"use client";

import { useTransition } from "react";
import PublicPageState from "../../components/PublicPageState";
import { PublicButton } from "../../components/ui/PublicControls";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return <PublicPageState state="error" title="页面暂时无法显示"
    description="页面加载遇到了问题。请重新读取，或返回首页继续浏览。">
    <PublicButton disabled={pending} onClick={() => startTransition(retry)}>
      {pending ? "正在重新读取" : "重新读取"}
    </PublicButton>
  </PublicPageState>;
}
