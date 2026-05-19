(function() {
  'use strict';

  // --- CSS: native macOS look ---
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      background: #030303 !important;
    }
    body {
      padding-top: 38px !important;
      -webkit-user-select: none;
      user-select: none;
    }
    /* Allow text selection in content areas */
    ytmusic-player-bar, .content, .description, .subtitle,
    input, textarea, [contenteditable] {
      -webkit-user-select: text;
      user-select: text;
    }
    #layout { padding-top: 0 !important; }
    ytmusic-app-layout > [slot="player-bar"] { z-index: 999; }
    body { touch-action: pan-x pan-y; }

    /* Drag region — transparent bar at top for window dragging */
    #yt-music-drag-region {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 38px;
      z-index: 10000;
      -webkit-app-region: drag;
    }

    /* All interactive elements inside header are no-drag */
    ytmusic-pivot-bar-renderer,
    ytmusic-search-box,
    #right-content,
    #left-content ytmusic-pivot-bar-renderer,
    tp-yt-paper-icon-button,
    a, button, input, select, textarea,
    [role="button"], [role="link"], [role="tab"],
    ytmusic-pivot-bar-item-renderer,
    #guide-button, #search-button,
    .search-container,
    ytmusic-settings-button {
      -webkit-app-region: no-drag;
    }

    /* Smooth scrolling */
    * { scroll-behavior: smooth; }
  `;
  document.head.appendChild(style);

  // --- Create drag region ---
  function createDragRegion() {
    if (document.getElementById('yt-music-drag-region')) return;
    const drag = document.createElement('div');
    drag.id = 'yt-music-drag-region';
    document.body.prepend(drag);
  }

  if (document.body) createDragRegion();
  else document.addEventListener('DOMContentLoaded', createDragRegion);

  // --- Disable zoom gestures ---
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  // Disable Cmd+Plus/Minus zoom
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '-' || e.key === '+')) {
      e.preventDefault();
    }
  });

  // --- Ad blocking ---
  const adSelectors = [
    'ytmusic-you-there-renderer',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    '.ytmusic-mealbar-promo-renderer',
    'tp-yt-paper-dialog.ytmusic-popup-container',
    '#masthead-ad',
    '.ad-showing video',
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
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
    // Auto-dismiss popups
    const confirmBtn = document.querySelector(
      'ytmusic-you-there-renderer tp-yt-paper-button, ' +
      'yt-button-renderer.style-blue-text[dialog-confirm], ' +
      'tp-yt-paper-dialog .yt-spec-button-shape-next--filled'
    );
    if (confirmBtn) confirmBtn.click();
  }

  const obs = new MutationObserver(removeAds);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      obs.observe(document.body, { childList: true, subtree: true });
    });
  }

  // --- Media info → Rust ---
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
      sendMediaInfo();
    } else {
      setTimeout(watchPlayerBar, 1000);
    }
  }
  watchPlayerBar();
  setInterval(sendMediaInfo, 3000);

  // --- Media controls from Rust ---
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
