---
"@singi-labs/sifa-page-renderer": patch
---

Make the "Now" page heatmap fill the available width and show a reliable hover tooltip. The grid is now fluid (square cells on 1fr week columns, capped cell size on very wide containers) instead of a fixed 11px grid that only covered part of the column. The per-day breakdown moved from the native `title` attribute (unreliable and unstyled on the tiny cells) to a styled CSS `:hover` tooltip driven by `data-tip`, with the grid keeping its accessible summary via `role="img"`.
