/* Exact reader contracts. This module grants no production admission or network access. */
const {createHash} = require('node:crypto');
const {readFileSync, lstatSync} = require('node:fs');
const {join} = require('node:path');
const targets = Object.freeze([
  {id:'overview:en:chatgpt', prefix:'content-pilot:en:chatgpt:', group:'content-pilot', path:'/en/ai-pricing/chatgpt'},
  {id:'overview:zh:claude', prefix:'managed-content:v2:overview:zh:claude:', group:'managed-content-v2', path:'/zh/ai-pricing/claude'},
  {id:'overview:en:claude', prefix:'managed-content:v2:overview:en:claude:', group:'managed-content-v2', path:'/en/ai-pricing/claude'},
].map(Object.freeze));
const hash = text => createHash('sha256').update(text).digest('hex');
function fingerprint(root, files) {
  if (!Array.isArray(files) || !files.length || new Set(files).size !== files.length) throw Error('Content contract file scope missing');
  return hash(files.map(file => {
    if (typeof file !== 'string' || !/^[\w./-]+$/.test(file) || file.startsWith('/') || file.split('/').some(x => !x || x === '..' || x === '.')) throw Error('Unsafe content contract path');
    const p = join(root, file);
    if (!lstatSync(p).isFile() || lstatSync(p).isSymbolicLink()) throw Error('Content contract file missing');
    return file + ':' + hash(readFileSync(p));
  }).join('\n'));
}
function rollbackPlan(from, to, policy) {
  const strict = {mode:'code-default-required', targets:[], pair:null};
  try {
    const source = fingerprint(from, policy.files);
    for (const pair of policy.approvedPairs || []) {
      if (pair.from !== source || pair.to !== fingerprint(to, pair.toFiles || policy.files)) continue;
      if (pair.format!==undefined && pair.format!==1 && pair.format!==2) return strict;
      if (pair.format !== 2) return {mode:'audited-compatible-readers', targets:[{id:targets[0].id, facts:false}], pair:{from:source,to:pair.to}};
      if (!Array.isArray(pair.targets) || !pair.targets.length || !pair.reason || !pair.evidence ||
          pair.targets.some(t => !targets.some(known => known.id === t.id) || typeof t.facts !== 'boolean') ||
          new Set(pair.targets.map(t => t.id)).size !== pair.targets.length) return strict;
      return {mode:'audited-compatible-readers', targets:pair.targets, pair:{from:source,to:pair.to}};
    }
  } catch { /* Changed, missing, reversed or unknown contract stays closed. */ }
  return strict;
}
function canonicalContent(content) {
  if (content === null) return null;
  if (typeof content!=='object' || Array.isArray(content) || Object.keys(content).sort().join(',')!=='description,faqs,heading,sections,sources,title') throw Error('Invalid content revision fields');
  const {title,heading,description,sections,faqs,sources} = content;
  if (![title,heading,description].every(x => typeof x === 'string') || !Array.isArray(sections) || !Array.isArray(faqs) || !Array.isArray(sources)) throw Error('Invalid content revision');
  return {title,heading,description,sections:sections.map(({heading,body}) => ({heading,body})),faqs:faqs.map(({q,a}) => ({q,a})),sources};
}
function validateRevision(target, state, revision) {
  if (!Number.isSafeInteger(state.version) || state.version < 0) throw Error('Invalid content pointer');
  if (!state.version) return;
  if (!revision || revision.version !== state.version || (target !== targets[0] && revision.targetId !== target.id) ||
      (revision.targetId && revision.targetId !== target.id) || hash(JSON.stringify(canonicalContent(revision.content))) !== revision.hash) throw Error('Content revision identity/hash mismatch');
}
function verifiedReceipt(target, state, attempt) {
  if (state.receipt !== 'verified') return false;
  // Retained v1 receipts predate persisted attempt evidence. Never infer this for Claude.
  if (target === targets[0] && !state.attemptId) return true;
  const proof = attempt?.evidence;
  const origin = proof?.origin, publicView = proof?.public;
  const canonical = 'https://geosub.org' + target.path;
  return Boolean(attempt?.id === state.attemptId && attempt.version === state.version && attempt.status === 'verified' &&
    (target === targets[0] ? !attempt.targetId || attempt.targetId === target.id : attempt.targetId === target.id) &&
    proof?.status === 'verified' && proof.stage === 'complete' && proof.purge?.url === canonical &&
    origin?.version === String(state.version) && publicView?.version === String(state.version) &&
    origin?.modeGeneration === String(attempt.fenceGeneration ?? 0) && publicView?.modeGeneration === origin.modeGeneration &&
    origin.outputHashes && Object.keys(origin.outputHashes).length >= 8 && publicView.outputHashes &&
    (target === targets[0] || origin.outputHashes.canonical === hash(canonical)) &&
    Object.entries(origin.outputHashes).every(([key,value]) => /^[a-f0-9]{64}$/.test(value) && publicView.outputHashes[key] === value));
}
module.exports = {targets, hash, fingerprint, rollbackPlan, canonicalContent, validateRevision, verifiedReceipt};
