/**
 * Pure-HTML activity heatmap for the "Now" page, rendered from the same
 * `/api/activity/:id/heatmap` payload that powers sifa-web's `/activity`
 * Activity Bar. The intensity engine (thresholds -> level -> opacity) mirrors
 * sifa-web's `heatmap-colors.ts` so page.sifa.id and `/activity` stay in step:
 * the AppView computes real per-day counts by walking PDS records, so this grid
 * is honest for the full window (not limited to the 50-item stream snapshot).
 */
import { escapeHtml } from "./util.js";

/** One day of activity, matching the AppView `HeatmapDay` shape. */
export interface HeatmapDayInput {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  apps: { appId: string; count: number }[];
}

/**
 * The subset of the AppView `HeatmapResponse` this renderer consumes.
 * Structurally compatible with the SDK's `HeatmapResponse` so callers can pass
 * it straight through without a translation step.
 */
export interface HeatmapDataInput {
  days: HeatmapDayInput[];
  thresholds: [number, number, number, number];
  appTotals?: { appId: string; appName: string; total: number }[];
}

export interface RenderHeatmapOptions {
  /** Reference "today". Defaults to the current date. */
  now?: Date;
  /** How many days back the grid covers. Default 180 (matches `/activity`). */
  daysBack?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS_BACK = 180;

/** Bucket a day's total into a 0-4 intensity level (mirrors `heatmap-colors.ts`). */
export function countToLevel(
  count: number,
  thresholds: [number, number, number, number]
): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
}

/** UTC `YYYY-MM-DD` for a Date, matching the AppView's `createdAt.slice(0,10)` keys. */
function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC midnight of the given date. */
function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/**
 * Render the activity heatmap as an HTML `<section>`, or an empty string when
 * there is nothing to show (null payload, no days, or zero activity) so the
 * "Now" page simply omits the header.
 */
export function renderHeatmap(
  data: HeatmapDataInput | null | undefined,
  options: RenderHeatmapOptions = {}
): string {
  if (!data || data.days.length === 0) return "";

  const totalActions = data.days.reduce((sum, d) => sum + Math.max(0, d.total), 0);
  if (totalActions === 0) return "";

  const daysBack =
    options.daysBack && options.daysBack > 0 ? options.daysBack : DEFAULT_DAYS_BACK;
  const months = Math.max(1, Math.round(daysBack / 30));

  // --- summary stats -------------------------------------------------------
  const stats: string[] = [
    `<span class="heatmap-stat-total">${escapeHtml(
      plural(totalActions, "activity", "activities")
    )} in the last ${months} months</span>`,
  ];

  const appTotals = data.appTotals ?? [];
  const mostActive = appTotals[0];
  if (mostActive) {
    stats.push(
      `<span class="heatmap-stat-app">Most active: ${escapeHtml(mostActive.appName)}</span>`
    );
  }

  const appCount = appTotals.length > 0
    ? appTotals.length
    : new Set(data.days.flatMap((d) => d.apps.map((a) => a.appId))).size;
  if (appCount > 0) {
    stats.push(
      `<span class="heatmap-stat-count">${escapeHtml(
        plural(appCount, "app active", "apps active")
      )}</span>`
    );
  }

  // --- grid ----------------------------------------------------------------
  const dayMap = new Map<string, number>();
  for (const d of data.days) dayMap.set(d.date, Math.max(0, d.total));

  const now = options.now ?? new Date();
  const end = utcMidnight(now);

  // Start `daysBack` before today, then roll back to the previous Monday so the
  // first column is a full week (weekStart = Monday).
  const startRaw = new Date(end.getTime() - daysBack * DAY_MS);
  const startDow = startRaw.getUTCDay(); // 0 = Sun .. 6 = Sat
  const backToMon = startDow === 0 ? 6 : startDow - 1;
  const start = new Date(startRaw.getTime() - backToMon * DAY_MS);

  // Roll `end` forward to the Sunday of its week so the last column is full too.
  const endDow = end.getUTCDay();
  const forwardToSun = endDow === 0 ? 0 : 7 - endDow;
  const gridEnd = new Date(end.getTime() + forwardToSun * DAY_MS);

  const cells: string[] = [];
  for (let t = start.getTime(); t <= gridEnd.getTime(); t += DAY_MS) {
    const day = new Date(t);
    if (t > end.getTime()) {
      // Future padding cell in the current week: no data, not labelled.
      cells.push('<div class="heatmap-cell heat-lvl-0 heatmap-cell-future"></div>');
      continue;
    }
    const dateStr = utcDateStr(day);
    const count = dayMap.get(dateStr) ?? 0;
    const level = countToLevel(count, data.thresholds);
    const title = escapeHtml(`${dateStr}: ${plural(count, "activity", "activities")}`);
    cells.push(`<div class="heatmap-cell heat-lvl-${level}" title="${title}"></div>`);
  }

  return (
    `<section class="now-heatmap" aria-label="Activity heatmap">` +
    `<div class="heatmap-stats">${stats.join("")}</div>` +
    `<div class="heatmap-grid" role="img" aria-label="${escapeHtml(
      `${plural(totalActions, "activity", "activities")} over the last ${months} months`
    )}">${cells.join("")}</div>` +
    `</section>`
  );
}
