import {
  ArrowLeftRight,
  Coins,
  FileCheck2,
  FileText,
  Gamepad2,
  Globe,
  Scale,
  ShieldCheck,
  Sparkles,
  Tv,
} from "lucide-react";
import type { GuideIconKey } from "../lib/guide-presentation";

export default function GuideIcon({
  icon = "article",
  size = 18,
}: {
  icon?: GuideIconKey;
  size?: number;
}) {
  switch (icon) {
    case "price":
      return <Coins size={size} aria-hidden="true" />;
    case "payment":
      return <ShieldCheck size={size} aria-hidden="true" />;
    case "review":
      return <Scale size={size} aria-hidden="true" />;
    case "methodology":
      return <FileCheck2 size={size} aria-hidden="true" />;
    case "ai":
      return <Sparkles size={size} aria-hidden="true" />;
    case "streaming":
      return <Tv size={size} aria-hidden="true" />;
    case "game":
      return <Gamepad2 size={size} aria-hidden="true" />;
    case "country":
      return <Globe size={size} aria-hidden="true" />;
    case "converter":
      return <ArrowLeftRight size={size} aria-hidden="true" />;
    default:
      return <FileText size={size} aria-hidden="true" />;
  }
}
