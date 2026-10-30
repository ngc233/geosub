import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const modules = new Set(['website', 'catalog', 'price_facts', 'content', 'collection_quality', 'operations']);

/** Audit metadata only. Never connects to a database or authorizes a runtime write. */
export function prismaScalarColumns(schema, model) {
  const models = new Map([...schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)].map((m) => [m[1], m[2]]));
  const body = models.get(model);
  if (!body) throw Error(`Unknown Prisma model: ${model}`);
  const table = body.match(/@@map\("([^"]+)"\)/)?.[1];
  const fields = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(\w+)\s+(\w+)(\[\])?\??\s*(.*)/);
    if (!m || models.has(m[2]) || m[3]) continue;
    fields[m[4].match(/@map\("([^"]+)"\)/)?.[1] ?? m[1]] = m[1];
  }
  return { table, fields };
}

/** Conservative literal-write inventory; dynamic SQL still needs human review. */
export function literalWriteSurface(path, source, entities) {
  const tables = entities.filter((entity) => {
    const table = entity.table;
    const model = entity.model ? entity.model[0].toLowerCase() + entity.model.slice(1) : null;
    return new RegExp(`\\b(?:INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+(?:public\\.)?${table}\\b`, 'i').test(source)
      || model && new RegExp(`\\.${model}\\.(?:create|update|upsert|delete)(?:Many)?\\s*\\(`).test(source);
  }).map((entity) => entity.table).sort();
  if (!tables.length) return null;
  const classification = path.includes('/sql/backfill/') ? 'historical_backfill'
    : path.includes('/sql/') ? 'schema_or_function_definition'
      : path.includes('/app/admin/') ? 'admin_action'
        : path.includes('/lib/') ? 'runtime_service' : 'controlled_script';
  return { path, classification, tables };
}
function discoverWrites(root, entities) {
  const rows = [];
  function walk(directory) {
    for (const entry of readdirSync(resolve(root, directory), { withFileTypes: true })) {
      if (['fixtures', 'tests', 'node_modules', '.git', '.next'].includes(entry.name)) continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.(?:ts|tsx|mts|mjs|cjs|sql|ps1)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.startsWith('test-')) {
        const row = literalWriteSurface(path, readFileSync(resolve(root, path), 'utf8'), entities);
        if (row) rows.push(row);
      }
    }
  }
  for (const path of ['geosub-backend/sql', 'geosub-backend/scripts', 'geosub-backend/deploy/linux-arm64', 'ai-price-site/app', 'ai-price-site/lib', 'ai-price-site/scripts']) walk(path);
  return rows.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

