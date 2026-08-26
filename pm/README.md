# HLW Partner Console

Static HTML dashboard, hosted at `/pm` in this repo. No backend, no hosted data.
Reads a local OneDrive-synced Excel file live in-browser via the File System
Access API — Chrome/Edge on desktop only. Each partner grants access once
via a native file picker; the browser remembers the file handle (IndexedDB)
so they aren't prompted every visit, though the browser does still require
re-granting the permission itself occasionally, by design. Data never leaves
the browser — the empty shell is the only thing that's public.

## Structure
- `index.html` — page shell, served as `/pm`
- `css/console.css` — approved design tokens + full component styles
- `js/file-connect.js` — file picker, IndexedDB handle persistence, permission handling
- `js/parse-excel.js` — SheetJS parsing + waterfall math, workbook schema documented inline
- `js/render.js` — renders parsed data into the dashboard DOM
- `js/app.js` — wires it all together (connect/refresh buttons, connection state, errors)
- `reference/style-preview.html` — approved visual direction (static mockup, not wired to data)
- `reference/HLW_PM_Template.xlsx` — sample workbook matching the expected schema; copy this to start the real shared tracker

## Workbook schema

The connected `.xlsx` needs five sheets (names matched case-insensitively).
Missing sheets just render as empty sections rather than erroring — fine to
fill in incrementally.

- **Snapshot** — two columns, `Key` / `Value`. Keys: `Period`, `Revenue`,
  `Expenses`, `Net Income`, `Cash On Hand`, `Active Clients`, `Entities`.
- **Pipeline** — `Client`, `Engagement`, `Type` (`Recurring`/`One-off`),
  `Stage`, `Procurer`.
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

## Style direction

Black (`var(--green-deep)`) background, cream text, gold accent used
sparingly. Variable names kept as `--green` / `--green-deep` for now even
though the values are black, to avoid touching every reference. Helvetica Neue for headings/body, JetBrains Mono for
labels/data/eyebrows, Cormorant Garamond reserved for the "HLW Financial"
wordmark only — matches the live site's actual typography
(github.com/HaydenHarms/hlwfinancial).

## UI

File connect/refresh/status live behind a small gear icon in the hero
(top right), opening a "Data connection" modal — keeps the main page to
just the dashboard. A red dot on the gear flags an error or a
permission that needs re-granting.

Each section is a card on the main page; clicking one (or focusing + Enter)
opens an expanded "window" modal with the full data and, for the waterfall
card, a bar chart of total dollars earned this month per partner
(aggregated across their procurer/preparer/reviewer/bookkeeper roles,
purely derived from the Waterfall sheet -- no extra data entry). Close via
the X, clicking the backdrop, or Escape. Charts for the other three cards
(pipeline by stage, hours by partner, snapshot revenue/expenses/net) are a
later pass.

## Status

v1 functional build complete: connect/reconnect/refresh flow, all four
sheet types parsed, waterfall math applied, card/modal UI, one chart
(waterfall earnings by partner), empty/error states styled.
Not yet tested against a real workbook or deployed to `/pm` -- do that next.
