const POLL_INTERVAL_MS = 5000;
const TICK_MS = 100;

// ---- Worker endpoints ----------------------------------------------------
// Each poll cycle rotates to the next worker in this list (round-robin).
// First tick -> WORKER_URLS[0], next tick (5s later) -> WORKER_URLS[1], etc.
// To add more workers in the future, just append another base URL here —
// no other code changes needed.
const WORKER_URLS = [
  "https://liveapp.romitkryadav.workers.dev/",
  "https://tdlivecount.romitkr5539.workers.dev/",
  "https://tdlive3.romitkr361.workers.dev/",

];

let workerIndex = 0;

function getNextWorkerUrl(user) {
  const base = WORKER_URLS[workerIndex % WORKER_URLS.length];
  workerIndex++;
  const sep = base.includes('?') ? '&' : '?';
  return base + sep + "user=" + encodeURIComponent(user);
}
// ---------------------------------------------------------------------------

let state = {
  username: "threads",
  followers: null,
  profilePic: null,
  history: [],
  sessionStart: null,
  ticks: 0,
  elapsed: 0,
  loading: false,
  monitoring: true,
  error: null,
  sparkChart: null
};

const el = {
  form: document.getElementById('search-form'),
  input: document.getElementById('username-input'),
  trackBtn: document.getElementById('track-btn'),
  refreshPill: document.getElementById('refresh-pill'),
  refreshLabel: document.getElementById('refresh-label'),
  profilePic: document.getElementById('profile-pic'),
  avatarPlaceholder: document.getElementById('avatar-placeholder'),
  trackingHandle: document.getElementById('tracking-handle'),
  profileName: document.getElementById('profile-name'),
  profileTagline: document.getElementById('profile-tagline'),
  followerCount: document.getElementById('follower-count'),
  countLabel: document.getElementById('count-label'),
  monitorSeconds: document.getElementById('monitor-seconds'),
  monitorToggleBtn: document.getElementById('monitor-toggle-btn'),
  monitorToggleIcon: document.getElementById('monitor-toggle-icon'),
  statUsername: document.getElementById('stat-username'),
  statDelta: document.getElementById('stat-delta'),
  statTicks: document.getElementById('stat-ticks'),
  statVerified: document.getElementById('stat-verified'),
  sparkCanvas: document.getElementById('spark-canvas'),
  errorBox: document.getElementById('error-box')
};

el.profilePic.onerror = () => {
  el.profilePic.classList.add('hidden');
  el.avatarPlaceholder.classList.remove('hidden');
};

function initSpark() {
  const ctx = el.sparkCanvas.getContext('2d');
  state.sparkChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: 'rgba(225,48,108,0.35)',
        borderWidth: 1.5,
        fill: false,
        tension: 0.35,
        pointRadius: (context) => {
          const i = context.dataIndex;
          const len = context.dataset.data.length;
          return i === len - 1 ? 5 : 0;
        },
        pointBackgroundColor: '#E1306C',
        pointBorderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false, grid: { display: false } },
        y: {
          display: false,
          grid: {
            display: true,
            color: 'rgba(255,255,255,0.08)',
            borderDash: [3, 4],
            drawTicks: false
          }
        }
      },
      layout: { padding: 0 }
    }
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function titleCase(handle) {
  return handle.charAt(0).toUpperCase() + handle.slice(1);
}

