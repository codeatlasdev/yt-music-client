(function() {
  'use strict';

  // ==========================================================
  // PERFORMANCE OPTIMIZATIONS — safe with Safari UA
  // The playback stall was caused by Chrome UA, not these optimizations.
  // ==========================================================

  // --- 1. Block telemetry (fetch interception — safe) ---
  const BLOCKED_URLS = [
    '/api/stats/ads',
    '/ptracking',
    '/youtubei/v1/log_event',
    '/youtubei/v1/feedback',
    '/youtubei/v1/att/get',
    'play.google.com/log',
    'jnn-pa.googleapis.com',
    'www.google-analytics.com',
    'www.googletagmanager.com',
    'googleads.g.doubleclick.net',
    'static.doubleclick.net',
    'pagead2.googlesyndication.com',
    '/api/stats/qoe',
    '/api/stats/atr',
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

  // --- 3. Disable Web Notifications ---
  window.Notification = { permission: 'denied', requestPermission: () => Promise.resolve('denied') };

  // --- 4. Hide video element (saves GPU memory — audio still plays) ---
  function hideVideo() {
    const video = document.querySelector('video');
    if (video) {
      video.style.cssText += 'width:1px!important;height:1px!important;position:absolute!important;top:-9999px!important;';
    }
  }
  setTimeout(hideVideo, 3000);
  // Re-apply after navigation
  setInterval(hideVideo, 10000);

  // --- 5. Block Cast/Chromecast scripts ---
  const scriptObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'SCRIPT' && node.src) {
          if (node.src.includes('cast_sender') ||
              node.src.includes('cast.framework') ||
              node.src.includes('www.gstatic.com/cast') ||
              node.src.includes('remote_module')) {
            node.remove();
          }
        }
      }
    }
  });
  if (document.documentElement) {
    scriptObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  // --- 6. CSS performance ---
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

  // --- 7. Memory management ---
  let navCount = 0;

  function memoryCleanup() {
    // Revoke blob URLs for off-screen images
    document.querySelectorAll('img[src^="blob:"]').forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.bottom < -2000 || rect.top > window.innerHeight + 3000) {
        URL.revokeObjectURL(img.src);
        img.removeAttribute('src');
      }
    });
    // Lazy-load far images
    document.querySelectorAll('img[src]:not([loading])').forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight + 1500) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }

  // Track SPA navigations
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    navCount++;
    if (navCount % 3 === 0) setTimeout(memoryCleanup, 2000);
  };

  // Periodic cleanup every 3 minutes
  setInterval(memoryCleanup, 180000);
})();
