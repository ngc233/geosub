import assert from "node:assert/strict";
import test from "node:test";
import {filterHistory,type HistoryFilters,type HistorySummary} from "./history-display.ts";

test("history filters preserve the confirmed event pair rather than deriving changes from filtered observations",()=>{
  const before={id:"before",planName:"Plus",countryCode:"PH",observedAt:"2026-09-20T00:00:00Z",amount:100,currency:"PHP",billingCycle:"monthly"};
  const after={...before,id:"after",observedAt:"2026-10-20T00:00:00Z",amount:120};
  const unknown={...after,id:"unknown",billingCycle:null};
  const summary:HistorySummary={coverage:{recordCount:100,countryCount:2,observedDays:30,firstObservedAt:before.observedAt,lastObservedAt:after.observedAt},events:[{before,after,direction:"increase",percent:20}],eventCount:1,snapshots:[unknown,after,before],truncated:false};
  const filters:HistoryFilters={country:"PH",plan:"Plus",cycle:"monthly",days:"30",direction:"all"};
  const original=structuredClone(summary);
  const result=filterHistory(summary,filters,Date.parse("2026-11-01T00:00:00Z"));
  assert.deepEqual(result.snapshots,[after]);assert.deepEqual(result.events[0].before,before);
  assert.equal(filterHistory(summary,{...filters,direction:"decrease"},Date.parse("2026-11-01")).events.length,0);
  assert.deepEqual(filterHistory(summary,{...filters,cycle:"unknown"},Date.parse("2026-11-01")).snapshots,[unknown]);
  assert.equal(filterHistory(summary,{...filters,country:"US"},Date.parse("2026-11-01")).snapshots.length,0);
  assert.deepEqual(summary,original);
});

test("same-price observations and missing periods do not become events in the display layer",()=>{
  const row={id:"one",planName:"Plus",countryCode:"PH",observedAt:"2026-10-20T00:00:00Z",amount:100,currency:"PHP",billingCycle:null};
  const summary:HistorySummary={coverage:{recordCount:2,countryCount:1,observedDays:2,firstObservedAt:row.observedAt,lastObservedAt:row.observedAt},eventCount:0,events:[],snapshots:[row,{...row,id:"two"}],truncated:true};
  const result=filterHistory(summary,{country:"all",plan:"all",cycle:"all",days:"120",direction:"all"},Date.parse("2026-11-01"));
  assert.equal(result.snapshots.length,2);assert.deepEqual(result.events,[]);
});
