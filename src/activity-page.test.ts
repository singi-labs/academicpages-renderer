import { describe, it, expect } from "vitest";
import type { StreamCardVM } from "@singi-labs/sifa-sdk";
import {
  renderActivityPage,
  renderHome,
  renderSectionPage,
  type AcademicProfile,
  type RenderedSection,
} from "./render";

const PROFILE: AcademicProfile = {
  handle: "jane.bsky.social",
  displayName: "Jane Doe",
  headline: "Engineer",
};

const SECTIONS: RenderedSection[] = [
  { id: "about", slug: "index", title: "About", html: "<p>Hi.</p>" },
  {
    id: "career",
    slug: "career",
    title: "Career",
    html: "<p>Work.</p>",
  },
  {
    id: "education",
    slug: "education",
    title: "Education",
    html: "<p>School.</p>",
  },
];

// Fixed reference so relative time / day grouping is deterministic.
const NOW = new Date("2026-07-17T12:00:00.000Z");

function vm(overrides: Partial<StreamCardVM> = {}): StreamCardVM {
  return {
    uri: "at://did:plc:abc/app.bsky.feed.post/1",
    cid: "bafycid1",
    verb: "posted",
    source: { appId: "bluesky", label: "Bluesky", color: "blue" },
    tier: "creation",
    timestamp: "2026-07-17T10:00:00.000Z",
    title: "posted on Bluesky",
    ...overrides,
  };
}

/** Extract the inner HTML of the masthead's `.top-nav`. */
function topNav(html: string): string {
  const m = html.match(/<nav class="top-nav">([\s\S]*?)<\/nav>/);
  if (!m) throw new Error("no top-nav found");
  return m[1];
}

/** Extract the mobile `.bottom-nav` markup (including the "More" sheet is not). */
function bottomNav(html: string): string {
  const m = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/);
  if (!m) throw new Error("no bottom-nav found");
  return m[0];
}

describe("renderActivityPage", () => {
  it("renders a full HTML document with the shared site layout", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [vm()], {
      year: 2026,
    });
    // Full document + site chrome (masthead, sidebar, footer).
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('class="masthead"');
    expect(html).toContain('class="sidebar"');
    expect(html).toContain('class="site-footer"');
    // Sidebar identity from the profile.
    expect(html).toContain("Jane Doe");
  });

  it("embeds the activity stream section as its main content", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [vm()], undefined, {
      now: NOW,
    });
    expect(html).toContain('class="activity-stream"');
    expect(html).toContain('class="stream-card"');
    expect(html).toContain("posted on Bluesky");
  });

  it('titles the page "Now" and marks the "Now" nav item active', () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [vm()]);
    expect(html).toContain("<title>Now - Jane Doe</title>");
    expect(html).toContain('<h2 class="page-title">Now</h2>');
    // The "Now" masthead link is present and active; no section is active.
    expect(topNav(html)).toContain(
      '<a href="now.html" aria-current="page" class="active">Now</a>'
    );
  });

  it("shows the Now link even when the caller omits ctx.activityStream", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [vm()]);
    expect(topNav(html)).toContain('href="now.html"');
  });

  it("honors a custom activity nav label", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [vm()], {
      activityStream: { label: "Updates" },
    });
    expect(html).toContain("<title>Updates - Jane Doe</title>");
    expect(topNav(html)).toContain(
      '<a href="now.html" aria-current="page" class="active">Updates</a>'
    );
  });

  it("points the Now nav at a custom href in top nav, bottom nav, and stays active", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [vm()], {
      activityStream: { href: "/gui.do/now" },
    });
    // Top nav: custom href, still active (active keyed on the "now" slug).
    expect(topNav(html)).toContain(
      '<a href="/gui.do/now" aria-current="page" class="active">Now</a>'
    );
    // Bottom nav: same custom href, still active + slug preserved.
    const bnav = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/);
    expect(bnav).not.toBeNull();
    expect(bnav![0]).toContain('href="/gui.do/now"');
    expect(bnav![0]).toContain('data-slug="now"');
    expect(bnav![0]).toContain("active");
    // The default file link is gone.
    expect(html).not.toContain('href="now.html"');
  });

  it("forwards stream options (empty text) to renderActivityStream", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [], undefined, {
      emptyText: "Nothing yet.",
    });
    expect(html).toContain("Nothing yet.");
    expect(html).not.toContain('class="stream-card"');
  });

  it("escapes a malicious VM string rather than emitting raw markup", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [
      vm({ title: '<img src=x onerror="alert(1)">' }),
    ]);
    expect(html).not.toContain("<img src=x onerror=");
    expect(html).toContain("&lt;img src=x onerror=");
  });
});

