"use client";
import { adminControlClassName } from "@/components/admin/admin-control";

import { AdminActionForm, useAdminActionState } from "@/components/admin/AdminPermissions";
import { useState } from "react";
import { PackagePlus, Radar } from "lucide-react";
import { AdminButton } from "../../../components/admin/AdminButton";
import {
  createDiscoverySource,
  createManualCandidate,
  type DiscoveryActionState,
} from "./actions";

type IntakeMode = "candidate" | "source";

const initialState: DiscoveryActionState = {
  ok: false,
  message: "",
};

const inputClassName = `${adminControlClassName} h-11 w-full`;

const labelClassName = "text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted";

function ModeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-[92px] items-start gap-3 rounded-lg border p-4 text-left transition",
        active
          ? "border-blue-200 bg-blue-50 text-blue-950 ring-1 ring-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-800"
          : [
            "border-admin-border bg-admin-surface text-admin-text-body hover:border-admin-border-strong",
            "hover:bg-admin-surface-subtle dark:border-admin-border-strong dark:bg-admin-surface",
            "dark:text-admin-text-body dark:hover:border-admin-border-strong dark:hover:bg-admin-surface"
          ].join(" "),
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-blue-700 text-white" : "bg-admin-chip text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted",
        ].join(" ")}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
          {description}
        </span>
      </span>
    </button>
  );
}

function ProductCandidateForm({
  initialName = "",
  initialReason = "",
  searchOpportunityQuery = "",
}: {
  initialName?: string;
  initialReason?: string;
  searchOpportunityQuery?: string;
}) {
  const [, formAction, pending] = useAdminActionState(
    createManualCandidate,
    initialState
  );

  return (
    <AdminActionForm action={formAction} className="grid gap-4 md:grid-cols-2">
      {searchOpportunityQuery ? (
        <input
          type="hidden"
          name="searchOpportunityQuery"
          value={searchOpportunityQuery}
        />
      ) : null}


      <label className="block">
        <span className={labelClassName}>产品名</span>
        <input
          name="name"
          required
          defaultValue={initialName}
          className={inputClassName}
          placeholder="DeepSeek"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>Slug</span>
        <input
          name="suggestedSlug"
          className={inputClassName}
          placeholder="deepseek"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>分类</span>
        <select
          name="suggestedCategory"
          defaultValue="ai"
          className={inputClassName}
        >
          <option value="ai">AI 订阅</option>
          <option value="software">软件订阅</option>
          <option value="streaming">流媒体</option>
          <option value="game">游戏</option>
          <option value="gift_card">礼品卡</option>
          <option value="vpn">网络工具</option>
          <option value="payment">支付服务</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>服务商</span>
        <input
          name="provider"
          className={inputClassName}
          placeholder="OpenAI / DeepSeek"
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>官网</span>
        <input
          name="officialUrl"
          type="url"
          className={inputClassName}
          placeholder="https://example.com"
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>定价页</span>
        <input
          name="pricingUrl"
          type="url"
          className={inputClassName}
          placeholder="https://example.com/pricing"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>线索来源</span>
        <select
          name="sourceType"
          defaultValue="manual_tip"
          className={inputClassName}
        >
          <option value="manual_tip">人工线索</option>
          <option value="official_site">官网</option>
          <option value="search">搜索</option>
          <option value="competitor">竞品站</option>
          <option value="rss">RSS</option>
          <option value="social">社媒</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>置信度</span>
        <input
          name="confidenceScore"
          type="number"
          min="0"
          max="100"
          defaultValue="65"
          className={inputClassName}
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>发现原因</span>
        <textarea
          name="discoveryReason"
          rows={3}
          defaultValue={initialReason}
          className={inputClassName}
          placeholder="为什么值得进入候选池？"
        />
      </label>

      <div className="md:col-span-2">
        <AdminButton type="submit" disabled={pending}>
          {pending ? "正在添加..." : "添加到候选池"}
        </AdminButton>
      </div>
    </AdminActionForm>
  );
}

