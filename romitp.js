/**
 * Threads Downloader - Main Frontend Script
 * Handles UI interactions, API calls, theme switching, and video/image/carousel downloads.
 * Supports both threads.net and threads.com post URLs.
 */

// Worker URL provided by user
const WORKER_URL = "https://tdvideo.romitkr5539.workers.dev";

// Global DOM State
let currentMediaType = 'video'; // 'video' | 'image'
let currentResultData = null;

/**
 * Determine primary API Base URL
 */
function getPrimaryApiBase() {
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('run.app') || origin.includes('127.0.0.1') || origin.includes('pages.dev')) {
    return ""; // Use same origin relative /api server
  }
  return WORKER_URL;
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initDownloaderTool();
  initFaqAccordion();
});

/* ==========================================================================
   1. Theme Management (Dark / Light Mode)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('td_theme') || 'dark';

  setTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('td_theme', theme);

  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (theme === 'light') {
      themeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
      themeIcon.setAttribute('title', 'Switch to Dark Mode');
    } else {
      themeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
      themeIcon.setAttribute('title', 'Switch to Light Mode');
    }
  }
}

/* ==========================================================================
   2. Navigation & Mobile Drawer
   ========================================================================== */
function initNavigation() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');

  if (hamburgerBtn && mobileNav) {
    hamburgerBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      const isOpen = mobileNav.classList.contains('open');
      hamburgerBtn.innerHTML = isOpen
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`;
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
      });
    });
  }
}

/* ==========================================================================
   3. Downloader Interface Core Logic
   ========================================================================== */
function initDownloaderTool() {
  const urlInput = document.getElementById('urlInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const toolVideoTab = document.getElementById('toolVideoTab');
  const toolImageTab = document.getElementById('toolImageTab');
  const sampleVideoBtn = document.getElementById('sampleVideoBtn');
  const sampleImageBtn = document.getElementById('sampleImageBtn');
  const sampleCarouselBtn = document.getElementById('sampleCarouselBtn');
  const sampleDpBtn = document.getElementById('sampleDpBtn');
  const toolDpTab = document.getElementById('toolDpTab');

  if (toolVideoTab && toolImageTab) {
    toolVideoTab.addEventListener('click', () => setToolMode('video'));
    toolImageTab.addEventListener('click', () => setToolMode('image'));
    if (toolDpTab) toolDpTab.addEventListener('click', () => setToolMode('dp'));
  }

  if (pasteBtn && urlInput) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          urlInput.value = text.trim();
          updateInputState();
          autoDetectTypeFromUrl(text.trim());
        }
      } catch (err) {
        alert('Clipboard access denied. Please paste the URL manually into the input box.');
      }
    });
  }

  if (clearBtn && urlInput) {
    clearBtn.addEventListener('click', () => {
      urlInput.value = '';
      updateInputState();
      hideResult();
      hideError();
    });
  }

  if (urlInput) {
    urlInput.addEventListener('input', () => {
      updateInputState();
    });

    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        processDownload();
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      processDownload();
    });
  }

  if (sampleVideoBtn) {
    sampleVideoBtn.addEventListener('click', () => {
      setToolMode('video');
      urlInput.value = 'https://www.threads.com/@demouser/post/test-video';
      updateInputState();
      processDownload();
    });
  }

  if (sampleImageBtn) {
    sampleImageBtn.addEventListener('click', () => {
      setToolMode('image');
      urlInput.value = 'https://www.threads.net/@demouser/post/test-image';
      updateInputState();
      processDownload();
    });
  }

  if (sampleCarouselBtn) {
    sampleCarouselBtn.addEventListener('click', () => {
      urlInput.value = 'https://www.threads.com/@demouser/post/test-carousel';
      updateInputState();
      processDownload();
    });
  }

  if (sampleDpBtn) {
    sampleDpBtn.addEventListener('click', () => {
      setToolMode('dp');
      urlInput.value = 'https://www.threads.net/@demouser/test-dp';
      updateInputState();
      processDownload();
    });
  }
}

function setToolMode(mode) {
  currentMediaType = mode;
  const toolVideoTab = document.getElementById('toolVideoTab');
  const toolImageTab = document.getElementById('toolImageTab');
  const toolDpTab = document.getElementById('toolDpTab');
  const heroHeading = document.getElementById('heroHeading');
  const urlInput = document.getElementById('urlInput');

  toolVideoTab?.classList.remove('active');
  toolImageTab?.classList.remove('active');
  toolDpTab?.classList.remove('active');

  if (mode === 'video') {
    toolVideoTab?.classList.add('active');
    if (heroHeading) heroHeading.textContent = 'Threads Video Downloader';
    if (urlInput) urlInput.placeholder = 'Paste Threads video link (e.g. https://www.threads.com/@user/post/...)...';
  } else if (mode === 'image') {
    toolImageTab?.classList.add('active');
    if (heroHeading) heroHeading.textContent = 'Threads Image Downloader';
    if (urlInput) urlInput.placeholder = 'Paste Threads photo link (e.g. https://www.threads.com/@user/post/...)...';
  } else if (mode === 'dp') {
    toolDpTab?.classList.add('active');
    if (heroHeading) heroHeading.textContent = 'Threads DP Downloader';
    if (urlInput) urlInput.placeholder = 'Enter Threads @username or Paste URL (e.g. https://www.threads.com/@username)...';
  }
}

function updateInputState() {
  const urlInput = document.getElementById('urlInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearBtn = document.getElementById('clearBtn');

  if (!urlInput || !pasteBtn || !clearBtn) return;

  if (urlInput.value.trim().length > 0) {
    pasteBtn.classList.add('hidden');
    clearBtn.classList.remove('hidden');
  } else {
    pasteBtn.classList.remove('hidden');
    clearBtn.classList.add('hidden');
  }
}

function normalizeInputUrl(raw) {
  let url = (raw || '').trim();
  if (!url) return '';
  if (/^@?[\w.-]+$/.test(url) && !url.includes('.')) {
    const user = url.replace(/^@/, '');
    return `https://www.threads.net/@${user}`;
  }
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  url = url.replace(/threads\.com/i, 'threads.net');

  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (/^\/([A-Za-z0-9_.-]+)\/?$/.test(path)) {
      const match = path.match(/^\/([A-Za-z0-9_.-]+)\/?$/);
      if (match) {
        const seg = match[1];
        if (!seg.startsWith('@') && !['t', 'post', 'api', 'share', 'intent'].includes(seg.toLowerCase())) {
          url = `${parsed.origin}/@${seg}`;
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return url;
}

function autoDetectTypeFromUrl(url) {
  const norm = normalizeInputUrl(url);
  if (norm.includes('test-image')) {
    setToolMode('image');
  } else if (norm.includes('test-video')) {
    setToolMode('video');
  } else if (norm.includes('test-dp') || norm.includes('test-profile')) {
    setToolMode('dp');
  } else if (!norm.includes('/post/') && !norm.includes('/t/')) {
    setToolMode('dp');
  }
}

/* ==========================================================================
   4. API Request & Download Processing
   ========================================================================== */
async function processDownload() {
  const urlInput = document.getElementById('urlInput');
  const rawInput = urlInput ? urlInput.value.trim() : '';

  hideError();
  hideResult();

  if (!rawInput) {
    showError('Empty URL or Handle', 'Please enter or paste a Threads post URL or profile handle (e.g. @username).');
    return;
  }

  const rawUrl = normalizeInputUrl(rawInput);
  if (urlInput && urlInput.value !== rawUrl) {
    urlInput.value = rawUrl;
    updateInputState();
  }

  // Validate URL format (supports posts AND profile URLs)
  const threadsPattern = /^https?:\/\/(www\.)?threads\.(net|com)\/(@?[\w.-]+(\/post\/[A-Za-z0-9_-]+)?|t\/[A-Za-z0-9_-]+|post\/[A-Za-z0-9_-]+)/i;
  const isTestUrl = rawUrl.includes('test-video') || rawUrl.includes('test-image') || rawUrl.includes('test-carousel') || rawUrl.includes('test-dp') || rawUrl.includes('test-profile');

  if (!threadsPattern.test(rawUrl) && !isTestUrl) {
    showError(
      'Invalid URL Format',
      'Please enter a valid Threads post or profile URL. Examples:\n• @username or https://www.threads.net/@username (Profile DP)\n• https://www.threads.com/@username/post/POST_ID'
    );
    return;
  }

  showLoading(true, 'Connecting to Threads...', 'Extracting media or profile picture from server');

  let data = null;
  let lastError = null;

  // Try Primary API Endpoint
  const primaryBase = getPrimaryApiBase();
  try {
    const endpoint = `${primaryBase}/api/download?url=${encodeURIComponent(rawUrl)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.success) {
        data = result;
      } else {
        lastError = result.error || 'Extraction failed';
      }
    } else {
      const errRes = await response.json().catch(() => ({}));
      lastError = errRes.error || `Server returned ${response.status}`;
    }
  } catch (err) {
    lastError = err.message || 'Primary API unreachable';
  }

  // If Primary API failed, try Cloudflare Worker as Fallback
  if (!data && primaryBase !== WORKER_URL) {
    try {
      const fallbackEndpoint = `${WORKER_URL}/api/download?url=${encodeURIComponent(rawUrl)}`;
      const response = await fetch(fallbackEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.success) {
          data = result;
        } else {
          lastError = result.error || lastError;
        }
      }
    } catch (err) {
      console.warn('Worker fallback failed:', err);
    }
  }

  showLoading(false);

  if (data && data.success) {
    currentResultData = data;
    renderResult(data);
  } else {
    showError(
      'Extraction Failed',
      lastError || 'Unable to fetch media from this Threads post. Please ensure the post is public and contains videos or images.'
    );
  }
}

/* ==========================================================================
   5. UI Rendering & Media Preview (Supports Single & Multi-Media / Carousel)
   ========================================================================== */
function showLoading(active, statusText = 'Processing...', subtext = '') {
  const loadingBox = document.getElementById('loadingBox');
  const loadingStatus = document.getElementById('loadingStatus');
  const loadingSubtext = document.getElementById('loadingSubtext');
  const downloadBtn = document.getElementById('downloadBtn');

  if (loadingBox) {
    if (active) {
      loadingBox.classList.add('active');
      if (loadingStatus) loadingStatus.textContent = statusText;
      if (loadingSubtext) loadingSubtext.textContent = subtext;
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.7';
      }
    } else {
      loadingBox.classList.remove('active');
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
      }
    }
  }
}

function showError(title, message) {
  const errorBox = document.getElementById('errorBox');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');

  if (errorBox) {
    if (errorTitle) errorTitle.textContent = title;
    if (errorMessage) errorMessage.textContent = message;
    errorBox.classList.add('active');
  }
}

function hideError() {
  const errorBox = document.getElementById('errorBox');
  if (errorBox) {
    errorBox.classList.remove('active');
  }
}

function hideResult() {
  const resultBox = document.getElementById('resultBox');
  if (resultBox) {
    resultBox.classList.remove('active');
  }
}

function buildProxyUrl(mediaUrl, filename = 'threads-media') {
  const base = getPrimaryApiBase() || WORKER_URL;
  return `${base}/api/proxy?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
}

function renderResult(data) {
  const resultBox = document.getElementById('resultBox');
  const previewContainer = document.getElementById('mediaPreviewContainer');
  const resultTypeBadge = document.getElementById('resultTypeBadge');
  const authorName = document.getElementById('authorName');
  const qualityOptions = document.getElementById('qualityOptions');
  const qualityPills = document.getElementById('qualityPills');
  const downloadDirectBtn = document.getElementById('downloadDirectBtn');
  const copyLinkBtn = document.getElementById('copyLinkBtn');

  if (!resultBox || !previewContainer) return;

  // Clear previous preview
  previewContainer.innerHTML = '';

  // Get list of media items
  const mediaList = data.mediaList && data.mediaList.length > 0 ? data.mediaList : [
    {
      type: data.type || 'video',
      mediaUrl: data.mediaUrl,
      thumbnail: data.thumbnail,
      quality: data.quality,
      qualities: data.qualities
    }
  ];

  const totalItems = mediaList.length;
  const isMulti = totalItems > 1;
  const isProfile = data.type === 'profile' || (totalItems === 1 && mediaList[0].type === 'profile');

  if (isMulti) {
    previewContainer.classList.add('multi-mode');
    previewContainer.classList.remove('profile-dp-mode');
  } else if (isProfile) {
    previewContainer.classList.add('profile-dp-mode');
    previewContainer.classList.remove('multi-mode');
  } else {
    previewContainer.classList.remove('multi-mode');
    previewContainer.classList.remove('profile-dp-mode');
  }

  // Header Badge
  if (resultTypeBadge) {
    if (isProfile) {
      resultTypeBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Profile DP (HD)`;
    } else if (isMulti) {
      resultTypeBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> Multi-Media Post (${totalItems} Files)`;
    } else {
      const isVideo = mediaList[0].type === 'video';
      resultTypeBadge.innerHTML = isVideo
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg> Threads Video`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg> Threads Image`;
    }
  }

  // Author
  if (authorName) authorName.textContent = data.author || '@threads';

  if (isMulti) {
    // MULTI-MEDIA / CAROUSEL LAYOUT: Render a media grid
    qualityOptions?.classList.add('hidden');

    const gridElem = document.createElement('div');
    gridElem.className = 'media-grid';

    mediaList.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'media-grid-card';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'media-card-header';
      cardHeader.innerHTML = `<span class="card-num-badge">#${index + 1} ${item.type === 'video' ? 'Video' : 'Image'}</span><span class="card-quality-badge">${item.quality || 'HD'}</span>`;

      const cardPreview = document.createElement('div');
      cardPreview.className = 'media-card-preview';

      let currentMediaUrl = item.mediaUrl;
      const isVid = item.type === 'video';

      if (isVid) {
        const vid = document.createElement('video');
        vid.controls = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('referrerpolicy', 'no-referrer');
        vid.preload = 'metadata';
        if (item.thumbnail) vid.poster = item.thumbnail;

        const proxyVidUrl = buildProxyUrl(item.mediaUrl, `threads-video-${index + 1}.mp4`);
        vid.src = proxyVidUrl;

        vid.onerror = () => {
          if (vid.src !== item.mediaUrl) {
            console.warn(`Proxy playback failed for video #${index + 1}. Falling back to direct URL...`);
            vid.src = item.mediaUrl;
            vid.load();
          }
        };

        // Auto scroll to media when loaded
        vid.addEventListener('canplay', () => {
          cardPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, { once: true });

        cardPreview.appendChild(vid);
      } else {
        const img = document.createElement('img');
        img.alt = `Threads Media Image ${index + 1}`;
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.src = item.mediaUrl;

        const proxyImgUrl = buildProxyUrl(item.mediaUrl, `threads-image-${index + 1}.jpg`);
        img.onerror = () => {
          if (img.src !== proxyImgUrl) {
            console.warn(`Direct image loading blocked for item #${index + 1}. Switching to proxy image...`);
            img.src = proxyImgUrl;
          }
        };

        // Auto scroll to media when loaded
        img.addEventListener('load', () => {
          cardPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, { once: true });

        cardPreview.appendChild(img);
      }

      // Card action button
      const cardActions = document.createElement('div');
      cardActions.className = 'media-card-actions';

      const dBtn = document.createElement('button');
      dBtn.className = 'btn-primary card-download-btn';
      const iconSvg = isVid ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      dBtn.innerHTML = `${iconSvg} Download #${index + 1}`;

      dBtn.onclick = (e) => {
        e.preventDefault();
        const filename = `threads-${item.type}-${index + 1}.${isVid ? 'mp4' : 'jpg'}`;
        triggerDownload(currentMediaUrl, filename, dBtn);
      };

      cardActions.appendChild(dBtn);

      card.appendChild(cardHeader);
      card.appendChild(cardPreview);
      card.appendChild(cardActions);

      gridElem.appendChild(card);
    });

    previewContainer.appendChild(gridElem);

    // Setup main Download All Button
    if (downloadDirectBtn) {
      const hasVideo = mediaList.some(m => m.type === 'video');
      const downloadAllIcon = hasVideo ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      downloadDirectBtn.innerHTML = `${downloadAllIcon} Download All ${totalItems} Items`;
      downloadDirectBtn.onclick = (e) => {
        e.preventDefault();
        downloadAllMedia(mediaList);
      };
    }

    if (copyLinkBtn) {
      copyLinkBtn.onclick = () => {
        const links = mediaList.map(m => m.mediaUrl).join('\n');
        navigator.clipboard.writeText(links).then(() => {
          const originalText = copyLinkBtn.innerHTML;
          copyLinkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied ${totalItems} Links!`;
          setTimeout(() => copyLinkBtn.innerHTML = originalText, 2000);
        });
      };
    }

  } else {
    // SINGLE MEDIA LAYOUT
    const item = mediaList[0];
    const isVideo = item.type === 'video';

    if (isVideo) {
      const videoElem = document.createElement('video');
      videoElem.controls = true;
      videoElem.playsInline = true;
      videoElem.setAttribute('playsinline', '');
      videoElem.setAttribute('referrerpolicy', 'no-referrer');
      videoElem.preload = 'metadata';

      if (item.thumbnail) {
        videoElem.poster = item.thumbnail;
      }

      const proxyStreamUrl = buildProxyUrl(item.mediaUrl, 'threads-video.mp4');
      videoElem.src = proxyStreamUrl;

      videoElem.onerror = () => {
        if (videoElem.src !== item.mediaUrl) {
          console.warn('Proxy stream error. Falling back to direct video URL...');
          videoElem.src = item.mediaUrl;
          videoElem.load();
        }
      };

      // Auto scroll to media when loaded
      videoElem.addEventListener('canplay', () => {
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, { once: true });

      previewContainer.appendChild(videoElem);
    } else {
      const imgElem = document.createElement('img');
      imgElem.alt = 'Threads Downloaded Image';
      imgElem.setAttribute('referrerpolicy', 'no-referrer');
      imgElem.src = item.mediaUrl;

      const proxyImgUrl = buildProxyUrl(item.mediaUrl, 'threads-image.jpg');
      imgElem.onerror = () => {
        if (imgElem.src !== proxyImgUrl) {
          console.warn('Direct image loading blocked. Switching to proxy image...');
          imgElem.src = proxyImgUrl;
        } else {
          console.warn('Proxy image failed, providing direct image link');
          imgElem.style.display = 'none';
          const fallbackBox = document.createElement('div');
          fallbackBox.style.padding = '1.5rem';
          fallbackBox.style.textAlign = 'center';
          fallbackBox.style.background = 'var(--bg-glass)';
          fallbackBox.style.borderRadius = 'var(--radius-md)';
          fallbackBox.style.border = '1px solid var(--border)';
          fallbackBox.innerHTML = `
            <p style="color:var(--text-secondary); font-size: 0.95rem; margin-bottom: 0.75rem;">Image preview restricted by CDN headers.</p>
            <a href="${item.mediaUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="display:inline-flex; align-items:center; gap:0.5rem; text-decoration:none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
              View / Download Original DP Image
            </a>
          `;
          previewContainer.appendChild(fallbackBox);
        }
      };

      // Auto scroll to media when loaded
      imgElem.addEventListener('load', () => {
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, { once: true });

      previewContainer.appendChild(imgElem);
    }

    // Qualities options for single video
    if (qualityPills && qualityOptions) {
      qualityPills.innerHTML = '';
      if (item.qualities && item.qualities.length > 0) {
        qualityOptions.classList.remove('hidden');
        item.qualities.forEach((q, index) => {
          const qBtn = document.createElement('button');
          qBtn.className = `quality-btn ${index === 0 ? 'active' : ''}`;
          qBtn.textContent = q.label || 'HD';
          qBtn.addEventListener('click', () => {
            document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
            qBtn.classList.add('active');
            if (isVideo) {
              const vid = previewContainer.querySelector('video');
              if (vid) {
                vid.src = q.url;
                vid.load();
              }
            }
            setupDownloadButton(q.url, isVideo ? 'threads-video.mp4' : 'threads-image.jpg');
          });
          qualityPills.appendChild(qBtn);
        });
      } else {
        qualityOptions.classList.add('hidden');
      }
    }

    // Setup Single Download Button
    if (downloadDirectBtn) {
      const isProf = isProfile || data.type === 'profile';
      const cleanUser = (data.author || 'user').replace('@', '').trim();
      const defaultFilename = isProf ? `threads-dp-${cleanUser}.jpg` : (isVideo ? 'threads-video.mp4' : 'threads-image.jpg');
      
      let singleIcon = '';
      if (isProf) {
        singleIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      } else if (isVideo) {
        singleIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
      } else {
        singleIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      }

      downloadDirectBtn.innerHTML = `${singleIcon} ${isProf ? 'Download HD Profile Picture (DP)' : 'Download File Now'}`;
      setupDownloadButton(item.mediaUrl, defaultFilename);
    }

    if (copyLinkBtn) {
      copyLinkBtn.onclick = () => {
        navigator.clipboard.writeText(item.mediaUrl).then(() => {
          const originalText = copyLinkBtn.innerHTML;
          copyLinkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied Direct Link!`;
          setTimeout(() => copyLinkBtn.innerHTML = originalText, 2000);
        });
      };
    }
  }

  resultBox.classList.add('active');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function triggerDownload(mediaUrl, filename, btnElem) {
  const downloadUrl = buildProxyUrl(mediaUrl, filename) + '&download=1';
  let originalHtml = '';

  if (btnElem) {
    originalHtml = btnElem.innerHTML;
    btnElem.disabled = true;
    btnElem.style.opacity = '0.85';
    btnElem.innerHTML = `<span style="display:inline-block; width:14px; height:14px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; vertical-align:middle; margin-right:6px;"></span> Downloading...`;
  }

  const restoreBtn = (success = true) => {
    if (!btnElem) return;
    if (success) {
      btnElem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
      setTimeout(() => {
        btnElem.disabled = false;
        btnElem.style.opacity = '1';
        btnElem.innerHTML = originalHtml;
      }, 2500);
    } else {
      btnElem.disabled = false;
      btnElem.style.opacity = '1';
      btnElem.innerHTML = originalHtml;
    }
  };

  // Primary Method: In-memory blob fetch & direct save (keeps user on page)
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
    restoreBtn(true);
    return;
  } catch (err) {
    console.warn('Blob fetch failed, falling back to hidden iframe stream:', err);
  }

  // Fallback Method: Hidden iframe (triggers native file download prompt without navigating or opening new tab)
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 45000);

    restoreBtn(true);
  } catch (err) {
    console.error('All download mechanisms failed:', err);
    restoreBtn(false);
  }
}

function downloadAllMedia(mediaList) {
  const downloadDirectBtn = document.getElementById('downloadDirectBtn');
  mediaList.forEach((item, idx) => {
    setTimeout(() => {
      const filename = `threads-${item.type}-${idx + 1}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
      triggerDownload(item.mediaUrl, filename, idx === 0 ? downloadDirectBtn : null);
    }, idx * 800);
  });
}

function setupDownloadButton(mediaUrl, filename) {
  const downloadDirectBtn = document.getElementById('downloadDirectBtn');
  if (!downloadDirectBtn) return;

  downloadDirectBtn.onclick = (e) => {
    e.preventDefault();
    triggerDownload(mediaUrl, filename, downloadDirectBtn);
  };
}

/* ==========================================================================
   6. FAQ Accordion Handler
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
}
