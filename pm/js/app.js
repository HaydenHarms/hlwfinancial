// Wires the connect/refresh buttons, connection state, and error display
// together. Keeps file-connect.js / parse-excel.js / render.js independent
// of each other so they stay easy to test/replace on their own.

(function () {
  const btnConnect = document.getElementById('btn-connect');
  const btnRefresh = document.getElementById('btn-refresh');
  const connectNote = document.getElementById('connect-note');
  const errorBanner = document.getElementById('error-banner');
  const metaStatus = document.getElementById('meta-status');
  const emptyState = document.getElementById('empty-state');
  const dashboard = document.getElementById('dashboard');

  let currentHandle = null;

  function setStatus(text, cls) {
    metaStatus.textContent = text;
    metaStatus.className = cls || '';
  }

  function showError(msg) {
    errorBanner.hidden = false;
    errorBanner.textContent = msg;
  }
  function clearError() {
    errorBanner.hidden = true;
    errorBanner.textContent = '';
  }

  async function loadAndRender(file) {
    const data = await hlwParseWorkbook(file);
    hlwRenderDashboard(data);
    emptyState.hidden = true;
    dashboard.hidden = false;
    clearError();
    const stamp = new Date(file.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    setStatus('Local — connected (' + stamp + ')', 'status-connected');
    btnConnect.textContent = 'Reconnect a different file';
    btnRefresh.hidden = false;
  }

  async function handleConnectClick() {
    clearError();
    try {
      const { handle, file } = await HlwFileConnect.pickFile();
      currentHandle = handle;
      await loadAndRender(file);
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled the picker
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
        setStatus('Permission needed — click Connect', '');
        connectNote.textContent = 'A previously connected file needs permission re-granted. Click "Connect Excel file" and choose the same file again.';
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
