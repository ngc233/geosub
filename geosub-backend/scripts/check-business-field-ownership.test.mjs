import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkBusinessOwnership, validateOwnership, literalWriteSurface } from './check-business-field-ownership.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'geosub-backend/data/business-field-ownership.json'), 'utf8'));
const schema = readFileSync(resolve(root, 'ai-price-site/prisma/schema.prisma'), 'utf8');
const source = (path) => readFileSync(resolve(root, path), 'utf8');
test('current field inventory is complete within its declared tables, while legacy conflicts remain visible', () => {
  const result = checkBusinessOwnership(root);
  assert.ok(result.fieldCount > 150);
  assert.ok(result.knownConflicts.includes('plan-catalog-overwrite'));
  assert.equal(result.runtimeCutoverVerified, false);
  assert.throws(() => checkBusinessOwnership(root, { strictCutover: true }), /Write cutover blocked/);
});
test('new scalar fields and SQL mapping drift must be assigned before the inventory passes', () => {
  assert.throws(() => validateOwnership(manifest, schema.replace('model Product {', 'model Product {\n  newFact String?'), source), /Unowned/);
  assert.throws(() => validateOwnership(manifest, schema.replace('@map("official_url")', '@map("new_official_url")'), source), /Unknown\/duplicate|Unowned/);
});
test('one database field cannot acquire a second owner or an unknown business owner', () => {
  const duplicate = structuredClone(manifest);
  duplicate.entities[0].groups.push({ owner: 'content', columns: ['name'] });
  assert.throws(() => validateOwnership(duplicate, schema, source), /duplicate/);
  const unknown = structuredClone(manifest);
  unknown.entities[0].groups[0].owner = 'any-admin';
  assert.throws(() => validateOwnership(unknown, schema, source), /Unknown field owner/);
});
test('deleted writer evidence and undeclared references cannot silently pass', () => {
  assert.throws(() => validateOwnership(manifest, schema, () => ''), /Missing source evidence/);
  const changed = structuredClone(manifest);
  changed.entities[0].currentWriters.push('new_unreviewed_writer');
  assert.throws(() => validateOwnership(changed, schema, source), /Unregistered source/);
});
test('literal SQL and Prisma write additions require an inventory review', () => {
  const entities = [{ table: 'products', model: 'Product' }, { table: 'plans', model: 'Plan' }];
  assert.deepEqual(literalWriteSurface('ai-price-site/lib/new-command.ts', 'await db.product.update({data:{}}); UPDATE plans SET name=$1;', entities), {
    path: 'ai-price-site/lib/new-command.ts', classification: 'runtime_service', tables: ['plans', 'products'],
  });
  assert.equal(literalWriteSurface('read.ts', 'SELECT * FROM products; db.plan.findMany()', entities), null);
  assert.throws(() => validateOwnership(manifest, schema, source, { writeSurfaces: [] }), /Literal write surfaces changed/);
});
