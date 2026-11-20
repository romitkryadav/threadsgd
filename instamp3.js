/**
 * InstaMP3 — Vanilla JavaScript Frontend (Cloudflare Pages)
 *
 * Architecture:
 *   1. Validates Instagram Reel URLs strictly on the client before calling the Worker.
 *   2. Calls POST /api/download on the Cloudflare Worker to retrieve public metadata
 *      and an HMAC-signed ephemeral media stream URL (/api/stream).
 *   3. Streams the verified AAC/MP4 media bytes, decodes audio natively with the
 *      Web Audio API (AudioContext.decodeAudioData), and encodes a genuine
 *      MPEG-1 Audio Layer 3 (.mp3) file with ID3v2.3 tags via self-hosted LAME (/assets/lamejs.iife.js).
 */
(() => {
  'use strict';

  const DEFAULT_API_BASE = 'https://instamp3.romitkr5539.workers.dev';
  const metaApiBase = document.querySelector('meta[name="instamp3-api-base"]');
  const API_BASE = (window.INSTAMP3_API_BASE || (metaApiBase && metaApiBase.content) || DEFAULT_API_BASE).replace(/\/+$/, '');

  const ALLOWED_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']);
  const REEL_PATH_REGEX = /^\/(?:[A-Za-z0-9._-]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,32})(?:\/|$)/i;
  const UNSUPPORTED_PATHS = [
    /^\/stories\//i,
    /^\/highlights\//i,
    /^\/accounts\//i,
    /^\/direct\//i,
    /^\/explore\//i,
    /^\/audio\//i,
  ];

  const ERROR_TITLES = {
    INVALID_URL: 'Invalid Instagram URL',
    UNSUPPORTED_URL: 'Unsupported Link Type',
    PRIVATE_ACCOUNT: 'Private Account Detected',
    DELETED_REEL: 'Reel Not Found',
    RATE_LIMITED: 'Too Many Requests',
    INSTAGRAM_RATE_LIMITED: 'Instagram Rate Limit Reached',
    INSTAGRAM_BLOCKED: 'Instagram Blocked Server Request',
    EXTRACTION_FAILED: 'Media Extraction Failed',
    AUDIO_CONVERSION_FAILED: 'Audio Conversion Failed',
    FILE_TOO_LARGE: 'File Exceeds Size Limit',
    NETWORK_TIMEOUT: 'Request Timed Out',
  };

  const LEGAL_CONTENT = {
    contact: {
      title: 'Contact InstaMP3',
      sections: [
        ['General Inquiries & Bug Reports', 'Share your browser version and error code (never Instagram credentials) with support@instamp3.pages.dev.'],
        ['Copyright & Content Removal', 'InstaMP3 never hosts, caches, or archives Instagram media. Adjust Reel visibility directly on Instagram to restrict public access.'],
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        ['Zero Storage & No Accounts', 'Submitted URLs are processed ephemerally in Cloudflare Worker memory and never stored in a database.'],
        ['Browser-Side Encoding', 'Audio decoding and MP3 encoding run locally on your device via Web Audio API and LAME.'],
      ],
    },
    terms: {
      title: 'Terms of Use',
      sections: [
        ['Permitted Use', 'Use InstaMP3 only for publicly accessible Instagram Reels that you own or have permission to extract audio from.'],
        ['Fair Use', 'Automated bulk scraping, rate-limit evasion, and unauthorized redistribution of copyrighted material are prohibited.'],
      ],
    },
    disclaimer: {
      title: 'Disclaimer',
      sections: [
        ['Independent Tool', 'InstaMP3 is an independent utility and is not affiliated with, endorsed by, or connected to Instagram or Meta Platforms, Inc.'],
      ],
    },
  };

  // State
  let activeBitrate = 192;
  let activeAbortController = null;
  let activeObjectUrl = null;
  let isBusy = false;

  // DOM References
  const themeToggle = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');
  const tabUrl = document.getElementById('tab-url');
  const tabLocal = document.getElementById('tab-local');
  const downloadForm = document.getElementById('download-form');
  const urlInput = document.getElementById('reel-url');
  const clearBtn = document.getElementById('clear-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const pasteStatus = document.getElementById('paste-status');
  const submitBtn = document.getElementById('submit-btn');
  const localPanel = document.getElementById('local-panel');
  const dropzone = document.getElementById('dropzone');
  const localFileInput = document.getElementById('local-file-input');
  const chooseFileBtn = document.getElementById('choose-file-btn');
  const progressPanel = document.getElementById('progress-panel');
  const progressLabel = document.getElementById('progress-label');
  const progressPercent = document.getElementById('progress-percent');
  const progressBar = document.getElementById('progress-bar');
  const cancelBtn = document.getElementById('cancel-btn');
  const errorPanel = document.getElementById('error-panel');
  const errorTitle = document.getElementById('error-title');
  const errorMessage = document.getElementById('error-message');
  const switchLocalBtn = document.getElementById('switch-local-btn');
  const resultPanel = document.getElementById('result-panel');
  const resultThumb = document.getElementById('result-thumb');
  const thumbFallback = document.getElementById('thumb-fallback');
  const resultTitle = document.getElementById('result-title');
  const resultMeta = document.getElementById('result-meta');
  const resultAudio = document.getElementById('result-audio');
  const downloadMp3Link = document.getElementById('download-mp3-link');
  const resetBtn = document.getElementById('reset-btn');
  const modalBackdrop = document.getElementById('legal-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  // Theme Init
  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    themeLabel.textContent = dark ? 'Light' : 'Dark';
    try {
      localStorage.setItem('instamp3-theme', dark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors in strict privacy mode
    }
  }

  const storedTheme = (() => {
    try {
      return localStorage.getItem('instamp3-theme');
    } catch {
      return null;
    }
  })();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(storedTheme ? storedTheme === 'dark' : prefersDark);

  themeToggle.addEventListener('click', () => {
    applyTheme(!document.documentElement.classList.contains('dark'));
  });

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mode Switching
  function setMode(nextMode) {
    hideError();
    const isUrl = nextMode === 'url';
    tabUrl.classList.toggle('active', isUrl);
    tabUrl.setAttribute('aria-selected', String(isUrl));
    tabLocal.classList.toggle('active', !isUrl);
    tabLocal.setAttribute('aria-selected', String(!isUrl));
    downloadForm.classList.toggle('hidden', !isUrl);
    localPanel.classList.toggle('hidden', isUrl);
  }

  tabUrl.addEventListener('click', () => setMode('url'));
  tabLocal.addEventListener('click', () => setMode('local'));
  switchLocalBtn.addEventListener('click', () => setMode('local'));

  // Bitrate Selection
  document.querySelectorAll('.rate-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isBusy) return;
      activeBitrate = Number(btn.dataset.bitrate) || 192;
      document.querySelectorAll('.rate-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // URL Input Helpers
  function updateClearVisibility() {
    clearBtn.classList.toggle('hidden', !urlInput.value);
  }

  urlInput.addEventListener('input', () => {
    updateClearVisibility();
    hideError();
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    updateClearVisibility();
    hideError();
    urlInput.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    hideError();
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        urlInput.value = text.trim();
        updateClearVisibility();
        pasteStatus.textContent = 'Pasted';
      } else {
        pasteStatus.textContent = 'Clipboard is empty';
      }
    } catch {
      urlInput.focus();
      pasteStatus.textContent = 'Press Ctrl+V / Cmd+V to paste';
    }
    setTimeout(() => {
      pasteStatus.textContent = '';
    }, 2200);
  });

  // Formatting & Validation
  function validateInstagramUrl(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      return { ok: false, code: 'INVALID_URL', message: 'Please paste an Instagram Reel URL first.' };
    }
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed;
    try {
      parsed = new URL(normalized);
    } catch {
      return { ok: false, code: 'INVALID_URL', message: 'Please enter a valid URL such as https://www.instagram.com/reel/EXAMPLE/.' };
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { ok: false, code: 'INVALID_URL', message: 'Only standard HTTP/HTTPS links are supported.' };
    }
    if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { ok: false, code: 'UNSUPPORTED_URL', message: 'Only official instagram.com Reel links are supported.' };
    }
    for (const pattern of UNSUPPORTED_PATHS) {
      if (pattern.test(parsed.pathname)) {
        return { ok: false, code: 'UNSUPPORTED_URL', message: 'Stories, highlights, and account links are not supported. Paste a public Reel link.' };
      }
    }
    const match = parsed.pathname.match(REEL_PATH_REGEX);
    if (match) {
      return {
        ok: true,
        shortcode: match[2],
        canonicalUrl: `https://www.instagram.com/reel/${match[2]}/`,
      };
    }
    const shareMatch = parsed.pathname.match(/^\/share\/(?:(reel|p)\/)?([A-Za-z0-9_-]{5,40})(?:\/|$)/i);
    if (shareMatch) {
      const shareType = shareMatch[1] ? `${shareMatch[1].toLowerCase()}/` : '';
      return {
        ok: true,
        shortcode: shareMatch[2],
        canonicalUrl: `https://www.instagram.com/share/${shareType}${shareMatch[2]}/`,
      };
    }
    return { ok: false, code: 'UNSUPPORTED_URL', message: 'Could not locate a Reel ID in that link. Ensure it contains /reel/.' };
  }

  function formatBytes(bytes) {
    if (!bytes || !Number.isFinite(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  function formatDuration(sec) {
    if (!sec || !Number.isFinite(sec)) return '—';
    const total = Math.round(sec);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function sanitizeFilename(name) {
    const clean = String(name || 'instamp3-reel')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return `${clean || 'instamp3-reel'}.mp3`;
  }

  // UI State Helpers
  function setBusyState(busy) {
    isBusy = busy;
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Processing…' : 'Download MP3';
    urlInput.disabled = busy;
    pasteBtn.disabled = busy;
    chooseFileBtn.disabled = busy;
  }

  function showProgress(label, pct) {
    progressPanel.classList.remove('hidden');
    progressLabel.textContent = label;
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    progressPercent.textContent = `${clamped}%`;
    progressBar.style.width = `${clamped}%`;
  }

  function hideProgress() {
    progressPanel.classList.add('hidden');
  }

  function showError(code, message, suggestLocal = false) {
    errorTitle.textContent = ERROR_TITLES[code] || 'Conversion Error';
    errorMessage.textContent = message;
    switchLocalBtn.classList.toggle('hidden', !suggestLocal);
    errorPanel.classList.remove('hidden');
  }

  function hideError() {
    errorPanel.classList.add('hidden');
  }

  function clearResult() {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = null;
    }
    resultAudio.removeAttribute('src');
    resultPanel.classList.add('hidden');
  }

  // Real ID3v2.3 + LAME MP3 Encoder (Browser Web Audio API + self-hosted lamejs)
  function createId3TextFrame(frameId, text) {
    const clean = String(text || '').trim().slice(0, 120);
    const bytes = [0x01, 0xff, 0xfe];
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      bytes.push(code & 0xff, (code >> 8) & 0xff);
    }
    const frame = new Uint8Array(10 + bytes.length);
    for (let i = 0; i < 4; i++) frame[i] = frameId.charCodeAt(i);
    frame[4] = (bytes.length >>> 24) & 0xff;
    frame[5] = (bytes.length >>> 16) & 0xff;
    frame[6] = (bytes.length >>> 8) & 0xff;
    frame[7] = bytes.length & 0xff;
    frame.set(bytes, 10);
    return frame;
  }

  function buildId3v2Header(tags) {
    if (!tags || (!tags.title && !tags.artist)) return null;
    const frames = [];
    if (tags.title) frames.push(createId3TextFrame('TIT2', tags.title));
    if (tags.artist) frames.push(createId3TextFrame('TPE1', tags.artist));
    frames.push(createId3TextFrame('TENC', 'InstaMP3 Browser LAME Encoder'));
    const bodySize = frames.reduce((sum, f) => sum + f.byteLength, 0);
    const header = new Uint8Array(10 + bodySize);
    header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0);
    header[6] = (bodySize >>> 21) & 0x7f;
    header[7] = (bodySize >>> 14) & 0x7f;
    header[8] = (bodySize >>> 7) & 0x7f;
    header[9] = bodySize & 0x7f;
    let offset = 10;
    for (const f of frames) {
      header.set(f, offset);
      offset += f.byteLength;
    }
    return header;
  }

  function floatToInt16Chunk(floatData, start, length) {
    const out = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, floatData[start + i]));
      out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return out;
  }

  async function encodeArrayBufferToMp3(arrayBuffer, bitrateKbps, tags, onProgress, signal) {
    if (!window.lamejs || !window.lamejs.Mp3Encoder) {
      throw new Error('MP3 encoder library failed to load. Please refresh the page.');
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('Your browser does not support Web Audio API decoding.');
    }

    const ctx = new AudioCtx();
    let audioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      throw new Error('Could not decode an audio track from this media file.');
    } finally {
      await ctx.close().catch(() => {});
    }

    if (signal && signal.aborted) {
      throw new DOMException('Cancelled', 'AbortError');
    }

    const channels = Math.min(2, Math.max(1, audioBuffer.numberOfChannels));
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioBuffer.length;
    const leftFloat = audioBuffer.getChannelData(0);
    const rightFloat = channels === 2 ? audioBuffer.getChannelData(1) : null;

    const encoder = new window.lamejs.Mp3Encoder(channels, sampleRate, bitrateKbps);
    const chunks = [];
    const id3 = buildId3v2Header(tags);
    if (id3) chunks.push(id3);

    const blockSize = 1152;
    let totalMp3Bytes = 0;
    let frameCounter = 0;

    for (let offset = 0; offset < totalSamples; offset += blockSize) {
      if (signal && signal.aborted) {
        throw new DOMException('Cancelled', 'AbortError');
      }
      const len = Math.min(blockSize, totalSamples - offset);
      const left16 = floatToInt16Chunk(leftFloat, offset, len);
      const right16 = rightFloat ? floatToInt16Chunk(rightFloat, offset, len) : undefined;
      const encoded = channels === 2 && right16
        ? encoder.encodeBuffer(left16, right16)
        : encoder.encodeBuffer(left16);

      if (encoded.length > 0) {
        const copy = new Uint8Array(encoded);
        chunks.push(copy);
        totalMp3Bytes += copy.byteLength;
      }

      frameCounter++;
      if (frameCounter >= 45) {
        frameCounter = 0;
        if (onProgress) onProgress(Math.min(98, Math.round((offset / totalSamples) * 100)));
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const flushed = encoder.flush();
    if (flushed.length > 0) {
      const copy = new Uint8Array(flushed);
      chunks.push(copy);
      totalMp3Bytes += copy.byteLength;
    }

    if (totalMp3Bytes === 0) {
      throw new Error('MP3 encoder produced no valid audio frames.');
    }

    return {
      blob: new Blob(chunks, { type: 'audio/mpeg' }),
      durationSeconds: audioBuffer.duration,
      sampleRate,
      channels,
      bitrateKbps,
    };
  }

  function renderResult({ title, username, thumbnailUrl, filename, encoded }) {
    activeObjectUrl = URL.createObjectURL(encoded.blob);
    resultTitle.textContent = title;

    const parts = [];
    if (username) parts.push(`@${username}`);
    parts.push('Format: MP3');
    parts.push(`${encoded.bitrateKbps} kbps`);
    parts.push(`${(encoded.sampleRate / 1000).toFixed(1)} kHz`);
    parts.push(formatDuration(encoded.durationSeconds));
    parts.push(formatBytes(encoded.blob.size));
    resultMeta.textContent = parts.join(' · ');

    if (thumbnailUrl) {
      resultThumb.src = thumbnailUrl;
      resultThumb.alt = `Thumbnail for ${title}`;
      resultThumb.classList.remove('hidden');
      thumbFallback.classList.add('hidden');
      resultThumb.onerror = () => {
        resultThumb.classList.add('hidden');
        thumbFallback.classList.remove('hidden');
      };
    } else {
      resultThumb.classList.add('hidden');
      thumbFallback.classList.remove('hidden');
    }

    resultAudio.src = activeObjectUrl;
    downloadMp3Link.href = activeObjectUrl;
    downloadMp3Link.download = filename;
    downloadMp3Link.textContent = `Save MP3 (${formatBytes(encoded.blob.size)})`;
    resultPanel.classList.remove('hidden');
  }

  // Cancel active conversion
  cancelBtn.addEventListener('click', () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    hideProgress();
    setBusyState(false);
  });

  resetBtn.addEventListener('click', () => {
    clearResult();
    hideError();
    hideProgress();
    urlInput.value = '';
    updateClearVisibility();
    localFileInput.value = '';
  });

  // Public URL Submission Flow
  downloadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isBusy) return;

    hideError();
    clearResult();

    const check = validateInstagramUrl(urlInput.value);
    if (!check.ok) {
      showError(check.code, check.message, false);
      return;
    }

    const controller = new AbortController();
    activeAbortController = controller;
    setBusyState(true);

    try {
      showProgress('Checking public Reel metadata via Cloudflare Worker…', 12);
      const res = await fetch(`${API_BASE}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ url: check.canonicalUrl }),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json || !json.ok) {
        const rawErr = json && json.error;
        const code =
          (rawErr && typeof rawErr === 'object' ? rawErr.code : json && json.code) ||
          (res.status === 429 ? 'RATE_LIMITED' : 'EXTRACTION_FAILED');
        const msg =
          (rawErr && typeof rawErr === 'object' ? rawErr.message : typeof rawErr === 'string' ? rawErr : json && json.message) ||
          'Could not extract audio from this Instagram Reel.';
        const canSuggestLocal = code === 'INSTAGRAM_BLOCKED' || code === 'INSTAGRAM_RATE_LIMITED' || code === 'EXTRACTION_FAILED';
        showError(code, msg, canSuggestLocal);
        hideProgress();
        return;
      }

      const rawReel = json.reel || json;
      const reel = {
        shortcode: rawReel.shortcode || check.shortcode,
        title: rawReel.title || `Instagram Reel ${rawReel.shortcode || check.shortcode}`,
        username: rawReel.username || rawReel.author || null,
        thumbnailUrl: rawReel.thumbnailUrl || null,
        streamUrl: rawReel.streamUrl || null,
        fallbackStreamUrl: rawReel.fallbackStreamUrl || null,
      };
      if (!reel.streamUrl) {
        showError('EXTRACTION_FAILED', 'No audio stream URL returned by Worker.', true);
        hideProgress();
        return;
      }
      showProgress('Streaming Reel audio source…', 28);

      const streamUrl = reel.streamUrl.startsWith('http') ? reel.streamUrl : `${API_BASE}${reel.streamUrl}`;
      const mediaRes = await fetch(streamUrl, { signal: controller.signal });
      if (!mediaRes.ok) {
        const streamErr = await mediaRes.json().catch(() => null);
        const code = (streamErr && streamErr.error && streamErr.error.code) || (mediaRes.status === 413 ? 'FILE_TOO_LARGE' : 'EXTRACTION_FAILED');
        showError(code, (streamErr && streamErr.error && streamErr.error.message) || 'Failed to stream Reel audio.', true);
        hideProgress();
        return;
      }

      const arrayBuffer = await mediaRes.arrayBuffer();
      showProgress('Decoding AAC audio via Web Audio API…', 58);

      const encodeTags = {
        title: reel.title || `Instagram Reel ${reel.shortcode}`,
        artist: reel.username ? `@${reel.username}` : 'Instagram Reel',
      };

      let encoded;
      try {
        encoded = await encodeArrayBufferToMp3(
          arrayBuffer,
          activeBitrate,
          encodeTags,
          (pct) => showProgress('Encoding genuine MPEG-1 Layer 3 (.mp3)…', 60 + pct * 0.4),
          controller.signal
        );
      } catch (decodeErr) {
        if (decodeErr && decodeErr.name === 'AbortError') throw decodeErr;
        if (!reel.fallbackStreamUrl) throw decodeErr;
        showProgress('Retrying with progressive MP4 audio track…', 44);
        const fbUrl = reel.fallbackStreamUrl.startsWith('http')
          ? reel.fallbackStreamUrl
          : `${API_BASE}${reel.fallbackStreamUrl}`;
        const fbRes = await fetch(fbUrl, { signal: controller.signal });
        if (!fbRes.ok) throw decodeErr;
        const fbBuffer = await fbRes.arrayBuffer();
        showProgress('Decoding AAC audio via Web Audio API…', 58);
        encoded = await encodeArrayBufferToMp3(
          fbBuffer,
          activeBitrate,
          encodeTags,
          (pct) => showProgress('Encoding genuine MPEG-1 Layer 3 (.mp3)…', 60 + pct * 0.4),
          controller.signal
        );
      }

      hideProgress();
      const thumbUrl = reel.thumbnailUrl
        ? (reel.thumbnailUrl.startsWith('http') ? reel.thumbnailUrl : `${API_BASE}${reel.thumbnailUrl}`)
        : null;

      renderResult({
        title: reel.title || `Instagram Reel ${reel.shortcode}`,
        username: reel.username || null,
        thumbnailUrl: thumbUrl,
        filename: sanitizeFilename(reel.username ? `${reel.username}-reel-${reel.shortcode}` : `instagram-reel-${reel.shortcode}`),
        encoded,
      });
    } catch (err) {
      hideProgress();
      if (err && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      const isAudioErr = /audio|mp3|decode/i.test(msg);
      showError(isAudioErr ? 'AUDIO_CONVERSION_FAILED' : 'NETWORK_TIMEOUT', msg, !isAudioErr);
    } finally {
      activeAbortController = null;
      setBusyState(false);
    }
  });

  // Local Reel File Conversion Flow
  async function convertLocalFile(file) {
    if (!file || isBusy) return;
    hideError();
    clearResult();

    if (file.size > 50 * 1024 * 1024) {
      showError('FILE_TOO_LARGE', 'Please select a file smaller than 50 MB for browser MP3 encoding.', false);
      return;
    }

    const controller = new AbortController();
    activeAbortController = controller;
    setBusyState(true);

    try {
      showProgress('Decoding local Reel audio track…', 25);
      const buffer = await file.arrayBuffer();
      const baseTitle = file.name.replace(/\.[^.]+$/, '');

      const encoded = await encodeArrayBufferToMp3(
        buffer,
        activeBitrate,
        { title: baseTitle, artist: 'Local Reel Extract' },
        (pct) => showProgress('Encoding genuine MPEG-1 Layer 3 (.mp3)…', 30 + pct * 0.7),
        controller.signal
      );

      hideProgress();
      renderResult({
        title: baseTitle,
        username: null,
        thumbnailUrl: null,
        filename: sanitizeFilename(baseTitle),
        encoded,
      });
    } catch (err) {
      hideProgress();
      if (err && err.name === 'AbortError') return;
      showError(
        'AUDIO_CONVERSION_FAILED',
        err instanceof Error ? err.message : 'Failed to decode audio from that file.',
        false
      );
    } finally {
      activeAbortController = null;
      setBusyState(false);
    }
  }

  chooseFileBtn.addEventListener('click', () => localFileInput.click());
  localFileInput.addEventListener('change', () => {
    if (localFileInput.files && localFileInput.files[0]) {
      convertLocalFile(localFileInput.files[0]);
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) convertLocalFile(file);
  });

  // Legal Modals
  function closeModal() {
    modalBackdrop.classList.add('hidden');
  }

  document.querySelectorAll('[data-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const topic = LEGAL_CONTENT[btn.dataset.modal];
      if (!topic) return;
      modalTitle.textContent = topic.title;
      modalBody.innerHTML = '';
      for (const [heading, text] of topic.sections) {
        const h3 = document.createElement('h3');
        h3.textContent = heading;
        const p = document.createElement('p');
        p.textContent = text;
        modalBody.appendChild(h3);
        modalBody.appendChild(p);
      }
      modalBackdrop.classList.remove('hidden');
    });
  });

  document.getElementById('modal-close-x').addEventListener('click', closeModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
})();
