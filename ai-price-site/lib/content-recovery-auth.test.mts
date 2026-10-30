import assert from 'node:assert/strict';
import test from 'node:test';
import { validContentRecoveryToken } from './content-recovery-auth.ts';
test('recovery auth fails closed for missing, malformed, partial and wrong tokens',()=>{
 const token='a'.repeat(64);
 assert.equal(validContentRecoveryToken(token,token),true);
 for(const value of [null,'',token.slice(1),'b'.repeat(64)])assert.equal(validContentRecoveryToken(value,token),false);
 for(const secret of [undefined,'short','A'.repeat(64)])assert.equal(validContentRecoveryToken(token,secret),false);
});
