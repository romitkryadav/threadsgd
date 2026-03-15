# Deployment Instructions for Threads Media Downloader

## 1. Deploy the Frontend (Cloudflare Pages)
1.  **Prepare your files:** Ensure all `.html`, `.css`, and `.js` files are in a folder (e.g., `public`).
2.  **Login to Cloudflare Dashboard:** Go to **Workers & Pages** > **Create application** > **Pages**.
3.  **Connect your Git repository** or **Upload assets** directly.
4.  **Build settings:**
    *   Framework preset: `None`
    *   Build command: (Leave empty)
    *   Build output directory: `.` (or your folder name)
5.  **Environment Variables:** Add `VITE_WORKER_URL` if you want to point to your worker dynamically.

## 2. Deploy the Backend (Cloudflare Workers)
1.  **Go to Workers & Pages** > **Create application** > **Create Worker**.
2.  **Name your worker** (e.g., `threads-api`).
3.  **Copy the code** from `worker/worker.js` into the Cloudflare Worker editor.
4.  **Deploy** the worker.
5.  **Get your Worker URL** (e.g., `https://threads-api.yourname.workers.dev`).

## 3. Connect Frontend to Backend
1.  Open `script.js` in your frontend.
2.  Update the `fetch` call to point to your Cloudflare Worker URL:
    ```javascript
    // Change this line:
    const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
    
    // To this:
    const response = await fetch(`https://your-worker-url.workers.dev/?url=${encodeURIComponent(url)}`);
    ```
3.  Re-deploy your frontend to Cloudflare Pages.

## 4. SEO Setup
*   Ensure each HTML file has unique meta titles and descriptions.
*   The `structured data` (JSON-LD) is already included in `index.html`.
*   For multi-page SEO, Cloudflare Pages automatically serves `threads-video-downloader.html` at `/threads-video-downloader`.

## 5. Security Notes
*   The worker includes basic URL validation.
*   CORS headers are set to `*` to allow your frontend to communicate with the worker.
*   The User-Agent in the worker mimics Googlebot to ensure Threads serves the meta tags correctly.
