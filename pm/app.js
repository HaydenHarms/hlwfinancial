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
  const modalChartCanvas = document.getElementById('modal-chart');

  let currentHandle = null;
  let currentData = null;
  let modalChart = null;
  let needsPermissionReconnect = false; // set when a stored handle needs its permission re-granted

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
  // Display-only: sets what the "Period" label shows. The workbook has no
  // per-row dates on Pipeline/Waterfall entries, so this does not filter
  // the dashboard data -- it only relabels the period. Reconnecting or
  // refreshing the file resets the label back to the Snapshot sheet's
  // own Period value (see hlwRenderMeta in render.js).

  const HLW_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const hlwFmtShort = d => (HLW_MONTHS[d.getMonth()].slice(0, 3)) + ' ' + d.getDate() + ', ' + d.getFullYear();

  function hlwComputePeriodLabel(key) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    switch (key) {
      case 'this-month':
        return HLW_MONTHS[m] + ' ' + y;
      case 'last-month': {
        const lm = new Date(y, m - 1, 1);
        return HLW_MONTHS[lm.getMonth()] + ' ' + lm.getFullYear();
      }
      case 'ytd':
        return hlwFmtShort(new Date(y, 0, 1)) + ' – ' + hlwFmtShort(now);
      case 'ttm': {
        const start = new Date(y, m, now.getDate());
        start.setFullYear(start.getFullYear() - 1);
        start.setDate(start.getDate() + 1);
        return hlwFmtShort(start) + ' – ' + hlwFmtShort(now);
      }
      default:
        return null;
    }
  }

  function wirePeriodControl() {
    periodOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        const label = hlwComputePeriodLabel(btn.dataset.period);
        periodOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        metaPeriod.textContent = label;
      });
    });

    btnPeriodApply.addEventListener('click', () => {
      const startVal = periodStartInput.value;
      const endVal = periodEndInput.value;
      if (!startVal || !endVal) return;
      // Parse as local dates (not UTC) so the displayed range matches what was picked.
      const [sy, sm, sd] = startVal.split('-').map(Number);
      const [ey, em, ed] = endVal.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      periodOptions.forEach(b => b.classList.remove('active'));
      metaPeriod.textContent = hlwFmtShort(start) + ' – ' + hlwFmtShort(end);
    });
  }

  // ---- Card -> modal ("window") ----

  function openModal(cardKey) {
    if (!currentData) return;
    const meta = HLW_MODAL_META[cardKey];
    if (!meta) return;

    modalTitle.textContent = meta.title;
    modalSubtitle.textContent = hlwModalSubtitle(cardKey, currentData);
    modalBody.innerHTML = hlwBuildModalBody(cardKey, currentData);

    if (modalChart) { modalChart.destroy(); modalChart = null; }
    const chartConfig = hlwBuildModalChartConfig(cardKey, currentData);
    if (chartConfig && typeof Chart !== 'undefined') {
      modalChartWrap.hidden = false;
      modalChart = new Chart(modalChartCanvas, chartConfig);
    } else {
      modalChartWrap.hidden = true;
    }

    modalOverlay.hidden = false;
    document.addEventListener('keydown', onModalKeydown);
  }

  function closeModal() {
    modalOverlay.hidden = true;
    if (modalChart) { modalChart.destroy(); modalChart = null; }
    document.removeEventListener('keydown', onModalKeydown);
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
    const data = await hlwParseWorkbook(file);
    currentData = data;
    needsPermissionReconnect = false;
    updateSettingsDot();
    hlwRenderDashboard(data);
    emptyState.hidden = true;
    dashboard.hidden = false;
    clearError();
    const stamp = new Date(file.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    setStatus('Local — connected (' + stamp + ')', 'status-connected');
    btnConnect.textContent = 'Reconnect';
    btnRefresh.hidden = false;
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

  async function init() {
    wireCards();
    wirePeriodControl();

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
