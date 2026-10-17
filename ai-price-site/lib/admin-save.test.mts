import assert from 'node:assert/strict';
import test from 'node:test';
import { adminRecordVersion, assertAdminVersion, AdminSaveConflict, attemptAdminSave } from './admin-save.ts';

test('version detects content changes even with unchanged timestamps; joins do not alter scalar version',()=>{
 const record={id:'a',description:'one',updatedAt:new Date('2026-10-16T00:00:00Z')};
 const version=adminRecordVersion(record);
 assert.equal(version,adminRecordVersion({...record,relations:[]}));
 assert.equal(version,adminRecordVersion({updatedAt:record.updatedAt,description:'one',id:'a'}));
 assert.doesNotThrow(()=>assertAdminVersion(record,version));
 assert.throws(()=>assertAdminVersion({...record,description:'two'},version),AdminSaveConflict);
 assert.throws(()=>assertAdminVersion(record,null),AdminSaveConflict);
 assert.throws(()=>assertAdminVersion(null,version),AdminSaveConflict);
});
test('transaction failure never returns success, known failures are actionable without database internals',async()=>{
 for(const code of ['P2002','P2003','P2025']){
  const db={$transaction:async()=>{throw {code,message:'private details'};}};
  const result=await attemptAdminSave(db as never,async()=>1);
  assert.equal(result.ok,false);
  if(!result.ok)assert.doesNotMatch(result.error,/private details/);
 }
 await assert.rejects(()=>attemptAdminSave({$transaction:async()=>{throw Error('offline');}} as never,async()=>1),/offline/);
});
