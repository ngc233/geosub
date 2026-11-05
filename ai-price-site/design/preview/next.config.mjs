// Separate development app. Never imported by the site's Next configuration.
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
export default function config(phase) {
  if (phase !== PHASE_DEVELOPMENT_SERVER || process.env.GEOSUB_V1_SAMPLE !== "1") {
    throw new Error("V1 sample is local-only: GEOSUB_V1_SAMPLE=1 and next dev are required; production build/start is forbidden.");
  }
  return { devIndicators: false };
}
