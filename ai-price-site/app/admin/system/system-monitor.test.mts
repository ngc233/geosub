import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDir, "../../..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

function readRepoFile(fileName: string) {
  return readFileSync(resolve(projectRoot, "..", fileName), "utf8");
}

test("system monitor exposes every scheduled production task", () => {
  const monitor = readProjectFile("lib/system-task-monitor.ts");
  const page = readProjectFile("app/admin/system/page.tsx");
  const autoRefresh = readProjectFile(
    "app/admin/system/SystemHealthAutoRefresh.tsx",
  );

  for (const taskKey of [
    "exchange_rate_sync",
    "collector_runner",
    "price_pipeline",
    "discovery_scan",
    "analytics_aggregation",
    "database_backup",
    "event_retention",
  ]) {
    assert.match(monitor, new RegExp(`key: "${taskKey}"`));
  }

  assert.match(page, /自动任务监控中心/);
  assert.match(page, /health\.automationTasks\.map/);
  assert.match(page, /SystemHealthAutoRefresh/);
  assert.match(autoRefresh, /REFRESH_INTERVAL_MS = 60_000/);
  assert.match(autoRefresh, /router\.refresh/);
});

test("Linux scheduled services record start and completion heartbeats", () => {
  const wrapper = readRepoFile(
    "geosub-backend/deploy/linux-arm64/run-system-task.sh",
  );
  const migration = readRepoFile(
    "geosub-backend/sql/063_system_task_runs.sql",
  );
  const migrationRunner = readRepoFile(
    "geosub-backend/deploy/linux-arm64/db-apply-sql.sh",
  );
  const postDeploy = readRepoFile(
    "geosub-backend/deploy/linux-arm64/post-deploy-check.sh",
  );

  assert.match(wrapper, /INSERT INTO system_task_runs/);
  assert.match(wrapper, /status = 'succeeded'/);
  assert.match(wrapper, /status = 'failed'/);
  assert.match(wrapper, /"\$@"/);
  assert.match(wrapper, /exit "\$EXIT_CODE"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS system_task_runs/);
  assert.match(migrationRunner, /sql\/063_system_task_runs\.sql/);
  assert.match(postDeploy, /sql\/063_system_task_runs\.sql/);
  assert.match(postDeploy, /system_task_runs_running_started_idx/);

  const services: Array<[string, string]> = [
    ["geosub-exchange-rate-sync.service", "exchange_rate_sync"],
    ["geosub-collector-jobs.service", "collector_runner"],
    ["geosub-price-pipeline.service", "price_pipeline"],
    ["geosub-discovery-scan.service", "discovery_scan"],
    ["geosub-analytics-aggregation.service", "analytics_aggregation"],
    ["geosub-db-backup.service", "database_backup"],
    ["geosub-event-retention.service", "event_retention"],
  ];

  for (const [serviceName, taskKey] of services) {
    const service = readRepoFile(
      `geosub-backend/deploy/linux-arm64/systemd/${serviceName}`,
    );
    assert.match(service, /run-system-task\.sh/);
    assert.match(service, new RegExp(taskKey));
  }
});

test("Windows collector task records the same operational heartbeat", () => {
  const wrapper = readRepoFile("geosub-backend/scripts/run-collector-jobs-task.ps1");
  const installer = readRepoFile("geosub-backend/scripts/install-collector-jobs-task.ps1");

  assert.match(wrapper, /INSERT INTO system_task_runs/);
  assert.match(wrapper, /'collector_runner'/);
  assert.match(wrapper, /'windows_task'/);
  assert.match(wrapper, /status = '\$status'/);
  assert.match(wrapper, /Console\]::OutputEncoding = \$utf8Encoding/);
  assert.match(installer, /run-collector-jobs-task\.ps1/);
  assert.match(installer, /IntervalMinutes = 30/);
  assert.match(installer, /MultipleInstances IgnoreNew/);
  assert.match(installer, /WindowStyle Hidden/);
});

test("task monitor reports real operational backlog instead of static status", () => {
  const monitor = readProjectFile("lib/system-task-monitor.ts");

  assert.match(monitor, /due_collector_jobs/);
  assert.match(monitor, /failed_collector_runs_24h/);
  assert.match(monitor, /stale_published_prices/);
  assert.match(monitor, /pending_anomalies/);
  assert.match(monitor, /fresh_rates/);
  assert.match(monitor, /MAX\(finished_at\)[\s\S]*status = 'succeeded'/);
  assert.match(monitor, /运行超时/);
  assert.match(monitor, /长时间未成功/);
});
