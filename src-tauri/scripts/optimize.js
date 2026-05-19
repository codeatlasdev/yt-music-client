(function() {
  'use strict';

  // ==========================================================
  // SAFE PERFORMANCE OPTIMIZATIONS
  // ==========================================================

  // --- 1. Block telemetry (CSS/DOM only, no fetch interception) ---
  // NOTE: fetch/XHR interception removed — it was causing playback stalls.
  // Ad blocking is handled by on_navigation (Rust) + DOM removal (init.js).

  // Block script elements loading unnecessary resources
  const scriptObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'SCRIPT' && node.src) {
          const src = node.src;
          if (src.includes('cast_sender') ||
              src.includes('cast.framework') ||
              src.includes('remote_module') ||
              src.includes('www.gstatic.com/cast')) {
            node.type = 'javascript/blocked';
            node.remove();
          }
        }
      }
    }
  });

  // --- 2. Disable Service Workers ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
    navigator.serviceWorker.register = () => Promise.reject(new Error('disabled'));
  }

  // --- 3. Disable Web Notifications (we use native) ---
  window.Notification = { permission: 'denied', requestPermission: () => Promise.resolve('denied') };

  // --- 4. CSS performance ---
  const perfStyle = document.createElement('style');
  perfStyle.textContent = `
    /* Prevent layout thrashing */
    ytmusic-menu-renderer .menu-items {
      overflow: hidden !important;
      contain: layout style !important;
    }
    /* CSS containment */
    ytmusic-section-list-renderer {
      contain: content;
    }
    /* content-visibility for off-screen items */
    ytmusic-responsive-list-item-renderer,
    ytmusic-two-row-item-renderer {
      content-visibility: auto;
      contain-intrinsic-size: auto 64px;
    }
    ytmusic-carousel-shelf-renderer {
      content-visibility: auto;
      contain-intrinsic-size: auto 250px;
    }
    /* Snappier transitions */
    ytmusic-browse-response *,
    ytmusic-section-list-renderer * {
      transition-duration: 0.1s !important;
    }
    /* Keep player smooth */
    ytmusic-player-bar *,
    .middle-controls *,
    .slider *,
    tp-yt-paper-slider * {
      transition-duration: unset !important;
    }
  `;
  document.head.appendChild(perfStyle);

  // --- 5. Start observing for script injection ---
  if (document.documentElement) {
    scriptObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  // --- 6. Lazy-load far off-screen images ---
  setInterval(() => {
    document.querySelectorAll('img[src]:not([loading])').forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight + 1500) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }, 5000);

  // --- 7. Memory management — prevent RAM growth over time ---
  let navigationCount = 0;

  function memoryCleanup() {
    // Release image blobs that are far off-screen
    document.querySelectorAll('img[src^="blob:"]').forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.bottom < -2000 || rect.top > window.innerHeight + 3000) {
        URL.revokeObjectURL(img.src);
        img.removeAttribute('src');
        img.setAttribute('loading', 'lazy');
      }
    });

    // Clear old canvas elements (visualizers, etc)
    document.querySelectorAll('canvas').forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom < -1000 || rect.top > window.innerHeight + 2000) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Hint GC after navigation
    if (window.gc) window.gc();
  }

  // Track SPA navigations and clean up after each
  function watchNavigations() {
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      navigationCount++;
      // Clean up every 3 navigations
      if (navigationCount % 3 === 0) {
        setTimeout(memoryCleanup, 2000);
      }
    };
  }
  watchNavigations();

  // Periodic cleanup every 5 minutes
  setInterval(memoryCleanup, 300000);

})();