export function validateOwnership(manifest, schema, readSource, { strictCutover = false, writeSurfaces } = {}) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entities) || !manifest.entities.length) throw Error('Invalid ownership manifest');
  if (!Array.isArray(manifest.modules) || manifest.modules.length !== modules.size ||
      new Set(manifest.modules).size !== modules.size || manifest.modules.some((m) => !modules.has(m))) throw Error('Invalid business modules');
  const knownFields = new Set();
  const tables = new Set();
  const refs = manifest.references;
  const requireRef = (id) => {
    if (!Object.hasOwn(refs, id)) throw Error(`Unregistered source: ${id}`);
  };
  const requireOwner = (owner) => { if (!modules.has(owner)) throw Error(`Unknown field owner: ${owner}`); };
  const requireEvidence = ({ path, anchor }) => {
    if (typeof path !== 'string' || !path || isAbsolute(path) || path.split(/[\\/]/).includes('..') ||
        typeof anchor !== 'string' || !anchor || !readSource(path).includes(anchor)) throw Error(`Missing source evidence: ${path}`);
  };
  for (const evidence of Object.values(refs)) requireEvidence(evidence);
  for (const entity of manifest.entities) {
    const { table, fields } = prismaScalarColumns(schema, entity.model);
    if (table !== entity.table || tables.has(table)) throw Error(`Duplicate/mismatched table: ${entity.table}`);
    tables.add(table);
    if (!entity.targetAction?.trim()) throw Error(`Missing target action: ${table}`);
    const owners = new Map();
    for (const group of entity.groups) {
      requireOwner(group.owner);
      if (!group.columns.length) throw Error(`Empty ownership group: ${table}`);
      for (const column of group.columns) {
        if (!Object.hasOwn(fields, column) || owners.has(column)) throw Error(`Unknown/duplicate field owner: ${table}.${column}`);
        owners.set(column, group.owner);
        knownFields.add(`${table}.${column}`);
      }
    }
    for (const [column, prismaField] of Object.entries(fields)) {
      if (!owners.has(column) || entity.prismaFields[column] !== prismaField) throw Error(`Unowned/schema-drifted field: ${table}.${column}`);
    }
    if (Object.keys(entity.prismaFields).length !== Object.keys(fields).length) throw Error(`Stale Prisma mapping: ${table}`);
    if (!entity.currentWriters.length || !entity.readers.length) throw Error(`Missing writer/reader inventory: ${table}`);
    [...entity.currentWriters, ...entity.readers].forEach(requireRef);
  }
  for (const entry of manifest.nativeSql) {
    requireOwner(entry.owner);
    requireEvidence(entry.evidence);
    for (const column of entry.columns) {
      const key = `${entry.table}.${column}`;
      if (knownFields.has(key)) throw Error(`Duplicate native field owner: ${key}`);
      if (!new RegExp(`\\b${column}\\b`).test(readSource(entry.evidence.path))) throw Error(`Missing native field evidence: ${key}`);
      knownFields.add(key);
    }
  }
  if (writeSurfaces && JSON.stringify(writeSurfaces) !== JSON.stringify(manifest.literalWriteSurfaces)) {
    throw Error('Literal write surfaces changed; review and register their ownership/classification');
  }
  const surfaces = new Set();
  for (const surface of manifest.jsonSurfaces) {
    requireOwner(surface.owner);
    if (!surface.id || surfaces.has(surface.id) || !surface.fields.length ||
        new Set(surface.fields).size !== surface.fields.length || !surface.cutover) throw Error('Invalid JSON ownership surface');
    surfaces.add(surface.id);
    requireRef(surface.writer);
    surface.readers.forEach(requireRef);
  }
  const conflictIds = new Set();
  for (const conflict of manifest.knownConflicts) {
    if (!conflict.id || conflictIds.has(conflict.id) || !conflict.cutover || !conflict.resolution || !conflict.fields.length) throw Error('Invalid legacy conflict');
    conflictIds.add(conflict.id);
    conflict.writers.forEach(requireRef);
    for (const field of conflict.fields) if (!knownFields.has(field)) throw Error(`Unregistered conflict field: ${field}`);
  }
  if (strictCutover && conflictIds.size) throw Error(`Write cutover blocked by: ${[...conflictIds].join(', ')}`);
  return {
    schemaVersion: 1,
    purpose: 'read_only_inventory_not_runtime_authorization',
    status: conflictIds.size ? 'valid_inventory_with_legacy_conflicts' : 'valid_inventory',
    schemaHash: createHash('sha256').update(schema).digest('hex'),
    fieldCount: knownFields.size, tableCount: tables.size,
    jsonSurfaceCount: surfaces.size, knownConflicts: [...conflictIds],
    literalWriteSourceCount: manifest.literalWriteSurfaces.length,
    // Empty inventory conflicts alone cannot prove that runtime writers were migrated.
    runtimeCutoverVerified: false,
  };
}

export function checkBusinessOwnership(root = repoRoot, options = {}) {
  const base = realpathSync(root);
  const manifest = JSON.parse(readFileSync(resolve(base, 'geosub-backend/data/business-field-ownership.json'), 'utf8'));
  const schema = readFileSync(resolve(base, 'ai-price-site/prisma/schema.prisma'), 'utf8');
  const entities = [...manifest.entities, ...manifest.nativeSql.filter((row) => !manifest.entities.some((entity) => entity.table === row.table))];
  return validateOwnership(manifest, schema, (path) => {
    const target = realpathSync(resolve(base, path));
    if (relative(base, target).startsWith('..') || isAbsolute(relative(base, target))) throw Error('Source escaped repository');
    return readFileSync(target, 'utf8');
  }, { ...options, writeSurfaces: discoverWrites(base, entities) });
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== '--strict-cutover')) throw Error('Only --strict-cutover is supported');
    console.log(JSON.stringify(checkBusinessOwnership(repoRoot, { strictCutover: args.includes('--strict-cutover') }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
