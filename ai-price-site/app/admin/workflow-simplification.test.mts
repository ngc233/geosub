import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import * as workflow from "../../lib/admin-product-next-action.ts";
import * as context from "../../lib/admin-workflow-context.ts";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const require=createRequire(resolve(root,"package.json"));
const ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
function load(file:string,stubs:Record<string,unknown>){const source=readFileSync(resolve(root,file),"utf8");const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});const loaded={exports:{} as Record<string,unknown>};new Function("require","module","exports",outputText)((name:string)=>name in stubs?stubs[name]:require(name),loaded,loaded.exports);return loaded.exports;}
const link=(props:Record<string,unknown>)=>React.createElement("a",props,props.children);
test("workflow navigation has three unique primary destinations, with product scope and auxiliary tools",()=>{
 const view=load("components/admin/AdminPipelineSteps.tsx",{
  "@/components/admin/AdminLink":{default:link},"@/lib/admin-product-next-action":workflow,
  "@/lib/admin-workflow-context":context
 }).default;
 const html=renderToStaticMarkup(React.createElement(view,{currentStep:"review",productSlug:"spotify"}));
 const nav=html.match(/<nav[\s\S]*?<\/nav>/)![0];assert.equal((nav.match(/<a /g)||[]).length,3);
 for(const path of ["pipeline","review","prices"])assert.match(nav,new RegExp(`/admin/${path}\\?product=spotify`));
 assert.equal((nav.match(/aria-current=/g)||[]).length,1);assert.match(html,/来源与线索工具/);assert.match(html,/href="\/admin\/discovery"/);
});
test("selected review opens its evidence without nesting action controls in summary",()=>{
 const view=load("app/admin/review/PendingProductReviewSection.tsx",{
 "@/components/admin/AdminProductLogo":{default:()=>null},
 "./LazyReviewDetails":{default:(props:Record<string,unknown>)=>React.createElement(
  "details",{id:props.id,open:props.initiallyOpen},props.summary,props.children
 )},
 "@/lib/admin-product-next-action":workflow,"@/lib/admin-workflow-context":context,"@/components/admin/AdminLink":{default:link},"@/components/admin/AdminButton":{AdminLinkButton:link},"@/components/admin/AdminPagination":{default:()=>null},
 "./ManualCollectionProgressForm":{default:()=>React.createElement("form",{action:"/admin/review/collect"},React.createElement("button",null,"补采"))},"./ObservationReviewActions":{default:()=>null},
 "./pending-product-diagnosis":{diagnosePendingProductGroup:()=>({level:"warning",title:"检查样本",label:"样本不足",nextAction:"等待稳定样本",detail:"继续验证"})},"./review-display":{formatDate:()=>"今天",PriceEvidencePanel:()=>null},"./review-reason-copy":{reviewReasonAction:()=>"",reviewReasonLabel:()=>""}
 }).PendingProductReviewSection;
 const html=renderToStaticMarkup(React.createElement(view,{
  productQuery:"spotify",pendingPage:1,pendingTotalPages:1,pendingProductTotal:1,
  pendingTotal:1,detailRowsPerProduct:10,detailRowsLimited:false,historyPage:1,
  collectorStatus:null,detailProduct:"spotify",
  pendingProductGroups:[{productSlug:"spotify",productName:"Spotify",pendingCount:1,plans:[],rows:[]}]
 }));
 assert.match(html,/<details[^>]*id="review-product-spotify"[^>]*open=""/);
 for(const match of html.matchAll(/<summary\b[\s\S]*?<\/summary>/g))assert.doesNotMatch(match[0],/<(?:form|button|a)\b/);
 assert.match(html,/form action="\/admin\/review\/collect"/);assert.match(html,/查看正式价格/);
});
test("unexpanded review details contain no edit controls and nested toggles do not navigate", () => {
  const navigations: unknown[] = [];
  const states: boolean[] = [];
  const view = load("app/admin/review/LazyReviewDetails.tsx", {
    react: {
      useState: (initial: boolean) => [
        initial,
        (value: boolean) => states.push(value),
      ],
      useTransition: () => [false, (action: () => void) => action()],
    },
    "next/navigation": {
      useRouter: () => ({
        replace: (...args: unknown[]) => navigations.push(args),
      }),
    },
    "@/components/admin/AdminLink": { default: link },
  }).default as (props: Record<string, unknown>) => {
    props: Record<string, unknown>;
  };
  const result = view({
    id: "review-product-spotify",
    loaded: false,
    initiallyOpen: false,
    loadHref: "/admin/review?product=spotify&detailProduct=spotify",
    summary: React.createElement("summary", null, "Spotify"),
    children: React.createElement("input", { name: "price" }),
  });
  const html = renderToStaticMarkup(result);
  assert.doesNotMatch(html, /<input|<button|name="price"/);
  const toggle = result.props.onToggle as (event: unknown) => void;
  const details = { open: true };
  toggle({ target: {}, currentTarget: details });
  assert.deepEqual(navigations, []);
  assert.deepEqual(states, []);
  toggle({ target: details, currentTarget: details });
  assert.deepEqual(navigations, [
    ["/admin/review?product=spotify&detailProduct=spotify", { scroll: false }],
  ]);
  assert.deepEqual(states, [true]);
});

