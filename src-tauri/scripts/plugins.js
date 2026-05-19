(function() {
  'use strict';

  // ==========================================================
  // PLUGIN: Crossfade
  // Smooth transition between songs (fade out current, fade in next)
  // ==========================================================
  (function crossfade() {
    const FADE_DURATION = 3; // seconds
    let isFading = false;

    function setupCrossfade() {
      const video = document.querySelector('video');
      if (!video) { setTimeout(setupCrossfade, 1000); return; }

      video.addEventListener('timeupdate', () => {
        if (isFading) return;
        if (video.duration && video.currentTime > video.duration - FADE_DURATION) {
          isFading = true;
          const startVolume = video.volume;
          const fadeInterval = setInterval(() => {
            const remaining = video.duration - video.currentTime;
            if (remaining <= 0) {
              clearInterval(fadeInterval);
              video.volume = startVolume;
              isFading = false;
              return;
            }
            video.volume = startVolume * (remaining / FADE_DURATION);
          }, 50);
        }
      });

      // Restore volume on new song
      const observer = new MutationObserver(() => {
        if (!isFading) video.volume = 1;
      });
      const titleEl = document.querySelector('.title.ytmusic-player-bar');
      if (titleEl) observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
    setupCrossfade();
  })();

  // ==========================================================
  // PLUGIN: Exponential Volume
  // Makes volume slider feel more natural (logarithmic curve)
  // ==========================================================
  (function exponentialVolume() {
    function setup() {
      const video = document.querySelector('video');
      const slider = document.querySelector('#volume-slider');
      if (!video || !slider) { setTimeout(setup, 1000); return; }

      // Override the volume slider behavior
      const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
      let rawVolume = 1;

      slider.addEventListener('input', () => {
        const linear = slider.value / 100;
        // Apply exponential curve: x^3 gives a more natural feel
        const exponential = Math.pow(linear, 3);
        video.volume = exponential;
      });
    }
    setup();
  })();

  // ==========================================================
  // PLUGIN: Skip Silences — DISABLED
  // createMediaElementSource can interfere with streaming
  // ==========================================================

  // ==========================================================
  // PLUGIN: Skip Disliked Songs
  // Automatically skips songs that have been disliked
  // ==========================================================
  (function skipDisliked() {
    function setup() {
      const observer = new MutationObserver(() => {
        const dislikeBtn = document.querySelector('#like-button-renderer tp-yt-paper-icon-button[aria-pressed="true"].dislike');
        // Alternative selector for newer UI
        const dislikeActive = document.querySelector('ytmusic-like-button-renderer .dislike.style-scope[aria-pressed="true"]');
        if (dislikeBtn || dislikeActive) {
          const nextBtn = document.querySelector('.next-button');
          if (nextBtn) nextBtn.click();
        }
      });

      const playerBar = document.querySelector('ytmusic-player-bar');
      if (playerBar) {
        observer.observe(playerBar, { childList: true, subtree: true, attributes: true });
      } else {
        setTimeout(setup, 1000);
      }
    }
    setup();
  })();

  // ==========================================================
  // PLUGIN: Keyboard Shortcuts
  // Global keyboard shortcuts for common actions
  // ==========================================================
  (function shortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const playBtn = document.querySelector('#play-pause-button');
      const nextBtn = document.querySelector('.next-button');
      const prevBtn = document.querySelector('.previous-button');
      const video = document.querySelector('video');
      const repeatBtn = document.querySelector('.repeat');
      const shuffleBtn = document.querySelector('.shuffle');

      switch(true) {
        // Space: play/pause
        case e.code === 'Space' && !e.metaKey && !e.ctrlKey:
          e.preventDefault();
          playBtn?.click();
          break;
        // Arrow Right: next track (with Cmd/Ctrl)
        case (e.metaKey || e.ctrlKey) && e.code === 'ArrowRight':
          e.preventDefault();
          nextBtn?.click();
          break;
        // Arrow Left: previous track (with Cmd/Ctrl)
        case (e.metaKey || e.ctrlKey) && e.code === 'ArrowLeft':
          e.preventDefault();
          prevBtn?.click();
          break;
        // Arrow Up: volume up
        case e.code === 'ArrowUp' && !e.metaKey && !e.ctrlKey:
          e.preventDefault();
          if (video) video.volume = Math.min(1, video.volume + 0.05);
          break;
        // Arrow Down: volume down
        case e.code === 'ArrowDown' && !e.metaKey && !e.ctrlKey:
          e.preventDefault();
          if (video) video.volume = Math.max(0, video.volume - 0.05);
          break;
        // R: toggle repeat
        case e.code === 'KeyR' && !e.metaKey && !e.ctrlKey:
          repeatBtn?.click();
          break;
        // S: toggle shuffle
        case e.code === 'KeyS' && !e.metaKey && !e.ctrlKey:
          shuffleBtn?.click();
          break;
        // L: like current song
        case e.code === 'KeyL' && !e.metaKey && !e.ctrlKey:
          document.querySelector('#like-button-renderer .like')?.click();
          break;
        // Arrow Left/Right without modifier: seek ±5s
        case e.code === 'ArrowLeft' && !e.metaKey && !e.ctrlKey:
          e.preventDefault();
          if (video) video.currentTime -= 5;
          break;
        case e.code === 'ArrowRight' && !e.metaKey && !e.ctrlKey:
          e.preventDefault();
          if (video) video.currentTime += 5;
          break;
      }
    });
  })();

  // ==========================================================
  // PLUGIN: Auto-confirm / Disable Autoplay Interruptions
  // Prevents "Continue watching?" and similar interruptions
  // ==========================================================
  (function autoConfirm() {
    setInterval(() => {
      // "Are you still there?" / "Continue watching?"
      const confirmBtns = document.querySelectorAll(
        'ytmusic-you-there-renderer tp-yt-paper-button, ' +
        'yt-button-renderer[dialog-confirm], ' +
        '.yt-spec-button-shape-next--filled[aria-label]'
      );
      confirmBtns.forEach(btn => btn.click());
    }, 5000);
  })();

})();
