#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {timers,taskLaunch,normalizeTaskLaunch,atomic} from './rolling-release-lib.mjs';
// A narrow operational repair: no app restart, no schedule change, no failed-state reset.
const repair=process.argv.includes('--repair');
if(process.platform!=='linux'||process.getuid()!==0)throw Error('Linux root required');
if(process.argv.slice(2).some(a=>!['--repair','--check'].includes(a)))throw Error('Use --check or --repair');
const plans=[];
for(const timer of timers){
 const unit=timer.replace('.timer','.service');
 const file=execFileSync('systemctl',['show',unit,'--property=FragmentPath','--value'],{encoding:'utf8'}).trim();
 if(file!==`/etc/systemd/system/${unit}`)throw Error('Unexpected unit location: '+unit);
 const source=fs.readFileSync(file,'utf8'),text=repair?normalizeTaskLaunch(source):source;
 // Refuse silently bypassing an ExecStart override.
 const dropins=execFileSync('systemctl',['show',unit,'--property=DropInPaths','--value'],{encoding:'utf8'}).trim();
 if(dropins)throw Error('Review service overrides first: '+unit);
 const launch=taskLaunch(text);
 execFileSync('sudo',['-u',launch.user,'test','-x',launch.executable]);
 for(const script of launch.scripts)execFileSync('sudo',['-u',launch.user,'/bin/bash','-n',script]);
 plans.push({unit,file,source,text});
}
if(repair){
 const backup='/opt/geosub/releases/task-launch-repair-'+new Date().toISOString().replace(/[:.]/g,'-');
 fs.mkdirSync(backup,{mode:0o700});
 for(const p of plans){fs.writeFileSync(backup+'/'+p.unit,p.source,{mode:0o600});atomic(p.file,p.text,0o644);}
 try{execFileSync('systemctl',['daemon-reload']);}
 catch(e){for(const p of plans)atomic(p.file,p.source,0o644);execFileSync('systemctl',['daemon-reload']);throw e;}
 console.log('Task launch repair backup: '+backup);
}
for(const p of plans)console.log('OK task launch identity/readability: '+p.unit);
