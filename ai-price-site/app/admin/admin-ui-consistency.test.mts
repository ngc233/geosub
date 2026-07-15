import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const adminDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(adminDir, "../..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

test("shared admin primitives use current compact radius tokens", () => {
  const files = [
    "components/admin/AdminButton.tsx",
    "components/admin/AdminCard.tsx",
    "components/admin/AdminInput.tsx",
    "components/admin/AdminSelect.tsx",
    "components/admin/AdminTable.tsx",
    "components/admin/AdminAlert.tsx",
    "components/admin/AdminCheckbox.tsx",
    "components/admin/AdminPipelineSteps.tsx",
    "app/admin/discovery/DiscoveryIntakeForms.tsx",
  ];

  for (const fileName of files) {
    const source = readProjectFile(fileName);
    assert.doesNotMatch(source, /rounded-3xl/, `${fileName} should not use oversized rounded-3xl`);
    assert.doesNotMatch(source, /rounded-\[28px\]/, `${fileName} should not use legacy custom radius`);
  }

  assert.match(readProjectFile("components/admin/AdminButton.tsx"), /rounded-lg/);
  assert.match(readProjectFile("components/admin/AdminInput.tsx"), /rounded-lg/);
  assert.match(readProjectFile("components/admin/AdminSelect.tsx"), /rounded-lg/);
  assert.match(readProjectFile("components/admin/AdminCard.tsx"), /rounded-xl/);
  assert.match(readProjectFile("components/admin/AdminTable.tsx"), /rounded-xl/);
});
