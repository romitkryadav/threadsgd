(() => {
  const originalSetToolMode = window.setToolMode;
  if (typeof originalSetToolMode === 'function') {
    window.setToolMode = function keepReelPageLabels(mode) {
      originalSetToolMode.call(this, mode);
      if (mode === 'video' && window.location.pathname.includes('threads-reel-downloader')) {
        const heading = document.getElementById('heroHeading');
        const input = document.getElementById('urlInput');
        if (heading) heading.textContent = 'Threads Reel Downloader';
        if (input) input.placeholder = 'Paste a public Threads video post link';
      }
    };
  }

  const originalRenderResult = window.renderResult;
  if (typeof originalRenderResult === 'function') {
    window.renderResult = function renderThreadsReelResult(data) {
      originalRenderResult.call(this, data);
      const badge = document.getElementById('resultTypeBadge');
      if (badge && badge.textContent.toLowerCase().includes('video')) {
        badge.textContent = 'Threads Reel Video';
      }
    };
  }
})();
