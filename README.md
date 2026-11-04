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
| `src/data/members.json` | people; `group` is `faculty` / `current` / `alumni` / `external` — faculty and current members get portrait cards and the home-page dome, alumni and external collaborators a quiet text list |
| `src/data/publications.json` | generated — see below |
| `src/data/yearbook.json` | the Yearbook: one entry per moment — the yearly retreat, a conference… — with `year`, `kind` ("Retreat", "Conference"), `title`, `place`, `when`, an optional `link` (e.g. the venue), two or three sentences of `text`, a main `photo`, and up to three more `photos`. Entries are grouped by year on the page and keep the file's order within a year (newest first). `draft: true` marks a placeholder. Not in the Sheets CMS yet — edit the file. Photos go in `public/assets/img/yearbook/`. |

`pillars.json`, `testbeds.json`, `posts.json` and `stats.json` are still pulled from the
sheet but the site no longer shows them (news and research areas were removed to keep the
focus on people). Members' `areas` and publications' `pillar` / `testbed` are likewise unused.

### Publications come from the AU research portal

```bash
npm run sync:pure              # all list pages
node scripts/fetch-pure.mjs --pages 2
```

The script walks `pure.au.dk/portal/en/persons/elm@cs.au.dk/publications/?page=N`,
opens every publication's own portal page for the abstract / venue / DOI / authors,
carries the hand-curated fields (`id`, `pillar`, `testbed`, `featured`, `hook`, `image`,
`pdf`, `video`) over from the existing `publications.json`, and rewrites it. When the
Sheets CMS is configured, `npm run sync:pure` ends by pushing the result into the
**Publications** tab (upsert by `id`; non-empty curated cells in the sheet win), so the
next rebuild does not undo it. Papers with no pillar assigned are listed at the end of the run.

Pure is rate-limited and occasionally blocks datacentre IPs — run the sync from a
machine that can reach the portal.

## Google Sheets CMS

Day-to-day content lives in one Google Sheet — **CA³ Site Content** — with a tab per
data file: `Site`, `Pillars`, `Testbeds`, `Members`, `Posts`, `Publications`, `Stats`.
Column headers are the JSON keys; a note on each header says the format. Every build
(`prebuild`) pulls the sheet and rewrites `src/data/*.json`, so a daily rebuild picks
up whatever was edited. `src/data/*.json` stays checked in as the fallback and the
diff record.

Cell conventions — the form in the sheet enforces them, and header notes repeat them:

| Type | In the cell |
|---|---|
| list (`authors`, `areas`, `keywords`, `images`, `contact`) | one item per line |
| paragraphs (`body`, `abstract`) | paragraphs separated by a blank line |
| pairs (`links`, `social`, `funders`) | `Label \| URL`, one per line |
| dates | `YYYY-MM-DD` (the column is text-formatted so Sheets does not "help") |
| checkboxes (`Posts.video`) | tick = `true`; unticked = key omitted |
| `pillar` / `testbed` / `group` / `kind` / `tag` / `type` / `by` | dropdowns; `tag` and `by` accept a typed value |
| empty cell | key omitted (`pillar`/`testbed` become `null`; list fields become `[]`) |

Nested keys use dots (`article.href`, `film.still`). A column whose header starts with
`_` is ignored, so notes can live there.

### One-time setup

1. Open the sheet → **Extensions → Apps Script**. Delete the default `Code.gs`, then add
   the three files from [`cms/`](cms/): `Code.gs`, `Form.html`, `Import.html` (names must
   match). In *Project Settings* tick "Show appsscript.json" and paste
   [`cms/appsscript.json`](cms/appsscript.json). Save.
2. Reload the sheet. A **CA³ CMS** menu appears. Run **Set up tabs** (authorise when asked)
   — it creates the tabs, headers, dropdowns and formatting without touching data.
3. **CA³ CMS → Import JSON files…** and pick `src/data/*.json` (all seven at once). This
   seeds the tabs with the current site content.
4. **CA³ CMS → Set API token…** — leave blank to generate one. Keep it; the site needs it.
5. **Deploy → New deployment → Web app**, *Execute as: Me*, *Who has access: Anyone*.
   Copy the `…/exec` URL. (Nobody can read the sheet through it without the token.)
6. Give the site the two values, locally in `.env` (see `.env.example`) and in the host's
   build environment:

   ```
   CMS_URL=https://script.google.com/macros/s/…/exec
   CMS_TOKEN=…
   ```

After editing `Code.gs` later, **Deploy → Manage deployments → ✎ → Version: New** — the
URL stays the same. Data edits never need a redeploy.

### Editing

- Type straight into the cells, or use **CA³ CMS → Add row…** / **Edit selected row…**
  for a form with the right control per field (dropdowns, checkbox, multi-line boxes) and
  an auto-filled `id`. Ids are the URL slugs — keep them stable once published.
