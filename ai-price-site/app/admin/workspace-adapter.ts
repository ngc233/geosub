import "server-only";

import { preproductionRuntime } from "../../lib/first-party-promotion";
import { readWorkspaceProducts } from "../../lib/admin-workspace";
import type { WorkspaceRow } from "../../lib/admin-workspace-model";
import {
  buildWorkspaceViewModel,
  type WorkspaceBadgeView,
  type WorkspaceItemView,
  type WorkspaceTone,
  type WorkspaceViewModel,
} from "./workspace-view-model";

export type { WorkspaceBadgeView, WorkspaceItemView, WorkspaceTone, WorkspaceViewModel };

/**
 * Thin ViewModel adapter for /admin.
 * Isolates the Workspace UI from the underlying DB read model so Phase 2 can
 * swap in a unified operational status engine without modifying UI components.
 */
export async function loadWorkspaceViewModel({
  view,
  page,
}: {
  view: string;
  page?: string;
}): Promise<WorkspaceViewModel> {
  const partial = preproductionRuntime();
  let rows: WorkspaceRow[] = [];
  let failed = false;

  try {
    rows = await readWorkspaceProducts();
  } catch {
    failed = true;
  }

  return buildWorkspaceViewModel(rows, {
    partial,
    failed,
    view,
    page,
    readAt:
      new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour12: false,
      }) + " 北京时间",
  });
}
