import assert from "node:assert/strict";
import test from "node:test";
import {
  assessPlanOperationalStatus,
  assessPriceOperationalStatus,
  assessProductOperationalStatus,
  countAdminOperationalAssessments,
  getAdminOperationalTotal,
} from "./admin-operational-status.ts";

test("archived records never enter active operational counts", () => {
  const archived = assessPlanOperationalStatus({
    publishStatus: "ARCHIVED",
    priceCount: 20,
    verifiedPriceCount: 20,
  });
  const active = assessPlanOperationalStatus({
    publishStatus: "PUBLISHED",
    priceCount: 20,
    verifiedPriceCount: 20,
  });
  const counts = countAdminOperationalAssessments([archived, active]);

  assert.equal(archived, null);
  assert.equal(getAdminOperationalTotal(counts), 1);
  assert.deepEqual(counts, {
    not_started: 0,
    pending: 0,
    exception: 0,
    published: 1,
  });
});

test("all active records equal the sum of the four operational states", () => {
  const assessments = [
    assessProductOperationalStatus({ publishStatus: "DRAFT" }),
    assessProductOperationalStatus({
      publishStatus: "REVIEW",
      planCount: 1,
      priceCount: 1,
      pendingWorkCount: 1,
    }),
    assessProductOperationalStatus({
      publishStatus: "PUBLISHED",
      planCount: 1,
      priceCount: 1,
      missingSourceCount: 1,
    }),
    assessProductOperationalStatus({
      publishStatus: "PUBLISHED",
      planCount: 1,
      publishedPriceCount: 1,
    }),
    assessProductOperationalStatus({
      publishStatus: "ARCHIVED",
      planCount: 1,
      publishedPriceCount: 1,
    }),
  ];
  const counts = countAdminOperationalAssessments(assessments);

  assert.equal(getAdminOperationalTotal(counts), 4);
  assert.deepEqual(counts, {
    not_started: 1,
    pending: 1,
    exception: 1,
    published: 1,
  });
});

test("hard issues outrank pending work and published data", () => {
  const assessment = assessProductOperationalStatus({
    publishStatus: "PUBLISHED",
    planCount: 2,
    activeCollectorJobCount: 1,
    publishedPriceCount: 30,
    pendingWorkCount: 4,
    hardIssueCount: 1,
  });

  assert.equal(assessment?.status, "exception");
});

test("estimated prices stay pending until they are verified", () => {
  assert.equal(
    assessPriceOperationalStatus({
      status: "PUBLISHED",
      dataQuality: "ESTIMATED",
      hasSource: true,
    })?.status,
    "pending",
  );
  assert.equal(
    assessPriceOperationalStatus({
      status: "PUBLISHED",
      dataQuality: "VERIFIED",
      hasSource: true,
    })?.status,
    "published",
  );
});

test("missing source is an exception even when the record is published", () => {
  assert.equal(
    assessPriceOperationalStatus({
      status: "PUBLISHED",
      dataQuality: "VERIFIED",
      hasSource: false,
    })?.status,
    "exception",
  );
});
