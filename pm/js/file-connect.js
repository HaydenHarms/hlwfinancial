// Handles the "Connect Excel file" button + File System Access API permission flow.
// Persists the chosen file handle in IndexedDB so returning partners don't have to
// re-pick the file every visit — the browser still requires them to re-grant the
// permission prompt (this is a File System Access API rule, not something we control).

const HLW_DB_NAME = 'hlw-partner-console';
const HLW_DB_STORE = 'handles';
const HLW_HANDLE_KEY = 'tracker-file';

function hlwOpenDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HLW_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(HLW_DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function hlwSaveHandle(handle) {
  const db = await hlwOpenDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HLW_DB_STORE, 'readwrite');
    tx.objectStore(HLW_DB_STORE).put(handle, HLW_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function hlwLoadHandle() {
  const db = await hlwOpenDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HLW_DB_STORE, 'readonly');
    const req = tx.objectStore(HLW_DB_STORE).get(HLW_HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// Verifies (and if needed, requests) read permission on a stored handle.
// Must be called from a user gesture (a click) if it needs to prompt.
async function hlwEnsurePermission(handle, requestIfNeeded) {
  const opts = { mode: 'read' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if (!requestIfNeeded) return false;
  return (await handle.requestPermission(opts)) === 'granted';
}

const HlwFileConnect = {
  supported: typeof window.showOpenFilePicker === 'function',

  // Opens the native file picker, saves the handle, returns { handle, file }.
  async pickFile() {
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: 'Excel workbook',
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
      }],
      excludeAcceptAllOption: false,
      multiple: false
    });
    await hlwSaveHandle(handle);
    const file = await handle.getFile();
    return { handle, file };
  },

  // Tries to silently reconnect to a previously-picked file. Returns
  // { handle, file } on success, or null if there's nothing stored / permission
  // needs an explicit re-grant (caller should fall back to pickFile()).
  async tryReconnect() {
    if (!this.supported) return null;
    const handle = await hlwLoadHandle();
    if (!handle) return null;
    const ok = await hlwEnsurePermission(handle, false);
    if (!ok) return { handle, needsPermission: true };
    const file = await handle.getFile();
    return { handle, file };
  },

  // Re-requests permission on a previously stored handle (call from a click handler).
  async reconnectWithPrompt(handle) {
    const ok = await hlwEnsurePermission(handle, true);
    if (!ok) throw new Error('Permission to read the file was not granted.');
    const file = await handle.getFile();
    return { handle, file };
  },

  // Re-reads the currently connected file from disk (for the Refresh button).
  async rereadFile(handle) {
    const ok = await hlwEnsurePermission(handle, false);
    if (!ok) throw new Error('File access permission was revoked. Reconnect the file.');
    return handle.getFile();
  }
};
