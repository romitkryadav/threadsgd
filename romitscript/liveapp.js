/**
 * THREADS.ANALYTICS - Pure Client-Side Version
 * Connects directly to Cloudflare Worker
 */

// State
let state = {
    username: localStorage.getItem("threads_tracker_user") || "",
    username2: localStorage.getItem("threads_tracker_user2") || "",
    data: JSON.parse(localStorage.getItem("threads_tracker_data") || "null"),
    data2: JSON.parse(localStorage.getItem("threads_tracker_data2") || "null"),
    prevFollowers: null,
    prevFollowers2: null,
    loading: false,
    error: null,
    lastFetchTime: null,
    secondsAgo: 0,
    autoRefresh: true,
    compareMode: localStorage.getItem("threads_tracker_compare") === "true",
    goal: localStorage.getItem("threads_tracker_goal") ? parseInt(localStorage.getItem("threads_tracker_goal")) : null,
    chart: null,
    vsChart: null
};

// DOM Elements
const elements = {
    form: document.getElementById('search-form'),
    input: document.getElementById('username-input'),
    trackBtn: document.getElementById('track-btn'),
    compareContainer: document.getElementById('compare-container'),
    compareForm: document.getElementById('compare-form'),
    compareInput: document.getElementById('compare-input'),
    compareBtn: document.getElementById('compare-btn'),
    toggleCompareBtn: document.getElementById('toggle-compare-btn'),
    goalInput: document.getElementById('goal-input'),
    setGoalBtn: document.getElementById('set-goal-btn'),
    autoGoalBtn: document.getElementById('auto-goal-btn'),
    clearGoalBtn: document.getElementById('clear-goal-btn'),
    goalStats: document.getElementById('goal-stats'),
    goalRemaining: document.getElementById('goal-remaining'),
    goalPercent: document.getElementById('goal-percent'),
    goalProgressBar: document.getElementById('goal-progress-bar'),
    mainDisplay: document.getElementById('main-display'),
    singleView: document.getElementById('single-view'),
    versusView: document.getElementById('versus-view'),
    vsPic1: document.getElementById('vs-pic-1'),
    vsPic2: document.getElementById('vs-pic-2'),
    vsUser1: document.getElementById('vs-user-1'),
    vsUser2: document.getElementById('vs-user-2'),
    vsCount1: document.getElementById('vs-count-1'),
    vsCount2: document.getElementById('vs-count-2'),
    vsGap: document.getElementById('vs-gap'),
    vsLeader: document.getElementById('vs-leader'),
    vsChartCanvas: document.getElementById('vs-chart'),
    errorDisplay: document.getElementById('error-display'),
    errorMessage: document.getElementById('error-message'),
    dataDisplay: document.getElementById('data-display'),
    followerCount: document.getElementById('follower-count'),
    usernameDisplay: document.getElementById('username-display'),
    profilePic: document.getElementById('profile-pic'),
    profilePicContainer: document.getElementById('profile-pic-container'),
    followerChange: document.getElementById('follower-change'),
    lastUpdated: document.getElementById('last-updated'),
    nextSync: document.getElementById('next-sync'),
    syncProgress: document.getElementById('sync-progress'),
    autoRefreshBtn: document.getElementById('auto-refresh-btn'),
    autoRefreshDot: document.getElementById('auto-refresh-dot'),
    todayGain: document.getElementById('today-gain'),
    startCount: document.getElementById('start-count'),
    growthRate: document.getElementById('growth-rate'),
    chartCanvas: document.getElementById('growth-chart'),
    welcomeScreen: document.getElementById('welcome-screen')
};

// Handle profile pic errors
elements.profilePic.onerror = () => {
    elements.profilePicContainer.classList.add('hidden');
};
elements.vsPic1.onerror = () => {
    elements.vsPic1.src = "https://www.threads.net/favicon.ico";
};
elements.vsPic2.onerror = () => {
    elements.vsPic2.src = "https://www.threads.net/favicon.ico";
};

