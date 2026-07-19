---
"@singi-labs/sifa-page-renderer": patch
---

Add optional `RenderContext.profileHomeHref` so single-page hosts can point the section nav back at the profile home. When set, the About/index section links to `profileHomeHref` and every other section links to `profileHomeHref` + `#` + slug (e.g. `/gui.do#career`), in both the masthead and mobile bottom nav. This fixes the activity ("Now") page's section links resolving to `page.sifa.id/{handle}/career.html` and 404ing. The "Now" activity entry keeps its own href and active-state; the value is validated/escaped like `activityStream.href`. Byte-identical output when unset.
