/**
 * OPTIMIZED INSTAGRAM DP DOWNLOADER (STABLE VERSION)
 */

// =========================
// CONFIG
// =========================
const WORKERS = [
  'https://instadp1.romitkr361.workers.dev',
  'https://instadp2.romitkr361.workers.dev',
  'https://instadp3.romitkr361.workers.dev'
];

const cache = new Map();
let currentResult = null;

// =========================
// DOM
// =========================
const searchForm = document.getElementById('searchForm');
const usernameInput = document.getElementById('usernameInput');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const loadingIcon = document.getElementById('loadingIcon');

const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const resultSection = document.getElementById('resultSection');

const profileImg = document.getElementById('profileImg');
const resUsername = document.getElementById('resUsername');
const resFullName = document.getElementById('resFullName');
const resBio = document.getElementById('resBio');
const downloadBtn = document.getElementById('downloadBtn');
const previewBtn = document.getElementById('previewBtn');
const igLink = document.getElementById('igLink');

// =========================
// CLEAN USERNAME
// =========================
function getCleanUsername(input) {
  let clean = input.trim();

  try {
    if (clean.includes('instagram.com')) {
      const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length) clean = parts[0];
    }
  } catch {}

  if (clean.startsWith('@')) clean = clean.slice(1);
  return clean;
}

// =========================
// VALIDATE USERNAME
// =========================
function isValidUsername(username) {
  return /^[a-zA-Z0-9._]{2,30}$/.test(username);
}

// =========================
// UI LOADING
// =========================
function setLoading(state) {
  submitBtn.disabled = state;

  if (state) {
    btnText.classList.add('hidden');
    loadingIcon.classList.remove('hidden');
    loadingState.classList.remove('hidden');
  } else {
    btnText.classList.remove('hidden');
    loadingIcon.classList.add('hidden');
    loadingState.classList.add('hidden');
  }
}

// =========================
// FETCH WITH TIMEOUT
// =========================
function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(id));
}

// =========================
// SINGLE WORKER FETCH
// =========================
async function fetchOne(username) {
  const shuffled = [...WORKERS].sort(() => Math.random() - 0.5);

  for (const worker of shuffled) {
    try {
      const res = await fetchWithTimeout(`${worker}?username=${username}`);

      if (!res.ok) continue;

      const data = await res.json();

      if (
        data &&
        data.status === "success" &&
        typeof data.image === "string" &&
        data.image.startsWith("http")
      ) {
        return { data, worker };
      }
    } catch {}
  }

  throw new Error("All workers failed");
}

// =========================
// SMART FETCH (WITH RETRY)
// =========================
async function fetchSmart(username) {
  try {
    return await fetchOne(username);
  } catch {
    await new Promise(r => setTimeout(r, 1500));
    return await fetchOne(username);
  }
}

// =========================
// CACHE WRAPPER
// =========================
async function fetchWithCache(username) {
  if (cache.has(username)) {
    return cache.get(username);
  }

  const result = await fetchSmart(username);
  cache.set(username, result);

  setTimeout(() => cache.delete(username), 120000); // 2 min cache

  return result;
}

// =========================
// FORM SUBMIT
// =========================
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = getCleanUsername(usernameInput.value);

  if (!username || !isValidUsername(username)) {
    showError("Invalid username");
    return;
  }

  setLoading(true);
  errorState.classList.add('hidden');
  resultSection.classList.add('hidden');
  currentResult = null;

  try {
    const { data, worker } = await fetchWithCache(username);
    displayResult(data, worker);
  } catch (err) {
    if (err.name === "AbortError") {
      showError("Server slow. Try again.");
    } else {
      showError("User not found or blocked by Instagram.");
    }
  } finally {
    setLoading(false);
  }
});

// =========================
// DISPLAY RESULT
// =========================
function displayResult(data, worker) {
  currentResult = { ...data, worker };

  // SAFE IMAGE LOAD
  profileImg.style.opacity = "0.3";
  profileImg.style.filter = "blur(8px)";

  const img = new Image();

  img.onload = () => {
    profileImg.src = data.image;
    profileImg.style.opacity = "1";
    profileImg.style.filter = "none";

    resultSection.scrollIntoView({ behavior: "smooth" });
  };

  img.onerror = () => {
    // fallback to proxy
    profileImg.src = `${worker}?proxy=${encodeURIComponent(data.image)}`;
    profileImg.style.opacity = "1";
    profileImg.style.filter = "none";
  };

  img.src = data.image;

  resUsername.textContent = `@${data.username}`;
  resFullName.textContent = data.full_name || "Instagram User";
  resBio.textContent = data.biography || "";
  igLink.href = `https://instagram.com/${data.username}`;

  resultSection.classList.remove('hidden');
}

// =========================
// DOWNLOAD
// =========================
downloadBtn.addEventListener('click', async () => {
  if (!currentResult?.image) return;

  const { worker, image, username } = currentResult;

  try {
    const res = await fetch(`${worker}?proxy=${encodeURIComponent(image)}`);
    const blob = await res.blob();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `instagram_${username}.jpg`;
    link.click();
  } catch {
    window.open(image, "_blank");
  }
});

// =========================
// PREVIEW
// =========================
previewBtn.addEventListener('click', () => {
  if (!currentResult?.image) return;
  window.open(currentResult.image, "_blank");
});

// =========================
// ERROR
// =========================
function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove('hidden');
                     }
