(function() {
  'use strict';

  // ==========================================================
  // PERFORMANCE OPTIMIZATIONS FOR YOUTUBE MUSIC
  // Target: reduce memory from ~600MB to ~200-300MB
  // ==========================================================

  // --- 1. Force audio-only mode (disable video rendering) ---
  // YouTube Music loads video streams even when showing album art.
  // We hide the video and prevent GPU decode.
  function forceAudioOnly() {
    const video = document.querySelector('video');
    if (!video) return;

    // Hide video element (saves GPU compositing)
    video.style.cssText = 'width:1px!important;height:1px!important;position:fixed!important;top:-9999px!important;opacity:0!important;pointer-events:none!important;';

    // Attempt to switch to audio-only stream quality
    const player = document.querySelector('#movie_player');
    if (player?.setPlaybackQualityRange) {
      player.setPlaybackQualityRange('tiny', 'tiny');
    }
  }

  // --- 2. Block telemetry and analytics ---
  const BLOCKED_SCRIPTS = [
    'www.google-analytics.com',
    'www.googletagmanager.com',
    'play.google.com/log',
    'youtube.com/api/stats',
    'youtube.com/ptracking',
    'youtube.com/api/timedtext',
    'youtube.com/youtubei/v1/log_event',
    'youtube.com/youtubei/v1/feedback',
    'jnn-pa.googleapis.com',
    'play.google.com/log',
  ];

  // Intercept fetch to block telemetry
  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    const urlStr = typeof url === 'string' ? url : url?.url || '';
    if (BLOCKED_SCRIPTS.some(s => urlStr.includes(s))) {
      return Promise.resolve(new Response('', { status: 200 }));
    }
    return originalFetch.call(this, url, ...args);
  };

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    const urlStr = String(url);
    if (BLOCKED_SCRIPTS.some(s => urlStr.includes(s))) {
      this._blocked = true;
    }
    return originalXHROpen.call(this, method, url, ...args);
  };
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._blocked) return;
    return originalXHRSend.call(this, ...args);
  };

  // --- 3. Disable Service Workers (unnecessary in native app) ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
    // Prevent new registrations
    navigator.serviceWorker.register = () => Promise.reject(new Error('disabled'));
  }

  // --- 4. DOM cleanup — remove stale pages from SPA navigation ---
  function cleanupDOM() {
    // YouTube Music keeps old page content in the DOM (SPA)
    // Remove hidden/inactive page content
    const pages = document.querySelectorAll('ytmusic-browse-response:not([active])');
    pages.forEach(p => {
      if (!p.closest('[active]')) p.innerHTML = '';
    });

    // Remove invisible shelf renderers that are off-screen
    const shelves = document.querySelectorAll('ytmusic-shelf-renderer, ytmusic-carousel-shelf-renderer');
    shelves.forEach(shelf => {
      const rect = shelf.getBoundingClientRect();
      if (rect.bottom < -1000 || rect.top > window.innerHeight + 2000) {
        shelf.style.contain = 'strict';
        shelf.style.contentVisibility = 'auto';
      }
    });

    // Clean up large image elements that are far off-screen
    const images = document.querySelectorAll('img[src]:not([loading="lazy"])');
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.bottom < -500 || rect.top > window.innerHeight + 1000) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }

  // --- 5. Prevent layout thrashing (YouTube button bar bug) ---
  function fixLayoutThrashing() {
    const style = document.createElement('style');
    style.textContent = `
      /* Prevent the flex overflow recalculation loop */
      ytmusic-menu-renderer .menu-items {
        overflow: hidden !important;
        contain: layout style !important;
      }
      /* CSS containment for heavy components */
      ytmusic-browse-response,
      ytmusic-section-list-renderer,
      ytmusic-shelf-renderer {
        contain: content;
      }
      /* content-visibility for off-screen items */
      ytmusic-responsive-list-item-renderer,
      ytmusic-two-row-item-renderer {
        content-visibility: auto;
        contain-intrinsic-size: auto 64px;
      }
      /* Reduce paint complexity */
      ytmusic-carousel-shelf-renderer {
        content-visibility: auto;
        contain-intrinsic-size: auto 250px;
      }
      /* Disable unnecessary animations */
      ytmusic-browse-response *,
      ytmusic-section-list-renderer * {
        animation-duration: 0.001s !important;
        transition-duration: 0.1s !important;
      }
      /* Keep player animations smooth */
      ytmusic-player-bar *,
      .middle-controls *,
      .slider * {
        animation-duration: unset !important;
        transition-duration: unset !important;
      }
    `;
    document.head.appendChild(style);
  }

  // --- 6. Reduce image quality (use smaller thumbnails) ---
  function reduceImageQuality() {
    // YouTube serves images at various sizes via URL params
    // Replace =w544 or =w226 with smaller versions
    const observer = new MutationObserver(() => {
      document.querySelectorAll('img[src*="=w544"], img[src*="=w800"], img[src*="=w1440"]').forEach(img => {
        img.src = img.src
          .replace(/=w\d+/, '=w226')
          .replace(/=h\d+/, '=h226');
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }

  // --- 7. Throttle background activity ---
  let isVisible = true;
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (!isVisible) {
      // When hidden, aggressively clean up
      cleanupDOM();
    }
  });

  // --- Initialize all optimizations ---
  function init() {
    fixLayoutThrashing();
    reduceImageQuality();

    // Run cleanup periodically
    setInterval(() => {
      if (isVisible) cleanupDOM();
      forceAudioOnly();
    }, 10000);

    // Initial run after page loads
    setTimeout(forceAudioOnly, 3000);
    setTimeout(cleanupDOM, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
