// Finalize an already-serving, migration-free candidate after a transient
// post-deploy gate failure. Verification has no runtime mutation capability.
export async function finalizeExistingCandidate({ prior, state, expectedCommit, latestAttempt, liveDir, routeMatches, runtimeMatches }, { verify, record }) {
  if (prior.operation !== 'upgrade' || prior.status !== 'failed' ||
      !prior.detail?.includes('post-deploy-check.sh') || !prior.detail.endsWith('recovery=incomplete')) {
    throw Error('Only an incompletely recovered post-deploy failure can be finalized');
  }
  if (prior.migration?.required !== false || prior.timers && Object.keys(prior.timers).length) throw Error('Finalize forbids migrations or paused timers');
  if (!/^[a-f0-9]{40}$/.test(expectedCommit) || prior.target?.commit !== expectedCommit) throw Error('Exact candidate commit required');
  if (latestAttempt !== prior.id || JSON.stringify(state.active) !== JSON.stringify(prior.previous)) throw Error('Stale release attempt');
  if (liveDir !== prior.target.dir || !routeMatches || !runtimeMatches) throw Error('Candidate is not the already-serving runtime');
  await verify(prior.target);
  await record({ active: prior.target, previous: prior.previous });
}
