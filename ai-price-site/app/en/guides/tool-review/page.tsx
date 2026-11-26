import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";
import {
  getDefaultArticleQuickTools,
  getGuideHubCopy,
  getSiblingCoreGuideLinks,
} from "../../../../lib/guide-hub-copy";

export const metadata: Metadata = {
  title: "Tool Reviews",
  description:
    "Evaluate digital tools by real use case, capability limits, total cost, regional availability and dated evidence.",
};

export default function EnglishToolReviewPage() {
  const copy = getGuideHubCopy("en");
  return (
    <PublicGuidePage
      canvas
      locale="en"
      eyebrow={copy.toolReview.eyebrow}
      title={copy.toolReview.title}
      description={copy.toolReview.articleDescription}
      metadata={<span>{copy.coreArticleMeta(3, 3)}</span>}
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
      relatedLabel={copy.articleContinueTitle}
      relatedLinks={getSiblingCoreGuideLinks("en", "tool-review")}
      quickTools={getDefaultArticleQuickTools("en", "tool-review")}
    />
  );
}
