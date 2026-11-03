/** Only datasource failures become a recoverable public state; programming errors still surface. */
export function isCodexResetReadUnavailable(error:unknown) {
  if(!error||typeof error!=="object")return false;
  const value=error as {code?:unknown;meta?:{code?:unknown;driverAdapterError?:{cause?:{originalCode?:unknown}}}};
  const sqlCode=value.meta?.code??value.meta?.driverAdapterError?.cause?.originalCode;
  return ["P1001","P1002","P1017","P2021","P2024","42P01","08006","08001","57P01"].includes(String(value.code))
    || value.code==="P2010"&&["42P01","08006","08001","57P01"].includes(String(sqlCode));
}
