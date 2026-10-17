import 'server-only';
import { readFile } from 'node:fs/promises';
import { prisma } from './prisma';
import { ADMIN_TRAFFIC_SQL } from './admin-traffic-query';
import { validateTrafficSnapshot, type TrafficSnapshot } from './admin-traffic-model';
export async function readAdminTraffic():Promise<TrafficSnapshot>{
 const path=process.env.GEOSUB_ADMIN_TRAFFIC_SNAPSHOT;
 if(path && process.env.GEOSUB_PROMOTION_RUNTIME==='preproduction-v1'){
  return {...validateTrafficSnapshot(JSON.parse(await readFile(path,'utf8'))),source:'生产只读聚合快照'};
 }
 const result=await prisma.$queryRawUnsafe<Array<{data:unknown}>>(ADMIN_TRAFFIC_SQL,new Date());
 return {...validateTrafficSnapshot(result[0]?.data),source:'当前数据库实时聚合'};
}
