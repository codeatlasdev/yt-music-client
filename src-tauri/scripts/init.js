(function() {
  'use strict';

  // --- CSS: drag region + titlebar padding + native feel ---
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      background: #030303 !important;
    }
    body {
      padding-top: 48px !important;
    }
    #layout { padding-top: 0 !important; }
    ytmusic-app-layout > [slot="player-bar"] { z-index: 999; }
    body { touch-action: pan-x pan-y; }

    /* Drag region — acts as native titlebar */
    #yt-music-drag-region {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 48px;
      -webkit-app-region: drag;
      z-index: 10000;
      pointer-events: auto;
    }

    /* Make buttons/links inside the header area clickable (no-drag) */
    #yt-music-drag-region .no-drag,
    ytmusic-pivot-bar-renderer,
    ytmusic-search-box,
    tp-yt-paper-icon-button,
    a, button, input, select, textarea,
    [role="button"], [role="link"], [role="tab"],
    ytmusic-pivot-bar-item-renderer {
      -webkit-app-region: no-drag;
    }

    /* Hide the native YT Music title/header background for cleaner look */
    ytmusic-nav-bar#nav-bar-background {
      background: transparent !important;
    }
  `;
  document.head.appendChild(style);

  // --- Create drag region element ---
  function createDragRegion() {
    if (document.getElementById('yt-music-drag-region')) return;
    const drag = document.createElement('div');
    drag.id = 'yt-music-drag-region';
    document.body.prepend(drag);
  }

  if (document.body) {
    createDragRegion();
  } else {
    document.addEventListener('DOMContentLoaded', createDragRegion);
  }

  // --- Disable zoom gestures (Cmd+scroll) ---
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  // --- Ad blocking: remove ad elements ---
  const adSelectors = [
    'ytmusic-you-there-renderer',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    '.ytmusic-mealbar-promo-renderer',
    'ytmusic-popup-container',
    '#masthead-ad',
    '.ad-showing video',
    'tp-yt-paper-dialog.ytmusic-popup-container',
  ];

  function removeAds() {
    for (const sel of adSelectors) {
      for (const el of document.querySelectorAll(sel)) el.remove();
    }
    const video = document.querySelector('video');
    if (video && document.querySelector('.ad-showing')) {
      video.currentTime = video.duration || 0;
      video.playbackRate = 16;
    }
    // Auto-dismiss "Are you still watching?"
    const confirmBtn = document.querySelector(
      'ytmusic-you-there-renderer tp-yt-paper-button, ' +
      'yt-button-renderer.style-blue-text[dialog-confirm]'
    );
    if (confirmBtn) confirmBtn.click();
  }

  const observer = new MutationObserver(removeAds);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // --- Media info: send to Rust via Tauri IPC ---
  let lastState = '';

  function sendMediaInfo() {
    const titleEl = document.querySelector('.title.ytmusic-player-bar');
    const artistEl = document.querySelector('.byline.ytmusic-player-bar a, .byline.ytmusic-player-bar span');
    const playBtn = document.querySelector('#play-pause-button');

    const title = titleEl?.textContent?.trim() || '';
    const artist = artistEl?.textContent?.trim() || '';
    const isPlaying = playBtn?.getAttribute('aria-label')?.toLowerCase().includes('pause') || false;

    const state = `${title}|${artist}|${isPlaying}`;
    if (state !== lastState && title) {
      lastState = state;
      if (window.__TAURI__?.core) {
        window.__TAURI__.core.invoke('update_media', { title, artist, isPlaying });
      }
    }
  }

  function watchPlayerBar() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (playerBar) {
      new MutationObserver(sendMediaInfo).observe(playerBar, {
        childList: true, subtree: true, attributes: true, characterData: true
      });
    } else {
      setTimeout(watchPlayerBar, 1000);
    }
  }
  watchPlayerBar();
  setInterval(sendMediaInfo, 3000);

  // --- Media controls from Rust (play/pause/next/prev) ---
  function setupMediaControls() {
    if (!window.__TAURI__?.event) {
      setTimeout(setupMediaControls, 500);
      return;
    }
    window.__TAURI__.event.listen('media-control', (event) => {
      const playBtn = document.querySelector('#play-pause-button');
      const nextBtn = document.querySelector('.next-button');
      const prevBtn = document.querySelector('.previous-button');

      switch (event.payload) {
        case 'play':
        case 'pause':
        case 'toggle':
          playBtn?.click();
          break;
        case 'next':
          nextBtn?.click();
          break;
        case 'previous':
          prevBtn?.click();
          break;
      }
    });
  }
  setupMediaControls();
})();