function render() {
  el.trackBtn.disabled = state.loading;
  el.trackBtn.textContent = state.loading ? 'Tracking…' : 'Track';

  el.refreshPill.classList.toggle('is-idle', !state.loading);
  el.refreshLabel.textContent = state.loading ? 'refreshing' : 'live';

  if (state.error) {
    el.errorBox.textContent = state.error;
    el.errorBox.classList.remove('hidden');
  } else {
    el.errorBox.classList.add('hidden');
  }

  if (state.followers === null) return;

  el.trackingHandle.textContent = '@' + state.username;
  el.statUsername.textContent = '@' + state.username;

  if (state.username === 'Threads') {
    el.profileName.textContent = 'Threads';
    el.profileTagline.textContent = "Discover what's new on Threads 🔎✨";
    el.countLabel.textContent = 'THREADS FOLLOWERS';
  } else {
    el.profileName.textContent = titleCase(state.username);
    el.profileTagline.textContent = 'Live-tracking @' + state.username + "'s growth in real time ✨";
    el.countLabel.textContent = state.username.toUpperCase() + ' FOLLOWERS';
  }

  if (state.profilePic) {
    el.profilePic.src = state.profilePic;
    el.profilePic.classList.remove('hidden');
    el.avatarPlaceholder.classList.add('hidden');
  } else {
    el.profilePic.classList.add('hidden');
    el.avatarPlaceholder.classList.remove('hidden');
  }

  el.followerCount.textContent = state.followers.toLocaleString();

  const delta = state.sessionStart !== null ? state.followers - state.sessionStart : 0;
  el.statDelta.textContent = (delta >= 0 ? '+' : '') + delta.toLocaleString();
  el.statDelta.classList.toggle('idp-green', delta >= 0);

  el.statTicks.textContent = state.ticks + ' tick' + (state.ticks === 1 ? '' : 's');

  const last = state.history[state.history.length - 1];
  el.statVerified.textContent = last ? formatTime(last.timestamp) : '--:--:-- --';

  if (state.sparkChart) {
    state.sparkChart.data.labels = state.history.map((_, i) => i);
    state.sparkChart.data.datasets[0].data = state.history.map(p => p.followers);
    state.sparkChart.update();
  }

  el.monitorToggleBtn.title = state.monitoring ? 'Pause monitoring' : 'Resume monitoring';
  el.monitorToggleIcon.innerHTML = state.monitoring
    ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
    : '<path d="M7 5l12 7-12 7V5z"/>';

  renderDiscoverSelection();
}
const POPULAR = [
  { name: 'Neymar Jr', handle: 'neymarjr' },
  { name: 'Kim Kardashian', handle: 'kimkardashian' },
  { name: 'MrBeast', handle: 'mrbeast' },
  { name: 'Selena Gomez', handle: 'selenagomez' },
  { name: 'Kylie Jenner', handle: 'kyliejenner' },
  { name: 'Shakira', handle: 'shakira' }
];
const PROMOTIONAL = [
  { name: 'Romit Kr Yadav', handle: 'romitkryadav' },
  { name: 'Abhijit Kumar', handle: 'abhijit_yadav_0018' }
  
];
const TRENDING = [
  { name: 'Mark Zuckerberg', handle: 'zuck' },
  { name: 'MrBeast', handle: 'mrbeast' },
  { name: 'National Geographic', handle: 'natgeo' },
  { name: 'Real Madrid', handle: 'realmadrid' },
  { name: 'Selena Gomez', handle: 'selenagomez' },
  { name: 'Nike', handle: 'nike' },
  { name: 'Khaby Lame', handle: 'khaby00' },
  { name: 'Marvel Entertainment', handle: 'marvel' },
  { name: 'Adam Mosseri', handle: 'mosseri' }
];