test("collector auxiliary page never highlights the product queue", () => {
  const view = load("components/admin/AdminPipelineSteps.tsx", {
    "@/components/admin/AdminLink": { default: link },
    "@/lib/admin-product-next-action": workflow,
    "@/lib/admin-workflow-context": context,
  }).default;
  const html = renderToStaticMarkup(
    React.createElement(view, { currentStep: "collector" }),
  );
  const nav = html.match(/<nav[\s\S]*?<\/nav>/)![0];
  assert.doesNotMatch(nav, /aria-current=/);
});

test("review history pagination preserves expanded state, product and return context", () => {
  const view = load("app/admin/review/ReviewHistorySection.tsx", {
    "@/components/admin/AdminProductLogo": { default: () => null },
    "@/components/admin/AdminPagination": {
      default: (props: { pageHref: (page: number) => string }) =>
        React.createElement("a", { href: props.pageHref(2) }, "下一页"),
    },
    "./review-display": {},
  }).ReviewHistorySection;
  const html = renderToStaticMarkup(
    React.createElement(view, {
      historyRows: [],
      historyPage: 1,
      historyTotalPages: 2,
      historyPageSize: 25,
      historyTotal: 26,
      pendingPage: 2,
      productQuery: "spotify",
      returnTo: "/admin/pipeline?page=3#pipeline-list",
    }),
  );
  const href = html.match(/href="([^"]+)"/)![1].replaceAll("&amp;", "&");
  const url = new URL(href, "http://local.invalid");
  assert.equal(url.searchParams.get("showHistory"), "1");
  assert.equal(url.searchParams.get("historyPage"), "2");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("product"), "spotify");
  assert.equal(
    url.searchParams.get("returnTo"),
    "/admin/pipeline?page=3#pipeline-list",
  );
});

test("all workflow steps and tools preserve the original filtered row return location",()=>{
 const view=load("components/admin/AdminPipelineSteps.tsx",{
  "@/components/admin/AdminLink":{default:link},"@/lib/admin-product-next-action":workflow,
  "@/lib/admin-workflow-context":context
 }).default;
 const returnTo="/admin/pipeline?q=spotify&page=3#pipeline-row-product";
 const html=renderToStaticMarkup(React.createElement(view,{currentStep:"review",productSlug:"spotify",returnTo}));
 const urls=[...html.matchAll(/href="([^"]+)"/g)].map(match=>new URL(match[1].replaceAll("&amp;","&"),"http://local.test"));
 assert.equal(urls.length,5);
 for(const url of urls)assert.equal(url.searchParams.get("returnTo"),returnTo);
 for(const url of urls.filter(url=>url.pathname!=="/admin/discovery"))assert.equal(url.searchParams.get("product"),"spotify");
});

test("workflow return context cannot introduce an external redirect",()=>{
 const view=load("components/admin/AdminPipelineSteps.tsx",{
  "@/components/admin/AdminLink":{default:link},"@/lib/admin-product-next-action":workflow,
  "@/lib/admin-workflow-context":context
 }).default;
 const html=renderToStaticMarkup(React.createElement(view,{
  currentStep:"review",productSlug:"spotify",returnTo:"https://untrusted.invalid/path"
 }));
 for(const match of html.matchAll(/href="([^"]+)"/g)){
  const url=new URL(match[1].replaceAll("&amp;","&"),"http://local.test");
  assert.equal(url.origin,"http://local.test");
  assert.equal(url.searchParams.get("returnTo"),"/admin/products");
 }
});
