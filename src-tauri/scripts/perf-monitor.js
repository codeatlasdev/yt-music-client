(function() {
  'use strict';

  // ==========================================================
  // PERFORMANCE MONITOR — debug builds only
  // Shows real-time metrics overlay
  // ==========================================================

  const panel = document.createElement('div');
  panel.id = 'perf-monitor';
  panel.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 12px;
    background: rgba(0,0,0,0.85);
    color: #0f0;
    font: 11px/1.4 'SF Mono', Monaco, monospace;
    padding: 8px 12px;
    border-radius: 6px;
    z-index: 99999;
    pointer-events: none;
    min-width: 200px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
  `;

  function getMetrics() {
    const mem = performance.memory ? {
      used: (performance.memory.usedJSHeapSize / 1048576).toFixed(1),
      total: (performance.memory.totalJSHeapSize / 1048576).toFixed(1),
      limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(0),
    } : null;

    const domNodes = document.querySelectorAll('*').length;
    const images = document.querySelectorAll('img[src]').length;
    const videos = document.querySelectorAll('video').length;
    const iframes = document.querySelectorAll('iframe').length;
    const observers = window.__mutationObserverCount || 0;

    // Layout metrics
    const entries = performance.getEntriesByType('longtask');
    const longTasks = entries.length;

    // FPS estimate
    return { mem, domNodes, images, videos, iframes, longTasks };
  }

  // FPS counter
  let fps = 0, frameCount = 0, lastTime = performance.now();
  function countFrame() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(countFrame);
  }
  requestAnimationFrame(countFrame);

  function update() {
    const m = getMetrics();
    let html = `<b>⚡ YT Music Perf</b>\n`;
    html += `FPS: ${fps}\n`;
    html += `DOM nodes: ${m.domNodes.toLocaleString()}\n`;
    html += `Images: ${m.images} | Videos: ${m.videos} | Iframes: ${m.iframes}\n`;
    if (m.mem) {
      html += `JS Heap: ${m.mem.used}/${m.mem.total} MB (limit: ${m.mem.limit})\n`;
    }
    html += `Long tasks: ${m.longTasks}\n`;

    // Color code FPS
    const fpsColor = fps >= 55 ? '#0f0' : fps >= 30 ? '#ff0' : '#f00';
    panel.innerHTML = html.replace(`FPS: ${fps}`, `FPS: <span style="color:${fpsColor}">${fps}</span>`);
  }

  function init() {
    document.body.appendChild(panel);
    setInterval(update, 1000);
    update();

    // Log initial load metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.getEntriesByType('navigation')[0];
        if (timing) {
          console.log('[YT Music Perf] Load metrics:', {
            domContentLoaded: Math.round(timing.domContentLoadedEventEnd) + 'ms',
            loadComplete: Math.round(timing.loadEventEnd) + 'ms',
            domInteractive: Math.round(timing.domInteractive) + 'ms',
            transferSize: Math.round(timing.transferSize / 1024) + 'KB',
          });
        }
        console.log('[YT Music Perf] DOM:', getMetrics());
      }, 2000);
    });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
