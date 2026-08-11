#!/usr/bin/env node

const fs = require("fs");

const LOG_MARKER = "[admin-performance]";

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return 0;
  const rank = Math.max(
    0,
    Math.ceil((percentileValue / 100) * sortedValues.length) - 1,
  );
  return sortedValues[Math.min(rank, sortedValues.length - 1)];
}

function parsePerformanceRecords(input) {
  const records = [];

  for (const line of String(input).split(/\r?\n/)) {
    const markerIndex = line.indexOf(LOG_MARKER);
    if (markerIndex < 0) continue;

    try {
      const record = JSON.parse(
        line.slice(markerIndex + LOG_MARKER.length).trim(),
      );
      const durationMs = Number(record.durationMs);

      if (
        typeof record.operation !== "string" ||
        record.operation.trim().length === 0 ||
        !Number.isFinite(durationMs) ||
        durationMs < 0 ||
        !["ok", "error"].includes(record.status)
      ) {
        continue;
      }

      records.push({
        operation: record.operation.trim(),
        durationMs: Math.round(durationMs),
        status: record.status,
      });
    } catch {
      // Ignore unrelated or truncated journal lines.
    }
  }

  return records;
}

function summarizePerformanceRecords(records, slowThresholdMs = 750) {
  const groups = new Map();

  for (const record of records) {
    const current = groups.get(record.operation) || [];
    current.push(record);
    groups.set(record.operation, current);
  }

  return [...groups.entries()]
    .map(([operation, operationRecords]) => {
      const durations = operationRecords
        .map((record) => record.durationMs)
        .sort((left, right) => left - right);
      const totalDurationMs = durations.reduce((total, value) => total + value, 0);
      const errorCount = operationRecords.filter(
        (record) => record.status === "error",
      ).length;

      return {
        operation,
        count: durations.length,
        errorCount,
        slowCount: durations.filter((value) => value >= slowThresholdMs).length,
        minMs: durations[0] || 0,
        averageMs: Math.round(totalDurationMs / Math.max(durations.length, 1)),
        p50Ms: percentile(durations, 50),
        p95Ms: percentile(durations, 95),
        maxMs: durations[durations.length - 1] || 0,
      };
    })
    .sort(
      (left, right) =>
        right.p95Ms - left.p95Ms ||
        right.maxMs - left.maxMs ||
        left.operation.localeCompare(right.operation),
    );
}

function parseArguments(argv) {
  const options = { file: null, json: false, slowThresholdMs: 750 };

  for (const argument of argv) {
    if (argument === "--json") {
      options.json = true;
    } else if (argument.startsWith("--file=")) {
      options.file = argument.slice("--file=".length);
    } else if (argument.startsWith("--slow-ms=")) {
      const value = Number(argument.slice("--slow-ms=".length));
      if (!Number.isFinite(value) || value < 1 || value > 60_000) {
        throw new Error("--slow-ms must be between 1 and 60000.");
      }
      options.slowThresholdMs = Math.round(value);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function printHumanReport(records, summaries, slowThresholdMs) {
  const totalErrors = records.filter((record) => record.status === "error").length;

  console.log("GeoSub admin performance summary");
  console.log(`Samples: ${records.length}`);
  console.log(`Operations: ${summaries.length}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Slow threshold: ${slowThresholdMs} ms`);
  console.log("");
  console.log(
    ["operation", "count", "errors", "slow", "avg", "p50", "p95", "max"].join(
      "\t",
    ),
  );

  for (const summary of summaries) {
    console.log(
      [
        summary.operation,
        summary.count,
        summary.errorCount,
        summary.slowCount,
        summary.averageMs,
        summary.p50Ms,
        summary.p95Ms,
        summary.maxMs,
      ].join("\t"),
    );
  }

  console.log("");
  console.log("Durations are milliseconds. Results are ordered by p95 latency.");
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const input = options.file
    ? fs.readFileSync(options.file, "utf8")
    : fs.readFileSync(0, "utf8");
  const records = parsePerformanceRecords(input);
  const summaries = summarizePerformanceRecords(
    records,
    options.slowThresholdMs,
  );

  if (records.length === 0) {
    console.error(
      "No admin performance samples found. Enable GEOSUB_ADMIN_PERFORMANCE_LOG=true for a bounded sampling window, or lower GEOSUB_ADMIN_SLOW_WORKLOAD_MS.",
    );
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          sampleCount: records.length,
          errorCount: records.filter((record) => record.status === "error").length,
          slowThresholdMs: options.slowThresholdMs,
          operations: summaries,
        },
        null,
        2,
      ),
    );
    return;
  }

  printHumanReport(records, summaries, options.slowThresholdMs);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Admin performance summary failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArguments,
  parsePerformanceRecords,
  summarizePerformanceRecords,
};
