(() => {
  const setToolModeBeforeAudioPage = window.setToolMode;
  if (typeof setToolModeBeforeAudioPage === 'function') {
    window.setToolMode = function keepAudioPageLabels(mode) {
      setToolModeBeforeAudioPage.call(this, mode);
      if (mode === 'video' && window.location.pathname.includes('threads-audio-extractor')) {
        const heading = document.getElementById('heroHeading');
        const input = document.getElementById('urlInput');
        if (heading) heading.textContent = 'Threads Audio Extractor';
        if (input) input.placeholder = 'Paste a public Threads video post link (threads.com or threads.net)';
      }
    };
  }

  const renderResultBeforeAudioControls = window.renderResult;
  if (typeof renderResultBeforeAudioControls !== 'function') return;

  window.renderResult = function renderResultWithAudioControls(data) {
    renderResultBeforeAudioControls.call(this, data);
    removeVideoControls();
    addAudioExtractionButtons(data);
  };

  function addAudioExtractionButtons(data) {
    const sourceItems = Array.isArray(data?.mediaList) && data.mediaList.length
      ? data.mediaList
      : [{ type: data?.type || 'video', mediaUrl: data?.mediaUrl }];
    const visibleItems = sourceItems.filter(item => item && typeof item === 'object' && isHttpUrl(item.mediaUrl));
    const videoItems = visibleItems.filter(item => item.type === 'video');
    const status = document.getElementById('audioExtractStatus');
    const actions = document.querySelector('#resultBox .action-buttons');

    document.querySelectorAll('.audio-extract-button').forEach(button => button.remove());
    if (status) status.textContent = '';

    if (!videoItems.length) {
      if (status) status.textContent = 'No video was found in this post. Audio extraction works with video posts; use the Threads image downloader for photo-only posts.';
      return;
    }

    if (videoItems.length && actions) {
      actions.prepend(makeButton(videoItems[0], 1));
      ensureMp3QualitySelector(actions);
    }
  }

  function makeButton(item, itemNumber) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-primary audio-extract-button';
    button.textContent = 'Download Audio (MP3)';
    button.addEventListener('click', () => extractAudio(item.mediaUrl, button, itemNumber));
    return button;
  }

  async function extractAudio(mediaUrl, button, itemNumber) {
    if (!window.AudioContext && !window.webkitAudioContext) {
      setStatus('Audio processing is not available in this browser. Try a current version of Chrome, Edge, Firefox, or Safari.');
      return;
    }
    if (!window.MediaRecorder || typeof window.buildProxyUrl !== 'function') {
      setStatus('This browser cannot record the audio stream needed for MP3 export. Try a current desktop or mobile browser.');
      return;
    }

    const safeUrl = new URL(mediaUrl);
    if (!['https:', 'http:'].includes(safeUrl.protocol)) {
      setStatus('The video link could not be opened safely. Please paste a public Threads post link again.');
      return;
    }

    const originalLabel = button.textContent;
    setButtonProcessing(button, true);
    setStatus('Playing the clip in your browser to capture its audio. Processing takes about as long as the video.');

    const VideoContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new VideoContext();
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;bottom:0;opacity:0;pointer-events:none;';
    document.body.appendChild(video);

    let recorder;
    let playbackTimeout;
    let playbackUrl;
    try {
      const resumeAudio = audioContext.resume();
      const source = audioContext.createMediaElementSource(video);
      const audioDestination = audioContext.createMediaStreamDestination();
      source.connect(audioDestination);

      const mimeType = getRecorderMimeType();
      recorder = mimeType ? new MediaRecorder(audioDestination.stream, { mimeType }) : new MediaRecorder(audioDestination.stream);
      const chunks = [];
      const recording = new Promise((resolve, reject) => {
        recorder.addEventListener('dataavailable', event => {
          if (event.data && event.data.size) chunks.push(event.data);
        });
        recorder.addEventListener('error', () => reject(new Error('The browser could not record this audio stream.')));
        recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })));
      });
      const playbackEnded = new Promise((resolve, reject) => {
        video.addEventListener('ended', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error('The video could not be played. Try another public video post.')), { once: true });
        playbackTimeout = window.setTimeout(() => reject(new Error('This video took too long to process. Try a shorter public clip.')), 10 * 60 * 1000);
      });

      const sourceBlob = await fetchVideoBlob(mediaUrl);
      const playbackBlob = sourceBlob.type.startsWith('video/')
        ? sourceBlob
        : new Blob([sourceBlob], { type: 'video/mp4' });
      playbackUrl = URL.createObjectURL(playbackBlob);
      video.src = playbackUrl;
      video.load();
      recorder.start(500);
      const startPlayback = video.play();
      await Promise.all([resumeAudio, startPlayback]);
      await playbackEnded;
      if (recorder.state !== 'inactive') recorder.stop();
      const recordedAudio = await recording;
      if (!recordedAudio.size) throw new Error('No audio track was found in this video.');

      if (!window.lamejs || !window.lamejs.Mp3Encoder) throw new Error('The MP3 encoder did not load. Refresh the page and try again.');
      setStatus('Converting the captured audio to MP3…');
      const decodeContext = new VideoContext();
      const audioBuffer = await decodeContext.decodeAudioData(await recordedAudio.arrayBuffer());
      const bitrate = Number(document.getElementById('audioMp3Quality')?.value || 128);
      const mp3Blob = encodeMp3(audioBuffer, bitrate);
      await decodeContext.close();
      saveBlob(mp3Blob, `threads-audio-${bitrate}kbps.mp3`);
      setStatus(`Audio extracted. Your ${bitrate} kbps MP3 is ready in your browser downloads.`);
      button.classList.remove('is-processing');
      button.removeAttribute('aria-busy');
      button.textContent = 'MP3 Downloaded';
      window.setTimeout(() => { button.textContent = originalLabel; button.disabled = false; }, 2500);
    } catch (error) {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      setStatus(error.message || 'Could not extract audio from this video. Check that the post is public and try again.');
      button.classList.remove('is-processing');
      button.removeAttribute('aria-busy');
      button.textContent = originalLabel;
      button.disabled = false;
    } finally {
      if (playbackTimeout) window.clearTimeout(playbackTimeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
      if (audioContext.state !== 'closed') await audioContext.close().catch(() => {});
    }
  }

  async function fetchVideoBlob(mediaUrl) {
    if (typeof fetchBlobFromBase !== 'function') {
      throw new Error('The video download service is unavailable. Reload the page and try again.');
    }

    const bases = [];
    if (typeof getPrimaryApiBase === 'function') {
      const primary = getPrimaryApiBase();
      if (primary !== null) bases.push(primary);
    }
    if (typeof activeWorkerBase === 'string') bases.push(activeWorkerBase);
    if (typeof WORKER_URLS !== 'undefined' && Array.isArray(WORKER_URLS)) bases.push(...WORKER_URLS);

    const uniqueBases = [...new Set(bases)];
    let lastError;
    for (const base of uniqueBases) {
      try {
        const blob = await fetchBlobFromBase(base, mediaUrl, 'threads-audio-source.mp4');
        if (!blob.size) throw new Error('The video service returned an empty file.');
        if (/^(text\/|application\/json)/i.test(blob.type)) {
          throw new Error('The video service did not return a playable video file.');
        }
        return blob;
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(lastError?.message || 'Could not retrieve this video. Try another public Threads post.');
  }

  function getRecorderMimeType() {
    const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    return options.find(type => MediaRecorder.isTypeSupported(type)) || '';
  }

  function removeVideoControls() {
    const result = document.getElementById('resultBox');
    if (!result) return;
    result.querySelector('#qualityOptions')?.remove();
    result.querySelector('#audioMp3Quality')?.closest('label')?.remove();
    result.querySelector('#downloadDirectBtn')?.remove();
    result.querySelector('#copyLinkBtn')?.remove();
    result.querySelectorAll('.action-buttons button:not(.audio-extract-button)').forEach(button => button.remove());
  }

  function ensureMp3QualitySelector(actions) {
    if (!actions || document.getElementById('audioMp3Quality')) return;
    const label = document.createElement('label');
    label.className = 'audio-mp3-quality';
    label.htmlFor = 'audioMp3Quality';
    label.textContent = 'MP3 quality';

    const select = document.createElement('select');
    select.id = 'audioMp3Quality';
    select.setAttribute('aria-label', 'Choose MP3 audio quality');
    select.innerHTML = '<option value="96">Low · 96 kbps</option><option value="128" selected>Standard · 128 kbps</option><option value="192">High · 192 kbps</option><option value="320">Best · 320 kbps</option>';
    label.appendChild(select);
    actions.appendChild(label);
  }
  function setButtonProcessing(button, isProcessing) {
    button.disabled = isProcessing;
    button.classList.toggle('is-processing', isProcessing);
    if (isProcessing) {
      button.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'audio-processing-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      button.replaceChildren(spinner, document.createTextNode('Processing audio…'));
    } else {
      button.removeAttribute('aria-busy');
    }
  }
  function encodeMp3(audioBuffer, bitrate) {
    const channels = Math.min(audioBuffer.numberOfChannels, 2);
    const sampleRate = audioBuffer.sampleRate;
    const encoder = new window.lamejs.Mp3Encoder(channels, sampleRate, bitrate);
    const sourceChannels = Array.from({ length: channels }, (_, index) => audioBuffer.getChannelData(index));
    const blockSize = 1152;
    const chunks = [];

    for (let offset = 0; offset < audioBuffer.length; offset += blockSize) {
      const length = Math.min(blockSize, audioBuffer.length - offset);
      const left = new Int16Array(length);
      const right = channels > 1 ? new Int16Array(length) : null;
      for (let i = 0; i < length; i += 1) {
        const leftSample = Math.max(-1, Math.min(1, sourceChannels[0][offset + i]));
        left[i] = leftSample < 0 ? leftSample * 0x8000 : leftSample * 0x7fff;
        if (right) {
          const rightSample = Math.max(-1, Math.min(1, sourceChannels[1][offset + i]));
          right[i] = rightSample < 0 ? rightSample * 0x8000 : rightSample * 0x7fff;
        }
      }
      const encoded = right ? encoder.encodeBuffer(left, right) : encoder.encodeBuffer(left);
      if (encoded?.length) chunks.push(new Int8Array(encoded));
    }

    const finalChunk = encoder.flush();
    if (finalChunk?.length) chunks.push(new Int8Array(finalChunk));
    if (!chunks.length) throw new Error('The MP3 encoder returned no audio data.');
    return new Blob(chunks, { type: 'audio/mpeg' });
  }
  function saveBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }

  function setStatus(message) {
    const status = document.getElementById('audioExtractStatus');
    if (status) status.textContent = message;
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }
})();
