/**
 * FINAL MERGED SYSTEM (UI + MULTI WORKER + DP PROCESSING)
 */

const WORKERS = [
  'https://instadp1.romitkr361.workers.dev',
  'https://instadp2.romitkr361.workers.dev',
  'https://instadp3.romitkr361.workers.dev'
];

const workerCooldown = {};

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

let currentResult = null;

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
// UI LOADING
// =========================
function setLoading(state) {
  if (state) {
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    loadingIcon.classList.remove('hidden');
    loadingState.classList.remove('hidden');
  } else {
    submitBtn.disabled = false;
    btnText.classList.remove('hidden');
    loadingIcon.classList.add('hidden');
    loadingState.classList.add('hidden');
  }
}

// =========================
// IMAGE EFFECTS
// =========================
function setImageLoading() {
  profileImg.style.opacity = "0.3";
  profileImg.style.filter = "blur(8px)";
}

function setImageLoaded() {
  profileImg.style.opacity = "1";
  profileImg.style.filter = "none";
}

// =========================
// FETCH WITH TIMEOUT
// =========================
function fetchWithTimeout(url, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(id));
}

// =========================
// PARALLEL WORKER RACE
// =========================
async function fetchRace(username) {
  const now = Date.now();

  const activeWorkers = WORKERS.filter(w =>
    !workerCooldown[w] || now - workerCooldown[w] > 8000
  );

  const workersToUse = activeWorkers.length ? activeWorkers : WORKERS;

  const shuffled = workersToUse.sort(() => Math.random() - 0.5);

  return new Promise((resolve, reject) => {
    let done = false;
    let failCount = 0;

    shuffled.forEach(worker => {
      fetchWithTimeout(`${worker}?username=${username}`)
        .then(res => {
          if (!res.ok) throw new Error();

          return res.json().then(data => {
            if (done) return;

            if (data.status === "success" && data.image) {
              done = true;
              resolve({ data, worker });
            } else throw new Error();
          });
        })
        .catch(() => {
          workerCooldown[worker] = Date.now();
          failCount++;

          if (failCount === shuffled.length && !done) {
            reject();
          }
        });
    });
  });
}

// =========================
// RETRY SYSTEM
// =========================
async function fetchSmart(username) {
  try {
    return await fetchRace(username);
  } catch {
    await new Promise(r => setTimeout(r, 1000));
    return await fetchRace(username);
  }
}

// =========================
// FORM SUBMIT
// =========================
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = getCleanUsername(usernameInput.value);
  if (!username) return;

  setLoading(true);
  errorState.classList.add('hidden');
  resultSection.classList.add('hidden');
  currentResult = null;

  try {
    const { data, worker } = await fetchSmart(username);
    displayResult(data, worker);
  } catch {
    showError("All servers busy. Try again.");
  } finally {
    setLoading(false);
  }
});

// =========================
// DISPLAY RESULT
// =========================
function displayResult(data, worker) {
  currentResult = { ...data, worker };

  const proxied = `${worker}?proxy=${encodeURIComponent(data.image)}`;

  setImageLoading();

  profileImg.onload = () => {
    setImageLoaded();
    resultSection.scrollIntoView({ behavior: "smooth" });
  };

  profileImg.onerror = () => retryImage(data.image);

  profileImg.src = proxied;

  resUsername.textContent = `@${data.username}`;
  resFullName.textContent = data.full_name || "Instagram User";
  resBio.textContent = data.biography || "";
  igLink.href = `https://instagram.com/${data.username}`;

  resultSection.classList.remove('hidden');
}

// =========================
// IMAGE FAILOVER
// =========================
function retryImage(imageUrl) {
  for (const worker of WORKERS) {
    const test = new Image();
    const url = `${worker}?proxy=${encodeURIComponent(imageUrl)}`;

    test.src = url;

    test.onload = () => {
      profileImg.src = url;
    };
  }

  showError("Image blocked. Retrying...");
}

// =========================
// DOWNLOAD
// =========================
downloadBtn.addEventListener('click', async () => {
  if (!currentResult?.image) return;

  const worker = currentResult.worker;
  const url = `${worker}?proxy=${encodeURIComponent(currentResult.image)}`;

  try {
    const res = await fetch(url);
    const blob = await res.blob();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `instagram_${currentResult.username}.jpg`;
    link.click();
  } catch {
    window.open(url, "_blank");
  }
});

// =========================
// PREVIEW
// =========================
previewBtn.addEventListener('click', () => {
  if (!currentResult?.image) return;

  const worker = currentResult.worker;
  const url = `${worker}?proxy=${encodeURIComponent(currentResult.image)}`;
  window.open(url, "_blank");
});

// =========================
// ERROR
// =========================
function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove('hidden');
}


