# Site Logo / Nav Mark — Conventions

These rules apply to the `.site-nav` header and its `.mark` logo block on
**every** page of the site. Keep the markup and CSS identical across pages
so the logo behaves consistently site-wide.

## Markup

Keep this exact structure at the top of `<body>` on every page:

```html
<header class="site-nav" id="siteNav">
  <a class="mark" href="index.html" aria-label="HLW Financial — home">
    <svg viewBox="0 0 303 302" role="img" aria-label="HLW Financial logo" fill="currentColor" fill-rule="evenodd">
      <title>HLW Financial logo</title>
      <!-- ...paths... -->
    </svg>
    HLW <span>Financial</span>
  </a>
  <div class="nav-links">
    ...
  </div>
</header>
```

- The logo + wordmark is always wrapped in `<a href="index.html">` so it
  links back to the homepage from any page.
- `href` should point to `index.html` (relative path), not an anchor or `#`.

## CSS

```css
.site-nav .mark{
  font-family:'Cormorant Garamond',serif;
  font-size:22px;
  letter-spacing:.06em;      /* tightened from .18em — keep tight */
  color:var(--cream);
  display:flex;align-items:center;gap:12px;
  text-decoration:none;
  transition:transform .25s ease, color .35s ease;
  cursor:pointer;
}
.site-nav .mark:hover{
  transform:translateY(-2px) scale(1.035);  /* subtle "jump" on hover */
}
.site-nav .mark svg{
  width:26px;height:26px;flex:0 0 auto;color:inherit;
  transition:transform .25s ease;
}
.site-nav .mark:hover svg{
  transform:rotate(-4deg);
}
.site-nav.scrolled .mark{color:var(--green);}
.site-nav .mark span{color:var(--gold);}
```

## Behavior summary

- **Link:** clicking the logo/wordmark anywhere on the site returns to `index.html`.
- **Hover:** logo lifts slightly and scales up (~3.5%), icon tilts -4deg.
- **Spacing:** wordmark letter-spacing is `.06em` (not the wider `.18em` used
  elsewhere in the nav) so "HLW Financial" doesn't look spread out.

When adding a new page, copy the header markup and these CSS rules verbatim
rather than re-deriving them.
