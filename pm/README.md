# HLW Partner Console

Static HTML dashboard, hosted at `/pm` in this repo. No backend, no hosted data.
Reads a local OneDrive-synced Excel file live in-browser via the File System
Access API — Chrome/Edge on desktop only. Each partner grants access once
via a native file picker; the browser remembers the file handle (IndexedDB)
so they aren't prompted every visit, though the browser does still require
re-granting the permission itself occasionally, by design. Data never leaves
the browser — the empty shell is the only thing that's public.

## Structure
Flat — everything lives directly in `/pm`, no subfolders (easier to
maintain via the GitHub web UI).
- `index.html` — page shell, served as `/pm`
- `console.css` — approved design tokens + full component styles
- `print.css` — PDF export theme (loaded only for print/"Save as PDF" via a
  `media="print"` link), re-themes the dashboard light-on-white for paper
- `file-connect.js` — file picker, IndexedDB handle persistence, permission handling
- `parse-excel.js` — SheetJS parsing + waterfall math, workbook schema documented inline
- `render.js` — renders parsed data into the dashboard DOM
- `app.js` — wires it all together (connect/refresh buttons, connection state, errors)
- `style-preview.html` — approved visual direction (static mockup, not wired to data)
- `cover-diagram.svg` — the PDF export cover's flowing ribbon-line diagram,
  as a standalone file for reference/regeneration; the live export uses
  the same content embedded inline in render.js (`HLW_COVER_DIAGRAM_SVG`),
  not this file directly. Regenerate via `build_cover_svg.py` (not part of
  the deployed site) if the diagram design changes.
- `HLW_PM_Mock_Data.xlsx` — filled-in mock data for dev/testing away from the real tracker; also doubles as the schema reference (deliberately not keeping a separate blank template file in the repo)

## Workbook schema

## Color system
Gold stays the brand accent (used for $ amounts, recurring-engagement
emphasis, and general UI chrome like the settings gear). All other
color is status-driven — it reflects what the data actually says, not
decoration:
- Pipeline stage chips: green = Active, blue = Onboarding, amber = In
  Review, red = Docs Requested (blocked/waiting), purple = Prospect
- Waterfall engagement-type chips: teal = Bookkeeping, purple = Tax Prep
- Snapshot Net income: green if positive, red if negative
- Hero "Data" status: green = connected, amber = permission needed,
  red = error/unsupported
These map to CSS custom properties (`--signal-green/blue/amber/red/
purple/teal`) at the top of `console.css` — add new stages/types there
rather than hardcoding a new color inline.

The connected `.xlsx` needs five sheets (names matched case-insensitively).
Missing sheets just render as empty sections rather than erroring — fine to
fill in incrementally.

- **Snapshot** — two columns, `Key` / `Value`. Keys: `Period`, `Revenue`,
  `Expenses`, `Net Income`, `Cash On Hand`, `Active Clients`, `Entities`.
- **Pipeline** — `Client`, `Engagement`, `Type` (`Recurring`/`One-off`),
  `Stage`, `Partner` (who's assigned to the engagement -- renamed from
  `Procurer` since it's a different concept from Waterfall's role of the
  same name; see below). The modal's full engagement table has "All
  stages"/"All partners" filter dropdowns, options generated from whatever
  values actually appear in the data.
- **Hours** — `Partner`, `Hours Logged`. Informational only — not tied to
  any threshold.
- **Capital** — `Partner`, `Capital Account Status`, `Capital Balance`
  (optional).
- **Waterfall** — `Client`, `Engagement Type` (`Tax Prep`/`Bookkeeping`),
  `Gross Profit`, `Procurer`, `Preparer`, `Reviewer`, `Bookkeeper`. The split
  math is computed client-side per the operating agreement, not read from
  the sheet:
  - Tax prep: 10% procurer / 45% preparer / 15% reviewer / 30% capital accounts
  - Bookkeeping: 60% guaranteed payment to the assigned bookkeeper, remaining 40% to capital accounts
  Each role's name is shown as a small label under its dollar amount in the
  profit-split table (card + modal) -- blank if that cell was left empty in
  the sheet. This `Procurer` is deliberately separate from Pipeline's
  `Partner` column above -- one is who's earning a cut of this specific
  engagement's profit, the other is who's assigned to the engagement.

## Style direction

Black (`var(--green-deep)`) background, cream text, gold accent used
sparingly. Variable names kept as `--green` / `--green-deep` for now even
though the values are black, to avoid touching every reference. Helvetica Neue for headings/body, JetBrains Mono for
labels/data/eyebrows, Cormorant Garamond reserved for the "HLW Financial"
wordmark only — matches the live site's actual typography
(github.com/HaydenHarms/hlwfinancial).

## Title

Now branded "Practice Management" in the hero (was "Partner console");
the top-of-page "Internal // Partner console" eyebrow and the
"Entities" meta callout were both dropped for a cleaner header —
`Entities` is still read from the Snapshot sheet and stored in the
parsed data, just not displayed.

## UI

File connect/refresh live behind a small gear icon in the hero, next to
the "Data" status. Hover (or tab-focus into) the gear and the two
buttons pop out to the side into the open header space — no modal, no
click needed to reveal them. The red dot on the gear still flags an
error or a permission that needs re-granting even when not hovered.
The error banner sits directly in the hero when something goes wrong.

