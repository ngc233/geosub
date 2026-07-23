import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "Tool Reviews",
  description:
    "Evaluate digital tools by real use case, capability limits, total cost, regional availability and dated evidence.",
};

export default function EnglishToolReviewPage() {
  return (
    <PublicGuidePage
      eyebrow="Tool Review"
      title="How to decide whether a digital tool is worth subscribing to"
      description="Do not rely on a feature list or one benchmark. Define the use case, then compare capability, limits and ongoing cost."
      sections={[
        {
          title: "Start with your actual tasks",
          body: "List frequent tasks, required capabilities and unacceptable limits. Chat, coding, image, search and collaboration tools need different evaluation criteria.",
        },
        {
          title: "Compare total cost, not the lowest headline",
          body: "Consider billing cycle, usage limits, included features, tax, currency conversion and regional availability. A cheaper plan may omit the capability you need.",
        },
        {
          title: "Check the evidence date",
          body: "Models, plan benefits and prices change. Look for the tested version, date, method and reproducible evidence before treating a review conclusion as current.",
        },
      ]}
      note="The most reliable decision comes from testing your own tasks. Scores and price comparisons should narrow the options, not replace direct experience."
    />
  );
}
