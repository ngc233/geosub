import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { notifyNewContactTicket } from "../../../lib/contact-ticket-notification";

const MAX_REQUEST_BYTES = 24 * 1024;
const ALLOWED_CATEGORIES = new Set(["correction", "suggestion", "data", "advertising", "privacy", "other"]);

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function clientIp(request: NextRequest) {
  return clean(request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown", 100);
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "请求来源无效。" }, { status: 403 });
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, error: "提交内容过长。" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "提交格式无效。" }, { status: 400 });
  }

  if (clean(body.website, 200)) return NextResponse.json({ ok: true }, { status: 201 });

  const category = clean(body.category, 30);
  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const organization = clean(body.organization, 160) || null;
  const subject = clean(body.subject, 200);
  const message = clean(body.message, 5000);
  const pageUrl = clean(body.pageUrl, 1000) || null;
  const sourcePath = clean(body.sourcePath, 500) || null;

  if (!ALLOWED_CATEGORIES.has(category) || name.length < 2 || subject.length < 4 || message.length < 20) {
    return NextResponse.json({ ok: false, error: "请完整填写必填内容。" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "请输入有效邮箱。" }, { status: 400 });
  }

  const rateKeyHash = createHash("sha256").update(`contact:${clientIp(request)}`).digest("hex");
  const recentCount = await prisma.contactTicket.count({
    where: { rateKeyHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recentCount >= 3) {
    return NextResponse.json({ ok: false, error: "提交过于频繁，请稍后再试。" }, { status: 429 });
  }

  const ticket = await prisma.contactTicket.create({
    data: { category, name, email, organization, subject, message, pageUrl, sourcePath, rateKeyHash },
    select: { id: true, createdAt: true },
  });

  await notifyNewContactTicket({
    ticketId: ticket.id.slice(0, 8).toUpperCase(),
    category,
    createdAt: ticket.createdAt.toISOString(),
    adminUrl: new URL("/admin/contact-tickets?status=new", request.url).toString(),
  });

  return NextResponse.json({ ok: true, ticketId: ticket.id.slice(0, 8).toUpperCase() }, { status: 201 });
}
