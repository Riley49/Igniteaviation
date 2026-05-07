(function () {
  if (!('serviceWorker' in navigator)) return;

  const RELOAD_FLAG = 'ia_sw_reloaded';

  window.addEventListener('load', async function () {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js', {
        updateViaCache: 'none'
      });

      setInterval(function () {
        reg.update().catch(function () {});
      }, 60 * 1000);

      function activateWaitingWorker(waitingWorker) {
        if (!waitingWorker) return;
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      }

      if (reg.waiting) activateWaitingWorker(reg.waiting);

      reg.addEventListener('updatefound', function () {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            activateWaitingWorker(reg.waiting || installing);
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (sessionStorage.getItem(RELOAD_FLAG)) return;
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
      });
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  });
})();
