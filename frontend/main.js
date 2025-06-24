if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('[SW] Registered'))
    .catch(err => console.error('[SW] Error:', err));
}