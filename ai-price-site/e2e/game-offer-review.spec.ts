import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import type { GameResponse } from "../lib/game-offers";

const enabled = process.env.GEOSUB_GAME_REVIEW_TEST === "1";
test.skip(!enabled, "Requires a dedicated local GTA 6 test database and matching local preview.");
const review = "/admin/review?source=games";

test("a reviewer approves one Xbox HK price and rejects a second, preserving every other offer", async ({
  page,
  browser,
  baseURL,
  request,
}) => {
  test.setTimeout(90_000);
  const url = new URL(process.env.DATABASE_URL!);
  expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
  expect(url.pathname).toMatch(/_test$/);
  expect(new URL(baseURL!).hostname).toBe("127.0.0.1");
  const db = new Client({ connectionString: url.href });
  await db.connect();
  const runIds: string[] = [],
    actorIds: string[] = [];
  const visitor = await browser.newContext({ baseURL });
  async function login(p: Page, role: "owner" | "viewer") {
    const id = randomUUID(),
      email = id + "@example.invalid",
      password = randomBytes(24).toString("hex");
    const salt = randomBytes(16).toString("hex"),
      hash = scryptSync(password, salt, 64).toString("hex");
    await db.query("INSERT INTO admin_users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)", [
      id,
      email,
      "报价验收 " + role,
      "scrypt:" + salt + ":" + hash,
      role,
    ]);
    actorIds.push(id);
    await p.goto("/admin-login");
    await p.locator("input[name=email]").fill(email);
    await p.locator("input[name=password]").fill(password);
    await p.getByRole("button", { name: "登录", exact: true }).click();
    await p.waitForURL((u) => u.pathname === "/admin");
    await p.goto(review);
    return id;
  }
  async function snapshot() {
    return (
      await db.query(
        "SELECT s.* FROM game_offer_public_state s JOIN products p ON p.id=s.product_id WHERE p.slug='gta-6' ORDER BY s.id",
      )
    ).rows;
  }
  async function latest() {
    const result = await request.get("/api/games/gta-6/offers?platform=xbox&display_currency=CNY");
    expect(result.ok()).toBe(true);
    return ((await result.json()) as GameResponse).full_games.filter((r) => r.edition === "standard");
  }
  try {
    const before = await snapshot();
    const target = before.find(
      (r) =>
        r.platform === "xbox" &&
        r.market === "HK" &&
        r.offer_type === "full_game" &&
        r.edition === "standard",
    );
    const siblings = (rows: typeof before) => rows.filter((r) => r.id !== target.id);
    expect(siblings(before)).toHaveLength(11);
    expect(target.price.public_price).toBe("568.00");
    async function candidate(price: string) {
      const runId = randomUUID();
      const result = await db.query(
        `INSERT INTO collector_job_runs(id,job_id,status,raw_payload)
        SELECT $1,b.job_id,'succeeded',jsonb_build_object('target_id',b.target_id,'game_offer',r.raw_payload->'game_offer' ||
          jsonb_build_object('observed_at',clock_timestamp(),'public_price',$3::text,'public_promotion',false,'promo_ends_at',NULL))
        FROM game_offer_jobs b JOIN game_offer_latest_verified v USING(target_id)
        JOIN collector_job_runs r ON r.id=v.run_id WHERE b.target_id=$2`,
        [runId, target.id, price],
      );
      expect(result.rowCount).toBe(1);
      runIds.push(runId);
      return runId;
    }
    const first = await candidate("500.00");
    expect((await latest()).find((r) => r.market === "HK")!.price!.public_price).toBe("568.00");
    await page.goto(review);
    await expect(page).toHaveURL(/admin-login/);
    const viewer = await visitor.newPage();
    await login(viewer, "viewer");
    const viewerRow = viewer.locator('[data-game-run="' + first + '"]');
    await viewerRow.locator("summary").click();
    await expect(viewerRow.getByRole("button", { name: "通过", exact: true })).toBeDisabled();
    const owner = await login(page, "owner");
    const productPage = await visitor.newPage();
    await productPage.goto("/zh/games/gta-6?platform=xbox");
    const oldSummary = await productPage.locator("#quote-insight").innerText();
    await page.goto("/admin/review");
    await page.getByRole("link", { name: "游戏报价审核", exact: true }).click();
    for (const width of [1280, 390]) {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme });
        const row = page.locator('[data-game-run="' + first + '"]');
        await expect(row).toContainText("HKD 568.00");
        await expect(row).toContainText("HKD 500.00");
        await expect(row.getByRole("link", { name: "打开官方商品页" })).toHaveAttribute(
          "href",
          target.store_url,
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
          true,
        );
      }
    }
    page.on("dialog", (dialog) => dialog.accept());
    async function decide(id: string, decision: string, reason: string) {
      const row = page.locator('[data-game-run="' + id + '"]');
      await row.locator("summary").click();
      await row.getByRole("textbox", { name: "审核理由" }).fill(reason);
      await row.getByRole("button", { name: decision, exact: true }).click();
      await expect(row).toHaveCount(0);
      await expect.poll(async () => siblings(await snapshot())).toEqual(siblings(before));
    }
    const oldTab = await page.context().newPage();
    await oldTab.goto(review);
    const oldForm = oldTab.locator('[data-game-run="' + first + '"]');
    await oldForm.locator("summary").click();
    await oldForm.getByRole("textbox", {name:"审核理由"}).fill("重复提交");
    oldTab.on("dialog", dialog => dialog.accept());
    await decide(first, "通过", "核对同一港服标准版的公开买断价");
    await oldForm.getByRole("button", {name:"驳回",exact:true}).click();
    await expect(oldForm.getByRole("alert")).toContainText("刷新");
    await oldTab.close();
    const approved = await latest();
    const hk = approved.find((r) => r.market === "HK")!.price!,
      us = approved.find((r) => r.market === "US")!.price!;
    expect(hk.public_price).toBe("500.00");
    const gap = (
      (Math.round(Number(us.converted_public_price) * 100) -
        Math.round(Number(hk.converted_public_price) * 100)) /
      100
    ).toFixed(2);
    await productPage.reload();
    await expect(productPage.locator(".lowest-offer")).toHaveAttribute("data-code", "HK");
    await expect(productPage.locator('[data-code="HK"] .quote-local')).toHaveText("HK$500");
    await expect(productPage.locator("#quote-insight")).toContainText("¥" + gap);
    expect(await productPage.locator("#quote-insight").innerText()).not.toBe(oldSummary);
    const second = await candidate("5.00");
    await page.reload();
    await expect(page.locator('[data-game-run="' + second + '"]')).toContainText("价格波动");
    await decide(second, "驳回", "错误报价，未通过商品价格复核");
    expect((await latest()).find((r) => r.market === "HK")!.price!.public_price).toBe("500.00");
    await productPage.reload();
    await expect(productPage.locator("#quote-insight")).toContainText("¥" + gap);
    await page.getByRole("link", { name: "审核记录", exact: true }).click();
    for (const [id, action, prior, note] of [
      [first, "approved", "568.00", "核对同一港服标准版的公开买断价"],
      [second, "rejected", "500.00", "错误报价，未通过商品价格复核"],
    ]) {
      const record = page.locator('[data-game-run="' + id + '"]');
      await expect(record).toContainText("报价验收 owner");
      await expect(record).toContainText(note);
      const audit = await db.query(
        `SELECT l.actor_id,l.action,l.note,l.old_value->>'public_price' AS prior,
        a.reviewed_at=l.created_at AS same_time FROM audit_logs l JOIN game_offer_attempts a ON l.target_id=a.run_id
        WHERE l.target_type='game_offer_attempt' AND l.target_id=$1`,
        [id],
      );
      expect(audit.rows).toEqual([{ actor_id: owner, action, note, prior, same_time: true }]);
    }
  } finally {
    await visitor.close();
    await db.query(
      "DELETE FROM audit_logs WHERE target_type='game_offer_attempt' AND target_id=ANY($1::uuid[])",
      [runIds],
    );
    await db.query("DELETE FROM game_offer_attempts WHERE run_id=ANY($1::uuid[])", [runIds]);
    await db.query("DELETE FROM collector_job_runs WHERE id=ANY($1::uuid[])", [runIds]);
    await db.query("DELETE FROM admin_users WHERE id=ANY($1::uuid[])", [actorIds]);
    await db.end();
  }
});
