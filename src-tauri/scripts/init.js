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
    ytmusic-player-bar, .content, .description, .subtitle,
    input, textarea, [contenteditable] {
      -webkit-user-select: text;
      user-select: text;
    }
    #layout { padding-top: 0 !important; }
    ytmusic-app-layout > [slot="player-bar"] { z-index: 999; }
    body { touch-action: pan-x pan-y; }

    /* Drag region */
    #yt-music-drag-region {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 38px;
      z-index: 10000;
      -webkit-app-region: drag;
    }

    /* No-drag on interactive elements */
    ytmusic-pivot-bar-renderer,
    ytmusic-search-box,
    #right-content,
    tp-yt-paper-icon-button,
    a, button, input, select, textarea,
    [role="button"], [role="link"], [role="tab"],
    ytmusic-pivot-bar-item-renderer,
    .search-container,
    ytmusic-settings-button {
      -webkit-app-region: no-drag;
    }

    /* Hide ad-related elements */
    ytmusic-you-there-renderer,
    .ytmusic-mealbar-promo-renderer,
    tp-yt-paper-dialog:has(yt-mealbar-promo-renderer),
    #masthead-ad,
    .ytp-ad-overlay-container,
    .ytp-ad-text-overlay,
    .ytp-ad-skip-button-container,
    ytmusic-statement-banner-renderer,
    ytmusic-mealbar-promo-renderer,
    .ytmusic-popup-container:has(.promo),
    .ad-showing .ytp-ad-player-overlay {
      display: none !important;
    }

    * { scroll-behavior: smooth; }
  `;
  document.head.appendChild(style);

  // --- Drag region ---
  function createDragRegion() {
    if (document.getElementById('yt-music-drag-region')) return;
    const drag = document.createElement('div');
    drag.id = 'yt-music-drag-region';
    document.body.prepend(drag);
  }
  if (document.body) createDragRegion();
  else document.addEventListener('DOMContentLoaded', createDragRegion);

  // --- Disable zoom ---
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '-' || e.key === '+')) {
      e.preventDefault();
    }
  });

  // ==========================================================
  // AD BLOCKING — complete removal
  // ==========================================================

  // 1. Skip video ads instantly
  function skipAds() {
    const player = document.querySelector('#movie_player');
    const video = document.querySelector('video');

    // If ad is playing, skip it
    if (document.querySelector('.ad-showing') || player?.classList.contains('ad-showing')) {
      if (video) {
        video.currentTime = 9999;
        video.playbackRate = 16;
      }
      // Click skip button if available
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipBtn) skipBtn.click();
    }

    // Remove ad overlays
    document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-text-overlay').forEach(el => el.remove());
  }

  // 2. Remove promotional banners and popups
  function removePromos() {
    const promoSelectors = [
      'ytmusic-you-there-renderer',
      'ytmusic-mealbar-promo-renderer',
      'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
      'ytmusic-statement-banner-renderer',
      'tp-yt-paper-dialog.ytmusic-popup-container',
      'ytmusic-enforcement-message-renderer',
    ];
    for (const sel of promoSelectors) {
      document.querySelectorAll(sel).forEach(el => el.remove());
    }

    // Auto-dismiss "Are you still watching?" / "Still there?"
    const confirmBtn = document.querySelector(
      'ytmusic-you-there-renderer tp-yt-paper-button, ' +
      'yt-button-renderer[dialog-confirm], ' +
      '.yt-spec-button-shape-next--filled[aria-label]'
    );
    if (confirmBtn) confirmBtn.click();
  }

  // 3. Observe DOM for ads
  const adObserver = new MutationObserver(() => {
    skipAds();
    removePromos();
  });
  if (document.body) {
    adObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      adObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // ==========================================================
  // HIGH QUALITY AUDIO — force 256kbps AAC
  // ==========================================================

  function forceHighQuality() {
    const player = document.querySelector('#movie_player');
    if (!player) return;

    // Use internal API to set quality to highest available
    if (player.setPlaybackQualityRange) {
      player.setPlaybackQualityRange('hd1080', 'hd1080');
    }

    // Access the audio quality setting via YouTube Music's internal config
    // The player uses adaptive streaming — we want the highest audio bitrate
    if (player.getAvailableQualityLevels) {
      const levels = player.getAvailableQualityLevels();
      if (levels.length > 0) {
        player.setPlaybackQualityRange(levels[0], levels[0]);
      }
    }
  }

  // Force high quality on every new song
  function watchForNewSongs() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (playerBar) {
      new MutationObserver(() => {
        setTimeout(forceHighQuality, 500);
      }).observe(playerBar, { childList: true, subtree: true });
    } else {
      setTimeout(watchForNewSongs, 1000);
    }
  }

  // Also intercept the player config to force high quality
  // YouTube Music uses `yt.config_` for player settings
  function patchPlayerConfig() {
    // Override the audio quality preference in localStorage
    try {
      const prefs = JSON.parse(localStorage.getItem('yt-player-quality') || '{}');
      prefs.data = JSON.stringify({ quality: 'hd1080', previousQuality: 'hd1080' });
      localStorage.setItem('yt-player-quality', JSON.stringify(prefs));
    } catch(e) {}

    // Set the streaming quality cookie/preference
    try {
      const config = document.querySelector('ytmusic-app')?.playerApi_;
      if (config?.setPlaybackQualityRange) {
        config.setPlaybackQualityRange('hd1080', 'hd1080');
      }
    } catch(e) {}
  }

  setTimeout(forceHighQuality, 3000);
  setTimeout(patchPlayerConfig, 4000);
  watchForNewSongs();

  // ==========================================================
  // MEDIA INFO → Rust
  // ==========================================================

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
