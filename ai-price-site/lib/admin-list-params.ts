// Shared URL state for admin list pages: search, filters, sort and page all live in
// the query string so lists can be bookmarked, refreshed and shared.
export const ADMIN_LIST_PAGE_SIZE = 50;

export type AdminSortDirection = "asc" | "desc";

export type AdminListParams = {
  q: string;
  page: number;
  pageSize: number;
  offset: number;
  sort: string;
  direction: AdminSortDirection;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminListParams(
  raw: RawParams,
  {
    sortable,
    defaultSort,
    defaultDirection = "asc",
  }: {
    sortable: readonly string[];
    defaultSort: string;
    defaultDirection?: AdminSortDirection;
  },
): AdminListParams {
  const q = (first(raw.q) || "").trim().slice(0, 100);
  const pageNumber = Number.parseInt(first(raw.page) || "1", 10);
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const requestedSort = first(raw.sort) || "";
  const sort = sortable.includes(requestedSort) ? requestedSort : defaultSort;
  const requestedDirection = first(raw.dir);
  const direction: AdminSortDirection =
    requestedDirection === "asc" || requestedDirection === "desc"
      ? requestedDirection
      : defaultDirection;

  return {
    q,
    page,
    pageSize: ADMIN_LIST_PAGE_SIZE,
    offset: (page - 1) * ADMIN_LIST_PAGE_SIZE,
    sort,
    direction,
  };
}

/** Clamp a parsed page once the total is known, so an out-of-range page shows the last page. */
export function clampAdminPage(page: number, total: number, pageSize = ADMIN_LIST_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  return { page: Math.min(Math.max(1, page), totalPages), totalPages };
}

/**
 * Build a list URL from the current params plus a patch. Empty values are dropped;
 * changing anything other than the page returns to page 1.
 */
export function buildAdminListHref(
  basePath: string,
  current: Record<string, string | number | undefined>,
  patch: Record<string, string | number | undefined>,
) {
  const next: Record<string, string | number | undefined> = { ...current, ...patch };
  if (!("page" in patch)) delete next.page;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function nextSortDirection(
  activeSort: string,
  activeDirection: AdminSortDirection,
  column: string,
): AdminSortDirection {
  if (activeSort !== column) return "asc";
  return activeDirection === "asc" ? "desc" : "asc";
}

/** Compact page list such as [1, "gap", 4, 5, 6, "gap", 20]. */
export function adminPageWindow(page: number, totalPages: number): Array<number | "gap"> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages));
  const sorted = [...pages].sort((left, right) => left - right);
  const result: Array<number | "gap"> = [];

  for (const value of sorted) {
    const previous = result.at(-1);
    if (typeof previous === "number" && value - previous > 1) result.push("gap");
    result.push(value);
  }

  return result;
}


/** Slice on the server after filtering/sorting; never render off-page cards. */
export function paginateAdminItems<T>(items: readonly T[], rawPage: string | string[] | undefined, pageSize: number) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error("Invalid admin page size");
  const raw = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const requested = raw && /^\d+$/.test(raw) ? Number(raw) : 1;
  const safePage = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const { page, totalPages } = clampAdminPage(safePage, items.length, pageSize);
  const offset = (page - 1) * pageSize;
  return { items: items.slice(offset, offset + pageSize), total: items.length, page, totalPages, pageSize };
}


export function createAdminListView<T>(items: readonly T[], {
  basePath, params = {}, pageParam = "page", pageSize = 25, id = "admin-list",
}: {
  basePath: string;
  params?: Record<string, string | string[] | number | undefined>;
  pageParam?: string;
  pageSize?: number;
  id?: string;
}) {
  const rawPage = params[pageParam];
  const pagination = paginateAdminItems(items, typeof rawPage === "number" ? String(rawPage) : rawPage, pageSize);
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === pageParam || value === undefined || value === "") continue;
      for (const part of Array.isArray(value) ? value : [String(value)]) query.append(key, part);
    }
    if (page > 1) query.set(pageParam, String(page));
    return `${basePath}${query.size ? `?${query}` : ""}#${id}`;
  };
  const { items: pageItems, ...counts } = pagination;
  return { items: pageItems, pagination: { ...counts, pageHref } };
}
