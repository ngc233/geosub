"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { getDefaultNavigationItems } from "../../../lib/navigation-defaults";
import { getNavigationLinkHealth } from "../../../lib/navigation-health";
import {
  getNavigationLocaleByDbValue,
  getNavigationLocaleByValue,
  getNavigationPositionByDbValue,
  getNavigationPositionByValue,
  isNavigationHomeHref,
} from "../../../lib/navigation-config";

function normalizeNavigationHref(href: string, localePath: string) {
  const normalizedHref = href.trim();

  if (!normalizedHref) {
    throw new Error("链接不能为空。");
  }

  const isInternal = normalizedHref.startsWith("/");
  const isExternal =
    normalizedHref.startsWith("https://") || normalizedHref.startsWith("http://");

  if (!isInternal && !isExternal) {
    throw new Error("链接必须以 /、https:// 或 http:// 开头。");
  }

  if (isInternal && !normalizedHref.startsWith(`/${localePath}/`)) {
    throw new Error(`当前语言的内部链接必须以 /${localePath}/ 开头。`);
  }

  return {
    href: normalizedHref,
    external: isExternal,
  };
}

function canPublishNavigationItem({
  href,
  external,
}: {
  href: string;
  external: boolean;
}) {
  const health = getNavigationLinkHealth({
    href,
    external,
    status: "PUBLISHED",
  });

  return health.tone !== "danger";
}

export async function toggleNavigationItemStatus(itemId: string) {
  const item = await prisma.navigationItem.findUnique({
    where: {
      id: itemId,
    },
    select: {
      id: true,
      href: true,
      external: true,
      status: true,
    },
  });

  if (!item) {
    throw new Error("导航菜单不存在。");
  }

  const nextStatus = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  if (isNavigationHomeHref(item.href) && nextStatus === "DRAFT") {
    throw new Error("已发布的首页导航不能停用。");
  }

  if (
    nextStatus === "PUBLISHED" &&
    !canPublishNavigationItem({
      href: item.href,
      external: item.external,
    })
  ) {
    revalidatePath("/admin/navigation");
    return;
  }

  await prisma.navigationItem.update({
    where: {
      id: item.id,
    },
    data: {
      status: nextStatus,
    },
  });

  revalidatePath("/admin/navigation");
  revalidatePath("/admin");
}

export async function moveNavigationItem(
  itemId: string,
  direction: "up" | "down"
) {
  const item = await prisma.navigationItem.findUnique({
    where: {
      id: itemId,
    },
    select: {
      id: true,
      href: true,
      parentId: true,
      locale: true,
      position: true,
    },
  });

  if (!item) {
    throw new Error("导航菜单不存在。");
  }

  if (isNavigationHomeHref(item.href)) {
    throw new Error("首页导航固定在第一位，不能移动。");
  }

  const siblings = await prisma.navigationItem.findMany({
    where: {
      locale: item.locale,
      position: item.position,
      parentId: item.parentId,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      href: true,
    },
  });

  const currentIndex = siblings.findIndex((sibling) => sibling.id === item.id);

  if (currentIndex < 0) {
    return;
  }

  const targetIndex =
    direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return;
  }

  const targetItem = siblings[targetIndex];

  if (direction === "up" && isNavigationHomeHref(targetItem.href)) {
    return;
  }

  const nextSiblings = [...siblings];

  const current = nextSiblings[currentIndex];
  nextSiblings[currentIndex] = nextSiblings[targetIndex];
  nextSiblings[targetIndex] = current;

  await prisma.$transaction(
    nextSiblings.map((sibling, index) =>
      prisma.navigationItem.update({
        where: {
          id: sibling.id,
        },
        data: {
          sortOrder: (index + 1) * 10,
        },
      })
    )
  );

  revalidatePath("/admin/navigation");
  revalidatePath("/admin");
}

export async function updateNavigationItem(
  itemId: string,
  formData: FormData
) {
  const currentItem = await prisma.navigationItem.findUnique({
    where: {
      id: itemId,
    },
    select: {
      id: true,
      href: true,
      status: true,
      locale: true,
      position: true,
    },
  });

  if (!currentItem) {
    throw new Error("导航菜单不存在。");
  }

  const label = String(formData.get("label") || "").trim();
  const rawHref = String(formData.get("href") || "").trim();
  const externalChecked = formData.get("external") === "on";

  if (!label) {
    throw new Error("菜单名称不能为空。");
  }

  const localeEntry = getNavigationLocaleByDbValue(currentItem.locale);

  let href = rawHref;

  if (isNavigationHomeHref(currentItem.href)) {
    href = currentItem.href;
  }

  const normalized = normalizeNavigationHref(href, localeEntry.path);
  const external = normalized.external || externalChecked;

  const nextStatus =
    currentItem.status === "PUBLISHED" &&
    !canPublishNavigationItem({
      href: normalized.href,
      external,
    })
      ? "DRAFT"
      : currentItem.status;

  await prisma.navigationItem.update({
    where: {
      id: currentItem.id,
    },
    data: {
      label,
      href: normalized.href,
      external,
      status: nextStatus,
    },
  });

  revalidatePath("/admin/navigation");
  revalidatePath("/admin");

  const localeQuery = getNavigationLocaleByDbValue(currentItem.locale).value;
  const positionQuery = getNavigationPositionByDbValue(currentItem.position).value;

  redirect(`/admin/navigation?locale=${localeQuery}&position=${positionQuery}`);
}

