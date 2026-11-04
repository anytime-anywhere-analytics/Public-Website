# ca3.dk — Astro site

Static Astro site for the Center for Anytime Anywhere Analytics. No CMS, no client
framework: content is JSON in `src/data/`, pages are server-rendered at build time,
and the handful of interactions (header state, the people dome, the video dialog, the
faceted publication list, search) are plain scripts in `public/js/`.

## Run

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # astro build, shrink heavy images, then pagefind indexes dist/
npm run preview
```

Search runs on a Pagefind index that `npm run build` writes to `dist/pagefind/`. `astro dev`
serves that same folder (see `astro.config.mjs`), so local search works after one build but
reflects the content of that build; with no build yet, the overlay says the index is missing.

## Content

| File | What it holds |
|---|---|
| `src/data/site.json` | name, tagline, contact lines, funder logos, socials, grant |
| `src/data/members.json` | people; `group` is `faculty` / `current` / `close` / `alumni` / `external` — faculty and current members get portrait cards and the home-page dome, close collaborators smaller portrait cards right under them, alumni and external collaborators a quiet text list |
| `src/data/publications.json` | generated — see below |
| `src/data/yearbook.json` | the Yearbook: one entry per moment — the yearly retreat, a conference… — with `year`, `kind` ("Retreat", "Conference"), `title`, `place`, `when`, an optional `link` (e.g. the venue), two or three sentences of `text`, a main `photo`, and up to three more `photos`. Entries are grouped by year on the page and keep the file's order within a year (newest first). `draft: true` marks a placeholder. Photos go in `public/assets/img/yearbook/`. |

To change content, edit these files (and add images under `public/assets/`: `people/` for
portraits, `img/` for figures and the home-page `group.jpg`, `img/yearbook/` for the Yearbook)
and push to `main`. Images the site no longer uses are kept in [`archive/`](archive/) rather
than deleted; that folder is not built or deployed.

### Publications come from the AU research portal

```bash
npm run sync:pure              # all list pages
node scripts/fetch-pure.mjs --pages 2
```

The script walks `pure.au.dk/portal/en/persons/elm@cs.au.dk/publications/?page=N`,
opens every publication's own portal page for the abstract / venue / DOI / authors,
carries the hand-curated fields (`id`, `featured`, `hook`, `image`, `pdf`, `video`) over
from the existing `publications.json`, and rewrites it. Review the diff and commit it.

Pure is rate-limited and occasionally blocks datacentre IPs — run the sync from a
machine that can reach the portal.

## Hosting

The site is served by GitHub Pages at **ca3.dk** (custom domain set in the repo's Pages
settings). `.github/workflows/deploy.yml` builds every pull request as a check (no deploy),
and builds and deploys on every push to `main` and on demand (*Actions → Build and deploy →
Run workflow*). A failed build leaves the last good deploy online; the run log says why.

The site used to pull members and publications from a Google Sheet ("CA³ Site Content") and
photos from a Drive folder at build time. That was removed; the Apps Script and sync scripts
are in the git history before the commit that removed them.

## Analytics and the cookie banner

Google Analytics 4 is wired in directly (gtag.js, no Tag Manager) by `src/components/Analytics.astro`,
and only when `PUBLIC_GA_ID` (`G-…`) is set at build time — locally in `.env`, in CI as the repository
**variable** `GA_ID` (*Settings → Secrets and variables → Actions → Variables*). Without it there is no
script and no banner.

- **Opt-in only.** Nothing from Google loads before the visitor clicks *Accept*: Consent Mode v2 starts
  with everything denied, and gtag.js is injected only after consent. *Accept* and *Decline* look the
  same; the banner never blocks the page.
- **Changing your mind.** *Cookie settings* in the footer reopens the banner. Declining after accepting
  switches consent off and deletes the `_ga` cookies. The choice is stored in `localStorage` for 12
  months, then asked again; bump `VERSION` in the component to ask everyone again after a change.
- **What is sent.** Page views, with the site section (`home`, `people`, `publications`, `yearbook`…) as
  GA4's built-in `content_group`, and site searches as GA4's `search` event with `search_term`. Google
  signals and ad personalisation are off.
- **Privacy policy.** Set `PUBLIC_PRIVACY_URL` (CI variable `PRIVACY_URL`) and the banner links to it.

## Conventions worth knowing

- **Home page order:** hero (pitch, the group photo `/assets/img/group.jpg` and the director's
  quote) → about and the film → featured publications → the people dome → work card. To change
  the group photo, overwrite `public/assets/img/group.jpg`.
- **People first.** The people page leads with portrait cards. Only faculty and current members get that stage
  (`team` / `isActive` in `src/lib/data.ts`); alumni and collaborators are listed below
  in small type, and their profile pages keep the small round avatar.
- **Work with us** (`src/pages/work-with-us.astro`) covers positions, industry partnerships
  and research collaboration; its copy lives in that file. The header button
  and the `WorkCard` at the foot of most pages link there.
- **List rows** (publications) carry a square cover on the right via `RowThumb`;
  with no image the space is held empty and the hover state still shows the black
  arrow overlay.
- **Page heroes** on People, Publications and Work with us are plain: a title and one lead
  line. The publications list does not lean on teaser figures, since most papers have none yet.
- **Logo.** `Logo.astro` is a simplified version of the ca3.dk logo: its triangles and the three
  chevrons (the "A"s of Anytime / Anywhere / Analytics), without the lettering and with heavier
  chevrons so it holds up at 30px. It draws in `currentColor` (`--logo`): Aarhus University navy
  `#003d73`, which is also the site's primary colour; white in dark mode, over the hero and in the footer. `public/assets/ca3-mark.svg` is the same mark as a standalone file.
