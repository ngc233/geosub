"use client";

import { CheckSquare2, Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { adminButtonClassName } from "../../../components/admin/AdminButton";
import { MAX_BATCH_COLLECTION_PRODUCTS } from "./batch-collection";

type ProductOption = {
  slug: string;
  name: string;
  needsUpdate: boolean;
};

export default function BatchCollectionPanel({ products }: { products: ProductOption[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectable = useMemo(() => products.slice(0, 80), [products]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const recommended = selectable.filter((product) => product.needsUpdate);

  function toggleProduct(slug: string) {
    setErrorMessage(null);
    setSelected((current) => {
      if (current.includes(slug)) {
        return current.filter((item) => item !== slug);
      }

      if (current.length >= MAX_BATCH_COLLECTION_PRODUCTS) {
        setErrorMessage(`每批最多选择 ${MAX_BATCH_COLLECTION_PRODUCTS} 个产品。`);
        return current;
      }

      return [...current, slug];
    });
  }

  function selectRecommended() {
    setErrorMessage(null);
    setSelected(
      recommended
        .slice(0, MAX_BATCH_COLLECTION_PRODUCTS)
        .map((product) => product.slug),
    );
  }

  return (
    <details className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <CheckSquare2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="text-sm font-black text-slate-950">批量更新产品</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              当前筛选中有 {selectable.length} 个可采集产品；每批最多 {MAX_BATCH_COLLECTION_PRODUCTS} 个。
            </div>
          </div>
        </div>
        <span className="shrink-0 text-xs font-bold text-blue-700">展开选择</span>
      </summary>

      <form
        action="/admin/pipeline/collect"
        method="post"
        className="border-t border-slate-200 px-5 py-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting || selected.length === 0) return;

          setSubmitting(true);
          setErrorMessage(null);

          try {
            const formData = new FormData();
            selected.forEach((slug) => formData.append("productSlugs", slug));
            const response = await fetch("/admin/pipeline/collect", {
              method: "POST",
              body: formData,
              headers: { Accept: "application/json" },
              credentials: "same-origin",
            });
            const payload = (await response.json().catch(() => null)) as {
              redirectPath?: string;
              message?: string;
            } | null;

            if (!response.ok) {
              throw new Error(payload?.message || "批量采集请求失败，请稍后重试。");
            }

            window.location.assign(payload?.redirectPath || "/admin/pipeline");
          } catch (error) {
            setSubmitting(false);
            setErrorMessage(error instanceof Error ? error.message : "批量采集请求失败，请稍后重试。");
          }
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-3xl text-xs leading-5 text-slate-500">
            系统只立即启动一个采集器，其余产品进入后台队列；所有新价格仍需通过自动审核，不会直接发布。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectRecommended}
              disabled={recommended.length === 0 || submitting}
              className={adminButtonClassName({ variant: "secondary", size: "sm" })}
            >
              选择建议更新
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              disabled={selected.length === 0 || submitting}
              className={adminButtonClassName({ variant: "ghost", size: "sm" })}
            >
              清空
            </button>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {selectable.map((product) => {
              const checked = selectedSet.has(product.slug);
              return (
                <label
                  key={product.slug}
                  className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-sm transition hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    name="productSlugs"
                    value={product.slug}
                    checked={checked}
                    onChange={() => toggleProduct(product.slug)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  />
                  <span className="min-w-0 flex-1 truncate font-bold text-slate-800">{product.name}</span>
                  {product.needsUpdate ? (
                    <span className="shrink-0 text-[11px] font-bold text-amber-700">建议更新</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-500">已选择 {selected.length} 个产品</div>
          <button
            type="submit"
            disabled={selected.length === 0 || submitting}
            className={adminButtonClassName({ variant: "primary", size: "md" })}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {submitting ? "正在加入队列" : "加入采集队列"}
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </details>
  );
}
