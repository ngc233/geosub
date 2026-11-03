import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkCodeowners, checkProtectedFiles, main, parsePolicy, renderCodeowners } from '../check-protected-files.mjs';

const script = fileURLToPath(new URL('../check-protected-files.mjs', import.meta.url));
const configPath = '.github/protected-files.json';
const policy = JSON.parse(readFileSync(new URL('../../.github/protected-files.json', import.meta.url), 'utf8'));

function fixture(t, { bootstrap = false } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'geosub-protected-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, {
    cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
  }).trim();
  const write = (path, text = 'changed\n') => {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), text);
  };
  const commit = () => {
    git('add', '-A');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q');
  for (const path of ['docs/DATA_POLICY.md', 'docs/RELEASE.md', 'src/ordinary.ts', '.github/workflows/ci.yml']) write(path, 'original\n');
  if (!bootstrap) {
    write(configPath, JSON.stringify(policy));
    write('.github/CODEOWNERS', renderCodeowners(policy));
  }
  const base = commit();
  return { repo, git, write, commit, base, check: head => checkProtectedFiles(repo, base, head) };
}

test('protected files may change together without ordinary files', t => {
  const f = fixture(t);
  f.write('docs/DATA_POLICY.md'); f.write('docs/RELEASE.md');
  const result = f.check(f.commit());
  assert.equal(result.passed, true);
  assert.deepEqual(result.protectedFiles, ['docs/DATA_POLICY.md', 'docs/RELEASE.md']);
  assert.deepEqual(result.otherFiles, []);
});

test('ordinary files and an empty diff pass', t => {
  const f = fixture(t);
  assert.equal(f.check(f.base).passed, true);
  f.write('src/ordinary.ts'); f.write('src/ordinary.test.ts');
  assert.equal(f.check(f.commit()).passed, true);
});

