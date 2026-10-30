import 'server-only';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { isClaudeReuseMutation, type ClaudeReuseOperation } from './claude-reuse-model';

const executeFile=promisify(execFile);
type Result = {ok:boolean;error_code?:string;result?:{
  state:string;configuration_fingerprint?:string;updated_jobs?:number;activated_jobs?:number;
  automatic_review?:boolean;automatic_review_after_confirmation?:boolean;
}};

export async function runClaudeReuseCommand(input: {
  jobId:string;operation:ClaudeReuseOperation;fingerprint?:string;actorId:string;
}): Promise<Result> {
  const roots=[process.env.GEOSUB_BACKEND_ROOT,process.env.GEOSUB_BACKEND_DIR,
    path.resolve(process.cwd(),'../geosub-backend'),path.resolve(process.cwd(),'geosub-backend')].filter(Boolean) as string[];
  const script=roots.map(root=>path.join(root,'scripts/reuse-claude-pro-job.mjs')).find(file=>existsSync(file));
  if (!script) return {ok:false,error_code:'reuse_operation_failed'};
  const args=[script,'--id',input.jobId,'--operation',input.operation];
  if (isClaudeReuseMutation(input.operation)) args.push('--fingerprint',input.fingerprint || '', '--actor-id',input.actorId);
  try {
    const {stdout}=await executeFile(process.execPath,args,{timeout:25_000,maxBuffer:128*1024,
      env:{...process.env,GEOSUB_FRONTEND_DIR:process.cwd()}});
    const response=JSON.parse(stdout) as Result;
    if (typeof response.ok!=='boolean') throw Error('invalid_response');
    return response;
  } catch {
    return {ok:false,error_code:'reuse_result_unknown'};
  }
}