The Period selector (calendar icon next to "Period") works the same
way — hover/focus reveals a dropdown of This month / Last month / YTD
/ TTM, plus a custom date-range picker with an Apply button. It is
display-only for now: it relabels the "Period" text but does not
filter Pipeline/Waterfall rows, since the workbook schema has no
per-row dates to filter by (only an aggregate Period value on the
Snapshot sheet). Reconnecting or refreshing the file resets the label
back to whatever the Snapshot sheet's Period value says.

The Firm snapshot card is static — it doesn't open a modal (there's
nothing more to show that isn't already on the card). The other three
cards are still clickable (or focus + Enter); doing so
opens an expanded "window" modal with the full data and, for the waterfall
card, a bar chart of total dollars earned this month per partner
(aggregated across their procurer/preparer/reviewer/bookkeeper roles,
purely derived from the Waterfall sheet -- no extra data entry), built
with Plottable (github.com/palantir/plottable, D3-based) rather than
Chart.js. The bar-growth animation is disabled (chart renders fresh
every time the modal opens, so there's nothing to animate from) and
the y-scale is padded 20% above the tallest bar so nothing touches the
plot's top edge. Dollar-value labels above each bar are drawn manually
as plain SVG text positioned from the bars' own rendered coordinates,
NOT via Plottable's built-in labelsEnabled()/labelFormatter() --
verified via a real jsdom+d3+Plottable execution harness (not just
docs) that its bundled Typesettable label writer silently no-ops when
SVG text measurement fails, with no error surfaced; the manual
approach in hlwDrawBarValueLabels (render.js) sidesteps that path
entirely and is confirmed working. It re-runs on window resize while
the modal is open. Close via the X, clicking the backdrop, or Escape.
Charts for the other two modal-enabled cards (pipeline by stage, hours
by partner) are a later pass.

## PDF export

The "Export PDF" button (appears in the hero once a workbook is connected)
builds a dedicated report document -- a cover page plus content pages --
entirely separate from the dashboard DOM, not the dashboard cards reflowed
onto paper. `hlwBuildReportHtml` in render.js builds the report fresh from
`currentData` every time the button is clicked, drops it into the (normally
empty, screen-hidden) `#report-print-root` div, then calls `window.print()`.
No PDF library, no new CDN dependency -- Chrome/Edge's own "Save as PDF"
print destination produces the actual file.

`print.css` (scoped via `media="print"`) hides the entire live dashboard
(`.hero`, `.main`, any open modal) and shows only `#report-print-root`.
Design reference: a standalone reportlab prototype was built and approved
first (`build_report.py`, not part of the deployed site -- kept as a design
reference) before translating it into this print-CSS version, specifically
to avoid iterating blind against the browser print pipeline the way the
first version of this feature had to.

- **Cover page**: single solid deep-forest-green background (matching the
  main marketing site's brand, not this report's own gold/black interior --
  a deliberate cover/interior contrast) across the whole page, with a
  flowing ribbon-line diagram (`HLW_COVER_DIAGRAM_SVG` in render.js) laid
  over a confined vertical band, semi-transparent, feathered at its top/
  bottom edges via a CSS mask so it dissolves into the background rather
  than having a visible edge. The diagram is fixed/deterministic art (not
  regenerated per export) -- disorganized-left-to-organized-right flowing
  lines in the console's own signal-color palette (green/blue/teal/amber/
  purple/red/cream), generated by `build_cover_svg.py` (kept as the
  regeneration script, not part of the deployed site) and embedded INLINE
  in the report HTML rather than referenced as an external `<img src>`, so
  it's guaranteed present before `window.print()` fires. `@page :first`
  removes margins just for this page so it bleeds edge-to-edge; `@page`
  (all other pages) keeps normal print margins.
- **Content pages**: a one-line continuity header (not a repeated title --
  the cover already carries that), a data-derived summary paragraph, stat
  cards, then Pipeline / Hours & Capital / Profit-Split Waterfall as
  sectioned tables. The partner-totals bar chart is plain HTML/CSS bars
  (`.report-bar-*` classes) rather than Plottable, so PDF export has zero
  dependency on the charting library.
- **Fonts**: same reasoning as before -- print.css overrides the Google
  Fonts (JetBrains Mono / Cormorant Garamond) with system fonts (Georgia,
  Courier New) so print never depends on webfont embedding, which is what
  caused grainy text in an earlier version.
- **Stage chips**: the report table reuses the dashboard's own
  `.stage-chip` classes (so pipeline stage colors match the live console
  exactly) -- console.css has no `media` restriction so it's still active
  during print; print.css redefines `--cream`/`--gold`/etc. so those
  shared rules render as dark-on-white instead of their screen (light-on-
  dark) colors.

Scope: exports the full current dataset (Pipeline, Hours & Capital,
Waterfall, Snapshot) as a proper report, not a snapshot of whatever's
scrolled into view. Not yet: real period filtering (the Period selector is
still display-only, see above) or an option to export a single card/modal
in isolation.

## Status

v1 functional build complete: connect/reconnect/refresh flow, all four
sheet types parsed, waterfall math applied, card/modal UI, one chart
(waterfall earnings by partner, via Plottable + manual value labels),
empty/error states styled, PDF export (dedicated report document with
cover page).
Not yet tested against a real workbook or deployed to `/pm` -- do that next.
