---
"@singi-labs/sifa-page-renderer": patch
---

Add an activity heatmap header to the "Now" page. `renderHeatmap` draws a GitHub-style contribution grid plus summary stats (total activities, most-active app, apps active) from the AppView's `/api/activity/:id/heatmap` payload — the same real per-day counts that power sifa-web's `/activity` Activity Bar, so the grid is honest for the whole window rather than limited to the stream snapshot. `renderActivityPage` accepts an optional heatmap argument and renders it above the stream; the header is omitted when there is no activity.
