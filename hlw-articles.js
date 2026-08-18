/* =====================================================================
   hlw-articles.js — shared news/article data. The single source of
   truth for every post: the newsroom page (card grid, featured slot,
   reader panel) AND the homepage's marquee (which borrows the title +
   excerpt of the most recent posts when there aren't enough dedicated
   marquee cards to go around) all read from this same array.

   To publish a new post: add one object to the TOP of ARTICLES below
   (newest first — nothing here sorts by date, order in the array IS
   the order things display in). Nothing else needs to change by hand;
   the newsroom and the homepage both pick it up automatically.

   Fields:
     id         — short unique slug, used to open the right article
     category   — display label, e.g. "Firm News"
     filterKey  — must match one of the newsroom's data-filter values
                  (currently: all / firm / insights)
     date       — display string, e.g. "Aug 2026"
     title      — keep this SHORT — it also gets used as a marquee
                  card headline at large display size on the homepage
     excerpt    — one short sentence; used on the card grid AND as the
                  marquee card's body text when borrowed
     featured   — true on at most one article at a time (the newsroom
                  featured slot uses the first one flagged true)
     body       — array of paragraph strings for the full reader panel
   ===================================================================== */
const ARTICLES = [
  {
    id: 'founding-clients',
    category: 'Firm News',
    filterKey: 'firm',
    date: 'Aug 2026',
    title: 'Founding clients, at a discount.',
    excerpt: 'A limited number of engagements at a discounted rate, for business owners willing to help shape how we build the firm\u2019s tools and workflows.',
    featured: true,
    body: [
      'HLW Financial is opening a limited number of founding-client engagements at a discounted rate \u2014 for business owners willing to work closely with us while we build out the firm\u2019s tools and workflows.',
      'In practice, that means shorter feedback loops than a typical client relationship: you\u2019ll see draft reports before they\u2019re finalized, weigh in on how your dashboard is organized, and flag what\u2019s confusing or missing as we go. Nothing experimental touches your actual filings \u2014 the discount is for your time and input, not for cutting corners on the work itself.',
      'Spots are limited, and we\u2019re prioritizing businesses whose books need to get current \u2014 bookkeeping, tax prep, or both. If that sounds like you, reach out through Get Started and mention you\u2019re interested in the founding-client rate.'
    ]
  }
];
