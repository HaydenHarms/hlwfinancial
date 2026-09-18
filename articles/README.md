# Newsroom articles

Every post is one plain-text file in this folder. Add a file, and the site updates itself a minute or so later.

## Publish a new post

1. Copy `_template.md`, or click **Add file → Create new file** and name it like `q3-estimated-taxes.md`.
   The name becomes the post's web address, so use lowercase letters, numbers and dashes only.
2. Fill in the block at the top, then write the post underneath it.
3. Commit. A GitHub Action rebuilds the newsroom (watch it in the **Actions** tab).

## The block at the top

```
---
title: Q3 estimated taxes: what to know
date: 2026-09-14
category: Insights
tags: Insights, Tax
tabWord: Deadlines
excerpt: One sentence that shows on the homepage.
---
```

| Field | Needed? | What it does |
|---|---|---|
| `title` | yes | Headline. Keep it short, since the homepage shows it large. |
| `date` | yes | `2026-09-14`, `2026-09`, `Sep 14, 2026` or `Sep 2026`. The month and year decide which group the post sits in; the day (if given) decides the order within a month. |
| `category` | yes | The tag shown under the title, e.g. `Firm News` or `Insights`. |
| `tags` | no | Several tags, separated by commas. Replaces `category` in the tag row. |
| `tabWord` | no | One word shown on the homepage marquee tab. |
| `excerpt` | no | One sentence for the homepage card. If left out, the first paragraph is used. |
| `image` | no | Share picture for link previews, e.g. `media/articles/q3-estimated-taxes/cover.jpg`. Falls back to the site's default. |
| `draft` | no | `draft: true` keeps the post unpublished while you work on it. |

## Writing the post

Write normally, with a blank line between paragraphs. Apostrophes, quotes and dashes can be typed as usual.

```
## A heading
Some **bold** and *italic* text, and a [link](https://example.com).

- a bullet
- another bullet

> A pull quote

![Describe the picture](media/articles/q3-estimated-taxes/chart.png)
```

Put a post's pictures in `media/articles/<post-name>/`.

## Change or remove a post

Edit the file to change it. Delete the file (or add `draft: true`) to take it down; its page is removed automatically.

## If something goes wrong

If the Actions tab shows a red X, open the run: it says which file has the problem and what to fix (for example a missing `title` or a date it can't read). Until it is fixed the site keeps showing the last good version.

## Files you should not edit

`hlw-articles.js` and everything in `newsroom/` are generated. Any change you make there is overwritten the next time the build runs.
