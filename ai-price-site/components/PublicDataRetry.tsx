"use client";
import {useRouter} from "next/navigation";
import {PublicButton} from "./ui/PublicControls";
import CodexResetError from "./CodexResetError";
import type {ResetLocale} from "../lib/codex-reset";
export default function PublicDataRetry({locale}:{locale?:ResetLocale}) {
  const router=useRouter();
  return locale?<CodexResetError locale={locale} retry={()=>router.refresh()}/>:<PublicButton variant="secondary" onClick={()=>router.refresh()}>重新读取价格</PublicButton>;
}
