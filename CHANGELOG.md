# @singi-labs/academicpages-renderer

## 0.2.2

### Patch Changes

- Widen `AcademicProfile` field types to accept `null` (matching the SDK
  `Profile` type, which uses `string | null` for optional fields). Fixes a
  typecheck failure when passing a real SDK profile directly to `renderHome`,
  `renderSectionPage`, or `renderSinglePage`.

## 0.2.1

### Patch Changes

- Add `renderSinglePage()` for server-rendered contexts that serve all sections
  through one route (e.g. sifa-web's `/p/{handle}/academic`). Sections render as
  hidden `<section>` blocks switched via hash-based nav (`#career`, `#education`,
  ...) instead of separate `.html` files.

## 0.2.0

### Minor Changes

- f5321e1: Initial release: pure HTML renderer for academicpages-style personal sites driven by Sifa profile data. Includes renderHome, renderSectionPage, parseSections, configurable asset paths, OG meta tag support, and bundled fonts/logos.
