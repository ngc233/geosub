"use client";

import { FormEvent, type ReactNode, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { resolveCanvasLocale, type CanvasLocale } from "../../lib/canvas-ui-copy";
import { getContactCopy, type ContactTicketCategory } from "../../lib/contact-copy";

export type { ContactTicketCategory };

function FieldFrame({ canvas, children }: { canvas: boolean; children: ReactNode }) {
  return canvas ? <span className="gs-field">{children}</span> : children;
}

export default function ContactTicketForm({
  canvas = false,
  locale = "zh",
  initialCategory = "correction",
  initialSubject = "",
}: {
  canvas?: boolean;
  locale?: CanvasLocale;
  initialCategory?: ContactTicketCategory;
  initialSubject?: string;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = getContactCopy(resolvedLocale).form;

  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState<ContactTicketCategory>(initialCategory);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setFeedback("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/contact-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, sourcePath: window.location.pathname }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setStatus("error");
      setFeedback(result.error || copy.fallbackError);
      return;
    }
    setStatus("success");
    setFeedback(copy.successFeedback(String(result.ticketId || "")));
    form.reset();
  }

  if (status === "success") {
    return (
      <div
        id="contact-form"
        className={canvas ? "" : "border border-emerald-200 bg-emerald-50 p-8 text-center"}
      >
        <CheckCircle2
          className={canvas ? "gs-aux-icon" : "mx-auto h-10 w-10 text-emerald-700"}
          aria-hidden="true"
        />
        <h2 className={canvas ? "" : "mt-4 text-2xl font-black"}>{copy.successHeading}</h2>
        <p className={canvas ? "" : "mt-3 text-sm text-emerald-900"}>{feedback}</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={canvas ? "" : "mt-6 text-sm font-black underline"}
        >
          {copy.submitAnotherLabel}
        </button>
      </div>
    );
  }

  return (
    <form
      id="contact-form"
      onSubmit={submit}
      className={
        canvas
          ? "gs-aux-form"
          : "rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-9"
      }
    >
      <div className={canvas ? "gs-aux-form-grid" : "grid gap-5 sm:grid-cols-2"}>
        <label className={canvas ? "" : "text-sm font-bold"}>
          {copy.categoryLabel}
          <FieldFrame canvas={canvas}>
            <select
              name="category"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value as ContactTicketCategory)}
              className={
                canvas
                  ? ""
                  : "mt-2 w-full border border-zinc-300 bg-white px-3 py-3 font-normal outline-none focus:border-[#182230]"
              }
            >
              {copy.categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FieldFrame>
        </label>
        <label className={canvas ? "" : "text-sm font-bold"}>
          {copy.nameLabel}
          <FieldFrame canvas={canvas}>
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              className={
                canvas
                  ? ""
                  : "mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]"
              }
              placeholder={copy.nameHint}
            />
          </FieldFrame>
        </label>
        <label className={canvas ? "" : "text-sm font-bold"}>
          {copy.emailLabel}
          <FieldFrame canvas={canvas}>
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              className={
                canvas
                  ? ""
                  : "mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]"
              }
              placeholder={copy.emailHint}
            />
          </FieldFrame>
        </label>
        <label className={canvas ? "" : "text-sm font-bold"}>
          {copy.orgLabel}
          <FieldFrame canvas={canvas}>
            <input
              name="organization"
              maxLength={160}
              className={
                canvas
                  ? ""
                  : "mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]"
              }
              placeholder={copy.orgHint}
            />
          </FieldFrame>
        </label>
        <label className={canvas ? "" : "text-sm font-bold sm:col-span-2"}>
          {copy.subjectLabel}
          <FieldFrame canvas={canvas}>
            <input
              key={`${initialCategory}-${initialSubject}`}
              name="subject"
              required
              minLength={4}
              maxLength={200}
              defaultValue={initialSubject}
              className={
                canvas
                  ? ""
                  : "mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]"
              }
              placeholder={copy.subjectHint}
            />
          </FieldFrame>
        </label>
        <label className={canvas ? "" : "text-sm font-bold sm:col-span-2"}>
          {copy.pageUrlLabel}
          <FieldFrame canvas={canvas}>
            <input
              name="pageUrl"
              type="url"
              maxLength={1000}
              className={
                canvas
                  ? ""
                  : "mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]"
              }
              placeholder={copy.pageUrlHint}
            />
          </FieldFrame>
        </label>
        <label className={canvas ? "" : "text-sm font-bold sm:col-span-2"}>
          {copy.messageLabel}
          <FieldFrame canvas={canvas}>
            <textarea
              name="message"
              required
              minLength={20}
              maxLength={5000}
              rows={7}
              className={
                canvas
                  ? ""
                  : "mt-2 w-full resize-y border border-zinc-300 px-3 py-3 font-normal leading-6 outline-none focus:border-[#182230]"
              }
              placeholder={copy.messageHint}
            />
          </FieldFrame>
        </label>
        <label className="hidden" aria-hidden="true">
          {copy.honeypotLabel}
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {status === "error" ? (
        <p role="alert" className={canvas ? "" : "mt-4 text-sm font-bold text-red-700"}>
          {feedback}
        </p>
      ) : null}
      <div className={canvas ? "" : "mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
        <p className={canvas ? "" : "max-w-xl text-xs leading-5 text-zinc-500"}>{copy.consentNote}</p>
        <button
          data-gs-ui={canvas ? "button" : undefined}
          disabled={status === "sending"}
          className={
            canvas
              ? ""
              : "inline-flex shrink-0 items-center justify-center gap-2 bg-[#182230] px-6 py-3 text-sm font-black text-white disabled:opacity-60"
          }
        >
          {status === "sending" ? (
            <Loader2 className={canvas ? "gs-aux-icon" : "h-4 w-4 animate-spin"} />
          ) : (
            <Send className={canvas ? "gs-aux-icon" : "h-4 w-4"} />
          )}
          {status === "sending" ? copy.sendingLabel : copy.submitLabel}
        </button>
      </div>
    </form>
  );
}