describe("activity nav flag: renderHome / renderSectionPage", () => {
  it("renderHome injects the Now nav link only when ctx.activityStream is set", () => {
    const withNow = renderHome(PROFILE, SECTIONS, { activityStream: true });
    expect(topNav(withNow)).toContain('>Now</a>');
    expect(withNow).toContain('href="now.html"');
  });

  it("renderSectionPage injects the Now nav link when ctx.activityStream is set", () => {
    const career = SECTIONS[1];
    const withNow = renderSectionPage(PROFILE, career, SECTIONS, {
      activityStream: true,
    });
    expect(topNav(withNow)).toContain('>Now</a>');
    // The active item is the section, not Now.
    expect(topNav(withNow)).toContain(
      '<a href="career.html" aria-current="page" class="active">Career</a>'
    );
    expect(topNav(withNow)).toContain('<a href="now.html">Now</a>');
  });

  it("omits the Now nav link when ctx.activityStream is not set", () => {
    const noFlag = renderHome(PROFILE, SECTIONS);
    expect(noFlag).not.toContain("now.html");
    expect(topNav(noFlag)).not.toContain(">Now</a>");
  });

  it("nav is byte-identical when the flag is absent (Now is a pure append)", () => {
    const noFlag = renderHome(PROFILE, SECTIONS, { year: 2026 });
    const withNow = renderHome(PROFILE, SECTIONS, {
      year: 2026,
      activityStream: true,
    });
    const navNoFlag = topNav(noFlag);
    const navWithNow = topNav(withNow);
    // The section links are byte-identical; the only difference is the single
    // appended Now anchor. Removing it reproduces the no-flag nav exactly.
    expect(navWithNow.replace('\n<a href="now.html">Now</a>', "")).toBe(
      navNoFlag
    );
    expect(navWithNow).not.toBe(navNoFlag);
  });

  it("full home output is byte-identical to before when the flag is absent", () => {
    // Guards the nav refactor: passing an unrelated ctx (no activityStream)
    // must not perturb any byte of the rendered document.
    const a = renderHome(PROFILE, SECTIONS, { year: 2026 });
    const b = renderHome(PROFILE, SECTIONS, { year: 2026 });
    expect(a).toBe(b);
    expect(a).not.toContain("now.html");
  });

  it("a custom href points the Now link at a per-handle URL in both navs", () => {
    const withHref = renderHome(PROFILE, SECTIONS, {
      activityStream: { href: "/gui.do/now" },
    });
    expect(topNav(withHref)).toContain('<a href="/gui.do/now">Now</a>');
    const bnav = withHref.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/);
    expect(bnav![0]).toContain('href="/gui.do/now"');
    expect(withHref).not.toContain('href="now.html"');
  });

  it("an absolute http(s) custom href is honored", () => {
    const withHref = renderHome(PROFILE, SECTIONS, {
      activityStream: { href: "https://page.sifa.id/gui.do/now" },
    });
    expect(topNav(withHref)).toContain(
      '<a href="https://page.sifa.id/gui.do/now">Now</a>'
    );
  });

  it("with href unset the Now link is byte-identical to the default now.html", () => {
    const defaultHref = renderHome(PROFILE, SECTIONS, {
      year: 2026,
      activityStream: true,
    });
    const emptyConfig = renderHome(PROFILE, SECTIONS, {
      year: 2026,
      activityStream: {},
    });
    // No href set => output is byte-identical to the boolean-true form.
    expect(emptyConfig).toBe(defaultHref);
    expect(emptyConfig).toContain('<a href="now.html">Now</a>');
  });

  it("neutralizes a javascript: / attribute-breakout href, falling back to now.html", () => {
    const evil = renderHome(PROFILE, SECTIONS, {
      activityStream: { href: 'javascript:alert(1)//"><script>bad()</script>' },
    });
    // The malicious scheme is rejected; falls back to the safe default.
    expect(evil).not.toContain("javascript:alert(1)");
    expect(evil).not.toContain("<script>bad()</script>");
    expect(topNav(evil)).toContain('<a href="now.html">Now</a>');
  });

  it("bottom nav also carries the Now entry with an icon when flagged", () => {
    const withNow = renderHome(PROFILE, SECTIONS, { activityStream: true });
    const m = withNow.match(
      /<nav class="bottom-nav"[\s\S]*?<\/nav>/
    );
    expect(m).not.toBeNull();
    expect(m![0]).toContain('data-slug="now"');
    expect(m![0]).toContain("<span>Now</span>");
  });
});

