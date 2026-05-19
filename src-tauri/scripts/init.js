(function() {
  'use strict';

  // --- CSS: titlebar padding + dark background while loading ---
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      background: #030303 !important;
    }
    body {
      padding-top: 28px !important;
    }
    #layout { padding-top: 0 !important; }
    ytmusic-app-layout > [slot="player-bar"] { z-index: 999; }
    /* Disable pinch-to-zoom */
    body { touch-action: pan-x pan-y; }
  `;
  document.head.appendChild(style);

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
    // Skip video ads instantly
    const video = document.querySelector('video');
    if (video && document.querySelector('.ad-showing')) {
      video.currentTime = video.duration || 0;
      video.playbackRate = 16;
    }
    // Auto-dismiss "Are you still watching?" / "Still there?"
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

  // Use MutationObserver on player bar for instant updates, fallback to interval
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
  setInterval(sendMediaInfo, 3000); // fallback

  // --- Media controls from Rust (play/pause/next/prev) ---
  function setupMediaControls() {
    if (!window.__TAURI__?.event) {
      setTimeout(setupMediaControls, 500);
      return;
    }
    window.__TAURI__.event.listen('media-control', (event) => {
      const video = document.querySelector('video');
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
