import path from 'node:path';
import { globSync as glob } from 'tinyglobby';

// Only the directory-discovery contract used by @next/eslint-plugin-next.
// Fail explicitly if an upstream upgrade starts using another contract.
export function globSync(pattern, options) {
  if (typeof pattern !== 'string' || options?.onlyDirectories !== true ||
      Object.keys(options).some(key => key !== 'onlyDirectories')) {
    throw new TypeError('Unsupported Next ESLint root glob contract');
  }
  if (pattern.length > 4096) throw new RangeError('Next ESLint root pattern too long');
  let depth = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '\\') { i++; continue; }
    if (pattern[i] === '{' || pattern[i] === '(') {
      if (++depth > 32) throw new RangeError('Next ESLint root pattern too deeply nested');
    } else if (pattern[i] === '}' || pattern[i] === ')') {
      depth = Math.max(0, depth - 1);
    }
  }
  return glob(pattern, {
    onlyDirectories: true,
    expandDirectories: false,
    absolute: path.isAbsolute(pattern),
  }).map(entry => entry.length > path.parse(entry).root.length ? entry.replace(/\/$/, '') : entry);
}
