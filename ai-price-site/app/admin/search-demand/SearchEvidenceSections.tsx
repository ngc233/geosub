import AdminLink from "@/components/admin/AdminLink";
import { ArrowUpRight, SearchCheck } from "lucide-react";
import { AdminBadge } from "../../../components/admin/AdminBadge";
import { AdminButton } from "../../../components/admin/AdminButton";
import { AdminCard } from "../../../components/admin/AdminCard";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
} from "../../../components/admin/AdminTable";
import { normalizeSearchOpportunityQuery } from "../../../lib/admin-search-opportunities";
import {
  approveSearchAliasAction,
  updateSearchAliasAction,
} from "./actions";
import {
  formatDate,
  resultKindLabel,
  termStatus,
} from "./presenters";
import type { SearchDemandPageData } from "./queries";

export function SearchEvidenceSections({
  summary,
  aliasRecords,
  days,
}: {
  summary: SearchDemandPageData["summary"];
  aliasRecords: SearchDemandPageData["aliasRecords"];
  days: number;
}) {
  const aliasByQueryAndLocale = new Map(
    aliasRecords.map((record) => [
      `${record.normalizedAlias}:${record.locale}`,
      record,
    ]),
  );

  return (
    <>
      {summary.totalSearches === 0 ? (
      <AdminCard className="mb-6 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="flex flex-col items-center py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
      <SearchCheck size={22} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-slate-50">
      暂时没有搜索数据
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
      前台搜索上线后，真实关键词会自动出现在这里。系统不会把搜索词公开，也不会创建可索引的搜索结果页。
      </p>
      </div>
      </AdminCard>
      ) : (
      <div className="mb-6">
      <AdminTableShell
      title="关键词需求"
      description="无结果次数高的关键词排在前面，代表最值得补充的产品或内容。"
      >
      <AdminTable className="min-w-[860px]">
      <AdminTableHead>
      <tr>
      <AdminTh>关键词</AdminTh>
      <AdminTh>状态</AdminTh>
      <AdminTh align="right">搜索</AdminTh>
      <AdminTh align="right">无结果</AdminTh>
      <AdminTh align="right">点击</AdminTh>
      <AdminTh align="right">点击率</AdminTh>
      <AdminTh>语言</AdminTh>
      <AdminTh>最近出现</AdminTh>
      </tr>
      </AdminTableHead>
      <AdminTableBody>
      {summary.terms.map((term) => {
      const status = termStatus(term);
      return (
      <AdminTr key={term.query}>
      <AdminTd>
      <span className="font-bold text-slate-950 dark:text-slate-50">
      {term.query}
      </span>
      </AdminTd>
      <AdminTd>
      <AdminBadge variant={status.variant}>
      <span className="whitespace-nowrap">{status.label}</span>
      </AdminBadge>
      </AdminTd>
      <AdminTd align="right">
      <span className="font-bold tabular-nums">
      {term.searchCount}
      </span>
      </AdminTd>
      <AdminTd align="right">
      <span
      className={
      term.noResultCount > 0
      ? "font-bold text-red-700 tabular-nums dark:text-red-300"
      : "text-slate-400 dark:text-slate-400"
      }
      >
      {term.noResultCount}
      </span>
      </AdminTd>
      <AdminTd align="right">
      <span className="font-bold tabular-nums">
      {term.clickCount}
      </span>
      </AdminTd>
      <AdminTd align="right">
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
      {term.clickRate}%
      </span>
      </AdminTd>
      <AdminTd>
      <span className="text-xs uppercase text-slate-500 dark:text-slate-400">
      {term.locales.join(", ") || "-"}
      </span>
      </AdminTd>
      <AdminTd>
      <span className="text-xs text-slate-500 dark:text-slate-400">
      {formatDate(term.lastSeenAt)} UTC
      </span>
      </AdminTd>
      </AdminTr>
      );
      })}
      </AdminTableBody>
      </AdminTable>
      </AdminTableShell>
      </div>
      )}
      
      <AdminTableShell
      title="用户叫法建议"
      description="只根据真实的“搜索后点击”整理。至少 2 次点击且来自 2 位访客时才建议启用；已确认的别名可以随时停用，不会删除历史证据。"
      >
      <AdminTable className="min-w-[980px]">
      <AdminTableHead>
      <tr>
      <AdminTh>用户搜索</AdminTh>
      <AdminTh>最终进入</AdminTh>
      <AdminTh>类型</AdminTh>
      <AdminTh align="right">点击</AdminTh>
      <AdminTh align="right">访客</AdminTh>
      <AdminTh>别名状态</AdminTh>
      <AdminTh>最近点击</AdminTh>
      <AdminTh align="right">操作</AdminTh>
      </tr>
      </AdminTableHead>
      <AdminTableBody>
      {summary.aliasSuggestions.length > 0 ? (
      summary.aliasSuggestions.map((suggestion) => {
      const existing = aliasByQueryAndLocale.get(
      `${normalizeSearchOpportunityQuery(suggestion.query)}:${suggestion.locale}`,
      );
      const sameTarget = existing
      ? existing.targetKind === suggestion.resultKind
      && (
      suggestion.resultKind === "product"
      ? existing.productId === suggestion.productId
      : existing.planId === suggestion.planId
      )
      : false;
      const ready =
      suggestion.clickCount >= 2 && suggestion.visitorCount >= 2;
      
      return (
      <AdminTr
      key={`${suggestion.locale}:${suggestion.query}:${suggestion.resultHref}`}
      >
      <AdminTd>
      <span className="font-bold text-slate-950 dark:text-slate-50">
      {suggestion.query}
      </span>
      <span className="mt-1 block text-xs uppercase text-slate-400 dark:text-slate-400">
      {suggestion.locale}
      </span>
      </AdminTd>
      <AdminTd>
      <span className="font-bold text-slate-700 dark:text-slate-300">
      {suggestion.resultTitle}
      </span>
      </AdminTd>
      <AdminTd>
      <AdminBadge>
      {resultKindLabel(suggestion.resultKind)}
      </AdminBadge>
      </AdminTd>
      <AdminTd align="right">
      <span className="font-bold tabular-nums">
      {suggestion.clickCount}
      </span>
      </AdminTd>
      <AdminTd align="right">
      <span className="font-bold tabular-nums">
      {suggestion.visitorCount}
      </span>
      </AdminTd>
      <AdminTd>
      <AdminBadge
      variant={
      existing && !sameTarget
      ? "danger"
      : existing?.status === "active"
      ? "published"
      : existing?.status === "disabled"
      ? "neutral"
      : ready
      ? "review"
      : "neutral"
      }
      >
      {existing && !sameTarget
      ? "指向冲突"
      : existing?.status === "active"
      ? "已启用"
      : existing?.status === "disabled"
      ? "已停用"
      : ready
      ? "建议启用"
      : "继续观察"}
      </AdminBadge>
      </AdminTd>
      <AdminTd>
      <span className="text-xs text-slate-500 dark:text-slate-400">
      {formatDate(suggestion.lastClickedAt)} UTC
      </span>
      </AdminTd>
      <AdminTd align="right">
      <div className="flex justify-end gap-2">
      {existing && sameTarget ? (
      <form action={updateSearchAliasAction}>
      <input type="hidden" name="id" value={existing.id} />
      <input
      type="hidden"
      name="status"
      value={
      existing.status === "active" ? "disabled" : "active"
      }
      />
      <input type="hidden" name="days" value={days} />
      <AdminButton type="submit" size="sm" variant="secondary">
      {existing.status === "active" ? "停用" : "重新启用"}
      </AdminButton>
      </form>
      ) : !existing && ready ? (
      <form action={approveSearchAliasAction}>
      <input
      type="hidden"
      name="alias"
      value={suggestion.query}
      />
      <input
      type="hidden"
      name="locale"
      value={suggestion.locale}
      />
      <input
      type="hidden"
      name="targetKind"
      value={suggestion.resultKind}
      />
      <input
      type="hidden"
      name="productId"
      value={suggestion.productId || ""}
      />
      <input
      type="hidden"
      name="planId"
      value={suggestion.planId || ""}
      />
      <input
      type="hidden"
      name="targetTitle"
      value={suggestion.resultTitle}
      />
      <input
      type="hidden"
      name="targetHref"
      value={suggestion.resultHref}
      />
      <input type="hidden" name="days" value={days} />
      <AdminButton type="submit" size="sm" variant="primary">
      启用别名
      </AdminButton>
      </form>
      ) : null}
      <AdminLink
      href={suggestion.resultHref}
      target="_blank"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 dark:focus-visible:ring-blue-400/60"
      aria-label={`查看 ${suggestion.resultTitle}`}
      title={`查看 ${suggestion.resultTitle}`}
      >
      <ArrowUpRight size={16} />
      </AdminLink>
      </div>
      </AdminTd>
      </AdminTr>
      );
      })
      ) : (
      <tr>
      <td
      colSpan={8}
      className="px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-400"
      >
      暂时没有足够的搜索点击，系统不会凭空猜测别名。
      </td>
      </tr>
      )}
      </AdminTableBody>
      </AdminTable>
      </AdminTableShell>
      
      <div className="mt-6">
      <AdminTableShell
      title="点击最多的搜索结果"
      description="用于判断搜索是否把访客带到了真正需要的产品、套餐、指南或工具。"
      >
      <AdminTable className="min-w-[760px]">
      <AdminTableHead>
      <tr>
      <AdminTh>结果</AdminTh>
      <AdminTh>类型</AdminTh>
      <AdminTh align="right">点击</AdminTh>
      <AdminTh>最近点击</AdminTh>
      <AdminTh align="right">打开</AdminTh>
      </tr>
      </AdminTableHead>
      <AdminTableBody>
      {summary.results.length > 0 ? (
      summary.results.map((result) => (
      <AdminTr key={`${result.kind}:${result.href}`}>
      <AdminTd>
      <span className="font-bold text-slate-950 dark:text-slate-50">
      {result.title}
      </span>
      </AdminTd>
      <AdminTd>
      <AdminBadge>{resultKindLabel(result.kind)}</AdminBadge>
      </AdminTd>
      <AdminTd align="right">
      <span className="font-bold tabular-nums">
      {result.clickCount}
      </span>
      </AdminTd>
      <AdminTd>
      <span className="text-xs text-slate-500 dark:text-slate-400">
      {formatDate(result.lastClickedAt)} UTC
      </span>
      </AdminTd>
      <AdminTd align="right">
      <AdminLink
      href={result.href}
      target="_blank"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 dark:focus-visible:ring-blue-400/60"
      aria-label={`打开 ${result.title}`}
      title={`打开 ${result.title}`}
      >
      <ArrowUpRight size={16} />
      </AdminLink>
      </AdminTd>
      </AdminTr>
      ))
      ) : (
      <tr>
      <td
      colSpan={5}
      className="px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-400"
      >
      暂时还没有搜索结果点击。
      </td>
      </tr>
      )}
      </AdminTableBody>
      </AdminTable>
      </AdminTableShell>
      </div>
    </>
  );
}
