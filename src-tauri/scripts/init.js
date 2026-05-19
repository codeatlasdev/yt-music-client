(function() {
  const style = document.createElement('style');
  style.textContent = `
    body { padding-top: 28px !important; }
    #layout { padding-top: 0 !important; }
    ytmusic-app-layout > [slot="player-bar"] { z-index: 999; }
  `;
  document.head.appendChild(style);

  const adSelectors = [
    'ytmusic-you-there-renderer',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    '.ytmusic-mealbar-promo-renderer',
    'ytmusic-popup-container',
    '#masthead-ad',
    '.ad-showing video',
  ];

  function removeAds() {
    adSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
    const video = document.querySelector('video');
    if (video && document.querySelector('.ad-showing')) {
      video.currentTime = video.duration || 0;
    }
  }

  const observer = new MutationObserver(removeAds);
  observer.observe(document.body || document.documentElement, {
    childList: true, subtree: true
  });

  let lastTitle = '';
  function sendMediaInfo() {
    const titleEl = document.querySelector('.title.ytmusic-player-bar');
    const artistEl = document.querySelector('.byline.ytmusic-player-bar a');
    const playBtn = document.querySelector('#play-pause-button');
    const title = titleEl?.textContent?.trim() || '';
    const artist = artistEl?.textContent?.trim() || '';
    const isPlaying = playBtn?.getAttribute('aria-label')?.includes('Pause') || false;

    if (title && title !== lastTitle) {
      lastTitle = title;
      if (window.__TAURI__) {
        window.__TAURI__.core.invoke('update_media', { title, artist, isPlaying });
      }
    }
  }
  setInterval(sendMediaInfo, 2000);
})();
