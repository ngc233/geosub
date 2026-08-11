#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const rootDir = process.cwd();

for (const fileName of [".env.local", ".env"]) {
  const filePath = path.join(rootDir, fileName);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false, quiet: true });
  }
}

const databaseUrl = process.env.DATABASE_URL;
const outputJson = process.argv.includes("--json");

if (!databaseUrl) {
  console.error("DATABASE_URL is missing. Database indexes were not inspected.");
  process.exit(1);
}

const indexInventorySql = `
  SELECT
    namespace.nspname AS schema_name,
    table_class.relname AS table_name,
    index_class.relname AS index_name,
    index_state.indisunique AS is_unique,
    index_state.indisprimary AS is_primary,
    index_state.indisvalid AS is_valid,
    index_state.indisready AS is_ready,
    index_state.indnkeyatts AS key_count,
    access_method.amname AS access_method,
    pg_get_indexdef(index_state.indexrelid) AS definition,
    md5(concat_ws('|',
      index_state.indrelid::text,
      index_state.indisunique::text,
      index_state.indisprimary::text,
      index_state.indnkeyatts::text,
      index_state.indkey::text,
      index_state.indcollation::text,
      index_state.indclass::text,
      index_state.indoption::text,
      coalesce(pg_get_expr(index_state.indexprs, index_state.indrelid), ''),
      coalesce(pg_get_expr(index_state.indpred, index_state.indrelid), '')
    )) AS structure_signature
  FROM pg_index AS index_state
  JOIN pg_class AS index_class
    ON index_class.oid = index_state.indexrelid
  JOIN pg_class AS table_class
    ON table_class.oid = index_state.indrelid
  JOIN pg_namespace AS namespace
    ON namespace.oid = table_class.relnamespace
  JOIN pg_am AS access_method
    ON access_method.oid = index_class.relam
  WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast'
    AND table_class.relkind IN ('r', 'p')
    AND index_class.relkind IN ('i', 'I')
  ORDER BY namespace.nspname, table_class.relname, index_class.relname
`;

function findDuplicateGroups(indexes) {
  const groups = new Map();

  for (const index of indexes) {
    const members = groups.get(index.structure_signature) || [];
    members.push(index);
    groups.set(index.structure_signature, members);
  }

  return [...groups.values()]
    .filter((members) => members.length > 1)
    .sort((left, right) => {
      const leftName = `${left[0].schema_name}.${left[0].table_name}`;
      const rightName = `${right[0].schema_name}.${right[0].table_name}`;
      return leftName.localeCompare(rightName);
    });
}

function printHumanReport(indexes, duplicateGroups) {
  const redundantIndexes = duplicateGroups.reduce(
    (total, members) => total + members.length - 1,
    0,
  );

  console.log("GeoSub database index audit (read-only)");
  console.log(`Indexes inspected: ${indexes.length}`);
  console.log(`Exact duplicate groups: ${duplicateGroups.length}`);
  console.log(`Potentially redundant indexes: ${redundantIndexes}`);

  if (duplicateGroups.length === 0) {
    console.log("No exact duplicate index structures were found.");
    return;
  }

  console.log("");
  console.log("Review these groups before creating a cleanup migration:");

  duplicateGroups.forEach((members, groupIndex) => {
    const first = members[0];
    console.log("");
    console.log(
      `${groupIndex + 1}. ${first.schema_name}.${first.table_name} (${first.access_method})`,
    );
    for (const member of members) {
      console.log(`   - ${member.index_name}`);
    }
    console.log(`   ${first.definition}`);
  });

  console.log("");
  console.log("No indexes were changed or removed.");
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
    application_name: "geosub-index-audit",
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();
    const result = await client.query(indexInventorySql);
    const duplicateGroups = findDuplicateGroups(result.rows);

    if (outputJson) {
      console.log(
        JSON.stringify(
          {
            inspectedIndexCount: result.rows.length,
            duplicateGroupCount: duplicateGroups.length,
            redundantIndexCount: duplicateGroups.reduce(
              (total, members) => total + members.length - 1,
              0,
            ),
            duplicateGroups,
          },
          null,
          2,
        ),
      );
      return;
    }

    printHumanReport(result.rows, duplicateGroups);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`Database index audit failed: ${error.message}`);
  process.exitCode = 1;
});