// Initialize Chart.js
function initChart() {
    const ctx = elements.chartCanvas.getContext('2d');
    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'User 1',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#141416',
                    titleColor: '#8E9299',
                    bodyColor: '#FFFFFF',
                    borderColor: '#2D2E35',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { color: '#4A4B53', maxTicksLimit: 5, font: { size: 10 } }
                },
                y: {
                    display: false,
                    grid: { color: '#2D2E35' },
                    ticks: { color: '#4A4B53', font: { size: 10 } }
                }
            }
        }
    });

    const vsCtx = elements.vsChartCanvas.getContext('2d');
    state.vsChart = new Chart(vsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'User 1',
                    data: [],
                    borderColor: '#10b981',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'User 2',
                    data: [],
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Update UI
function updateUI() {
    // Handle Loading State
    elements.trackBtn.disabled = state.loading;
    elements.compareBtn.disabled = state.loading;
    
    elements.trackBtn.innerHTML = state.loading 
        ? '<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> INITIALIZING'
        : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> TRACK';

    elements.compareBtn.innerHTML = state.loading 
        ? '<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> SYNCING'
        : 'COMPARE';
    
    // Handle Compare Mode Toggle
    if (state.compareMode) {
        elements.compareContainer.classList.remove('hidden');
        elements.toggleCompareBtn.innerHTML = `
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            Exit Comparison Mode
        `;
        elements.singleView.classList.add('hidden');
        elements.versusView.classList.remove('hidden');
    } else {
        elements.compareContainer.classList.add('hidden');
        elements.toggleCompareBtn.innerHTML = `
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            Toggle Comparison Mode
        `;
        elements.singleView.classList.remove('hidden');
        elements.versusView.classList.add('hidden');
    }

    // Handle Error
    if (state.error) {
        elements.errorDisplay.classList.remove('hidden');
        elements.errorMessage.textContent = state.error;
        elements.dataDisplay.classList.add('hidden');
        elements.welcomeScreen.classList.add('hidden');
    } else if (state.data) {
        elements.errorDisplay.classList.add('hidden');
        elements.dataDisplay.classList.remove('hidden');
        elements.welcomeScreen.classList.add('hidden');

        if (state.compareMode) {
            // Update Versus View
            elements.vsUser1.textContent = state.data ? `@${state.data.username}` : "@username";
            elements.vsUser2.textContent = state.data2 ? `@${state.data2.username}` : "@waiting...";
            elements.vsPic1.src = state.data ? (state.data.profilePic || "") : "";
            elements.vsPic2.src = state.data2 ? (state.data2.profilePic || "") : "";
            
            if (state.data) {
                animateValue(elements.vsCount1, state.prevFollowers || state.data.followers, state.data.followers, 1000);
            } else {
                elements.vsCount1.textContent = "0";
            }

            if (state.data2) {
                animateValue(elements.vsCount2, state.prevFollowers2 || state.data2.followers, state.data2.followers, 1000);
            } else {
                elements.vsCount2.textContent = "0";
            }

            if (state.data && state.data2) {
                const gap = Math.abs(state.data.followers - state.data2.followers);
                elements.vsGap.textContent = gap.toLocaleString();
                
                if (state.data.followers > state.data2.followers) {
                    elements.vsLeader.textContent = `${state.data.username} IS LEADING`;
                    elements.vsLeader.className = "text-[10px] font-bold text-emerald-400 mt-1 uppercase tracking-widest";
                } else if (state.data2.followers > state.data.followers) {
                    elements.vsLeader.textContent = `${state.data2.username} IS LEADING`;
                    elements.vsLeader.className = "text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-widest";
                } else {
                    elements.vsLeader.textContent = "IT'S A TIE";
                    elements.vsLeader.className = "text-[10px] font-bold text-white mt-1 uppercase tracking-widest";
                }

                // Update VS Chart
                if (state.vsChart && state.data.history && state.data2.history) {
                    state.vsChart.data.labels = state.data.history.map((_, i) => i);
                    state.vsChart.data.datasets[0].data = state.data.history.map(p => p.followers);
                    state.vsChart.data.datasets[1].data = state.data2.history.map(p => p.followers);
                    state.vsChart.update('none');
                }
            } else {
                elements.vsGap.textContent = "0";
                elements.vsLeader.textContent = "WAITING FOR DATA...";
                elements.vsLeader.className = "text-[10px] font-bold text-[#4A4B53] mt-1 uppercase tracking-widest";
            }
        } else {
            // Update Single View
            elements.usernameDisplay.textContent = `@${state.data.username}`;
            
            if (state.data.profilePic && typeof state.data.profilePic === 'string' && state.data.profilePic.trim() !== "") {
                elements.profilePic.src = state.data.profilePic;
                elements.profilePicContainer.classList.remove('hidden');
            } else {
                elements.profilePicContainer.classList.add('hidden');
            }

            animateValue(elements.followerCount, state.prevFollowers || state.data.followers, state.data.followers, 1000);
            
            const change = state.prevFollowers !== null ? state.data.followers - state.prevFollowers : 0;
            if (change !== 0) {
                elements.followerChange.classList.remove('hidden');
                elements.followerChange.className = `flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${change > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`;
                elements.followerChange.innerHTML = `
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${change > 0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6'}"></path></svg>
                    ${change > 0 ? '+' : ''}${change.toLocaleString()} (LAST SYNC)
                `;
            } else {
                elements.followerChange.classList.add('hidden');
            }

            // Update Chart
            if (state.chart && state.data.history) {
                state.chart.data.labels = state.data.history.map(p => new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                state.chart.data.datasets[0].data = state.data.history.map(p => p.followers);
                state.chart.data.datasets[0].label = state.data.username;
                state.chart.update('none');
            }
        }

        // Today's Gain
        const todayGain = state.data.followers - state.data.startOfDayFollowers;
        elements.todayGain.textContent = `${todayGain >= 0 ? '+' : ''}${todayGain.toLocaleString()}`;
        elements.todayGain.className = `text-3xl font-bold tracking-tight ${todayGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
        elements.startCount.textContent = state.data.startOfDayFollowers.toLocaleString();
        elements.growthRate.textContent = `${((todayGain / state.data.startOfDayFollowers) * 100).toFixed(4)}%`;

        // Auto Refresh UI
        elements.autoRefreshBtn.className = `px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 border ${state.autoRefresh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#1C1D21] text-[#8E9299] border-transparent hover:border-[#4A4B53]'}`;
        elements.autoRefreshDot.className = `w-1.5 h-1.5 rounded-full ${state.autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-[#4A4B53]'}`;

        // Update Goal UI
        if (state.goal) {
            elements.goalStats.classList.remove('hidden');
            const remaining = state.goal - state.data.followers;
            const progress = Math.min(Math.max((state.data.followers / state.goal) * 100, 0), 100);
            
            elements.goalRemaining.textContent = remaining > 0 ? remaining.toLocaleString() : "REACHED";
            elements.goalRemaining.className = `text-xl font-bold tracking-tight ${remaining > 0 ? 'text-white' : 'text-purple-400'}`;
            elements.goalPercent.textContent = `${progress.toFixed(1)}%`;
            elements.goalProgressBar.style.width = `${progress}%`;
        } else {
            elements.goalStats.classList.add('hidden');
        }
    }

    // Reset prev followers after UI update to prevent re-triggering animations
    state.prevFollowers = null;
    state.prevFollowers2 = null;
}

// Animate value helper
function animateValue(obj, start, end, duration) {
    if (obj.dataset.target === String(end)) return;
    obj.dataset.target = end;

    if (obj.dataset.animationId) {
        cancelAnimationFrame(parseInt(obj.dataset.animationId));
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        obj.textContent = current.toLocaleString();
        if (progress < 1) {
            obj.dataset.animationId = window.requestAnimationFrame(step);
        } else {
            delete obj.dataset.animationId;
        }
    };
    obj.dataset.animationId = window.requestAnimationFrame(step);
}

// Fetch Data Directly from Worker
async function fetchFollowers(user, isAuto = false, isSecondUser = false) {
    if (!user) return;
    if (!isAuto) {
        state.loading = true;
        updateUI();
    }
    state.error = null;

    try {
        const workerUrl = `https://liveapp.romitkryadav.workers.dev/?user=${user}`;
        const response = await fetch(workerUrl);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const workerData = await response.json();
        
        if (workerData.followers === undefined || workerData.followers === null) {
            throw new Error("API response missing follower count");
        }

        const followers = workerData.followers;
        const profilePic = workerData.profilePic;
        const now = Date.now();

        if (isSecondUser) {
            // Reset prev if username changed
            if (state.data2 && state.data2.username !== user) {
                state.prevFollowers2 = null;
            }
            
            let history = state.data2 && state.data2.username === user ? [...state.data2.history] : [];
            history.push({ timestamp: now, followers });
            if (history.length > 30) history.shift();

            const startOfDay = new Date().setHours(0, 0, 0, 0);
            let startOfDayFollowers = state.data2 && state.data2.username === user ? state.data2.startOfDayFollowers : followers;
            if (state.data2 && state.data2.lastUpdated < startOfDay) startOfDayFollowers = followers;

            const result = { username: user, followers, profilePic, lastUpdated: now, history, startOfDayFollowers };
            if (state.data2 && state.data2.followers !== result.followers) state.prevFollowers2 = state.data2.followers;
            state.data2 = result;
            localStorage.setItem("threads_tracker_user2", user);
            localStorage.setItem("threads_tracker_data2", JSON.stringify(result));
        } else {
            // Reset prev if username changed
            if (state.data && state.data.username !== user) {
                state.prevFollowers = null;
            }

            let history = state.data && state.data.username === user ? [...state.data.history] : [];
            history.push({ timestamp: now, followers });
            if (history.length > 30) history.shift();

            const startOfDay = new Date().setHours(0, 0, 0, 0);
            let startOfDayFollowers = state.data && state.data.username === user ? state.data.startOfDayFollowers : followers;
            if (state.data && state.data.lastUpdated < startOfDay) startOfDayFollowers = followers;

            const result = { username: user, followers, profilePic, lastUpdated: now, history, startOfDayFollowers };
            if (state.data && state.data.followers !== result.followers) state.prevFollowers = state.data.followers;
            state.data = result;
            localStorage.setItem("threads_tracker_user", user);
            localStorage.setItem("threads_tracker_data", JSON.stringify(result));
        }
        
        state.lastFetchTime = now;

    } catch (err) {
        state.error = "Failed to connect to API: " + err.message;
        state.autoRefresh = false;
    } finally {
        state.loading = false;
        updateUI();
    }
}

// Timers
setInterval(() => {
    if (state.lastFetchTime) {
        state.secondsAgo = Math.floor((Date.now() - state.lastFetchTime) / 1000);
        elements.lastUpdated.textContent = `${state.secondsAgo}S AGO`;
        
        if (state.autoRefresh) {
            const next = 5 - (state.secondsAgo % 5);
            elements.nextSync.textContent = `${next}S`;
            elements.syncProgress.style.width = `${((state.secondsAgo % 5) / 5) * 100}%`;
            
            if (state.secondsAgo > 0 && state.secondsAgo % 5 === 0 && !state.loading) {
                if (state.data) fetchFollowers(state.data.username, true, false);
                if (state.compareMode && state.data2) fetchFollowers(state.data2.username, true, true);
            }
        } else {
            elements.nextSync.textContent = '--S';
            elements.syncProgress.style.width = '0%';
        }
    }
}, 1000);

// Event Listeners
elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cleanUser = elements.input.value.trim().replace(/^@/, "");
    if (cleanUser) {
        fetchFollowers(cleanUser, false, false);
    }
});

elements.compareForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cleanUser = elements.compareInput.value.trim().replace(/^@/, "");
    if (cleanUser) {
        fetchFollowers(cleanUser, false, true);
    }
});

