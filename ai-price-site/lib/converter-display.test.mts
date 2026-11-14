import test from 'node:test';
import assert from 'node:assert/strict';
import { canDisplayConverterRate } from './converter-display.ts';
test('converter display: valid and stale-but-usable quotes remain usable; expired, missing or invalid quotes never show an estimate',()=>{
  const fresh={rate:7.2,isExpired:false,isStale:false};
  const stale={rate:7.2,isExpired:false,isStale:true};
  assert.equal(canDisplayConverterRate(fresh),true);
  assert.equal(canDisplayConverterRate(stale),true);
  for(const rate of [undefined,{rate:7.2,isExpired:true},{rate:0,isExpired:false},{rate:-1,isExpired:false},{rate:NaN,isExpired:false},{rate:Infinity,isExpired:false}])assert.equal(canDisplayConverterRate(rate),false);
});