test('mixed protected and ordinary files fail with names and nonzero CLI exit', t => {
  const f = fixture(t);
  f.write('docs/DATA_POLICY.md'); f.write('src/ordinary.ts');
  const head = f.commit();
  const result = spawnSync(process.execPath, [script, '--base', f.base, '--head', head], { cwd: f.repo, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Protected files FAILED/);
  assert.match(result.stdout, /docs\/DATA_POLICY.md/);
  assert.match(result.stdout, /src\/ordinary.ts/);
});

test('removing a file from the head policy cannot exempt it from base policy', t => {
  const f = fixture(t);
  const relaxed = { ...policy, isolate: policy.isolate.filter(path => path !== 'docs/DATA_POLICY.md') };
  f.write(configPath, JSON.stringify(relaxed));
  f.write('.github/CODEOWNERS', renderCodeowners(relaxed));
  f.write('docs/DATA_POLICY.md'); f.write('src/ordinary.ts');
  const result = f.check(f.commit());
  assert.equal(result.passed, false);
  assert.ok(result.protectedFiles.includes('docs/DATA_POLICY.md'));
  assert.ok(result.otherFiles.includes('src/ordinary.ts'));
});

test('ci.yml plus ordinary code fails', t => {
  const f = fixture(t);
  f.write('.github/workflows/ci.yml'); f.write('src/ordinary.ts');
  const result = f.check(f.commit());
  assert.equal(result.passed, false);
  assert.deepEqual(result.protectedFiles, ['.github/workflows/ci.yml']);
});

test('executing the committed base checker rejects a head that replaces it with a no-op', t => {
  const f = fixture(t);
  f.write('scripts/check-protected-files.mjs', readFileSync(script, 'utf8'));
  const base = f.commit();
  f.write('scripts/check-protected-files.mjs', 'process.exit(0);\n');
  f.write('docs/DATA_POLICY.md'); f.write('src/ordinary.ts');
  const head = f.commit();
  const runner = join(f.repo, 'base-checker.mjs');
  writeFileSync(runner, f.git('show', `${base}:scripts/check-protected-files.mjs`));
  const result = spawnSync(process.execPath, [runner, '--base', base, '--head', head], { cwd: f.repo, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Protected files FAILED/);
});

test('configuration, checker and CODEOWNERS are also in the isolated layer', t => {
  for (const path of [configPath, 'scripts/check-protected-files.mjs', '.github/CODEOWNERS']) {
    const f = fixture(t);
    f.write(path); f.write('src/ordinary.ts');
    const result = f.check(f.commit());
    assert.equal(result.passed, false, path);
    assert.ok(result.protectedFiles.includes(path));
  }
});

test('SQL and both plan specifications can share a PR with behavior tests', t => {
  const f = fixture(t);
  for (const path of [
    'geosub-backend/sql/schema/999_review.sql',
    'geosub-backend/sql/isolated/new-review.sql',
    'geosub-backend/sql/backfill/999_migration.sql',
    'geosub-backend/data/product-plan-specs.json',
    'geosub-backend/data/catalog-expansion-2026-08.json',
    'scripts/tests/review.test.mjs',
  ]) f.write(path);
  const result = f.check(f.commit());
  assert.equal(result.passed, true);
  assert.equal(result.otherFiles.length, 6);
  assert.equal(result.protectedFiles.length, 0);
});

test('ownership-only files are outside the isolation layer when mixed with a policy', t => {
  const f = fixture(t);
  f.write('docs/DATA_POLICY.md'); f.write('geosub-backend/sql/schema/999_review.sql');
  assert.equal(f.check(f.commit()).passed, false);
});

test('reserved future documents may be absent but are protected upon creation', t => {
  for (const path of ['docs/APPROVALS.md', 'docs/RULES-SUMMARY.md']) {
    const f = fixture(t);
    assert.equal(f.check(f.base).passed, true);
    f.write(path);
    assert.equal(f.check(f.commit()).passed, true);
    f.write('src/ordinary.ts');
    assert.equal(f.check(f.commit()).passed, false);
  }
});

test('deleting protected files is a protected modification', t => {
  const f = fixture(t);
  rmSync(join(f.repo, 'docs/DATA_POLICY.md'));
  assert.equal(f.check(f.commit()).passed, true);
  f.write('src/ordinary.ts');
  assert.equal(f.check(f.commit()).passed, false);
});

test('renames classify both the deleted and added paths', t => {
  const f = fixture(t);
  renameSync(join(f.repo, 'docs/DATA_POLICY.md'), join(f.repo, 'docs/renamed.md'));
  const result = f.check(f.commit());
  assert.equal(result.passed, false);
  assert.deepEqual(result.protectedFiles, ['docs/DATA_POLICY.md']);
  assert.deepEqual(result.otherFiles, ['docs/renamed.md']);
});

test('renaming an ordinary file into a reserved protected path is detected', t => {
  const f = fixture(t);
  renameSync(join(f.repo, 'src/ordinary.ts'), join(f.repo, 'docs/APPROVALS.md'));
  const result = f.check(f.commit());
  assert.equal(result.passed, false);
  assert.ok(result.protectedFiles.includes('docs/APPROVALS.md'));
});

test('deleting or corrupting the head configuration cannot cause bootstrap skip', t => {
  for (const deleted of [false, true]) {
    const f = fixture(t);
    if (deleted) rmSync(join(f.repo, configPath)); else f.write(configPath, 'broken JSON');
    f.write('src/ordinary.ts');
    const result = f.check(f.commit());
    assert.equal(result.skipped, false);
    assert.equal(result.passed, false);
  }
});

test('first establishment skips only because the exact base has no configuration', t => {
  const f = fixture(t, { bootstrap: true });
  f.write(configPath, JSON.stringify(policy));
  f.write('docs/DATA_POLICY.md'); f.write('src/ordinary.ts');
  const head = f.commit();
  assert.equal(f.check(head).skipped, true);
  const lines = [];
  assert.equal(main(['--base', f.base, '--head', head], f.repo, line => lines.push(line)), 0);
  assert.match(lines.join('\n'), /首次建立/);
});

test('working tree, index and current checkout do not determine the PR diff', t => {
  const f = fixture(t);
  f.write('docs/DATA_POLICY.md'); f.write('src/ordinary.ts');
  const head = f.commit();
  f.git('checkout', '--detach', f.base);
  f.write(configPath, JSON.stringify({ ...policy, isolate: ['irrelevant.md'] }));
  f.write('docs/DATA_POLICY.md');
  f.git('add', '-A');
  assert.equal(f.check(head).passed, false);
});

test('base-only edits do not enter PR diff but policy is read from current base', t => {
  const f = fixture(t);
  f.git('checkout', '-b', 'candidate');
  f.write('src/ordinary.ts');
  const head = f.commit();
  f.git('checkout', '--detach', f.base);
  f.write('docs/DATA_POLICY.md');
  const advancedBase = f.commit();
  assert.equal(checkProtectedFiles(f.repo, advancedBase, head).passed, true);
  f.write(configPath, JSON.stringify({ ...policy, isolate: [...policy.isolate, 'src/ordinary.ts'] }));
  const policyBase = f.commit();
  assert.deepEqual(checkProtectedFiles(f.repo, policyBase, head).protectedFiles, ['src/ordinary.ts']);
});

test('missing commits, malformed SHAs and unrelated histories fail closed', t => {
  const f = fixture(t);
  for (const sha of ['main', '0'.repeat(40), f.base + '\n']) {
    assert.throws(() => checkProtectedFiles(f.repo, sha, f.base));
  }
  f.git('checkout', '--orphan', 'unrelated');
  f.write('unrelated.txt');
  const head = f.commit();
  assert.throws(() => f.check(head), /Git history/);
});

test('filenames with tabs/newlines are retained as individual paths and safely logged', t => {
  const f = fixture(t);
  const path = 'src/a\tline\n::warning::ordinary.ts';
  f.write(path); f.write('docs/DATA_POLICY.md');
  const head = f.commit();
  assert.deepEqual(f.check(head).otherFiles, [path]);
  const lines = [];
  assert.equal(main(['--base', f.base, '--head', head], f.repo, line => lines.push(line)), 1);
  assert.ok(lines.every(line => !line.includes('\n')));
});

test('CODEOWNERS is generated from both layers including reserved absent files', t => {
  const f = fixture(t);
  assert.equal(checkCodeowners(f.repo, f.base), true);
  const output = renderCodeowners(policy);
  for (const path of [...policy.isolate, ...policy.codeownersOnly]) {
    assert.ok(output.split('\n').includes(`/${path} @ngc233`));
  }
  assert.ok(output.includes('/docs/APPROVALS.md @ngc233'));
  f.write('.github/CODEOWNERS', output.replace('/docs/DATA_POLICY.md @ngc233\n', ''));
  assert.throws(() => checkCodeowners(f.repo, f.commit()), /differs/);
});

test('CODEOWNERS comparison uses committed candidate bytes, not worktree bytes', t => {
  const f = fixture(t);
  f.write('.github/CODEOWNERS', 'bad worktree');
  assert.equal(checkCodeowners(f.repo, f.base), true);
  const badHead = f.commit();
  f.write('.github/CODEOWNERS', renderCodeowners(policy));
  assert.throws(() => checkCodeowners(f.repo, badHead), /differs/);
});

test('generation and committed CODEOWNERS validation work through the actual CLI', t => {
  const f = fixture(t);
  const generated = spawnSync(process.execPath, [script, '--generate-codeowners'], { cwd: f.repo, encoding: 'utf8' });
  assert.equal(generated.status, 0);
  assert.equal(generated.stdout, renderCodeowners(policy));
  const checked = spawnSync(process.execPath, [script, '--check-codeowners', f.base], { cwd: f.repo, encoding: 'utf8' });
  assert.equal(checked.status, 0);
  assert.match(checked.stdout, /matches/);
});

test('invalid base policy and symlink configuration do not silently skip', t => {
  const f = fixture(t);
  f.write(configPath, '{broken');
  const badBase = f.commit();
  assert.throws(() => checkProtectedFiles(f.repo, badBase, badBase), /JSON/);
  f.git('rm', configPath);
  execFileSync('ln', ['-s', '../docs/DATA_POLICY.md', configPath], { cwd: f.repo });
  const symlinkBase = f.commit();
  assert.throws(() => checkProtectedFiles(f.repo, symlinkBase, symlinkBase), /regular committed file/);
});

test('policy parser rejects ambiguous patterns, duplicate paths and malformed schema', () => {
  for (const invalid of [null, {}, { ...policy, version: 2 }, { ...policy, isolate: [] },
    { ...policy, owner: '@owner\n* @other' }, { ...policy, owner: '@owner\n' },
    { ...policy, isolate: ['docs/extra.md\n'] }, { ...policy, isolate: ['../escape'] },
    { ...policy, isolate: ['docs/'] }, { ...policy, isolate: ['docs/*.md'] },
    { ...policy, codeownersOnly: [policy.isolate[0]] }]) {
    assert.throws(() => parsePolicy(JSON.stringify(invalid)));
  }
});
