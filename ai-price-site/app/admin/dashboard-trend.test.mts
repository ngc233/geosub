import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTrendCsv,
  getNiceAxisScale,
  getTrendChangePercent,
  getTrendLabelStep,
  shouldShowTrendLabel,
} from "./dashboard-trend.ts";

test("trend axis uses readable integer ticks with headroom", () => {
  assert.deepEqual(getNiceAxisScale(334), {
    axisMax: 400,
    ticks: [0, 100, 200, 300, 400],
  });
  assert.deepEqual(getNiceAxisScale(88), {
    axisMax: 100,
    ticks: [0, 25, 50, 75, 100],
  });
  assert.deepEqual(getNiceAxisScale(1), {
    axisMax: 4,
    ticks: [0, 1, 2, 3, 4],
  });
});

test("trend labels use a fixed interval without forcing a drifting final label", () => {
  assert.equal(getTrendLabelStep(7), 1);
  assert.equal(getTrendLabelStep(30), 3);
  assert.deepEqual(
    Array.from({ length: 30 }, (_, index) => index).filter((index) =>
      shouldShowTrendLabel(index, 30),
    ),
    [0, 3, 6, 9, 12, 15, 18, 21, 24, 27],
  );
});

test("trend comparison handles zero baselines without fake percentages", () => {
  assert.equal(getTrendChangePercent(120, 100), 20);
  assert.equal(getTrendChangePercent(80, 100), -20);
  assert.equal(getTrendChangePercent(0, 0), 0);
  assert.equal(getTrendChangePercent(10, 0), null);
});

test("trend csv follows the visible series and comparison state", () => {
  const csv = buildTrendCsv({
    trend: [{ label: "8/14", pageViews: 20, clicks: 5 }],
    previousTrend: [{ label: "8/7", pageViews: 12, clicks: 3 }],
    showPageViews: true,
    showClicks: false,
    compare: true,
  });

  assert.equal(
    csv,
    "当前日期,当前访问量,上一周期日期,上一周期访问量\r\n8/14,20,8/7,12",
  );
  assert.doesNotMatch(csv, /点击事件/);
});
