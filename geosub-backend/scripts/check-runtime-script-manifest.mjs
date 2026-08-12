import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const defaultManifestPath = path.join(scriptDir, 'runtime-script-manifest.json');
const allowedStatuses = new Set(['legacy-active', 'shadow-ready', 'active-mjs']);

function normalize(value) {
  return value.replaceAll('\\', '/');
}

async function exists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function validateRuntimeScriptManifest({
  rootDir = backendDir,
  manifestPath = defaultManifestPath,
} = {}) {
  const errors = [];
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const scriptEntries = Array.isArray(manifest.scripts) ? manifest.scripts : [];
  const productionEntries = Array.isArray(manifest.productionEntrypoints)
    ? manifest.productionEntrypoints
    : [];

  if (manifest.version !== 1) {
    errors.push('Manifest version must be 1.');
  }

  const listedPaths = new Set();
  for (const entry of scriptEntries) {
    const label = entry?.path || '<missing path>';
    if (!entry?.path || listedPaths.has(entry.path)) {
      errors.push(`Script path is missing or duplicated: ${label}`);
      continue;
    }

    listedPaths.add(entry.path);
    if (!(await exists(path.join(rootDir, entry.path)))) {
      errors.push(`Listed PowerShell script does not exist: ${entry.path}`);
    }
    if (!entry.kind || !Number.isInteger(entry.migrationPhase)) {
      errors.push(`Script classification is incomplete: ${entry.path}`);
    }
    if (!entry.databaseEffect || !entry.networkEffect || typeof entry.dryRun !== 'boolean') {
      errors.push(`Script effect contract is incomplete: ${entry.path}`);
    }

    if (entry.kind === 'windows-task-installer') {
      if (entry.migrationPhase !== 0 || entry.replacement !== null) {
        errors.push(`Windows task installer must remain platform-specific: ${entry.path}`);
      }
    } else if (!entry.replacement?.endsWith('.mjs')) {
      errors.push(`Runtime script needs an .mjs replacement target: ${entry.path}`);
    }
  }

  const discoveredPowerShell = (await readdir(path.join(rootDir, 'scripts'), {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ps1'))
    .map((entry) => `scripts/${entry.name}`)
    .sort();

  for (const scriptPath of discoveredPowerShell) {
    if (!listedPaths.has(scriptPath)) {
      errors.push(`PowerShell script is not classified: ${scriptPath}`);
    }
  }
  for (const scriptPath of listedPaths) {
    if (!discoveredPowerShell.includes(scriptPath)) {
      errors.push(`Manifest has a stale PowerShell entry: ${scriptPath}`);
    }
  }

  const productionTasks = new Set();
  for (const entry of productionEntries) {
    if (!entry.task || productionTasks.has(entry.task)) {
      errors.push(`Production task is missing or duplicated: ${entry.task || '<missing>'}`);
      continue;
    }
    productionTasks.add(entry.task);

    if (!allowedStatuses.has(entry.status)) {
      errors.push(`Unknown production migration status for ${entry.task}: ${entry.status}`);
      continue;
    }
    if (!listedPaths.has(entry.legacyScript)) {
      errors.push(`Production legacy script is not classified: ${entry.legacyScript}`);
    }

    const wrapperPath = path.join(rootDir, entry.wrapper);
    if (!(await exists(wrapperPath))) {
      errors.push(`Production wrapper does not exist: ${entry.wrapper}`);
      continue;
    }

    const wrapperSource = normalize(await readFile(wrapperPath, 'utf8'));
    const legacyName = path.posix.basename(normalize(entry.legacyScript));
    const replacementName = path.posix.basename(normalize(entry.replacement));
    const replacementExists = await exists(path.join(rootDir, entry.replacement));

    if (entry.status === 'legacy-active') {
      if (!wrapperSource.includes(legacyName) || !wrapperSource.includes('pwsh')) {
        errors.push(`Legacy-active wrapper no longer invokes PowerShell: ${entry.wrapper}`);
      }
    }
    if (entry.status === 'shadow-ready') {
      if (!replacementExists) {
        errors.push(`Shadow-ready replacement does not exist: ${entry.replacement}`);
      }
      if (!wrapperSource.includes(legacyName) || !wrapperSource.includes('pwsh')) {
        errors.push(`Shadow-ready wrapper must keep PowerShell active: ${entry.wrapper}`);
      }
    }
    if (entry.status === 'active-mjs') {
      if (!replacementExists || !wrapperSource.includes(replacementName)) {
        errors.push(`Active MJS wrapper does not invoke its replacement: ${entry.wrapper}`);
      }
      if (!(await exists(path.join(rootDir, entry.legacyScript)))) {
        errors.push(`Active MJS task must retain its legacy script for one release: ${entry.legacyScript}`);
      }
    }
  }

  return {
    errors,
    scriptCount: scriptEntries.length,
    productionTaskCount: productionEntries.length,
    phases: [...new Set(scriptEntries.map((entry) => entry.migrationPhase))].sort(),
  };
}

async function main() {
  const result = await validateRuntimeScriptManifest();
  if (result.errors.length > 0) {
    console.error('Runtime script manifest check failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Runtime script manifest passed: ${result.scriptCount} PowerShell scripts, ` +
      `${result.productionTaskCount} production entrypoints, phases ${result.phases.join(', ')}.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  await main();
}
