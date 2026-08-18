/* =====================================================================
   hlw-articles.js — shared news/article data. The single source of
   truth for every post: the newsroom page (news.html — card grid,
   featured slot, reader panel) AND the homepage (index.html — the
   marquee cards + the tab strip above them) all read from this same
   array. No other file needs to change to publish a new post.

   ===== HOW TO PUBLISH A NEW ARTICLE — DO THIS, IN THIS ORDER =====
   1. Copy the object below (the one with id: 'founding-clients') and
      paste a new copy as the FIRST entry in the ARTICLES array —
      this array is newest-first; nothing here sorts by date, the
      array order IS the display order everywhere.
   2. Give it a unique `id` (short slug, lowercase-with-dashes).
   3. Set `filterKey` to one that already exists as a tab button on
      news.html — open news.html and check the data-filter values in
      the #newsTabs / .news-latest-head tab row if unsure. As of this
      writing the valid values are: all / firm / insights. Using a
      filterKey that doesn't match any tab isn't an error — that
      article just won't show up under any specific tab, only "All".
   4. Write `title` SHORT (one line, ideally under ~6 words) — it also
      gets reused verbatim as a marquee card headline on the homepage
      at large display size, and long titles will wrap awkwardly there.
   5. Write `tabWord` as exactly ONE word — it replaces one of the
      small tab labels above the marquee (Ledger / Close / Tax /
      Reporting / Counsel / News) when this article is borrowed onto
      the homepage. If you skip this field, that tab's label is just
      left as whatever it already says.
   6. Write `excerpt` as one short sentence — shown on the newsroom
      card grid AND reused as a marquee card's body text.
   7. Write `body` as an array of paragraph strings for the full
      article reader panel.
   8. IMPORTANT — this file is parsed as JavaScript, not as plain
      text. A literal apostrophe or quote inside a single-quoted
      string will break the file (e.g. writing 'we're opening...'
      breaks on the raw apostrophe). Use the curly-quote escape codes
      instead, exactly as done below: \u2019 for a right single quote
      (’), \u2014 for an em dash (—). Copy an existing paragraph as a
      template rather than typing a new one from scratch.
   9. Only ever set `featured: true` on ONE article at a time — if
      more than one is marked featured, the newsroom just uses
      whichever one comes first in the array and silently ignores the
      rest, so it won't break, but only one will actually show.
   10. Save. Nothing else needs to change — news.html's grid/featured/
       reader and index.html's marquee cards + tab labels all update
       automatically from this array.

   ===== WHAT THIS FILE DOES *NOT* CONTROL =====
   Marquee card background videos/images and their left-to-right order
   on the homepage are fixed in index.html itself (the has-bg / bg-*
   classes) and are completely independent of this file. Publishing an
   article here only ever replaces a card's HEADLINE and BODY TEXT —
   it never changes, adds, or removes a background.

   Fields:
     id         — short unique slug, used to open the right article
     category   — display label, e.g. "Firm News"
     filterKey  — must match an existing news.html tab (see step 3)
     date       — display string, e.g. "Aug 2026"
     title      — SHORT (see step 4) — reused as a marquee headline
     tabWord    — ONE word (see step 5) — reused as a marquee tab label
     excerpt    — one short sentence (see step 6)
     featured   — true on at most one article at a time (see step 9)
     body       — array of paragraph strings (see step 7)
   ===================================================================== */
const ARTICLES = [
  {
    id: 'founding-clients',
    category: 'Firm News',
    filterKey: 'firm',
    date: 'Aug 2026',
    title: 'Founding clients, at a discount.',
    tabWord: 'Founding',
    excerpt: 'A limited number of engagements at a discounted rate, for business owners willing to help shape how we build the firm\u2019s tools and workflows.',
    featured: true,
    body: [
      'HLW Financial is opening a limited number of founding-client engagements at a discounted rate \u2014 for business owners willing to work closely with us while we build out the firm\u2019s tools and workflows.',
      'In practice, that means shorter feedback loops than a typical client relationship: you\u2019ll see draft reports before they\u2019re finalized, weigh in on how your dashboard is organized, and flag what\u2019s confusing or missing as we go. Nothing experimental touches your actual filings \u2014 the discount is for your time and input, not for cutting corners on the work itself.',
      'Spots are limited, and we\u2019re prioritizing businesses whose books need to get current \u2014 bookkeeping, tax prep, or both. If that sounds like you, reach out through Get Started and mention you\u2019re interested in the founding-client rate.'
    ]
  }
];
