import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getCollectorPublicationClaim } from './collector-build-proof.ts';

test('build proof is bound to a single validated job and current private build secret',()=>{
  const job='12345678-1234-4234-8234-123456789abc',secret='a'.repeat(32);
  const signature=createHmac('sha256',secret).update(`collector-publication-v1:${job}`).digest('hex');
  assert.equal(getCollectorPublicationClaim(`${job}.${signature}`,secret),job);
  for(const value of [null,'',`${job}.x`,`${job}.${signature}.extra`,`22345678-1234-4234-8234-123456789abc.${signature}`])
    assert.equal(getCollectorPublicationClaim(value,secret),null);
  assert.equal(getCollectorPublicationClaim(`${job}.${signature}`,'b'.repeat(32)),null);
  assert.equal(getCollectorPublicationClaim(`${job}.${signature}`,''),null);
});
