export type ReleaseMetadata = {
  schemaVersion: 1;
  component: "collector";
  version: string;
  commit: string;
  deployedAt: string;
  operation: "upgrade" | "rollback";
};

export function parseCollectorMetadata(value: unknown): ReleaseMetadata | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    row.schemaVersion !== 1 || row.component !== "collector"
    || typeof row.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(row.version)
    || typeof row.commit !== "string" || !/^[a-f0-9]{40}$/.test(row.commit)
    || typeof row.deployedAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T/.test(row.deployedAt)
    || !Number.isFinite(Date.parse(row.deployedAt))
    || (row.operation !== "upgrade" && row.operation !== "rollback")
  ) return null;
  return {
    schemaVersion: 1, component: "collector", version: row.version, commit: row.commit,
    deployedAt: row.deployedAt, operation: row.operation,
  };
}

export function priceVersionLabel(sequence: string, recordedAt: Date | string) {
  const date = new Date(recordedAt);
  if (!/^[1-9]\d*$/.test(sequence) || !Number.isFinite(date.getTime())) return null;
  return `D${date.toISOString().slice(0, 10).replaceAll("-", "")}.${sequence.padStart(4, "0")}`;
}

export type VersionItem = {
  key: string;
  title: string;
  version: string;
  status: string;
  detail: string;
  updatedAt?: string;
};
