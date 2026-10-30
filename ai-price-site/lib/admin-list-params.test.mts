import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_LIST_PAGE_SIZE,
  adminPageWindow,
  buildAdminListHref,
  clampAdminPage,
  nextSortDirection,
  parseAdminListParams,
  paginateAdminItems,
  createAdminListView,
} from "./admin-list-params.ts";

const options = { sortable: ["name", "updated"], defaultSort: "name" } as const;

test("list params default to page 1, fixed page size and the default sort", () => {
  assert.deepEqual(parseAdminListParams({}, options), {
    q: "",
    page: 1,
    pageSize: ADMIN_LIST_PAGE_SIZE,
    offset: 0,
    sort: "name",
    direction: "asc",
  });
  assert.equal(ADMIN_LIST_PAGE_SIZE, 50);
});

test("list params reject unknown sorts, bad pages and directions instead of trusting the URL", () => {
  const parsed = parseAdminListParams({ sort: "password_hash", page: "-3", dir: "sideways", q: ["  chat  ", "x"] }, options);
  assert.equal(parsed.sort, "name");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.direction, "asc");
  assert.equal(parsed.q, "chat");
  assert.equal(parseAdminListParams({ page: "3", sort: "updated", dir: "desc" }, options).offset, 100);
  assert.equal(parseAdminListParams({ q: "x".repeat(500) }, options).q.length, 100);
});

test("out-of-range pages clamp to the last page", () => {
  assert.deepEqual(clampAdminPage(9, 120), { page: 3, totalPages: 3 });
  assert.deepEqual(clampAdminPage(1, 0), { page: 1, totalPages: 1 });
});

test("hrefs keep filters, drop empties and reset the page when filters change", () => {
  const current = { q: "netflix", status: "PUBLISHED", page: 4, sort: "name" };
  assert.equal(buildAdminListHref("/admin/products", current, { page: 5 }), "/admin/products?q=netflix&status=PUBLISHED&page=5&sort=name");
  assert.equal(buildAdminListHref("/admin/products", current, { status: "" }), "/admin/products?q=netflix&sort=name");
  assert.equal(buildAdminListHref("/admin/products", current, { page: 1 }), "/admin/products?q=netflix&status=PUBLISHED&sort=name");
  assert.equal(buildAdminListHref("/admin/products", {}, {}), "/admin/products");
  assert.equal(buildAdminListHref("/admin/x", { q: "a&b=c" }, {}), "/admin/x?q=a%26b%3Dc");
});

test("sorting a new column starts ascending; the active column toggles", () => {
  assert.equal(nextSortDirection("name", "asc", "updated"), "asc");
  assert.equal(nextSortDirection("name", "asc", "name"), "desc");
  assert.equal(nextSortDirection("name", "desc", "name"), "asc");
});

test("page window shows first, last and neighbours with gaps", () => {
  assert.deepEqual(adminPageWindow(1, 1), [1]);
  assert.deepEqual(adminPageWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(adminPageWindow(5, 20), [1, "gap", 4, 5, 6, "gap", 20]);
  assert.deepEqual(adminPageWindow(20, 20), [1, "gap", 19, 20]);
});


test("card pagination renders only the requested ten products and keeps source order", () => {
  const products = Array.from({length: 42}, (_, id) => ({id}));
  const second = paginateAdminItems(products, "2", 10);
  assert.equal(second.total, 42);
  assert.equal(second.totalPages, 5);
  assert.deepEqual(second.items.map(row => row.id), [10,11,12,13,14,15,16,17,18,19]);
  assert.deepEqual(paginateAdminItems(products, "5", 10).items.map(row => row.id), [40,41]);
  assert.equal(products.length, 42, "page slicing must not mutate the matching set used for status counts");
});

test("card pagination clamps beyond the last page and handles empty or malformed URLs", () => {
  const rows = Array.from({length:23}, (_, i)=>i);
  const last = paginateAdminItems(rows, "999999", 10);
  assert.equal(last.page, 3);
  assert.deepEqual(last.items, [20,21,22]);
  for (const value of [undefined,"0","-1","2junk","1.5","Infinity","9007199254740992"]) {
    assert.equal(paginateAdminItems(rows, value, 10).page, 1, `invalid page ${value}`);
  }
  assert.equal(paginateAdminItems(rows, ["2","3"], 10).page, 2);
  assert.deepEqual(paginateAdminItems([], "9", 10), {items:[],total:0,page:1,totalPages:1,pageSize:10});
});

test("pipeline page links keep all active filters, while switching a filter drops the page", () => {
  const current={q:"AI & tools", category:"ai", stage:"exception", page:3};
  const next=new URL(buildAdminListHref("/admin/pipeline", current, {page:4}), "http://localhost");
  assert.deepEqual(Object.fromEntries(next.searchParams), {q:"AI & tools",category:"ai",stage:"exception",page:"4"});
  const filtered=new URL(buildAdminListHref("/admin/pipeline", current, {stage:"pending"}), "http://localhost");
  assert.equal(filtered.searchParams.has("page"), false);
  assert.equal(filtered.searchParams.get("q"), "AI & tools");
});


test("independent list pages keep filters and other page keys, and return to their own anchor", () => {
  const source=Array.from({length:52},(_,i)=>({id:i}));
  const params={page:"2",runPage:"3",q:"a & b",tag:["one","two"]};
  const list=createAdminListView(source,{basePath:"/admin/collector-jobs",params,pageParam:"runPage",pageSize:25,id:"runs"});
  assert.deepEqual(list.items.map(row=>row.id),[50,51]);
  assert.equal(list.pagination.total,52);
  const href=new URL(list.pagination.pageHref(1),"http://localhost");
  assert.equal(href.hash,"#runs");
  assert.equal(href.searchParams.get("page"),"2");
  assert.equal(href.searchParams.get("runPage"),null);
  assert.equal(href.searchParams.get("q"),"a & b");
  assert.deepEqual(href.searchParams.getAll("tag"),["one","two"]);
  assert.equal(params.runPage,"3");
});

test("list pages are disjoint and cover the whole set while preserving object identity", () => {
  const source=Array.from({length:61},(_,i)=>({id:i}));
  const lists=[1,2,3].map(page=>createAdminListView(source,{basePath:"/admin/plans",params:{page},pageSize:25}));
  assert.deepEqual(lists.map(list=>list.items.length),[25,25,11]);
  assert.deepEqual(lists.flatMap(list=>list.items),source);
  assert.equal(lists[1].items[0],source[25]);
  assert.equal(lists[0].pagination.total,61);
});

test("multi-list page clamps before slicing and does not turn empty or invalid requests into phantom rows", () => {
  const items=[1,2,3];
  assert.deepEqual(createAdminListView(items,{basePath:"/admin/prices",params:{pricePage:"999"},pageParam:"pricePage",pageSize:2}).items,[3]);
  for(const page of ["2garbage","-1","Infinity",""]){
    assert.equal(createAdminListView(items,{basePath:"/admin/products",params:{page},pageSize:2}).pagination.page,1);
  }
  const empty=createAdminListView([],{basePath:"/admin/articles",params:{page:"200"}});
  assert.deepEqual(empty.items,[]);
  assert.equal(empty.pagination.total,0);
  assert.equal(empty.pagination.page,1);
});
