import assert from 'node:assert/strict';
import test from 'node:test';
import {effectWindows,assessContentEffect,EFFECT_PATH,type EffectLink} from './content-effects.ts';
import type {SeoSearchPageImportBatch} from './seo-search-observation-import.ts';
const link:EffectLink={id:'x',version:1,revisionHash:'a',opportunityId:'o',query:'q',hypothesis:'h',engine:'google',timezone:'UTC',publishedAt:'2026-09-15T12:00:00Z',createdAt:'2026-09-15T12:00:00Z',actor:'a',attemptId:'b',path:EFFECT_PATH};
const now=new Date('2026-10-01T00:00:00Z');
function batch(start:string,end:string,clicks=10):SeoSearchPageImportBatch{return {id:start,engine:'google',periodStart:start,periodEnd:end,importedAt:'2026-09-30T12:00:00Z',actorLabel:'test',evidence:{evidenceHash:'sha256:'+'a'.repeat(64),method:'server_api',searchType:'web',sourceTimezone:'UTC',coverage:'selected_rows',availableRows:1,capturedRows:1,excludedRoundedRows:0},observations:[{engine:'google',periodStart:start,periodEnd:end,path:EFFECT_PATH,clicks,impressions:200}]};}
const evidence=[batch('2026-09-01','2026-09-14'),batch('2026-09-16','2026-09-29',20)];
test('windows exclude publication day, including Pacific DST boundary',()=>{assert.deepEqual(effectWindows(link.publishedAt,'UTC'),{before:{start:'2026-09-01',end:'2026-09-14'},after:{start:'2026-09-16',end:'2026-09-29'}});assert.equal(effectWindows('2026-03-09T01:00:00Z','America/Los_Angeles').after.start,'2026-03-09');});
test('comparable evidence records descriptive delta',()=>assert.equal(assessContentEffect(link,evidence,1,now).clickDelta,10));
test('missing evidence is not zero',()=>assert.equal(assessContentEffect(link,[],1,now).before,null));
test('switched version blocks attribution',()=>assert.equal(assessContentEffect(link,evidence,2,now).status,'insufficient'));
test('partial observation day blocks comparison',()=>assert.equal(assessContentEffect(link,evidence,1,new Date('2026-09-29T23:59:59Z')).status,'insufficient'));
test('conflicting evidence is rejected',()=>assert.equal(assessContentEffect(link,[...evidence,batch('2026-09-16','2026-09-29',50)],1,now).status,'insufficient'));
test('wrong source timezone rejected',()=>{const b=structuredClone(evidence);b[1].evidence!.sourceTimezone='America/Los_Angeles';assert.equal(assessContentEffect(link,b,1,now).status,'insufficient');});
test('low impressions remain inconclusive',()=>{const b=structuredClone(evidence);b[1].observations[0].impressions=90;assert.equal(assessContentEffect(link,b,1,now).clickDelta,null);});
test('imports captured before window completes cannot support comparison',()=>{const b=structuredClone(evidence);b[1].importedAt='2026-09-29T22:00:00Z';assert.equal(assessContentEffect(link,b,1,now).status,'insufficient');});
test('future evidence timestamps cannot support comparison',()=>{const b=structuredClone(evidence);b[1].importedAt='2027-01-01T00:00:00Z';assert.equal(assessContentEffect(link,b,1,now).status,'insufficient');});

test('real import parser preserves evidence accepted by effect assessment',async()=>{const {parseSeoSearchPageImportState}=await import('./seo-search-observation-import.ts');const parsed=parseSeoSearchPageImportState(JSON.stringify({version:1,batches:evidence}));assert.equal(parsed.batches.length,2);assert.equal(assessContentEffect(link,parsed.batches,1,now).clickDelta,10);});
