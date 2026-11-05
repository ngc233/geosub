import "../../../../app/globals.css";
// These imports belong only to the isolated local app, not ai-price-site/app.
import "../../../../app/public-tokens.css";
import "../../../../app/public-base.css";
import "../../../../app/public-components.css";
import "../../../../app/public-motion.css";

export default function PreviewScope({ children }: { children: React.ReactNode }) {
  return <div className="gs-public-unified" style={{ minHeight: "100vh" }}>{children}</div>;
}
