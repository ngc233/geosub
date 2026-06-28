"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

type MobileShareButtonProps = {
  title: string;
  text?: string;
};

export default function MobileShareButton({
  title,
  text,
}: MobileShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch {
      // 用户取消分享时不做提示。
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm shadow-zinc-950/[0.06] backdrop-blur transition-all duration-200 ease-out hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-lime-200"
      aria-label="分享当前页面"
      title="分享"
    >
      {copied ? (
        <Check size={16} strokeWidth={2.4} />
      ) : (
        <Share2 size={16} strokeWidth={2.4} />
      )}
    </button>
  );
}