- **Validate** reports missing required fields, duplicate ids, unknown pillar titles,
  bylines that do not match a member, and duplicate `featured` ranks.
- **Preview JSON for this tab** shows exactly what the site will receive.
- The `Site` tab is key/value; everything else is one row per record.

### How a build reads it

```bash
npm run sync:sheets     # pull now and rewrite src/data/*.json
npm run sync:assets     # mirror the Drive assets folder into public/assets/
npm run build           # prebuild runs both pulls when CMS_URL/CMS_TOKEN are set
npm run push:sheets publications   # push a local JSON file into the sheet (upsert by id)
npm run test:cms        # round-trip every record through the sheet encoding, offline
```

`fetch-sheets.mjs` checks every tab before writing anything: a list that came back empty
or lost more than half its rows (`--force` overrides), or any row missing a required
field, fails the build with nothing written, so the last good deploy stays up. Other
validation issues (unknown byline, duplicate featured rank…) are printed as warnings.

### Images in Google Drive

Next to the sheet in Drive is a folder called **assets**. Its tree mirrors `public/assets/`
on the site, so a file dropped at `assets/people/niklas.jpg` is served as
`/assets/people/niklas.jpg` — which is exactly what goes in a `photo` / `image` cell.

- `assets/people/` — portraits · `assets/img/` — pillar, testbed and publication figures ·
  `assets/img/news/` — post images. Lowercase names, no spaces.
- `npm run sync:assets` (also part of `prebuild`) asks the script for the folder listing,
  makes each file link-viewable, and downloads new or changed files into `public/assets/`.
  A Drive file wins over a checked-in file with the same path; files that exist only in the
  repo (logo, hero still, `joinus.png`…) stay as they are.
- It then checks every `/assets/…` reference in the content and warns about ones that
  resolve to nothing, so a typo in a cell is caught at build time rather than as a blank
  placeholder on the site.
- **CA³ CMS → Open the images folder** in the sheet links to the folder.

### Hosting and the daily rebuild

The site is served by GitHub Pages from `anytime-anywhere-analytics/anytime-anywhere-analytics.github.io`
at **ca3.dk** (custom domain set in the repo's Pages settings). `.github/workflows/deploy.yml`:

- builds every pull request as a check (no deploy);
- builds and deploys on every push to `main`, daily at 04:00 UTC, and on demand
  (*Actions → Build and deploy → Run workflow*) — the daily run is what publishes sheet and
  Drive edits;
- reads `CMS_URL` and `CMS_TOKEN` from the repository secrets
  (*Settings → Secrets and variables → Actions*). Without them the build uses the checked-in
  `src/data/*.json` and `public/assets/`.

A failed pull (validation error, Apps Script down) fails the build and leaves the last good
deploy online; the run log says why.

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
  quote) → about and the film → featured publications → the people dome → work card. A new
  group photo goes into the Drive assets folder as `assets/img/group.jpg`; it replaces the
  checked-in one on the next build.
- **People first.** The people page leads with portrait cards. Only faculty and current members get that stage
  (`team` / `isActive` in `src/lib/data.ts`); alumni and collaborators are listed below
  in small type, and their profile pages keep the small round avatar.
- **Work with us** (`src/pages/work-with-us.astro`) covers positions, industry partnerships
  and research collaboration; its copy lives in that file, not the sheet. The header button
  and the `WorkCard` at the foot of most pages link there.
- **List rows** (publications) carry a square cover on the right via `RowThumb`;
  with no image the space is held empty and the hover state still shows the black
  arrow overlay.
- **Page heroes** on People, Publications and Work with us are plain: a title and one lead
  line. The publications list does not lean on teaser figures, since most papers have none yet.
- **Logo.** `Logo.astro` is a simplified version of the ca3.dk logo: its triangles and the three
  chevrons (the "A"s of Anytime / Anywhere / Analytics), without the lettering and with heavier
  chevrons so it holds up at 30px. It draws in `currentColor` (`--logo`: AU blue in light mode);
  `public/assets/ca3-mark.svg` is the same mark as a standalone file.
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
  there (today only the publications hero, for papers without a figure).
- **Heavy images are shrunk at build time.** `scripts/optimize-images.mjs` re-encodes any
  `.png`/`.jpg` over 300 KB in `dist/assets/` as a ≤1600px WebP and repoints the built pages
  at it, so a 5 MB PNG dropped into Drive costs ~200 KB on the page. Sources stay untouched;
  `og:image` keeps the original because some link-preview crawlers reject WebP.
- **Head metadata** comes from `Base`: pass `description` and `image` (used for link previews,
  defaulting to `/assets/img/share-image.jpg`). Long descriptions are clipped to 160 chars.
  `noindex` drops a page from search and the sitemap (the 404 page uses it).
- **Site URL.** Canonical, `og:url`, the sitemap and `robots.txt` use `site` from
  `astro.config.mjs` — `https://ca3.dk`, or `SITE_URL` if set (for a staging host).
