import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Share the collector runner's existing admission lock, including its end-of-
// batch refresh/review. Never create, truncate, replace or chmod that lock file.
export function acquireCollectorBatchLock({
  lockFile = '/run/geosub/collector-jobs.lock',
  timeoutSeconds = 120,
} = {}) {
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0 || timeoutSeconds > 120) {
    throw Error('Collector batch lock timeout must be > 0 and <= 120 seconds');
  }
  const fd = fs.openSync(lockFile, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  let closed = false;
  const release = () => {
    if (!closed) {
      closed = true;
      fs.closeSync(fd);
    }
  };
  const assertHeld = () => {
    if (closed) throw Error('Collector batch lock is no longer held');
    const held = fs.fstatSync(fd), current = fs.lstatSync(lockFile);
    if (!held.isFile() || !current.isFile() || held.dev !== current.dev || held.ino !== current.ino) {
      throw Error('Collector batch lock file was replaced or is not a regular file');
    }
  };
  try {
    assertHeld();
    // Linux flock attaches the lock to the shared open-file description. FD 3
    // in this child refers to the parent's fd; exiting flock does NOT release
    // admission while the parent keeps its descriptor open. Other children do
    // not inherit it. Parent termination also releases it without a helper daemon.
    const result = spawnSync('flock', ['--exclusive', '--timeout', String(timeoutSeconds), '3'], {
      stdio: ['ignore', 'pipe', 'pipe', fd],
      timeout: Math.ceil(timeoutSeconds * 1000) + 1000,
    });
    if (result.error || result.status !== 0 || result.signal) {
      throw Error(result.status === 1
        ? 'Collector batch did not finish within admission timeout; release stopped'
        : 'Collector batch lock could not be acquired; release stopped');
    }
    assertHeld();
    return { assertHeld, release };
  } catch (error) {
    release();
    throw error;
  }
}
