import Link from "next/link";

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
  relatedLabel,
  relatedLinks = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: GuideSection[];
  note: string;
  relatedLabel?: string;
  relatedLinks?: Array<{
    href: string;
    title: string;
    description?: string | null;
  }>;
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

        {relatedLinks.length > 0 ? (
          <aside className="mt-8 border-t border-zinc-200 pt-8">
            <h2 className="text-xl font-black text-zinc-950">{relatedLabel}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-xl border border-zinc-200 bg-white px-5 py-4 transition hover:border-lime-300 hover:bg-lime-50/50"
                >
                  <div className="font-black text-zinc-950 group-hover:text-lime-800">
                    {link.title}
                  </div>
                  {link.description ? (
                    <div className="mt-1.5 text-sm leading-6 text-zinc-500">
                      {link.description}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </aside>
        ) : null}
      </section>
    </main>
  );
}