function initials(name) {
  return name.replace('@', '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function selectAccount(handle) {
  if (state.loading) return;
  el.input.value = handle;
  fetchFollowers(handle);
}
function renderPopularGrid() {
  const grid = document.getElementById('popular-grid');
  grid.innerHTML = '';
  POPULAR.forEach(p => {
    const card = document.createElement('div');
    card.className = 'idp-account-card';
    card.dataset.handle = p.handle;
    card.innerHTML =
      '<div class="idp-account-avatar-ring"><div class="idp-account-avatar-inner">' +
        '<img src="https://unavatar.io/threads/' + p.handle + '" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode(\'' + initials(p.name) + '\'))">' +
      '</div></div>' +
      '<div class="idp-account-name">' + p.name + '</div>' +
      '<div class="idp-account-handle">@' + p.handle + '</div>';
    card.addEventListener('click', () => selectAccount(p.handle));
    grid.appendChild(card);
  });
}

function renderTrendingGrid() {
  const grid = document.getElementById('trending-grid');
  grid.innerHTML = '';
  TRENDING.forEach(t => {
    const row = document.createElement('div');
    row.className = 'idp-trend-row';
    row.dataset.handle = t.handle;
    row.innerHTML = '<div class="idp-trend-handle">@' + t.handle + '</div><div class="idp-trend-name">' + t.name + '</div>';
    row.addEventListener('click', () => selectAccount(t.handle));
    grid.appendChild(row);
  });
}
function renderPromotedGrid() {
  const grid = document.getElementById('promoted-grid');
  grid.innerHTML = '';
  PROMOTIONAL.forEach(p => {
    const card = document.createElement('div');
    card.className = 'idp-account-card';
    card.dataset.handle = p.handle;
    card.innerHTML =
      '<div class="idp-account-avatar-ring"><div class="idp-account-avatar-inner">' +
        '<img src="https://unavatar.io/threads/' + p.handle + '" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode(\'' + initials(p.name) + '\'))">' +
      '</div></div>' +
      '<div class="idp-account-name">' + p.name + '</div>' +
      '<div class="idp-account-handle">@' + p.handle + '</div>';
    card.addEventListener('click', () => selectAccount(p.handle));
    grid.appendChild(card);
  });
}

function initFaqAccordion() {
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach(i => {
        const q = i.querySelector('.faq-question');
        const a = i.querySelector('.faq-answer');
        i.classList.remove('active');
        if (q) q.setAttribute('aria-expanded', 'false');
        if (a) a.setAttribute('hidden', '');
      });

      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
        answer.removeAttribute('hidden');
      }
    });
  });

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const isActive = item.classList.contains('active');
    if (question) {
      question.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    }
    if (answer) {
      if (isActive) {
        answer.removeAttribute('hidden');
      } else {
        answer.setAttribute('hidden', '');
      }
    }
  });
}

function renderDiscoverSelection() {
  const active = state.followers !== null ? state.username : null;
  document.querySelectorAll('#promoted-grid .idp-account-card, #popular-grid .idp-account-card').forEach(node => {
    node.classList.toggle('selected', !!active && node.dataset.handle === active);
  });
  document.querySelectorAll('#trending-grid .idp-trend-row').forEach(node => {
    node.classList.toggle('selected', !!active && node.dataset.handle === active);
  });
}

async function fetchFollowers(user) {
  state.loading = true;
  state.error = null;
  render();
  try {
    const url = getNextWorkerUrl(user);
    const res = await fetch(url);
    const data = await res.json();

    // Check for API error response
    if (data.error) {
      throw new Error(data.error);
    }

    // Check for missing or invalid follower count
    if (data.followers === undefined || data.followers === null || data.followers === 0) {
      throw new Error("Username not found");
    }

    // Check for non-OK status
    if (!res.ok) {
      throw new Error("Username not found");
    }

    const now = Date.now();
    if (state.username !== user) {
      // Switching to a different account — reset all per-session stats
      state.username = user;
      state.history = [];
      state.sessionStart = data.followers;
      state.ticks = 0;
    }
    if (state.sessionStart === null) state.sessionStart = data.followers;

    // Persist username, session start, and tick count in cookies (30-day expiry)
    setCookie(COOKIE_KEY, user, COOKIE_DAYS);
    saveStatsCookies();

    state.followers = data.followers;
    state.profilePic = data.profilePic || null;
    state.history.push({ timestamp: now, followers: data.followers });
    if (state.history.length > 40) state.history.shift();
    state.ticks += 1;
  } catch (err) {
    state.error = err.message.includes("Username not found") || err.message.includes("not found") || err.message.includes("404") ? "Username not found" : err.message;
  } finally {
    state.loading = false;
    render();
  }
}

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = el.input.value.trim().replace(/^@/, '');
  if (!user || state.loading) return;
  fetchFollowers(user);
});

el.monitorToggleBtn.addEventListener('click', () => {
  state.monitoring = !state.monitoring;
  render();
});

setInterval(() => {
  if (!state.monitoring || state.loading) return;
  state.elapsed += TICK_MS;
  el.monitorSeconds.textContent = (state.elapsed / 1000).toFixed(1) + 's';
  if (state.elapsed >= POLL_INTERVAL_MS) {
    state.elapsed = 0;
    fetchFollowers(state.username);
  }
}, TICK_MS);

// ---- Cookie helpers -------------------------------------------------------
const COOKIE_KEY            = 'tg_last_username';
const COOKIE_KEY_SESSION    = 'tg_session_start';   // follower count at session start
const COOKIE_KEY_TICKS      = 'tg_poll_ticks';       // cumulative poll iterations
const COOKIE_KEY_FOR_USER   = 'tg_stats_user';       // which username the stats belong to
const COOKIE_DAYS = 30;

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) +
    '; expires=' + expires +
    '; path=/; SameSite=Lax';
}

