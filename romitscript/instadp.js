   /** 
 * Vanilla JavaScript logic for Instagram Profile Picture Downloader
 */

const WORKER_URL = 'https://instadp2.romitkr361.workers.dev/';

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

// Helper: Parse username from input
function getCleanUsername(input) {
    let clean = input.trim();
    
    try {
        if (clean.includes('instagram.com')) {
            const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            if (pathParts.length > 0) {
                clean = pathParts[0];
            }
        }
    } catch (err) {
        // Fallback to original
    }

    if (clean.startsWith('@')) {
        clean = clean.substring(1);
    }
    
    return clean;
}

// Handle Form Submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = getCleanUsername(usernameInput.value);
    if (!username) return;

    // Reset UI
    setLoading(true);
    errorState.classList.add('hidden');
    resultSection.classList.add('hidden');
    currentResult = null;

    try {
        const response = await fetch(`${WORKER_URL}?username=${username}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success' && data.image) {
            displayResult(data);
        } else {
            showError(data.message || "Failed to fetch profile picture. The user might be private or doesn't exist.");
        }
    } catch (err) {
        showError(err.message || 'An error occurred while fetching the data. Please try again.');
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
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

function showError(msg) {
    errorMessage.textContent = msg;
    errorState.classList.remove('hidden');
}

function displayResult(data) {
    currentResult = data;
    
    // Update UI
    const proxiedUrl = `${WORKER_URL}?proxy=${encodeURIComponent(data.image)}`;
    
    // Set up the load event before setting the src
    profileImg.onload = () => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    profileImg.src = proxiedUrl;
    resUsername.textContent = `@${data.username}`;
    resFullName.textContent = data.full_name || 'Instagram User';
    resBio.textContent = data.biography || '';
    igLink.href = `https://instagram.com/${data.username}`;
    
    resultSection.classList.remove('hidden');
}

// Download Logic
downloadBtn.addEventListener('click', async () => {
    if (!currentResult?.image) return;
    
    try {
        const proxiedUrl = `${WORKER_URL}?proxy=${encodeURIComponent(currentResult.image)}`;
        const response = await fetch(proxiedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `instagram_${currentResult.username}_dp.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        const proxiedUrl = `${WORKER_URL}?proxy=${encodeURIComponent(currentResult.image)}`;
        window.open(proxiedUrl, '_blank');
    }
});

// Preview Logic
previewBtn.addEventListener('click', () => {
    if (!currentResult?.image) return;
    const proxiedUrl = `${WORKER_URL}?proxy=${encodeURIComponent(currentResult.image)}`;
    window.open(proxiedUrl, '_blank');
});

// Handle Image Errors
profileImg.onerror = () => {
    showError("The image could not be loaded. This often happens due to Instagram's security restrictions. Try the 'Preview Full Size' button.");
};          