function DiscoverySourceForm() {
  const [, formAction, pending] = useAdminActionState(
    createDiscoverySource,
    initialState
  );

  return (
    <AdminActionForm action={formAction} className="grid gap-4 md:grid-cols-2">


      <label className="block">
        <span className={labelClassName}>来源名称</span>
        <input
          name="name"
          required
          className={inputClassName}
          placeholder="OpenAI Blog"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>来源类型</span>
        <select
          name="sourceType"
          defaultValue="official_site"
          className={inputClassName}
        >
          <option value="official_site">官网</option>
          <option value="rss">RSS</option>
          <option value="search">搜索</option>
          <option value="competitor">竞品站</option>
          <option value="app_store">App Store</option>
          <option value="google_play">Google Play</option>
          <option value="social">社媒</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>URL</span>
        <input
          name="url"
          type="url"
          required
          className={inputClassName}
          placeholder="https://example.com/blog"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>分类提示</span>
        <select name="categoryHint" defaultValue="ai" className={inputClassName}>
          <option value="ai">AI 订阅</option>
          <option value="software">软件订阅</option>
          <option value="streaming">流媒体</option>
          <option value="game">游戏</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>检查间隔</span>
        <input
          name="scanIntervalHours"
          type="number"
          min="1"
          max="720"
          defaultValue="24"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className={labelClassName}>关键词</span>
        <input
          name="query"
          className={inputClassName}
          placeholder="pricing / new model"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>可靠度</span>
        <input
          name="reliabilityScore"
          type="number"
          min="0"
          max="100"
          defaultValue="60"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className={labelClassName}>判断策略</span>
        <select name="strategy" defaultValue="auto" className={inputClassName}>
          <option value="auto">自动判断</option>
          <option value="pricing_page">价格页</option>
          <option value="announcement_feed">官方动态</option>
          <option value="marketplace">应用市场</option>
          <option value="competitor_page">竞品页</option>
          <option value="search_result">搜索结果</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>入池门槛</span>
        <input
          name="promoteThreshold"
          type="number"
          min="0"
          max="100"
          defaultValue="60"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className={labelClassName}>观察门槛</span>
        <input
          name="watchThreshold"
          type="number"
          min="0"
          max="100"
          defaultValue="40"
          className={inputClassName}
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>备注</span>
        <textarea
          name="note"
          rows={3}
          className={inputClassName}
          placeholder="这个来源适合监控什么？"
        />
      </label>

      <div className="md:col-span-2">
        <AdminButton type="submit" disabled={pending}>
          {pending ? "正在保存..." : "保存来源配置"}
        </AdminButton>
      </div>
    </AdminActionForm>
  );
}

export default function DiscoveryIntakeForms({
  initialCandidateName = "",
  initialCandidateReason = "",
  searchOpportunityQuery = "",
}: {
  initialCandidateName?: string;
  initialCandidateReason?: string;
  searchOpportunityQuery?: string;
}) {
  const [mode, setMode] = useState<IntakeMode>("candidate");

  return (
    <section className="mb-6 rounded-admin-card border border-admin-border bg-admin-surface p-6 shadow-sm shadow-admin-shadow/60 dark:border-admin-border-strong dark:bg-admin-surface">
      <div className="mb-5">
        <p className="text-sm font-semibold tracking-tight text-blue-700 dark:text-blue-300">
          线索入口
        </p>
        <h2 className="mt-2 text-base font-semibold tracking-tight text-admin-text dark:text-admin-text">
          添加发现线索
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
          已经明确是某个产品时，先放进候选池；点击加入后会创建产品、匹配 App Store，并进入这个产品的采集工作台。如果只是一个值得长期监控的网站、频道或应用市场入口，就保存为发现来源，后续由扫描器定期检查。
        </p>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <ModeButton
          active={mode === "candidate"}
          icon={<PackagePlus size={18} strokeWidth={2} />}
          title="具体产品线索"
          description="你已经知道某个产品、模型、套餐或定价页，下一步会进入产品级采集。"
          onClick={() => setMode("candidate")}
        />
        <ModeButton
          active={mode === "source"}
          icon={<Radar size={18} strokeWidth={2} />}
          title="长期发现来源"
          description="配置一个后续自动扫描的来源，例如官网、博客、应用市场或竞品页。"
          onClick={() => setMode("source")}
        />
      </div>

      {mode === "candidate" ? (
        <ProductCandidateForm
          initialName={initialCandidateName}
          initialReason={initialCandidateReason}
          searchOpportunityQuery={searchOpportunityQuery}
        />
      ) : (
        <DiscoverySourceForm />
      )}
    </section>
  );
}
