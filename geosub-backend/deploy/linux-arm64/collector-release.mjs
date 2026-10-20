#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { atomic, safePath, taskIsBusy } from './rolling-release-lib.mjs';
import { migrationPlan, webRuntime, webRuntimeEnv, collectorEnvironment, collectorUnit, sourceHash, switchCollector } from './component-release-lib.mjs';
const run = (bin,args=[],options={}) => execFileSync(bin,args,{stdio:'inherit',...options});
const read = (bin,args=[]) => run(bin,args,{stdio:['ignore','pipe','pipe'],encoding:'utf8'}).trim();
const json = f => JSON.parse(fs.readFileSync(f,'utf8'));
const save = (f,v) => atomic(f,JSON.stringify(v,null,2)+'\n');
const root = safePath(process.env.GEOSUB_RELEASE_DIR || '/opt/geosub/releases');
const repo = safePath(process.env.GEOSUB_REPO_DIR || '/opt/geosub/geosub');
const envFile = safePath(process.env.GEOSUB_ENV_FILE || '/etc/geosub/geosub.env');
const stateFile=path.join(root,'collector-state.json'), currentFile=path.join(root,'collector-current.env');
const unitFile='/etc/systemd/system/geosub-collector-jobs.service', timer='geosub-collector-jobs.timer', service='geosub-collector-jobs.service';
const collectorEnv=path.join(root,'collector.env'), live=path.join(root,'collector-live');
const [operation,...args]=process.argv.slice(2);
let attempt, locked=false, priorState, priorCurrent;
const enabled=()=>{const r=spawnSync('systemctl',['is-enabled',timer],{encoding:'utf8'});const value=r.stdout.trim();if(!['enabled','disabled','static','indirect','enabled-runtime'].includes(value))throw Error('Unknown collector timer enablement');return value;};
const git=(...args)=>read('git',['-c',`safe.directory=${repo}`,'-C',repo,...args]);
const evidence=(step,status='running',detail='')=>{attempt={...attempt,step,status,detail,updatedAt:new Date().toISOString()};save(path.join(root,'collector-attempts',attempt.id+'.json'),attempt);};
function assertCommit(commit) {if(!/^[a-f0-9]{40}$/.test(commit || '')) throw Error('Exact commit required');}
function verifyBackend(release) {
  assertCommit(release.commit); safePath(release.dir);
  const entries=git('ls-tree','-r',release.commit,'geosub-backend').split('\n').filter(Boolean);
  for(const entry of entries) {
    const m=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entry);
    if(!m) throw Error('Unsupported collector source entry');
    const f=path.join(release.dir,m[3]);
    if(fs.lstatSync(f).isSymbolicLink() || sourceHash(fs.readFileSync(f))!==m[2]) throw Error('Retained collector source differs from commit');
  }
  if(!entries.length) throw Error('Empty collector source');
}
function compatible(commit,web) {
  const plan=migrationPlan(git('diff','--name-only',web.commit,commit).split('\n').filter(Boolean));
  if(plan.required) throw Error('Collector database inputs differ from deployed web; use compatible database release first');
  return plan;
}
function sudoNode(environment,backend) {
  // All variables are passed as arguments; environment file is root-controlled.
  run('sudo',['-u','geosub','--','bash','-c','set -ae; source "$1"; export GEOSUB_BACKEND_DIR="$2"; exec node "$2/scripts/collector-runtime-check.mjs"','check',environment,backend]);
}
async function holdCollectorLock() {
  run('install',['-d','-o','geosub','-g','geosub','-m','0700','/run/geosub']);
  run('sudo',['-u','geosub','--','touch','/run/geosub/collector-jobs.lock']);
  const child=spawn('flock',['-w','120','/run/geosub/collector-jobs.lock','/bin/bash','-c','printf ready; cat >/dev/null'],{stdio:['pipe','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    let ready=''; child.stdout.on('data',b=>{ready+=b;if(ready.includes('ready'))resolve();});
    child.once('error',reject);child.once('exit',code=>{if(!ready.includes('ready'))reject(Error(`Collector admission lock unavailable (${code})`));});
  });
  return ()=>new Promise((resolve,reject)=>{child.once('exit',code=>code===0?resolve():reject(Error('Collector lock process failed')));child.stdin.end();});
}
function snapshotFile(file) { return fs.existsSync(file)?fs.readFileSync(file,'utf8'):null; }
function restoreFile(file,value,mode) {if(value===null)fs.rmSync(file,{force:true});else atomic(file,value,mode);}
function point(dir) {const temp=live+'.pending';fs.rmSync(temp,{force:true});fs.symlinkSync(dir,temp);fs.renameSync(temp,live);}
try {
  if(process.platform!=='linux' || process.getuid()!==0)throw Error('Linux root required');
  if(!['upgrade','rollback'].includes(operation))throw Error('Use upgrade --commit SHA or rollback --attempt ID --confirm ID');
  const st=fs.statSync(envFile);if(st.uid!==0 || st.mode&0o022)throw Error('Root-controlled environment required');
  fs.mkdirSync(path.join(root,'rolling.lock'));locked=true;
  const web=json(path.join(root,'rolling-state.json')).active;
  const prior=fs.existsSync(stateFile)?json(stateFile):null;
  const previous=prior?.active || {id:'web-baseline-'+web.id,dir:web.dir,commit:web.commit,version:web.version,source:'web'};
  priorState=snapshotFile(stateFile);priorCurrent=snapshotFile(currentFile);
  const params=Object.fromEntries(Array.from({length:args.length/2},(_,i)=>[args[i*2],args[i*2+1]]));
  if(args.length!==Object.keys(params).length*2)throw Error('Invalid or duplicate arguments');
  let target,commit;
  if(operation==='upgrade') {
    if(Object.keys(params).join()!=='--commit')throw Error('Exact --commit required');
    commit=params['--commit'];assertCommit(commit);
    if(git('status','--porcelain','--untracked-files=normal'))throw Error('Clean release repository required');
    run('sudo',['-u','geosub','git','-C',repo,'fetch','origin',process.env.GEOSUB_GIT_BRANCH || 'main']);
    if(git('rev-parse','FETCH_HEAD')!==commit)throw Error('Candidate differs from fetched branch');
    if(previous.commit===commit && previous.source!=='web')throw Error('Collector commit already active');
    // First extraction of the deployed web's collector is a component adoption.
    const versionArgs=['--root',repo,'--ref',commit];
    if(!(previous.source==='web' && previous.commit===commit))versionArgs.push('--current',prior?currentFile:path.join(root,'current.env'));
    run('node',[path.join(repo,'scripts/check-release-version.mjs'),...versionArgs]);
    compatible(commit,web);
    if(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize<512*1024**2)throw Error('At least 512 MiB free space required');
  } else {
    const ref=params['--attempt'];
    if(!/^[0-9TZ-]+$/.test(ref || '') || params['--confirm']!==ref || Object.keys(params).length!==2)throw Error('Explicit matching attempt confirmation required');
    const receipt=json(path.join(root,'collector-attempts',ref+'.json'));
    if(receipt.status!=='succeeded' || receipt.operation!=='upgrade' || previous.id!==receipt.target.id || prior?.previous?.id!==receipt.previous.id)throw Error('Stale collector rollback attempt');
    target=receipt.previous;commit=target.commit;compatible(commit,web);verifyBackend(target);
  }
  const id=new Date().toISOString().replace(/[-:]/g,'').replace(/\.(\d+)Z$/,'Z-$1');
  attempt={id,operation,createdAt:new Date().toISOString(),previous,web:{id:web.id,commit:web.commit,unit:web.unit,port:web.port},migration:{required:false,reason:'database-inputs-identical-to-deployed-web'}};
  evidence('prepare');
  // Runtime pointer is bootstrapped once; later web releases update it atomically.
  if(!fs.existsSync(path.join(root,'web-runtime.json'))) {
    atomic(path.join(root,'web-runtime.json'),JSON.stringify(webRuntime(web))+'\n',0o640);
    atomic(path.join(root,'web-runtime.env'),webRuntimeEnv(web),0o640);
    run('chown',['root:geosub',path.join(root,'web-runtime.json'),path.join(root,'web-runtime.env')]);
  }
  if(operation==='upgrade') {
    const dir=safePath(path.join(root,'collectors',`${commit.slice(0,12)}-${id}`));fs.mkdirSync(dir,{recursive:true});
    run('bash',['-o','pipefail','-c','git -c safe.directory="$1" -C "$1" archive "$2" geosub-backend VERSION | tar -x -C "$3"','archive',repo,commit,dir]);
    run('chown',['-R','geosub:geosub',dir]);
    run('sudo',['-u','geosub','--','bash','-c','cd "$1"; exec npm ci --omit=dev','prepare',path.join(dir,'geosub-backend')]);
    run('chown',['-R','root:geosub',dir]);
    target={id:path.basename(dir),dir,commit,version:fs.readFileSync(path.join(dir,'VERSION'),'utf8').trim(),source:'collector'};
    verifyBackend(target);
    // Candidate check uses the existing web environment, not a rebuilt website.
    sudoNode(web.envFile,path.join(dir,'geosub-backend'));
  }
  attempt.target=target;evidence('candidate_verified');
  const io={
    snapshot:async()=>({active:spawnSync('systemctl',['is-active','--quiet',timer]).status===0,enabled:enabled(),unit:snapshotFile(unitFile),env:snapshotFile(collectorEnv),link:fs.existsSync(live)?fs.readlinkSync(live):null}),
    pause:async()=>{evidence('pause_collector');run('systemctl',['stop',timer]);},
    drain:async()=>{for(let i=0;i<120;i++){if(!taskIsBusy(read('systemctl',['show',service,'--property=ActiveState','--value'])))return;await new Promise(r=>setTimeout(r,1000));}throw Error('Collector still running; no switch performed');},
    acquire:holdCollectorLock,
    activate:async release=>{
      evidence('switch_collector');point(release.dir);
      atomic(collectorEnv,collectorEnvironment(root,envFile),0o640);run('chown',['root:geosub',collectorEnv]);
      const template=fs.readFileSync(path.join(release.dir,'geosub-backend/deploy/linux-arm64/systemd',service),'utf8');
      atomic(unitFile,collectorUnit(template,root),0o644);run('systemctl',['daemon-reload']);
    },
    verify:async release=>{
      verifyBackend(release);sudoNode(collectorEnv,path.join(release.dir,'geosub-backend'));
      if(!read('systemctl',['show',service,'--property=ExecStart','--value']).includes(live))throw Error('Collector unit did not switch');
      if(!read('systemctl',['show',service,'--property=Environment','--value']).includes(`GEOSUB_ENV_FILE=${collectorEnv}`))throw Error('Collector environment did not switch');
      if(json(path.join(root,'rolling-state.json')).active.id!==web.id || spawnSync('systemctl',['is-active','--quiet',web.unit]).status!==0)throw Error('Website changed during collector release');
    },
    record:async state=>{save(stateFile,state);atomic(currentFile,`GEOSUB_VERSION=${state.active.version}\nGEOSUB_COMMIT=${state.active.commit}\nGEOSUB_DEPLOYED_AT=${new Date().toISOString()}\n`);},
    restore:async snapshot=>{
      if(snapshot.link===null)fs.rmSync(live,{force:true});else point(snapshot.link);
      restoreFile(collectorEnv,snapshot.env,0o640);if(snapshot.env!==null)run('chown',['root:geosub',collectorEnv]);
      restoreFile(unitFile,snapshot.unit,0o644);restoreFile(stateFile,priorState,0o600);restoreFile(currentFile,priorCurrent,0o600);
      run('systemctl',['daemon-reload']);
    },
    resume:async snapshot=>{run('systemctl',[snapshot.active?'start':'stop',timer]);if(enabled()!==snapshot.enabled)throw Error('Collector timer enabled state changed');}
  };
  await switchCollector(io,target,previous);
  evidence('complete','succeeded');console.log(`Collector ${target.version} ${operation} verified; website ${web.version} unchanged; no migration.`);
} catch(error) {if(attempt)evidence(attempt.step,'failed',error.message);console.error(error.message);process.exitCode=1;}
finally {if(locked)fs.rmdirSync(path.join(root,'rolling.lock'));}
