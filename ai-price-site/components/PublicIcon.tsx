import { Search, Globe, Banknote, Share2, ExternalLink, ChevronDown, ArrowRight,
  ChevronRight, ArrowUp, ArrowDown, TrendingUp, TrendingDown, BookOpen, Check, Menu, X } from "lucide-react";

const icons = { Search, Globe, Banknote, Share2, ExternalLink, ChevronDown, ArrowRight,
  ChevronRight, ArrowUp, ArrowDown, TrendingUp, TrendingDown, BookOpen, Check, Menu, X };

export type PublicIconName = keyof typeof icons;
export default function PublicIcon({ name, size = 20, label, className }: {
  name: PublicIconName; size?: 16 | 20 | 24; label?: string; className?: string;
}) {
  const Glyph = icons[name];
  return <Glyph size={size} strokeWidth={1.75} color="currentColor" className={className}
    aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} focusable="false" />;
}
