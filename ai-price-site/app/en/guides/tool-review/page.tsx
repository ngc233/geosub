import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tool Reviews",
  description: "Read practical reviews and comparisons of AI tools, software tools, productivity apps, and digital services.",
};

export default function EnglishGuidePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Tool Review
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          Tool Reviews
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          Read practical reviews and comparisons of AI tools, software tools, productivity apps, and digital services.
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            Content in progress
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            This page is prepared for the English navigation system. Detailed guide content, examples, and comparison data will be added later.
          </p>
        </div>
      </section>
    </main>
  );
}
