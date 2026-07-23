import type { ReactNode } from "react";

type JapaneseInfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function JapaneseInfoPage({
  eyebrow,
  title,
  description,
  children,
}: JapaneseInfoPageProps) {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-lime-600">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          {description}
        </p>
        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          {children}
        </div>
      </section>
    </main>
  );
}
