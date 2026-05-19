(function() {
  'use strict';

  // ==========================================================
  // SAFE OPTIMIZATIONS ONLY
  // Rule: NEVER touch video element, fetch, or XHR.
  // Only CSS and periodic DOM cleanup.
  // ==========================================================

  // --- 1. Disable Service Workers (safe, no impact on playback) ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
  }

  // --- 2. CSS containment (browser-level optimization, no JS) ---
  const perfStyle = document.createElement('style');
  perfStyle.textContent = `
    ytmusic-menu-renderer .menu-items {
      overflow: hidden !important;
      contain: layout style !important;
    }
    ytmusic-section-list-renderer { contain: content; }
    ytmusic-responsive-list-item-renderer,
    ytmusic-two-row-item-renderer {
      content-visibility: auto;
      contain-intrinsic-size: auto 64px;
    }
    ytmusic-carousel-shelf-renderer {
      content-visibility: auto;
      contain-intrinsic-size: auto 250px;
    }
  `;
  document.head.appendChild(perfStyle);

  // --- 3. Memory cleanup (images only, never touch player) ---
  function memoryCleanup() {
    document.querySelectorAll('img[src^="blob:"]').forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.bottom < -2000 || rect.top > window.innerHeight + 3000) {
        URL.revokeObjectURL(img.src);
        img.removeAttribute('src');
      }
    });
  }

  // Run every 3 minutes
  setInterval(memoryCleanup, 180000);

  // Run on SPA navigation
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(memoryCleanup, 3000);
  };
})();
