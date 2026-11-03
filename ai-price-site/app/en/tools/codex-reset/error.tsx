"use client";

import CodexResetError from "../../../../components/CodexResetError";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <CodexResetError locale="en" retry={retry}/>;
}