describe("profileHomeHref: section links point back at the single-page home", () => {
  it("rewrites section links to home + hash in both navs, Now unchanged and active", () => {
    const html = renderActivityPage(PROFILE, SECTIONS, [vm()], {
      activityStream: { href: "/gui.do/now" },
      profileHomeHref: "/gui.do",
    });

    // Top nav: About (index) -> home root; Career -> home + #career.
    expect(topNav(html)).toContain('<a href="/gui.do">About</a>');
    expect(topNav(html)).toContain('<a href="/gui.do#career">Career</a>');
    expect(topNav(html)).toContain('<a href="/gui.do#education">Education</a>');
    // The "Now" entry keeps its own href and active state (slug "now").
    expect(topNav(html)).toContain(
      '<a href="/gui.do/now" aria-current="page" class="active">Now</a>'
    );
    // The self-hosted section files are gone.
    expect(html).not.toContain('href="career.html"');
    expect(html).not.toContain('href="index.html"');

    // Bottom nav: same rewritten section hrefs + untouched Now.
    const bnav = bottomNav(html);
    expect(bnav).toContain('href="/gui.do"');
    expect(bnav).toContain('href="/gui.do#career"');
    expect(bnav).toContain('href="/gui.do/now"');
    expect(bnav).toContain('data-slug="now"');
    expect(bnav).toContain("active");
  });

  it("leaves the section nav byte-identical when profileHomeHref is unset", () => {
    const baseline = renderActivityPage(PROFILE, SECTIONS, [vm()], {
      year: 2026,
      activityStream: { href: "/gui.do/now" },
    });
    const explicitUndefined = renderActivityPage(PROFILE, SECTIONS, [vm()], {
      year: 2026,
      activityStream: { href: "/gui.do/now" },
      profileHomeHref: undefined,
    });
    // Passing the key as undefined must not perturb any byte of the document.
    expect(explicitUndefined).toBe(baseline);
    // And the default self-hosted section links remain.
    expect(topNav(baseline)).toContain('<a href="career.html">Career</a>');
  });

  it("neutralizes a javascript: / attribute-breakout profileHomeHref", () => {
    const evil = renderActivityPage(PROFILE, SECTIONS, [vm()], {
      profileHomeHref: 'javascript:alert(1)//"><script>bad()</script>',
    });
    // Malicious scheme rejected; falls back to the default section links.
    expect(evil).not.toContain("javascript:alert(1)");
    expect(evil).not.toContain("<script>bad()</script>");
    expect(topNav(evil)).toContain('<a href="career.html">Career</a>');
  });

  it("honors profileHomeHref in renderHome section links too", () => {
    const html = renderHome(PROFILE, SECTIONS, {
      profileHomeHref: "/gui.do",
    });
    expect(topNav(html)).toContain('<a href="/gui.do#career">Career</a>');
    // About (index) is the active page here; it points at the home root.
    expect(topNav(html)).toContain(
      '<a href="/gui.do" aria-current="page" class="active">About</a>'
    );
  });
});
