# @singi-labs/academicpages-renderer

Pure HTML renderer for [academicpages](https://academicpages.github.io/)-style personal sites driven by [Sifa](https://sifa.id) profile data. No framework, no filesystem -- import and call.

## What it does

Takes a Sifa profile (structured identity) and parsed markdown sections, returns complete standalone HTML pages with:

- Top masthead with horizontal navigation
- Left sidebar with avatar, identity, and links
- Main content area with prose styling
- Sifa-branded footer
- Dark mode toggle (persisted to localStorage)
- Print-friendly layout (hides chrome)

## Usage

### Self-hosted static site

```javascript
import { fetchProfile } from '@singi-labs/sifa-sdk/query/fetchers';
import { parseSections, renderHome, renderSectionPage, sectionSlug, isSidebarOnly } from '@singi-labs/academicpages-renderer';
import { CSS } from '@singi-labs/academicpages-renderer/style';

// Fetch data from sifa.id
const profile = await fetchProfile({ baseUrl: 'https://sifa.id' }, 'your-handle.bsky.social');
const md = await fetch('https://sifa.id/p/your-handle.bsky.social.md').then(r => r.text());
const sections = parseSections(md);

// Render pages
const indexHtml = renderHome(profile, sections, { year: 2026, updated: '2026-07-15' });
for (const section of sections) {
  if (section.title.toLowerCase() === 'about') continue;
  if (isSidebarOnly(section.title)) continue;
  const html = renderSectionPage(profile, section, sections, { year: 2026 });
  // Write to dist/${sectionSlug(section.title)}.html
}
```

See [sifa-academicpages](https://github.com/singi-labs/sifa-academicpages) for a complete self-hosting scaffold.

### Server-rendered (Next.js, Fastify, etc.)

```typescript
import { renderHome, parseSections } from '@singi-labs/academicpages-renderer';
import { getCSS } from '@singi-labs/academicpages-renderer/style';

// Override asset paths for your hosting setup
const html = renderHome(profile, sections, {
  paths: {
    css: '/api/style',
    assetDir: '/static/academic',
    fontDir: '/fonts/academic',
    favicon: '/static/academic/favicon.svg',
  },
  og: {
    title: 'Jane Doe - Academic CV',
    description: 'Academic profile on Sifa ID',
    url: 'https://example.com/p/jane/academic',
  },
});
```

## API

### `parseSections(md: string): ParsedSection[]`

Parse a markdown string into sections keyed by `##` headings.

### `renderHome(profile, sections, ctx?): string`

Render the home/about page. Returns a complete HTML document.

### `renderSectionPage(profile, section, sections, ctx?): string`

Render a section page (Experience, Education, etc.). Returns a complete HTML document.

### `sectionSlug(title: string): string`

Convert a section title to a URL-safe slug.

### `isSidebarOnly(title: string): boolean`

Returns `true` for sections that render in the sidebar (currently "Links").

### `getCSS(opts?): string`

Generate the stylesheet. Pass `{ fontDir: '/custom/path' }` to override font paths.

### `CSS: string`

Default stylesheet (equivalent to `getCSS()`).

## Static assets

The package includes fonts and SVG logos under `static/`. Import them via the package exports:

```
@singi-labs/academicpages-renderer/static/fonts/quattro-regular.woff2
@singi-labs/academicpages-renderer/static/assets/sifa-logo.svg
```

Or copy them to your build output:

```bash
cp -r node_modules/@singi-labs/academicpages-renderer/static/* dist/
```

## Data requirements

The renderer expects two data inputs:

1. **Profile** -- a structurally-compatible SDK `Profile` object. At minimum: `handle`, `displayName`. Optional: `headline`, `about`, `avatar`, `website`, `location*`, `externalAccounts`.

2. **Sections** -- parsed markdown from the Sifa `.md` export (`/p/{handle}.md`). Use `parseSections()` to convert the raw markdown string.

## License

MIT. See [LICENSE](./LICENSE).

Fonts: Quattro (SIL Open Font License), Space Grotesk (SIL Open Font License). See `static/fonts/LICENSE.txt`.
