(function() {
  'use strict';

  // ==========================================================
  // SAFE PERFORMANCE OPTIMIZATIONS
  // Only non-destructive changes — never remove/hide DOM content
  // ==========================================================

  // --- 1. Block telemetry and analytics (network only) ---
  const BLOCKED_URLS = [
    '/api/stats/watchtime',
    '/api/stats/playback',
    '/ptracking',
    '/youtubei/v1/log_event',
    '/youtubei/v1/feedback',
    'play.google.com/log',
    'jnn-pa.googleapis.com',
    'www.google-analytics.com',
    'www.googletagmanager.com',
  ];

  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    const urlStr = typeof url === 'string' ? url : url?.url || '';
    if (BLOCKED_URLS.some(s => urlStr.includes(s))) {
      return Promise.resolve(new Response('{}', { status: 200 }));
    }
    return originalFetch.call(this, url, ...args);
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._blocked = BLOCKED_URLS.some(s => String(url).includes(s));
    return originalXHROpen.call(this, method, url, ...args);
  };
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._blocked) return;
    return originalXHRSend.call(this, ...args);
  };

  // --- 2. Disable Service Workers ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
    navigator.serviceWorker.register = () => Promise.reject(new Error('disabled'));
  }

  // --- 3. CSS-only performance (no DOM manipulation) ---
  const perfStyle = document.createElement('style');
  perfStyle.textContent = `
    /* Prevent layout thrashing on menu items */
    ytmusic-menu-renderer .menu-items {
      overflow: hidden !important;
      contain: layout style !important;
    }
    /* CSS containment for heavy sections */
    ytmusic-section-list-renderer {
      contain: content;
    }
    /* content-visibility for list items (browser skips off-screen rendering) */
    ytmusic-responsive-list-item-renderer,
    ytmusic-two-row-item-renderer {
      content-visibility: auto;
      contain-intrinsic-size: auto 64px;
    }
    ytmusic-carousel-shelf-renderer {
      content-visibility: auto;
      contain-intrinsic-size: auto 250px;
    }
    /* Faster transitions (not disabled, just snappier) */
    ytmusic-browse-response *,
    ytmusic-section-list-renderer * {
      transition-duration: 0.1s !important;
    }
    /* Keep player animations untouched */
    ytmusic-player-bar *,
    .middle-controls *,
    .slider *,
    tp-yt-paper-slider * {
      transition-duration: unset !important;
    }
  `;
  document.head.appendChild(perfStyle);

  // --- 4. Lazy-load images that are far off-screen (non-destructive) ---
  // Only adds loading="lazy" attribute, doesn't remove anything
  setInterval(() => {
    document.querySelectorAll('img[src]:not([loading])').forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight + 1500) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }, 5000);
})();
