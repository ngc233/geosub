import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const files = {
  countryIndex: "app/public-country-index.css",
  article: "app/public-auxiliary-article.css",
  contact: "app/public-auxiliary-contact.css",
  evidence: "app/public-auxiliary-evidence.css",
} as const;

// Trusted, checked repository stylesheets, cached per server module in production
// and read fresh in development so local CSS edits hot-reload immediately.
const styles = {
  countryIndex: readFileSync(join(process.cwd(), files.countryIndex), "utf8"),
  article: readFileSync(join(process.cwd(), files.article), "utf8"),
  contact: readFileSync(join(process.cwd(), files.contact), "utf8"),
  evidence: readFileSync(join(process.cwd(), files.evidence), "utf8"),
};

export default function AuxiliaryStyles({ kind }: { kind: keyof typeof styles }) {
  const css =
    process.env.NODE_ENV === "development"
      ? readFileSync(join(process.cwd(), files[kind]), "utf8")
      : styles[kind];
  return <style data-gs-auxiliary={kind}>{css}</style>;
}
