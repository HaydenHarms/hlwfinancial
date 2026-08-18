/* =====================================================================
   hlw-chrome.js — shared site chrome: injects the nav, the Get Started
   modal, and the footer into every page, and wires up their behavior
   (scroll-triggered nav background, modal open/close, mailto submit).

   Every page includes this with a plain <script src="hlw-chrome.js">
   right before its own closing </body> tag, and needs three empty
   mount points in its markup:
     <header class="site-nav" id="siteNav"></header>
     <div id="gsModalMount"></div>
     <div class="footer" id="siteFooter"></div>

   Edit ONCE here — every page picks up the change automatically, no
   per-page copies to keep in sync. Named "hlw-chrome" (not "shared")
   in case a second shared file is ever needed for something else.
   ===================================================================== */
(function(){

  var NAV_HTML =
    '<a class="mark" href="index.html" aria-label="HLW Financial — home">' +
      '<svg viewBox="0 0 303 302" role="img" aria-label="HLW Financial logo" fill="currentColor" fill-rule="evenodd">' +
        '<title>HLW Financial logo</title>' +
        '<path d="M157.42 24.15c-0.7 0.18 -1.13 0.48 -1.57 1.1 -0.38 0.58 -2.3 5.73 -13.02 35 -2.42 6.6 -10.75 29.33 -16.12 43.92 -1.97 5.37 -3.88 10.55 -4.23 11.55 -0.35 0.98 -1.88 5.13 -3.38 9.25 -15.1 41.05 -14.33 38.9 -14.22 39.75 0.17 1.25 0.9 1.65 4.03 2.2 35.25 6.28 68.65 20.07 98.17 40.47 18.73 12.97 30.53 22.8 52.42 43.7 8.18 7.83 9.38 8.92 9.92 8.92 0.9 0 -0.88 -2.78 -5.43 -8.45 -23.92 -29.8 -51.78 -56.25 -76.07 -72.13 -20.22 -13.23 -36.63 -21.08 -55.58 -26.58 -6.33 -1.85 -6.28 -1.75 -4.43 -7.45 0.6 -1.82 2.82 -8.63 4.93 -15.13 2.12 -6.52 4.27 -13.07 4.75 -14.58 1.35 -4.15 5.93 -18.22 7.42 -22.75 0.72 -2.2 2.9 -8.88 4.83 -14.83 1.93 -5.97 4.63 -14.25 6 -18.42 1.37 -4.17 3.23 -9.92 4.15 -12.75 2.58 -7.97 2.2 -7.7 9.25 -6.33 11.4 2.2 22.07 5.93 35.8 12.55 13.03 6.28 30.33 17.55 46.72 30.45 6.13 4.82 6.67 3.57 1.27 -2.88 -19.97 -23.82 -63.63 -50.42 -92.27 -56.2 -2.68 -0.53 -2.58 -0.52 -3.33 -0.35Z"/>' +
        '<path d="M116.55 54.9c-0.75 0.62 -1.02 1.27 -3.97 9.35 -1.45 3.93 -3.42 9.3 -4.37 11.92 -0.97 2.62 -1.92 5.23 -2.13 5.83 -0.2 0.6 -1.3 3.55 -2.42 6.58 -1.12 3.02 -3.97 10.78 -6.33 17.25 -10.55 28.82 -17.77 48.5 -18.87 51.42 -0.65 1.73 -1.5 4.07 -1.88 5.17 -0.4 1.1 -3.13 8.57 -6.08 16.58 -5.55 15.08 -5.8 15.92 -5.27 16.77 0.52 0.77 0.9 0.85 9.85 2.4 2.93 0.5 7.17 1.28 13.15 2.43 3.95 0.75 12.77 2.58 16.43 3.42 1.6 0.37 3.77 0.85 4.8 1.08 3.95 0.88 14.93 3.72 19.62 5.07 0.92 0.27 3.05 0.87 4.75 1.35 45.35 12.68 80.47 29.52 113.37 54.35 5.03 3.8 6.53 4.8 6.82 4.52 0.97 -0.97 -9.65 -11.93 -20.52 -21.23 -33.32 -28.45 -78.73 -49.92 -138.98 -65.67 -6.28 -1.65 -6.93 -1.9 -7.42 -2.88 -0.47 -0.95 -1.27 1.72 8.9 -29.43 2.67 -8.2 6.52 -19.98 8.53 -26.17 15.45 -47.42 17.25 -52.92 17.55 -53.5 0.77 -1.5 1.47 -1.55 5.78 -0.48 5.98 1.48 5.87 1.55 8.03 -4.45 2.12 -5.87 2.45 -5.57 -11.15 -10.1 -6.35 -2.13 -7.32 -2.32 -8.2 -1.57Z"/>' +
        '<path d="M76.9 84.97c-0.68 0.43 -1.07 1.1 -1.88 3.28 -1.52 4.12 -8.72 23.72 -13.52 36.83 -2.22 6.05 -8 21.82 -11.37 31 -3.12 8.48 -10.83 29.55 -13.97 38.08 -1 2.7 -2.48 6.75 -3.3 9 -0.83 2.25 -2.6 7.08 -3.95 10.75 -1.33 3.67 -2.7 7.38 -3.02 8.25 -0.73 1.98 -0.88 3 -0.5 3.57 0.58 0.92 0.7 0.93 8.85 1.68 4.63 0.43 15.55 1.55 22.75 2.33 6.03 0.65 17.17 2.1 22.33 2.92 4.98 0.78 14.1 2.28 17.17 2.83 1.52 0.27 4.1 0.72 5.75 1 21.32 3.7 42.97 8.67 62.55 14.35 26.53 7.68 43.05 14.07 65.95 25.5 7.6 3.78 8.42 4.13 8.42 3.5 0 -1.95 -16.4 -13.18 -31.42 -21.52 -23.02 -12.77 -52.37 -23.75 -86 -32.15 -21.32 -5.32 -40.37 -9.08 -69.75 -13.75 -3.35 -0.53 -3.87 -0.68 -4.43 -1.28 -0.88 -0.93 -1.12 -0.08 4.5 -17.23 2.28 -6.98 11.68 -35.82 14.88 -45.67 0.77 -2.38 3.07 -9.4 5.08 -15.58 2.02 -6.18 5.05 -15.53 6.75 -20.75 4.25 -13.1 3.37 -12.13 9.83 -10.68 5.45 1.23 5.28 1.33 7.5 -4.65 2.15 -5.82 2.2 -5.73 -4.2 -7.85 -10.75 -3.53 -14.05 -4.37 -15.02 -3.77Z"/>' +
      '</svg>' +
      'HLW <span>Financial</span>' +
    '</a>' +
    '<div class="nav-links">' +
      '<a href="index.html#">Team</a>' +
      '<a href="client-access.html" class="nav-btn">Client Access</a>' +
      '<a href="get-started.html" class="nav-btn nav-btn-primary js-get-started">Get Started</a>' +
    '</div>';

  var MODAL_HTML =
    '<div class="gs-overlay" id="gsOverlay">' +
      '<div class="gs-scrim" id="gsScrim"></div>' +
      '<div class="gs-panel">' +
        '<div class="gs-meta">' +
          '<span>Get Started</span>' +
          '<button class="gs-close" id="gsClose" type="button">Close ✕</button>' +
        '</div>' +
        '<h2>Tell us a bit about what you need, and we\'ll be in touch.</h2>' +
        '<form id="gsForm">' +
          '<div class="gs-row">' +
            '<div class="gs-field">' +
              '<label for="gsFirst">First Name</label>' +
              '<input type="text" id="gsFirst" required>' +
            '</div>' +
            '<div class="gs-field">' +
              '<label for="gsLast">Last Name</label>' +
              '<input type="text" id="gsLast" required>' +
            '</div>' +
          '</div>' +
          '<div class="gs-field">' +
            '<label for="gsEmail">Email Address</label>' +
            '<input type="email" id="gsEmail" required>' +
          '</div>' +
          '<div class="gs-field">' +
            '<label for="gsPhone">Phone Number</label>' +
            '<input type="tel" id="gsPhone">' +
          '</div>' +
          '<div class="gs-field">' +
            '<label for="gsService">What do you need help with?</label>' +
            '<select id="gsService">' +
              '<option>Bookkeeping</option>' +
              '<option>Tax Preparation</option>' +
              '<option>Both</option>' +
              '<option>Not sure yet</option>' +
            '</select>' +
          '</div>' +
          '<div class="gs-field">' +
            '<label for="gsMessage">Add some context to help us better fulfill your needs</label>' +
            '<textarea id="gsMessage" rows="3"></textarea>' +
          '</div>' +
          '<button type="submit" class="gs-submit">Send</button>' +
          '<p class="gs-note">This opens a pre-filled email in your mail app, addressed to HLW Financial — nothing is sent until you hit send there.</p>' +
        '</form>' +
      '</div>' +
    '</div>';

  var FOOTER_HTML =
    '<div class="footer-inner">' +
      '<div class="mark">HLW FINANCIAL</div>' +
      '<div class="fine">DALLAS, TEXAS &nbsp;·&nbsp; BY REFERRAL &amp; INTRODUCTION</div>' +
    '</div>';

  // ---- inject into the mount points every page provides ----
  var navMount = document.getElementById('siteNav');
  if(navMount) navMount.innerHTML = NAV_HTML;

  var modalMount = document.getElementById('gsModalMount');
  if(modalMount) modalMount.innerHTML = MODAL_HTML;

  var footerMount = document.getElementById('siteFooter');
  if(footerMount) footerMount.innerHTML = FOOTER_HTML;

  // ---- nav: solid background once scrolled ----
  // default threshold is a flat 40px; the homepage instead waits until
  // the user has scrolled past the full-height hero (data-nav-mode="hero").
  // Light pages with no dark hero at all (coming-soon pages, the
  // newsroom) need the nav ALWAYS solid (data-nav-mode="light") —
  // otherwise the nav's light/cream text sits invisible against the
  // light page background until the user scrolls.
  if(navMount){
    var navMode = navMount.getAttribute('data-nav-mode');
    if(navMode === 'light'){
      navMount.classList.add('scrolled');
    } else {
      var heroMode = navMode === 'hero';
      var updateNav = function(){
        var scrollY = document.body.scrollTop || window.scrollY || 0;
        var threshold = heroMode ? (window.innerHeight - 90) : 40;
        navMount.classList.toggle('scrolled', scrollY > threshold);
      };
      document.body.addEventListener('scroll', updateNav, {passive:true});
      window.addEventListener('scroll', updateNav, {passive:true});
      window.addEventListener('resize', updateNav);
      updateNav();
    }
  }

  // ---- Get Started modal: open/close + mailto submit ----
  var overlay = document.getElementById('gsOverlay');
  var scrim = document.getElementById('gsScrim');
  var closeBtn = document.getElementById('gsClose');
  var form = document.getElementById('gsForm');
  if(overlay && form){
    var openGS = function(){
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    var closeGS = function(){
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    // any element marked .js-get-started opens the panel instead of
    // following its href — the href stays as a plain no-JS fallback
    document.querySelectorAll('.js-get-started').forEach(function(el){
      el.addEventListener('click', function(e){
        e.preventDefault();
        openGS();
      });
    });
    scrim.addEventListener('click', closeGS);
    closeBtn.addEventListener('click', closeGS);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeGS();
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var first = document.getElementById('gsFirst').value.trim();
      var last = document.getElementById('gsLast').value.trim();
      var email = document.getElementById('gsEmail').value.trim();
      var phone = document.getElementById('gsPhone').value.trim();
      var service = document.getElementById('gsService').value;
      var message = document.getElementById('gsMessage').value.trim();

      var subject = 'Get Started — ' + first + ' ' + last + ' (' + service + ')';
      var bodyLines = [
        'Name: ' + first + ' ' + last,
        'Email: ' + email,
        'Phone: ' + (phone || '—'),
        'Interested in: ' + service,
        '',
        'Message:',
        message || '—'
      ];
      var body = bodyLines.join('\n');
      var mailto = 'mailto:harms.e.hayden@gmail.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
      window.location.href = mailto;
    });
  }

})();
