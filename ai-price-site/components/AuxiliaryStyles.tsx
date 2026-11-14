import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Trusted, checked repository stylesheets, read once per server module.
// Each route emits only its own rules, without another blocking request.
const styles = {
  article: readFileSync(join(process.cwd(), "app/public-auxiliary-article.css"), "utf8"),
  contact: readFileSync(join(process.cwd(), "app/public-auxiliary-contact.css"), "utf8"),
  evidence: readFileSync(join(process.cwd(), "app/public-auxiliary-evidence.css"), "utf8"),
};
export default function AuxiliaryStyles({ kind }: { kind: keyof typeof styles }) {
  return <style data-gs-auxiliary={kind}>{styles[kind]}</style>;
}
