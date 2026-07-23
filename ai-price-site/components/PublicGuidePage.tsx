type GuideSection = {
  title: string;
  body: string;
};

export default function PublicGuidePage({
  eyebrow,
  title,
  description,
  sections,
  note,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: GuideSection[];
  note: string;
}) {
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

        <div className="mt-10 grid gap-4">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03] md:grid-cols-[44px_minmax(0,1fr)] md:p-7"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-lime-50 text-sm font-black text-lime-700 ring-1 ring-lime-200">
                {index + 1}
              </span>
              <div>
                <h2 className="text-lg font-black text-zinc-950">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-zinc-600">
                  {section.body}
                </p>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm leading-7 text-zinc-500">
          {note}
        </p>
      </section>
    </main>
  );
}
