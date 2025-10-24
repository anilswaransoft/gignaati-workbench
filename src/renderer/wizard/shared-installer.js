/* Shared installer runner used by the wizard UI and the main page.
   Exposes window.sharedInstaller.run(onProgress(percent, text), onLog(text))
*/
(function () {
  async function run(onProgress, onLog) {
    onLog && onLog('Shared installer: starting');
    try {
      onProgress && onProgress(5, 'Preparing installation');

      // Install Ollama
      onLog && onLog('Calling installOllama()');
      try {
        await window.electronAPI.installOllama();
        onProgress && onProgress(30, 'Ollama installed');
        onLog && onLog('installOllama completed');
      } catch (err) {
        onLog && onLog('installOllama failed: ' + (err && err.message ? err.message : String(err)));
        onProgress && onProgress(30, 'Ollama install failed');
      }

      // Start Ollama
      onLog && onLog('Calling startOllama()');
      try {
        const res = await window.electronAPI.startOllama();
        onProgress && onProgress(55, 'Ollama started');
        onLog && onLog('startOllama response: ' + JSON.stringify(res || {}));
      } catch (err) {
        onLog && onLog('startOllama failed: ' + (err && err.message ? err.message : String(err)));
        onProgress && onProgress(55, 'Ollama start failed');
      }

      // Setup N8N
      onLog && onLog('Calling setupN8N()');
      try {
        await window.electronAPI.setupN8N();
        onProgress && onProgress(75, 'N8N configured');
        onLog && onLog('setupN8N completed');
      } catch (err) {
        onLog && onLog('setupN8N failed: ' + (err && err.message ? err.message : String(err)));
        onProgress && onProgress(75, 'N8N setup failed');
      }

      // Start N8N
      onLog && onLog('Calling startN8N()');
      try {
        await window.electronAPI.startN8N();
        onProgress && onProgress(100, 'Launch complete');
        onLog && onLog('startN8N completed');
      } catch (err) {
        onLog && onLog('startN8N failed: ' + (err && err.message ? err.message : String(err)));
        onProgress && onProgress(90, 'Launch finished with errors');
      }

      return true;
    } catch (e) {
      onLog && onLog('Shared installer unexpected error: ' + (e && e.message ? e.message : String(e)));
      throw e;
    }
  }

  window.sharedInstaller = { run };
})();
