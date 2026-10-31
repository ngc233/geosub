'use client';

import AdminProductLogo from "@/components/admin/AdminProductLogo";

import { withAdminReturnTo, adminListLocation } from "@/lib/admin-workflow-context";
import AdminPagination from '@/components/admin/AdminPagination';
import { adminButtonClassName } from '@/components/admin/AdminButton';
import { createAdminListView } from '@/lib/admin-list-params';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AdminSegmentedControl from '../../components/admin/AdminSegmentedControl';
import { ArrowRight, Activity, Clock3, ShieldCheck } from 'lucide-react';
import AdminLink from '../../components/admin/AdminLink';
import { workspaceStatus, type WorkspaceRow } from '../../lib/admin-workspace-model';
import styles from './Workspace.module.css';
type Props={
 rows:WorkspaceRow[];partial:boolean;failed:boolean;role:string;readAt:string;denied:boolean;
 initialPage?:string;initialFilter:string;versionOverview?:ReactNode;
};
type Tone='success'|'warning'|'danger'|'info'|'neutral';
// Pill tones come from the row's own fields, never from matching display text.
function tones(row:WorkspaceRow,partial:boolean):{publication:Tone;quality:Tone;collection:Tone}{
 const status=row.publish_status.toLowerCase();
 return {
  publication:status==='published'?'success':status==='review'?'warning':'neutral',
  quality:row.price_count===0?'danger':row.stale_count>0?'warning':'success',
  collection:partial?'neutral':row.running_count>0?'info':row.failed_count>0?'danger':row.queued_count>0?'info':'neutral',
 };
}
export default function Workspace({rows,partial,failed,role,readAt,denied,initialFilter,initialPage,versionOverview}:Props){
 const router=useRouter();
 const [filter,setFilterState]=useState(initialFilter);
 const [page,setPage]=useState(initialPage);
 function setFilter(value:string){
  setFilterState(value);setPage(undefined);const url=new URL(window.location.href);
  url.searchParams.set('view',value);url.searchParams.delete('page');
  router.replace(url.pathname+url.search+url.hash,{scroll:false});
 }
 const items=rows.map(r=>({...r,state:workspaceStatus(r,partial),tone:tones(r,partial)}));
 const attention=items.filter(r=>r.state.needsAction),progress=items.filter(r=>r.state.progress);
 const displayed=items.filter(r=>filter==='all'||(filter==='action'?r.state.needsAction:r.state.progress));
 const list=createAdminListView(displayed,{basePath:"/admin",params:{page,view:filter},pageSize:10,id:"workspace-list"});
 const latest=rows.map(r=>r.latest_checked).filter((s):s is string=>Boolean(s)).sort().at(-1);
 const stats=[
  {id:'action',icon:Activity,label:'需要处理',value:failed?'—':attention.length,unit:'个产品',hint:'价格缺失、时效问题与采集失败'},
  {id:'progress',icon:Clock3,label:'系统执行中',value:failed||partial?'—':progress.length,unit:'个产品',hint:partial?'本地快照不包含任务运行记录':'运行中或等待调度，无需重复提交'},
  {id:'all',icon:ShieldCheck,label:'当前产品',value:failed?'—':items.length,unit:'个',hint:'查看发布、价格与采集的独立状态'},
 ];
 return <div className={styles.workspace}>
 {denied?<div role="alert" className={styles.notice}>当前账号没有该操作权限。正式数据与系统操作需由管理员执行。</div>:null}
 {failed?<div role="alert" className={styles.notice}>工作台数据暂时不可用，请稍后刷新。未将读取失败显示为零项待办。</div>:null}
 <div className={styles.heading}>
  <div><h1>先处理重要的事</h1><p>把需要你决策的工作放在前面，系统执行进度单独跟踪。</p></div>
  <AdminLink className={adminButtonClassName({variant:"secondary"})} href="/admin/analytics">查看流量看板 <ArrowRight size={15}/></AdminLink>
 </div>
 <p className={styles.source}>{partial?'真实公开价格快照：采集任务、来源与运营历史未导入；缺失记录不计为生产异常。':'状态来自当前数据库，只读查询；查看详情后再决定是否执行操作。'}</p>
 {versionOverview}
 <div className={styles.stats}>{stats.map(({id,icon:Icon,label,value,unit,hint})=>
  <button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>
   <span className={styles.statIcon}><Icon size={18}/></span>
   <span className={styles.statBody}><span>{label}</span><strong>{value}<small>{unit}</small></strong><em>{hint}</em></span>
  </button>)}</div>
 <div className={styles.columns}>
 <section className={styles.panel}>
  <div className={styles.panelHead}>
   <div><h2 className="text-base font-semibold text-admin-text">我的待办</h2><p>每个问题都有数据依据和下一步。</p></div>
   <AdminSegmentedControl ariaLabel="待办筛选" size="sm" value={filter} onChange={setFilter} items={[{value:"action",label:"需要处理"},{value:"progress",label:"执行中"},{value:"all",label:"全部产品"}]} />
  </div>
  <div id="workspace-list" className={styles.count}>{failed?'读取失败':`${displayed.length} 个产品`}</div>
  {!displayed.length?<div className={styles.empty}>{
   failed?'暂时无法读取待办。':partial&&filter==='progress'?'当前快照未导入运行记录，无法判断生产采集进度。':
   filter==='action'?'当前数据范围内，没有发现正式价格缺失、超期或已知采集失败。':'当前筛选下没有产品。'
  }</div>:list.items.map(r=>
  <article className={styles.task} key={r.id} id={`workspace-row-${r.id}`}>
   <AdminProductLogo slug={r.slug} name={r.name} />
   <div className={styles.taskBody}>
    <h3>{r.name}</h3>
    <p>{r.price_count===0?`尚无 ${r.billing_platform==='web'?'官网':'App Store'} 正式价格，请核对是否需要补齐。`:
     r.stale_count>0?`${r.stale_count} 条 ${r.billing_platform==='web'?'官网':'App Store'} 正式价格超过 14 天未核验或缺少核验时间。`:
     r.failed_count>0&&!partial?'已配置任务最近一次运行失败，请检查采集记录。':
     `${r.price_count} 条 ${r.billing_platform==='web'?'官网':'App Store'} 正式价格。`}</p>
    <div className={styles.tags}>
     <span data-tone={r.tone.publication}>发布：{r.state.publication}</span>
     <span data-tone={r.tone.quality}>数据：{r.state.quality}</span>
     <span data-tone={r.tone.collection}>采集：{r.state.collection}</span>
    </div>
   </div>
   <AdminLink href={withAdminReturnTo(
    r.billing_platform==='web'?`/admin/collector-jobs?product=${encodeURIComponent(r.slug)}`:
    r.stale_count>0?`/admin/data-quality/${encodeURIComponent(r.slug)}`:
    !partial&&r.failed_count>0?`/admin/review?q=${encodeURIComponent(r.slug)}`:`/admin/products/${r.id}/edit`,
    adminListLocation("/admin",{page,view:filter},`workspace-row-${r.id}`)
   )} className={styles.action}>{role==='OWNER'?'查看并处理':'查看详情'}<ArrowRight size={14}/></AdminLink>
  </article>)}
  {list.pagination.totalPages>1 ?
   <AdminPagination {...list.pagination} showCount={false} ariaLabel="待办底部分页" className="mx-5 my-3" />
  : null}
  <div className={styles.foot}>这里的“已发布”不代表采集正常；价格时效正常也不代表内容已完成审核。</div>
 </section>
 <aside>
  <section className={styles.panel}>
   <div className={styles.panelHead}><h2 className="text-base font-semibold text-admin-text">数据与权限</h2><ShieldCheck size={18}/></div>
   <dl className={styles.details}>
    <div><dt>当前角色</dt><dd>{{OWNER:"管理员",EDITOR:"编辑",VIEWER:"只读成员"}[role] || "未知角色"}</dd></div>
    <div><dt>读取时间</dt><dd>{readAt}</dd></div>
    <div><dt>最新价格核验</dt><dd>{latest?new Date(latest).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'}):'不可用'}</dd></div>
    <div><dt>任务记录</dt><dd>{partial?'未导入':'已查询'}</dd></div><div><dt>本批次范围</dt><dd>不启用推广投放</dd></div>
   </dl>
   <div className={styles.foot}>仅统计当前数据库；本地快照不等于生产实时状态。查看详情不会触发采集或发布。</div>
  </section>
  <section className={styles.panel}>
   <div className={styles.panelHead}><h2 className="text-base font-semibold text-admin-text">操作边界</h2></div>
   <p className={styles.explain}>管理员管理正式数据、采集和发布；编辑可维护独立草稿；只读成员仅查看。旧模块尚无独立草稿的写操作暂限管理员。</p>
  </section>
 </aside>
 </div>
 </div>;
}