elements.toggleCompareBtn.addEventListener('click', () => {
    state.compareMode = !state.compareMode;
    localStorage.setItem("threads_tracker_compare", state.compareMode);
    
    if (state.chart) {
        state.chart.options.plugins.legend.display = state.compareMode;
        state.chart.data.datasets[1].hidden = !state.compareMode;
        state.chart.update();
    }
    
    updateUI();
});

elements.autoRefreshBtn.addEventListener('click', () => {
    state.autoRefresh = !state.autoRefresh;
    updateUI();
});

elements.autoGoalBtn.addEventListener('click', () => {
    if (!state.data) return;
    const current = state.data.followers;
    if (current <= 0) return;
    
    // Calculate next milestone
    // e.g. 850 -> 900, 1200 -> 2000
    const magnitude = Math.pow(10, Math.floor(Math.log10(current)));
    const next = Math.ceil((current + 1) / magnitude) * magnitude;
    
    state.goal = next;
    localStorage.setItem("threads_tracker_goal", next);
    elements.goalInput.value = next;
    updateUI();
});

elements.setGoalBtn.addEventListener('click', () => {
    const val = parseInt(elements.goalInput.value);
    if (val && val > 0) {
        state.goal = val;
        localStorage.setItem("threads_tracker_goal", val);
        updateUI();
    }
});

elements.clearGoalBtn.addEventListener('click', () => {
    state.goal = null;
    localStorage.removeItem("threads_tracker_goal");
    elements.goalInput.value = "";
    updateUI();
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    if (state.username) {
        elements.input.value = state.username;
        if (state.data) {
            updateUI();
        }
        fetchFollowers(state.username, false, false);
    }
    if (state.compareMode && state.username2) {
        elements.compareInput.value = state.username2;
        fetchFollowers(state.username2, false, true);
    }
});