- **Filters** are a sidebar at ≥900px and a collapsible, headroom-aware sticky bar below
  that (`FilterRail`): it hides on scroll down, returns on scroll up, and stays put while open.
- **One header.** Transparent-over-hero on the home page (`overHero` prop on `Base`),
  solid frosted everywhere else. There is no second nav bar.
- **No scrollbars.** Native scrollbars are hidden; vertical progress is the accent bar at
  the top of the viewport.
- **Gradual blur** (`GBlur`) layers masked `backdrop-filter` divs at section seams —
  under the people dome.
- **Dark mode** follows `prefers-color-scheme` through the token block at the top of
  `src/styles/site.css`. Nothing else should hardcode a colour.
- **Pre-filtered links.** `/publications/?author=…` (or `?year=`, `?venue=`) arrives with that
  facet checked; `public/js/list.js` reads the params.
- **Selects** use `appearance: base-select` with `::picker(select)` styling, and fall back
  to a custom arrow where that is unsupported.
- **Pagefind metadata** is set per page with `<SearchMeta kind=… title=… meta=… />` (one element
  per key — Pagefind does not split a comma list, and titles contain commas); the search
  overlay groups results by `kind`. Blocks repeated across pages (the work card, the dome,
  "Related" papers) carry `data-pagefind-ignore` so they do not make every page match.
- Images sit in a `.ph` frame; with no image the frame shows a label saying what belongs
  there (e.g. a Yearbook placeholder's group photo).
- **Heavy images are shrunk at build time.** `scripts/optimize-images.mjs` re-encodes any
  `.png`/`.jpg` over 300 KB in `dist/assets/` as a ≤1600px WebP and repoints the built pages
  at it, so a 5 MB PNG costs ~200 KB on the page. Sources stay untouched;
  `og:image` keeps the original because some link-preview crawlers reject WebP.
- **Head metadata** comes from `Base`: pass `description` and `image` (used for link previews,
  defaulting to `/assets/img/share-image.jpg`). Long descriptions are clipped to 160 chars.
  `noindex` drops a page from search and the sitemap (the 404 page uses it).
- **Site URL.** Canonical, `og:url`, the sitemap and `robots.txt` use `site` from
  `astro.config.mjs` — `https://ca3.dk`, or `SITE_URL` if set (for a staging host).
