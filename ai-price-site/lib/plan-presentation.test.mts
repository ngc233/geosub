import assert from "node:assert/strict";
import test from "node:test";
import { incomeWorkSource, workDurationParts, workSquareColumns } from "./income-work-display.ts";
import { placeMapLabels } from "./map-label-layout.ts";

test("income evidence merges source names once and keeps the complete year range",()=>{
  const source=incomeWorkSource([{source:"World Bank",year:2025},{source:"World Bank",year:2024},{source:"World Bank",year:2025}]);
  assert.equal((source.match(/World Bank/g)||[]).length,1);
  assert.match(source,/2024–2025$/);
  assert.match(source,/Atlas/);
  assert.equal(incomeWorkSource([]),"");
  assert.match(incomeWorkSource([{source:"Official",year:2024}]),/2024$/);
});
test("work duration keeps the existing minute rounding while separating numeric and unit presentation",()=>{
  assert.deepEqual(workDurationParts(.43),{hours:0,minutes:26,underMinute:false});
  assert.deepEqual(workDurationParts(32.7),{hours:32,minutes:42,underMinute:false});
  assert.deepEqual(workDurationParts(.999),{hours:1,minutes:0,underMinute:false});
  assert.equal(workDurationParts(.001)?.underMinute,true);
  assert.equal(workDurationParts(NaN),null);
  assert.equal(workDurationParts(-1),null);
});
test("responsive work columns fit larger squares and never turn a fractional hour into a hairline",()=>{
  assert.equal(workSquareColumns(792,20,4,33),33);
  assert.equal(workSquareColumns(326,20,4,33),13);
  assert.equal(workSquareColumns(326,20,4,1),1);
  assert.equal(workSquareColumns(0,20,4,33),1);
  assert.equal(workSquareColumns(792,0,4,33),1);
});
test("map labels stay near their regions, within the canvas, with leaders outside the label boxes",()=>{
  const points=[{x:750,y:240,width:170,height:64,preferRight:true},{x:300,y:170,width:170,height:64},{x:365,y:280,width:170,height:64}];
  const boxes=placeMapLabels(points);
  boxes.forEach((box,index)=>{
    const point=points[index];
    assert(box.x>=8&&box.x+box.width<=892&&box.y>=8&&box.y+box.height<=422);
    assert(point.x<box.x||point.x>box.x+box.width);
    assert(box.lineX===box.x||box.lineX===box.x+box.width);
    assert(Math.hypot(box.lineX-point.x,box.lineY-point.y)<=60);
  });
  const edges=placeMapLabels([{x:12,y:12,width:230,height:64},{x:888,y:418,width:230,height:64}]);
  edges.forEach(box=>assert(box.x>=8&&box.y>=8&&box.x+box.width<=892&&box.y+box.height<=422));
});
test("nearby labels avoid overlap without moving the underlying country points",()=>{
  const points=[{x:450,y:210,width:170,height:64,preferRight:true},{x:450,y:210,width:170,height:64},{x:450,y:210,width:170,height:64}];
  const before=structuredClone(points),boxes=placeMapLabels(points);
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!(boxes[i].x<boxes[j].x+boxes[j].width&&boxes[i].x+boxes[i].width>boxes[j].x&&boxes[i].y<boxes[j].y+boxes[j].height&&boxes[i].y+boxes[i].height>boxes[j].y));
  assert.deepEqual(points,before);
});
