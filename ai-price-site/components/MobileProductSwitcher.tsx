"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import BrandIcon from "./BrandIcon";
import { getProductNavigationCopy } from "../lib/product-navigation-copy";
import type { SiteLocale } from "../lib/site-locale";
import {
  getProductHref,
  type ProductNavCategory,
  type ProductNavItem,
} from "./ProductSidebar";

type MobileProductSwitcherProps = {
  products: ProductNavItem[];
  currentSlug: string;
  basePath?: string;
  locale?: SiteLocale;
};

function categoryLabel(
  category: ProductNavCategory,
  copy: ReturnType<typeof getProductNavigationCopy>,
) {
  if (category === "ai") return copy.ai;
  if (category === "streaming") return copy.streaming;
  return copy.other;
}

export default function MobileProductSwitcher({
  products,
  currentSlug,
  basePath,
  locale = "zh",
}: MobileProductSwitcherProps) {
  const copy = getProductNavigationCopy(locale);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const currentProduct =
    products.find((product) => product.slug === currentSlug) || products[0];

  useEffect(() => {
    function handleOutside(event: Event) {
      const target = event.target;

      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("focusin", handleOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("focusin", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  if (!currentProduct) {
    return null;
  }

  const groupedProducts = products.reduce<Record<string, ProductNavItem[]>>(
    (groups, product) => {
      const key = product.category;
      groups[key] = groups[key] || [];
      groups[key].push(product);
      return groups;
    },
    {},
  );

  return (
    <div ref={containerRef} className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white/90 px-4 py-3 text-left shadow-sm shadow-zinc-950/[0.04] backdrop-blur transition-all duration-200 ease-out active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/15"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex min-w-0 items-center gap-3">
          <BrandIcon product={currentProduct} size="sm" />

          <span className="min-w-0">
            <span className="block text-xs font-black text-zinc-400">
              {copy.currentProduct}
            </span>
            <span className="block truncate text-sm font-black text-zinc-950">
              {currentProduct.name}
            </span>
          </span>
        </span>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
          {open ? (
            <ChevronUp size={16} strokeWidth={2.4} />
          ) : (
            <ChevronDown size={16} strokeWidth={2.4} />
          )}
        </span>
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-950/[0.04]" role="menu">
            {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <div key={category} className="py-2">
                <div className="px-3 pb-2 text-xs font-black text-zinc-400">
                  {categoryLabel(category as ProductNavCategory, copy)}
                </div>

                <div className="grid gap-1.5">
                  {categoryProducts.map((product) => {
                    const active = product.slug === currentSlug;

                    return (
                      <Link
                        key={product.slug}
                        href={getProductHref(product, basePath)}
                        data-track-event="click_digital_service_sidebar"
                        data-track-name="Switch digital service"
                        data-track-button={product.slug}
                        data-track-placement="product_sidebar_mobile"
                        onClick={() => setOpen(false)}
                        role="menuitem"
                        className={[
                          "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-black transition",
                          active
                            ? "bg-lime-50 text-zinc-950 ring-1 ring-lime-200"
                            : "text-zinc-700 hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        <BrandIcon product={product} size="sm" />
                        <span className="truncate">{product.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
