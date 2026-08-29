// Wires the connect/refresh buttons, connection state, error display, and
// the card-click -> expanded "window" modal together. Keeps file-connect.js
// / parse-excel.js / render.js independent of each other so they stay easy
// to test/replace on their own.

(function () {
  const btnConnect = document.getElementById('btn-connect');
  const btnRefresh = document.getElementById('btn-refresh');
  const errorBanner = document.getElementById('error-banner');
  const metaStatus = document.getElementById('meta-status');
  const emptyState = document.getElementById('empty-state');
  const dashboard = document.getElementById('dashboard');

  const settingsDot = document.getElementById('settings-dot');

  const btnExportPdf = document.getElementById('btn-export-pdf');

  const metaPeriod = document.getElementById('meta-period');
  const periodOptions = document.querySelectorAll('.period-option');
  const periodStartInput = document.getElementById('period-start');
  const periodEndInput = document.getElementById('period-end');
  const btnPeriodApply = document.getElementById('btn-period-apply');

  const modalOverlay = document.getElementById('card-modal-overlay');
  const modalClose = document.getElementById('card-modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalBody = document.getElementById('modal-body');
  const modalChartWrap = document.getElementById('modal-chart-wrap');
  const modalChartAnchor = document.getElementById('modal-chart'); // Plottable renders an <svg> into this div

  let currentHandle = null;
  let currentRawData = null;   // unfiltered parse -- see hlwParseWorkbook in parse-excel.js
  let currentData = null;      // currentRawData filtered to activeRange -- see hlwBuildPeriodView
  let activeRange = null;      // { key, start, end, label } -- see hlwComputePeriodRange below
  let openCardKey = null;      // which modal (if any) is currently open, so period changes can refresh it live
  let modalChart = null;
  let onChartResize = null; // resize listener bound while the chart modal is open; removed on close
  let needsPermissionReconnect = false; // set when a stored handle needs its permission re-granted
  // Persists across modal close/reopen (cleared only on reconnect/refresh,
  // since a fresh workbook may not have the same stage/partner values).
  const pipelineFilterState = { stage: '', partner: '' };

  function setStatus(text, cls) {
    metaStatus.textContent = text;
    metaStatus.className = cls || '';
  }

  function updateSettingsDot() {
    settingsDot.hidden = !(needsPermissionReconnect || !errorBanner.hidden);
  }

  function showError(msg) {
    errorBanner.hidden = false;
    errorBanner.textContent = msg;
    updateSettingsDot();
  }
  function clearError() {
    errorBanner.hidden = true;
    errorBanner.textContent = '';
    updateSettingsDot();
  }

  // ---- Period selector ----
  // Recomputes currentData from currentRawData (see hlwBuildPeriodView in
  // parse-excel.js) and re-renders every time the period changes -- this is
  // the one place that makes the selector "ubiquitous": every card, the open
  // modal (if any), and the PDF export all just read currentData and have no
  // idea a period filter exists.

  const HLW_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const hlwFmtShort = d => (HLW_MONTHS[d.getMonth()].slice(0, 3)) + ' ' + d.getDate() + ', ' + d.getFullYear();
  const hlwStartOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const hlwEndOfDay = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  function hlwComputePeriodRange(key, customStart, customEnd) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    switch (key) {
      case 'this-month': {
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        return { key, start: hlwStartOfDay(start), end: hlwEndOfDay(end), label: HLW_MONTHS[m] + ' ' + y };
      }
      case 'last-month': {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0);
        return { key, start: hlwStartOfDay(start), end: hlwEndOfDay(end), label: HLW_MONTHS[start.getMonth()] + ' ' + start.getFullYear() };
      }
      case 'ytd': {
        const start = new Date(y, 0, 1);
        return { key, start: hlwStartOfDay(start), end: hlwEndOfDay(now), label: hlwFmtShort(start) + ' – ' + hlwFmtShort(now) };
      }
      case 'ttm': {
        const start = new Date(y, m, now.getDate());
        start.setFullYear(start.getFullYear() - 1);
        start.setDate(start.getDate() + 1);
        return { key, start: hlwStartOfDay(start), end: hlwEndOfDay(now), label: hlwFmtShort(start) + ' – ' + hlwFmtShort(now) };
      }
      case 'custom':
        return { key, start: hlwStartOfDay(customStart), end: hlwEndOfDay(customEnd), label: hlwFmtShort(customStart) + ' – ' + hlwFmtShort(customEnd) };
      default:
        return null;
    }
  }

  // Recomputes currentData for a new range and re-renders. Safe to call
  // before a workbook is connected (just updates the label + stores the
  // range for when loadAndRender runs).
  function applyPeriod(range) {
    if (!range) return;
    activeRange = range;
    metaPeriod.textContent = range.label;
    if (!currentRawData) return;
    currentData = hlwBuildPeriodView(currentRawData, activeRange);
    hlwRenderDashboard(currentData, pipelineFilterState);
    if (openCardKey) openModal(openCardKey); // live-refresh the open modal's contents, if any
  }

  function wirePeriodControl() {
    periodOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        periodOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyPeriod(hlwComputePeriodRange(btn.dataset.period));
      });
    });

    btnPeriodApply.addEventListener('click', () => {
      const startVal = periodStartInput.value;
      const endVal = periodEndInput.value;
      if (!startVal || !endVal) return;
      // Parse as local dates (not UTC) so the filtered range matches what was picked.
      const [sy, sm, sd] = startVal.split('-').map(Number);
      const [ey, em, ed] = endVal.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      periodOptions.forEach(b => b.classList.remove('active'));
      applyPeriod(hlwComputePeriodRange('custom', start, end));
    });
  }

  // ---- Card -> modal ("window") ----

  function openModal(cardKey) {
    if (!currentData) return;
    const meta = HLW_MODAL_META[cardKey];
    if (!meta) return;
    openCardKey = cardKey;

    modalTitle.textContent = meta.title;
    modalSubtitle.textContent = hlwModalSubtitle(cardKey, currentData);
    modalBody.innerHTML = hlwBuildModalBody(cardKey, currentData, pipelineFilterState);

    modalOverlay.hidden = false;

    if (modalChart) { modalChart.destroy(); modalChart = null; }
    if (onChartResize) { window.removeEventListener('resize', onChartResize); onChartResize = null; }
    modalChartAnchor.innerHTML = '';

    if (cardKey === 'waterfall') {
      // Deferred to the next frame: reading/measuring the container's size
      // in the same tick that removes `hidden` can be unreliable depending
      // on the browser, and this chart depends on real layout being settled
      // before Plottable measures it.
      requestAnimationFrame(() => {
        let built = null;
        try {
          built = hlwBuildWaterfallChart(currentData);
        } catch (e) {
          console.error('Chart build failed:', e);
        }
        if (!built) {
          modalChartWrap.hidden = true;
          return;
        }
        modalChartWrap.hidden = false;
        try {
          built.table.renderTo(modalChartAnchor);
          hlwDrawBarValueLabels(modalChartAnchor, built.rows);
          onChartResize = () => hlwDrawBarValueLabels(modalChartAnchor, built.rows);
          window.addEventListener('resize', onChartResize);
          modalChart = built.table;
          // Sanity check: if nothing actually painted (a bar plot with no
          // visible <rect>s), don't leave a silent blank box -- show a
          // message instead so a failure is diagnosable from the page
          // itself rather than looking like nothing happened.
          if (!modalChartAnchor.querySelector('.bar-area rect')) {
            throw new Error('Chart rendered but no bars were drawn');
          }
        } catch (e) {
          console.error('Chart render failed:', e);
          if (modalChart) { modalChart.destroy(); modalChart = null; }
          modalChartAnchor.innerHTML = '<div class="chart-error">Chart couldn\'t render — check the browser console, or try refreshing the page.</div>';
        }
      });
    } else {
      modalChartWrap.hidden = true;
    }

    if (cardKey === 'pipeline') wirePipelineFilters();

    document.addEventListener('keydown', onModalKeydown);
  }

  // Wires the two custom filter dropdowns (hlwFilterDropdownHtml in
  // render.js) for the pipeline modal's "All engagements" table. Pure
  // client-side show/hide on the already-rendered rows -- no re-fetch, no
  // re-render. Selections are written into pipelineFilterState as they're
  // made, and hlwBuildModalBody reads that state back when the modal is
  // rebuilt, so the choice survives closing and reopening the modal.
  function wirePipelineFilters() {
    const table = document.getElementById('pipeline-modal-table');
    const emptyMsg = document.getElementById('pipeline-filter-empty');
    if (!table) return;

    function applyFilters() {
      const stage = pipelineFilterState.stage;
      const partner = pipelineFilterState.partner;
      let visibleCount = 0;
      table.querySelectorAll('tbody tr').forEach(row => {
        const matches = (!stage || row.dataset.stage === stage) && (!partner || row.dataset.partner === partner);
        row.hidden = !matches;
        if (matches) visibleCount++;
      });
      table.hidden = visibleCount === 0;
      if (emptyMsg) emptyMsg.hidden = visibleCount !== 0;
      // Keep the compact card in sync live, not just once the modal closes --
      // see hlwRenderPipeline in render.js.
      if (currentData) hlwRenderPipeline(currentData, pipelineFilterState);
    }

    function wireDropdown(id, stateKey) {
      const dropdown = document.getElementById(id);
      if (!dropdown) return;
      const trigger = dropdown.querySelector('.filter-dropdown-trigger');
      const valueEl = dropdown.querySelector('.filter-dropdown-value');
      const menu = dropdown.querySelector('.filter-dropdown-menu');

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      });
      menu.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const value = opt.dataset.value;
          pipelineFilterState[stateKey] = value;
          valueEl.textContent = opt.textContent;
          menu.querySelectorAll('.filter-option').forEach(o => o.classList.toggle('active', o === opt));
          menu.hidden = true;
          applyFilters();
        });
      });
    }

    wireDropdown('pipeline-filter-stage', 'stage');
    wireDropdown('pipeline-filter-partner', 'partner');
    applyFilters(); // re-apply whatever was already selected, since the table was just rebuilt from scratch
  }

  // Closes any open filter-dropdown menu on outside click or Escape. One
  // delegated pair of listeners set up once in init(), rather than
  // re-attaching document-level listeners every time a modal opens (which
  // would leak a new pair on every open with no matching removal).
  function closeAllFilterDropdowns() {
    document.querySelectorAll('.filter-dropdown-menu:not([hidden])').forEach(menu => { menu.hidden = true; });
  }

  function closeModal() {
    modalOverlay.hidden = true;
    openCardKey = null;
    if (onChartResize) { window.removeEventListener('resize', onChartResize); onChartResize = null; }
    if (modalChart) { modalChart.destroy(); modalChart = null; }
    modalChartAnchor.innerHTML = '';
    document.removeEventListener('keydown', onModalKeydown);
    // Belt-and-suspenders: the pipeline card is already kept live-synced to
    // pipelineFilterState as filters change (see wirePipelineFilters), but
    // re-apply here too so closing always reflects the current selection.
    if (currentData) hlwRenderPipeline(currentData, pipelineFilterState);
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function wireCards() {
    document.querySelectorAll('.card[data-card]').forEach(card => {
      card.addEventListener('click', () => openModal(card.dataset.card));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card.dataset.card);
        }
      });
    });
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal(); // click on the backdrop, not the panel
  });

  // ---- File connect / refresh ----

  async function loadAndRender(file) {
    currentRawData = await hlwParseWorkbook(file);
    needsPermissionReconnect = false;
    updateSettingsDot();
    // First connect of the session defaults to "This month"; a reconnect or
    // refresh keeps whatever period the partner already had selected rather
    // than jumping back to it (see applyPeriod -- it just recomputes
    // currentData from the fresh raw data using the existing activeRange).
    if (!activeRange) {
      activeRange = hlwComputePeriodRange('this-month');
      periodOptions.forEach(b => b.classList.toggle('active', b.dataset.period === 'this-month'));
    }
    currentData = hlwBuildPeriodView(currentRawData, activeRange);
    metaPeriod.textContent = activeRange.label;
    hlwRenderDashboard(currentData, pipelineFilterState);
    emptyState.hidden = true;
    dashboard.hidden = false;
    clearError();
    const stamp = new Date(file.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    setStatus('Local — connected (' + stamp + ')', 'status-connected');
    btnConnect.textContent = 'Reconnect';
    btnRefresh.hidden = false;
    btnExportPdf.hidden = false;
  }

  async function handleConnectClick() {
    clearError();
    try {
      if (needsPermissionReconnect && currentHandle) {
        // A previously connected file just needs its permission re-granted --
        // this surfaces Chrome's lightweight "Allow access again?" prompt on
        // the same file, rather than sending them through the full browse dialog.
        const { handle, file } = await HlwFileConnect.reconnectWithPrompt(currentHandle);
        currentHandle = handle;
        await loadAndRender(file);
        return;
      }
      const { handle, file } = await HlwFileConnect.pickFile();
      currentHandle = handle;
      await loadAndRender(file);
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled the picker/prompt
      console.error(err);
      showError('Could not connect the file: ' + err.message);
      setStatus('Connection failed', 'status-error');
    }
  }

  async function handleRefreshClick() {
    if (!currentHandle) return;
    clearError();
    try {
      const file = await HlwFileConnect.rereadFile(currentHandle);
      await loadAndRender(file);
    } catch (err) {
      console.error(err);
      showError('Could not refresh the file: ' + err.message);
      setStatus('Refresh failed', 'status-error');
    }
  }

  // ---- PDF export ----
  // Builds a dedicated report document (hlwBuildReportHtml in render.js --
  // cover page + content pages, entirely separate from the dashboard DOM)
  // fresh from currentData, drops it into #report-print-root, then triggers
  // the browser's native print dialog with print.css active (see index.html's
  // <link media="print">) -- no PDF library, no new CDN dependency. Chrome/
  // Edge's own "Save as PDF" print destination produces the actual file.
  const reportPrintRoot = document.getElementById('report-print-root');

  function handleExportClick() {
    if (!currentData) return;
    const html = hlwBuildReportHtml(currentData);
    if (!html) return;
    reportPrintRoot.innerHTML = html;
    window.print();
  }

  async function init() {
    wireCards();
    wirePeriodControl();
    btnExportPdf.addEventListener('click', handleExportClick);
    document.addEventListener('click', closeAllFilterDropdowns);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllFilterDropdowns(); });

    if (!HlwFileConnect.supported) {
      showError('This browser does not support the File System Access API. Open this page in a recent Chrome or Edge on desktop.');
      btnConnect.disabled = true;
      setStatus('Unsupported browser', 'status-error');
      return;
    }

    btnConnect.addEventListener('click', handleConnectClick);
    btnRefresh.addEventListener('click', handleRefreshClick);

    // Try to silently pick back up a previously connected file.
    try {
      const result = await HlwFileConnect.tryReconnect();
      if (!result) return; // nothing stored yet
      if (result.needsPermission) {
        currentHandle = result.handle;
        needsPermissionReconnect = true;
        setStatus('Permission needed', 'status-warn');
        updateSettingsDot();
        return;
      }
      currentHandle = result.handle;
      await loadAndRender(result.file);
    } catch (err) {
      console.error(err);
      // Silent failure on auto-reconnect is fine — user can just click Connect.
    }
  }

  init();
})();
