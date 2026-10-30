/** Presentation decisions only. Collection, review and publication gates remain server-owned. */
export type ProductNextActionInput = {
  id: string; slug: string; appStoreJobs: number; webJobs: number;
  runStatus: string | null; pending: number; blocked: number;
  prices: number; stale: number; due: number;
};
export type ProductNextAction = { kind: "collect" | "progress" | "setup" | "diagnose" | "review" | "source" | "prices"; label: string; href: string; detail: string };
const count = (value: number) => Number.isFinite(value) ? Math.max(0,value) : 0;
export function productWorkflowHref(path: "/admin/pipeline" | "/admin/review" | "/admin/prices" | "/admin/collector-jobs", slug: string, hash = "") {
  return `${path}${slug ? `?product=${encodeURIComponent(slug)}` : ""}${hash ? `#${hash}` : ""}`;
}
export function productNextAction(input: ProductNextActionInput): ProductNextAction {
  const app=count(input.appStoreJobs),web=count(input.webJobs),pending=count(input.pending),prices=count(input.prices);
  const href=(path:Parameters<typeof productWorkflowHref>[0],hash="")=>productWorkflowHref(path,input.slug,hash);
  if(input.runStatus === "running")return {kind:"progress",label:"查看运行进度",href:href("/admin/review","collection-runs"),detail:"本次任务仍在运行，无需重复提交。"};
  if(app+web===0)return {kind:"setup",label:"配置价格来源",href:`/admin/products/${encodeURIComponent(input.id)}/edit`,detail:"先配置受支持的来源，再开始采集。"};
  if(input.runStatus === "failed")return {kind:"diagnose",label:"查看失败原因",href:href("/admin/collector-jobs","collector-runs"),detail:"先核对失败记录，修正后再重试。"};
  if(pending>0 || count(input.blocked)>0){
    if(app===0)return {kind:"source",label:"查看官网验证",href:href("/admin/collector-jobs"),detail:"官网记录按来源专属规则验证；查看来源的运行和验证结果。"};
    return {kind:"review",label:"处理待审异常",href:href("/admin/review","review-pending"),detail:"先查看拦截原因与证据；通过验证的数据会写入正式价格。"};
  }
  if(prices===0 || count(input.stale)>0 || count(input.due)>0){
    if(app>0)return {kind:"collect",label:prices===0?"开始采集":"更新价格",href:href("/admin/pipeline","pipeline-products"),detail:"采集后自动验证；稳定结果入库，异常留在审核列表。"};
    return {kind:"source",label:"查看官网任务",href:href("/admin/collector-jobs"),detail:"官网任务按既有计划运行，在来源记录中查看进度。"};
  }
  return {kind:"prices",label:"查看正式价格",href:href("/admin/prices"),detail:"已有正式价格记录；产品资料和内容的发布状态单独管理。"};
}
