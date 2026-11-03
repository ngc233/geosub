#!/usr/bin/env node
// The isolation policy comes exclusively from the PR base, never the worktree/head.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONFIG = '.github/protected-files.json';
const CODEOWNERS = '.github/CODEOWNERS';

function git(repo, args) {
  try {
    return execFileSync('git', args, {
      cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    throw new Error('Cannot read the requested Git history; fetch the PR base and head with full history.');
  }
}

function requireCommit(repo, sha) {
  if (typeof sha !== 'string' || sha.length !== 40 || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error('Base and head must be full 40-character commit SHAs.');
  }
  git(repo, ['cat-file', '-e', `${sha}^{commit}`]);
}

function committedFile(repo, sha, path) {
  const entry = git(repo, ['ls-tree', '-z', sha, '--', path]);
  if (!entry) return null;
  if (!/^100(?:644|755) blob [a-f0-9]{40}\t/.test(entry)) {
    throw new Error(`Expected a regular committed file: ${path}`);
  }
  return git(repo, ['show', `${sha}:${path}`]);
}

export function parsePolicy(text) {
  let policy;
  try { policy = JSON.parse(text); } catch { throw new Error('Invalid protected-files JSON.'); }
  if (!policy || policy.version !== 1 || typeof policy.owner !== 'string' ||
      policy.owner.trim() !== policy.owner || !/^@[A-Za-z0-9-]+$/.test(policy.owner) ||
      !Array.isArray(policy.isolate) || !policy.isolate.length || !Array.isArray(policy.codeownersOnly)) {
    throw new Error('Invalid protected-files policy schema.');
  }
  const seen = new Set();
  for (const [layer, paths] of [['isolate', policy.isolate], ['codeownersOnly', policy.codeownersOnly]]) {
    for (const path of paths) {
      // Exact rooted files or ownership-only directories; no ambiguous glob rules.
      if (typeof path !== 'string' || path.trim() !== path || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\/?$/.test(path) ||
          path.split('/').some(part => part === '.' || part === '..') ||
          (layer === 'isolate' && path.endsWith('/')) || seen.has(path)) {
        throw new Error('Invalid or duplicate protected-files path.');
      }
      seen.add(path);
    }
  }
  return policy;
}

export function renderCodeowners(policy) {
  return [
    '# Generated from .github/protected-files.json; do not edit by hand.',
    '# Regenerate: node scripts/check-protected-files.mjs --generate-codeowners > .github/CODEOWNERS',
    '# Isolation applies only to the first layer; SQL/spec changes may include tests.',
    '',
    '# Must be isolated from all files outside this layer',
    ...policy.isolate.map(path => `/${path} ${policy.owner}`),
    '',
    '# Ownership only (no PR isolation)',
    ...policy.codeownersOnly.map(path => `/${path} ${policy.owner}`),
    '',
  ].join('\n');
}

export function checkCodeowners(repo, head) {
  requireCommit(repo, head);
  const policyText = committedFile(repo, head, CONFIG);
  if (policyText === null) throw new Error('Candidate protected-files configuration is missing.');
  const expected = renderCodeowners(parsePolicy(policyText));
  if (committedFile(repo, head, CODEOWNERS) !== expected) {
    throw new Error('CODEOWNERS differs from the candidate configuration; regenerate it with --generate-codeowners.');
  }
  return true;
}

export function checkProtectedFiles(repo, base, head) {
  requireCommit(repo, base);
  requireCommit(repo, head);
  const policyText = committedFile(repo, base, CONFIG);
  if (policyText === null) return { skipped: true, protectedFiles: [], otherFiles: [] };
  const policy = parsePolicy(policyText);
  // GitHub PRs compare merge-base to head. The policy still uses the exact base
  // SHA, so base-only changes do not become false positives in the file list.
  // Disable rename detection: both old/deleted and new paths must be classified.
  const paths = git(repo, ['diff', '--name-only', '--no-renames', '-z', `${base}...${head}`, '--'])
    .split('\0').filter(Boolean);
  const isolated = new Set(policy.isolate);
  const protectedFiles = paths.filter(path => isolated.has(path));
  const otherFiles = paths.filter(path => !isolated.has(path));
  return { skipped: false, protectedFiles, otherFiles,
    passed: protectedFiles.length === 0 || otherFiles.length === 0 };
}

export function main(args = process.argv.slice(2), repo = process.cwd(), log = console.log) {
  try {
    if (args.length === 1 && args[0] === '--generate-codeowners') {
      process.stdout.write(renderCodeowners(parsePolicy(readFileSync(resolve(repo, CONFIG), 'utf8'))));
      return 0;
    }
    if (args.length === 2 && args[0] === '--check-codeowners') {
      checkCodeowners(repo, args[1]);
      log('CODEOWNERS matches the committed candidate configuration.');
      return 0;
    }
    if (args.length !== 4 || args[0] !== '--base' || args[2] !== '--head') {
      throw new Error('Usage: --base <SHA> --head <SHA> | --check-codeowners <SHA> | --generate-codeowners');
    }
    const result = checkProtectedFiles(repo, args[1], args[3]);
    log(`Protected files: base=${args[1]} head=${args[3]}`);
    if (result.skipped) {
      log('首次建立：PR base 中不存在 .github/protected-files.json，跳过隔离检查。');
      return 0;
    }
    if (!result.passed) {
      log('Protected files FAILED: isolated files and files outside that layer cannot share a PR.');
      // JSON quoting preserves unusual filenames without injecting log directives.
      log('Protected: ' + JSON.stringify(result.protectedFiles));
      log('Other: ' + JSON.stringify(result.otherFiles));
      return 1;
    }
    log(`Protected files passed (${result.protectedFiles.length} protected, ${result.otherFiles.length} other).`);
    return 0;
  } catch (error) {
    log('Protected files ERROR: ' + error.message);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = main();
}