export async function createNavigationItem(formData: FormData) {
  const label = String(formData.get("label") || "").trim();
  const rawHref = String(formData.get("href") || "").trim();
  const rawLocale = String(formData.get("locale") || "zh");
  const rawPosition = String(formData.get("position") || "header");
  const parentIdValue = String(formData.get("parentId") || "").trim();
  const externalChecked = formData.get("external") === "on";
  const publishNow = formData.get("publishNow") === "on";

  if (!label) {
    throw new Error("菜单名称不能为空。");
  }

  const localeEntry = getNavigationLocaleByValue(rawLocale);
  const positionEntry = getNavigationPositionByValue(rawPosition);
  const normalized = normalizeNavigationHref(rawHref, localeEntry.path);
  const external = normalized.external || externalChecked;
  const parentId = parentIdValue || null;

  if (parentId) {
    const parent = await prisma.navigationItem.findUnique({
      where: {
        id: parentId,
      },
      select: {
        id: true,
        locale: true,
        position: true,
        parentId: true,
      },
    });

    if (!parent) {
      throw new Error("父级菜单不存在。");
    }

    if (parent.parentId) {
      throw new Error("暂时只支持二级菜单，不能在子菜单下面继续新增。");
    }

    if (
      parent.locale !== localeEntry.dbValue ||
      parent.position !== positionEntry.dbValue
    ) {
      throw new Error("父级菜单必须属于当前语言和当前导航位置。");
    }
  }

  const lastSibling = await prisma.navigationItem.findFirst({
    where: {
      locale: localeEntry.dbValue,
      position: positionEntry.dbValue,
      parentId,
    },
    orderBy: {
      sortOrder: "desc",
    },
    select: {
      sortOrder: true,
    },
  });

  const sortOrder = (lastSibling?.sortOrder || 0) + 10;

  const safeToPublish = canPublishNavigationItem({
    href: normalized.href,
    external,
  });

  await prisma.navigationItem.create({
    data: {
      locale: localeEntry.dbValue,
      label,
      href: normalized.href,
      position: positionEntry.dbValue,
      parentId,
      external,
      status: publishNow && safeToPublish ? "PUBLISHED" : "DRAFT",
      sortOrder,
    },
  });

  revalidatePath("/admin/navigation");
  revalidatePath("/admin");

  redirect(
    `/admin/navigation?locale=${localeEntry.value}&position=${positionEntry.value}`
  );
}

export async function seedDefaultNavigation(formData: FormData) {
  const rawLocale = String(formData.get("locale") || "zh");
  const rawPosition = String(formData.get("position") || "footer");
  const localeEntry = getNavigationLocaleByValue(rawLocale);
  const positionEntry = getNavigationPositionByValue(rawPosition);
  const groups = getDefaultNavigationItems({
    locale: localeEntry.value,
    position: positionEntry.value,
  });

  for (const [groupIndex, group] of groups.entries()) {
    let parent = await prisma.navigationItem.findFirst({
      where: {
        locale: localeEntry.dbValue,
        position: positionEntry.dbValue,
        parentId: null,
        href: group.href,
      },
      select: {
        id: true,
      },
    });

    if (!parent) {
      parent = await prisma.navigationItem.create({
        data: {
          locale: localeEntry.dbValue,
          position: positionEntry.dbValue,
          label: group.label,
          href: group.href,
          parentId: null,
          external: false,
          status: "PUBLISHED",
          sortOrder: (groupIndex + 1) * 10,
        },
        select: {
          id: true,
        },
      });
    }

    for (const [childIndex, child] of (group.children || []).entries()) {
      const exists = await prisma.navigationItem.findFirst({
        where: {
          locale: localeEntry.dbValue,
          position: positionEntry.dbValue,
          parentId: parent.id,
          href: child.href,
        },
        select: {
          id: true,
        },
      });

      if (exists) continue;

      await prisma.navigationItem.create({
        data: {
          locale: localeEntry.dbValue,
          position: positionEntry.dbValue,
          label: child.label,
          href: child.href,
          parentId: parent.id,
          external: false,
          status: "PUBLISHED",
          sortOrder: (childIndex + 1) * 10,
        },
      });
    }
  }

  revalidatePath("/admin/navigation");
  revalidatePath("/admin");
  revalidatePath(`/${localeEntry.path}`);
  redirect(
    `/admin/navigation?locale=${localeEntry.value}&position=${positionEntry.value}&seeded=1`,
  );
}
