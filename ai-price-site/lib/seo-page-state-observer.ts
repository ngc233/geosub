import "server-only";

import { prisma } from "./prisma";
import {
  normalizeSeoPageObservation,
  type SeoPageObservationInput,
} from "./seo-page-lifecycle.ts";

export async function observeSeoPageState(input: SeoPageObservationInput) {
  const observation = normalizeSeoPageObservation(input);

  return prisma.$transaction(async (transaction) => {
    const state = await transaction.seoPageState.upsert({
      where: { canonicalPath: observation.canonicalPath },
      create: {
        locale: observation.locale,
        pageType: observation.pageType,
        canonicalPath: observation.canonicalPath,
        productId: observation.productId,
        productSlug: observation.productSlug,
        planId: observation.planId,
        planSlug: observation.planSlug,
        eligibilityState: observation.eligibilityState,
        indexingDecision: observation.indexingDecision,
        decisionSource: observation.decisionSource,
        effectiveAt: observation.effectiveAt,
        reason: observation.reason,
        policyVersion: observation.policyVersion,
      },
      update: {
        locale: observation.locale,
        pageType: observation.pageType,
        productId: observation.productId,
        productSlug: observation.productSlug,
        planId: observation.planId,
        planSlug: observation.planSlug,
        eligibilityState: observation.eligibilityState,
        indexingDecision: observation.indexingDecision,
        decisionSource: observation.decisionSource,
        effectiveAt: observation.effectiveAt,
        reason: observation.reason,
        policyVersion: observation.policyVersion,
      },
    });

    const history = await transaction.seoPageStateHistory.create({
      data: {
        seoPageStateId: state.id,
        locale: observation.locale,
        pageType: observation.pageType,
        canonicalPath: observation.canonicalPath,
        finalRobotsIndex: observation.finalRobotsIndex,
        finalRobotsFollow: observation.finalRobotsFollow,
        canonicalUrl: observation.canonicalUrl,
        qualityScore: observation.qualityScore,
        qualityStatus: observation.qualityStatus,
        sitemapIncluded: observation.sitemapIncluded,
        indexingDecision: observation.indexingDecision,
        triggerSource: observation.triggerSource,
        policyVersion: observation.policyVersion,
        experimentLockId: observation.experimentLockId,
        experimentLocked: observation.experimentLocked,
      },
    });

    return { state, history };
  });
}
