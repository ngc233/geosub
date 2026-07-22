import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function readArticleFile(fileName: string) {
  return readFileSync(resolve(currentDir, fileName), "utf8");
}

test("article list exposes archive and trash actions", () => {
  const source = readArticleFile("page.tsx");

  assert.match(source, /archiveArticleAction/);
  assert.match(source, /moveArticleToTrashAction/);
  assert.match(source, /\/admin\/articles\/trash/);
  assert.match(source, /下架/);
  assert.match(source, /删除/);
});

test("article trash page exposes restore and permanent delete actions", () => {
  const source = readArticleFile("trash/page.tsx");

  assert.match(source, /restoreArticleFromTrashAction/);
  assert.match(source, /permanentlyDeleteArticleAction/);
  assert.match(source, /恢复/);
  assert.match(source, /永久删除/);
  assert.match(source, /回收站是空的/);
});

test("article actions keep unpublished and trashed articles out of public entry points", () => {
  const source = readArticleFile("actions.ts");

  assert.match(source, /revalidatePath\("\/sitemap\.xml"\)/);
  assert.match(source, /status: "ARCHIVED"/);
  assert.match(source, /deletedAt: new Date\(\)/);
  assert.match(source, /deletedAt: null/);
  assert.match(source, /status: "DRAFT"/);
  assert.match(source, /prisma\.article\.delete/);
});

test("article SEO draft action has no unreachable legacy generator branch", () => {
  const source = readArticleFile("actions.ts");

  assert.doesNotMatch(source, /stripMarkdown/);
  assert.doesNotMatch(source, /truncateText/);
  assert.doesNotMatch(source, /uniqueText/);
  assert.doesNotMatch(source, /findUniqueOrThrow/);
});

test("article admin keeps language-specific taxonomy, links and cache paths", () => {
  const list = readArticleFile("page.tsx");
  const form = readArticleFile("ArticleForm.tsx");
  const createPage = readArticleFile("new/page.tsx");
  const editPage = readArticleFile("[id]/edit/page.tsx");
  const taxonomy = readArticleFile("taxonomy/page.tsx");
  const actions = readArticleFile("actions.ts");

  assert.match(list, /article\.locale === "EN" \? "en" : "zh"/);
  assert.match(form, /defaultLocale/);
  assert.match(createPage, /getArticleCategories\(locale\)/);
  assert.match(createPage, /getArticleTags\(locale\)/);
  assert.match(editPage, /getArticleCategories\(article\.locale\)/);
  assert.match(editPage, /locale: article\.locale/);
  assert.match(taxonomy, /query\.locale === "EN"/);
  assert.match(taxonomy, /name="locale" value=\{locale\}/);
  assert.match(actions, /revalidatePath\("\/en\/guides"\)/);
  assert.match(actions, /revalidatePath\(`\/en\/guides\/\$\{slug\}`\)/);
});
