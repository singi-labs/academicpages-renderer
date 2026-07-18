---
"@singi-labs/sifa-page-renderer": patch
---

Add an optional `href` to `ActivityNavConfig` so callers can point the "Now" activity nav entry at a custom URL (e.g. a single-page host's per-handle `/gui.do/now` route) instead of the default `now.html`. The href is validated and escaped -- absolute `http(s)` URLs and same-origin relative paths are allowed, executable schemes like `javascript:` are rejected and fall back to `now.html`. Active-state highlighting stays keyed on the `now` slug, so a custom href still highlights on the activity page. When `href` is unset the nav output is byte-identical to before.
