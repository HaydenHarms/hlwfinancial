# HLW Partner Console

Static HTML dashboard. No backend, no hosted data.
Reads a local OneDrive-synced Excel file live in-browser via the File System Access API (Chrome/Edge only).

## Structure
- console.html — page shell
- css/console.css — design tokens (approved), component styles TBD
- js/file-connect.js — file picker + permission handling
- js/parse-excel.js — Excel parsing (SheetJS)
- js/render.js — renders parsed data into the dashboard
- reference/style-preview.html — approved visual direction (Anduril/Palantir structure, HLW brand tokens). Build console.html's layout against this.

## Style direction
Dark green (var(--green-deep)) background, cream text, gold accent used sparingly.
Helvetica Neue for headings/body, JetBrains Mono for labels/data/eyebrows,
Cormorant Garamond reserved for the "HLW Financial" wordmark only —
matches the live site's actual typography (github.com/HaydenHarms/hlwfinancial).