function getCookie(name) {
  const match = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function saveStatsCookies() {
  setCookie(COOKIE_KEY_FOR_USER, state.username,           COOKIE_DAYS);
  setCookie(COOKIE_KEY_SESSION,  state.sessionStart,       COOKIE_DAYS);
  setCookie(COOKIE_KEY_TICKS,    state.ticks,              COOKIE_DAYS);
}
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initSpark();
  renderPromotedGrid();
  renderPopularGrid();
  renderTrendingGrid();
  initFaqAccordion();

  // Restore last tracked username from cookie, fallback to 'threads'
  const lastUser = getCookie(COOKIE_KEY) || 'threads';
  if (lastUser !== 'threads') {
    el.input.value = lastUser;
  }

  // Restore session delta and poll ticks only if they belong to the same username
  const statsUser = getCookie(COOKIE_KEY_FOR_USER);
  if (statsUser === lastUser) {
    const savedSession = parseInt(getCookie(COOKIE_KEY_SESSION), 10);
    const savedTicks   = parseInt(getCookie(COOKIE_KEY_TICKS),   10);
    if (!isNaN(savedSession)) state.sessionStart = savedSession;
    if (!isNaN(savedTicks))   state.ticks        = savedTicks;
  }

  fetchFollowers(lastUser);
});

// lang menu dropdown

    (function attachLangDropdown(){
      const langBtnDesktop = document.getElementById('langBtnDesktop');
      const langPanelDesktop = document.getElementById('langPanelDesktop');
      const langBtnLabelDesktop = document.getElementById('langBtnLabelDesktop');
      const mobileLangCurrent = document.getElementById('mobileLangCurrent');

      if (!langBtnDesktop || !langPanelDesktop) return;

      function isLangPanelOpen() {
        return langPanelDesktop.classList.contains('open');
      }

      function openLangPanel() {
        langPanelDesktop.removeAttribute('hidden');
        langPanelDesktop.style.display = '';
        langPanelDesktop.classList.add('open');
        langBtnDesktop.setAttribute('aria-expanded', 'true');
      }

      function closeLangPanel() {
        langPanelDesktop.setAttribute('hidden', '');
        langPanelDesktop.style.display = 'none';
        langPanelDesktop.classList.remove('open');
        langBtnDesktop.setAttribute('aria-expanded', 'false');
      }

      // Force a known closed state on load.
      closeLangPanel();

      langBtnDesktop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLangPanelOpen()) {
          closeLangPanel();
        } else {
          openLangPanel();
        }
      });

      document.addEventListener('click', (e) => {
        if (isLangPanelOpen() &&
            !langPanelDesktop.contains(e.target) &&
            !langBtnDesktop.contains(e.target)) {
          closeLangPanel();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isLangPanelOpen()) {
          closeLangPanel();
          langBtnDesktop.focus();
        }
      });

      function applyLanguageUI(code, name) {
        document.documentElement.setAttribute('lang', code);
        if (langBtnLabelDesktop) langBtnLabelDesktop.textContent = name;
        if (mobileLangCurrent) mobileLangCurrent.textContent = name;

        document.querySelectorAll('.lang-item, .mobile-lang-item').forEach((el) => {
          const elCode = el.getAttribute('data-lang-code');
          const isActive = elCode === code;
          el.classList.toggle('active', isActive);
          el.setAttribute('aria-selected', String(isActive));
        });
      }

      function setLanguage(code, name) {
        localStorage.setItem('td_lang_code', code);
        localStorage.setItem('td_lang_name', name);
        applyLanguageUI(code, name);
        closeLangPanel();
      }

      document.querySelectorAll('.lang-item, .mobile-lang-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const code = btn.getAttribute('data-lang-code');
          const name = btn.getAttribute('data-lang-name');
          setLanguage(code, name);
        });
      });

      // Restore saved language on load
      const savedLang = localStorage.getItem('td_lang_code') || 'en';
      const savedLangName = localStorage.getItem('td_lang_name') || 'English';
      applyLanguageUI(savedLang, savedLangName);
    })();

  