"use client";
import CodexResetError from "../../../components/CodexResetError";
import { useRouter } from "next/navigation";

export default function PreviewError() {
  const router=useRouter();
  return <CodexResetError locale="zh" retry={()=>router.push("/style-preview/codex-reset")}/>;
}
