import { readFileSync } from "node:fs";
import { join } from "node:path";

// The five registered pilot regions use the exact checked-in SVG bytes.
// These tiny decorations need no separate request competing with initial CSS.
const inlineFlags = new Map(["ph", "in", "jp", "kr", "th"].map(code => [
  code,
  `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/flags", `${code}.svg`)).toString("base64")}`,
]));

/** Server-rendered counterpart for known local flag assets. Reuses the same
 * decorative markup, dimensions and shared class as HomepageCountryFlag.
 * Fixed server labels need no deferred visibility or client error state; this
 * avoids shipping Next Image/hydration code for a single static flag. Callers
 * must use checked local assets (the registered pilot set is covered by tests). */
export default function StaticCountryFlag({ code }: { code: string }) {
  if (!/^[a-z]{2}$/i.test(code)) return null;
  const normalized = code.toLowerCase();
  return <span className="gs-home-flag" aria-hidden="true">
    {/* Local SVG, explicit dimensions, no optimizer or client hydration needed. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={inlineFlags.get(normalized) ?? `/flags/${normalized}.svg`} width={28} height={20} alt="" aria-hidden="true" loading="lazy" decoding="async" />
  </span>;
}
