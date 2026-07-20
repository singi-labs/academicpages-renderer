import { describe, it, expect } from "vitest";
import { renderHeatmap, countToLevel, type HeatmapDataInput } from "./heatmap.js";

// A fixed "now" so the grid window is deterministic across runs.
const NOW = new Date("2026-07-20T12:00:00.000Z");

function data(overrides: Partial<HeatmapDataInput> = {}): HeatmapDataInput {
  return {
    days: [
      { date: "2026-07-14", total: 5, apps: [{ appId: "bluesky", count: 5 }] },
      {
        date: "2026-07-18",
        total: 2,
        apps: [
          { appId: "bluesky", count: 1 },
          { appId: "github", count: 1 },
        ],
      },
    ],
    thresholds: [1, 3, 6, 10],
    appTotals: [
      { appId: "bluesky", appName: "Bluesky", total: 6 },
      { appId: "github", appName: "GitHub", total: 1 },
    ],
    ...overrides,
  };
}

describe("countToLevel", () => {
  it("maps counts onto 0-4 buckets against the thresholds", () => {
    const t: [number, number, number, number] = [1, 3, 6, 10];
    expect(countToLevel(0, t)).toBe(0);
    expect(countToLevel(1, t)).toBe(1);
    expect(countToLevel(3, t)).toBe(2);
    expect(countToLevel(6, t)).toBe(3);
    expect(countToLevel(7, t)).toBe(4);
    expect(countToLevel(999, t)).toBe(4);
  });
});

describe("renderHeatmap", () => {
  it("returns an empty string when data is null", () => {
    expect(renderHeatmap(null, { now: NOW })).toBe("");
  });

  it("returns an empty string when there are no days", () => {
    expect(renderHeatmap(data({ days: [] }), { now: NOW })).toBe("");
  });

  it("returns an empty string when every day is empty", () => {
    const empty = data({
      days: [{ date: "2026-07-14", total: 0, apps: [] }],
      appTotals: [],
    });
    expect(renderHeatmap(empty, { now: NOW })).toBe("");
  });

  it("renders the summary stats: total actions, most-active app, apps active", () => {
    const html = renderHeatmap(data(), { now: NOW, daysBack: 180 });
    expect(html).toContain("7 activities in the last 6 months");
    expect(html).toContain("Most active: Bluesky");
    expect(html).toContain("2 apps active");
  });

  it("uses the singular 'activity' for a total of one", () => {
    const one = data({
      days: [{ date: "2026-07-18", total: 1, apps: [{ appId: "bluesky", count: 1 }] }],
      appTotals: [{ appId: "bluesky", appName: "Bluesky", total: 1 }],
    });
    const html = renderHeatmap(one, { now: NOW, daysBack: 180 });
    expect(html).toContain("1 activity in the last 6 months");
    expect(html).toContain("1 app active");
  });

  it("colours cells by intensity level using the shared thresholds", () => {
    const html = renderHeatmap(data(), { now: NOW });
    // 2026-07-14 has total 5 -> thresholds [1,3,6,10] -> level 3
    expect(html).toContain('class="heatmap-cell heat-lvl-3"');
    // 2026-07-18 has total 2 -> level 2
    expect(html).toContain('class="heatmap-cell heat-lvl-2"');
  });

  it("labels active cells with an accessible date + count title", () => {
    const html = renderHeatmap(data(), { now: NOW });
    expect(html).toContain('title="2026-07-14: 5 activities"');
    expect(html).toContain('title="2026-07-18: 2 activities"');
  });

  it("emits a grid whose cell count is a multiple of 7 (full week columns)", () => {
    const html = renderHeatmap(data(), { now: NOW, daysBack: 28 });
    const cells = html.match(/class="heatmap-cell/g) ?? [];
    expect(cells.length % 7).toBe(0);
    expect(cells.length).toBeGreaterThanOrEqual(28);
  });

  it("escapes the most-active app name", () => {
    const xss = data({
      appTotals: [{ appId: "x", appName: '<img src=x onerror=alert(1)>', total: 5 }],
    });
    const html = renderHeatmap(xss, { now: NOW });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("omits the most-active line when appTotals is empty but activity exists", () => {
    const noTotals = data({ appTotals: [] });
    const html = renderHeatmap(noTotals, { now: NOW });
    expect(html).toContain("7 activities in the last 6 months");
    expect(html).not.toContain("Most active:");
  });
});
