/**
 * THREADS.ANALYTICS - API Interface
 * Connects directly to Cloudflare Worker
 */

// Fetch Data Directly from Worker
async function fetchFollowers(user, isAuto = false, isSecondUser = false) {
    if (!user) return;
    
    // Check if state is available in global scope
    if (typeof state === 'undefined' || typeof updateUI === 'undefined') {
        console.error('UI Structure not found. Please ensure liveapp.js is loaded after the main script.');
        return;
    }

    if (!isAuto) {
        state.loading = true;
        updateUI();
    }
    state.error = null;

    try {
        const workerUrl = `https://reddit.romitkr361.workers.dev/?user=${user}`;
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
