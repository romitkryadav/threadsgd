const WORKER_URL = 'https://instadp.romitkr361.workers.dev/';

// DOM Elements
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

// ---------------- USERNAME CLEAN ----------------
function getCleanUsername(input) {
    let clean = input.trim();

    try {
        if (clean.includes('instagram.com')) {
            const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length > 0) clean = parts[0];
        }
    } catch {}

    if (clean.startsWith('@')) clean = clean.slice(1);

    return clean;
}

// ---------------- FORM SUBMIT ----------------
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = getCleanUsername(usernameInput.value);
    if (!username) return;

    resetUI();
    setLoading(true);

    try {
        const res = await fetch(`${WORKER_URL}?username=${username}`);
        const data = await res.json();

        // SUCCESS
        if (data.status === 'success' && data.image) {
            displayResult(data);
        }

        // PARTIAL
        else if (data.status === 'partial' && data.image) {
            displayPartial(data, username);
        }

        // ERROR
        else {
            showError(data.message || "Failed to fetch profile picture.");
        }

    } catch {
        showError("Network error. Try again.");
    }

    setLoading(false);
});

// ---------------- UI HELPERS ----------------
function setLoading(state) {
    submitBtn.disabled = state;
    btnText.classList.toggle('hidden', state);
    loadingIcon.classList.toggle('hidden', !state);
    loadingState.classList.toggle('hidden', !state);
}

function resetUI() {
    errorState.classList.add('hidden');
    resultSection.classList.add('hidden');
    profileImg.style.display = "block";
    currentResult = null;
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorState.classList.remove('hidden');
}

// ---------------- SUCCESS DISPLAY ----------------
function displayResult(data) {
    currentResult = data;

    const proxy = `${WORKER_URL}?proxy=${encodeURIComponent(data.image)}`;

    profileImg.style.display = "block";
    profileImg.src = proxy;

    profileImg.onload = () => {
        resultSection.scrollIntoView({ behavior: 'smooth' });
    };

    profileImg.onerror = () => {
        profileImg.style.display = "none";

        errorMessage.textContent =
            "Preview blocked. Use buttons below.";
        errorState.classList.remove('hidden');
    };

    resUsername.textContent = `@${data.username}`;
    resFullName.textContent = data.full_name || "Instagram User";
    resBio.textContent = data.biography || "";
    igLink.href = `https://instagram.com/${data.username}`;

    setupButtons(proxy, data.image);

    resultSection.classList.remove('hidden');
}

// ---------------- PARTIAL DISPLAY ----------------
function displayPartial(data, username) {
    currentResult = data;

    profileImg.style.display = "none";

    resUsername.textContent = `@${username}`;
    resFullName.textContent = "Preview not available";
    resBio.textContent = "Instagram blocked direct image.";

    igLink.href = data.image;

    setupButtons(data.image, data.image);

    resultSection.classList.remove('hidden');
}

// ---------------- BUTTON LOGIC ----------------
function setupButtons(proxyUrl, originalUrl) {
    // DOWNLOAD
    downloadBtn.onclick = async () => {
        try {
            const res = await fetch(proxyUrl);
            const blob = await res.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = 'instagram_dp.jpg';
            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(url);

        } catch {
            window.open(originalUrl, '_blank');
        }
    };

    // PREVIEW
    previewBtn.onclick = () => {
        window.open(proxyUrl, '_blank');
    };
}
