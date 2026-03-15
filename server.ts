import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for Threads Downloader (Simulating the Cloudflare Worker)
  app.get("/api/download", async (req, res) => {
    const url = req.query.url as string;

    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    try {
      if (!url.includes("threads.net") && !url.includes("threads.com")) {
        return res.status(400).json({ success: false, error: "Invalid Threads URL" });
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const html = response.data;
      const media: any[] = [];
      const seenUrls = new Set();
      const seenIds = new Set();

      // Extract shortcode from URL
      const shortcodeMatch = url.match(/\/post\/([^\/]+)/);
      const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

      const getMediaId = (mediaUrl: string) => {
        try {
          const urlObj = new URL(mediaUrl);
          const pathParts = urlObj.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];
          return fileName.split('_')[0];
        } catch (e) {
          return mediaUrl;
        }
      };

      const normalizeUrl = (mediaUrl: string) => {
        try {
          const urlObj = new URL(mediaUrl);
          return urlObj.hostname + urlObj.pathname;
        } catch (e) {
          return mediaUrl;
        }
      };

      const addMedia = (type: string, mediaUrl: string) => {
        if (!mediaUrl || !mediaUrl.startsWith('http')) return;
        let cleanUrl = decodeHtmlEntities(mediaUrl.replace(/\\u0025/g, '%').replace(/\\/g, ''));
        
        // Filter out common non-post media
        if (cleanUrl.includes('profile_pic') || cleanUrl.includes('static.cdninstagram.com') || cleanUrl.includes('favicon')) return;
        
        // Force video type if URL contains video indicators
        const videoIndicators = ['.mp4', '.m4v', 'video_dashinit', 'efg=', '/v/'];
        const isVideoUrl = videoIndicators.some(ind => cleanUrl.toLowerCase().includes(ind));
        const isImageUrl = cleanUrl.includes('.jpg') || cleanUrl.includes('.png') || cleanUrl.includes('.webp');
        
        if (isVideoUrl && (!isImageUrl || cleanUrl.toLowerCase().includes('.mp4'))) {
          type = 'video';
        }

        const mediaId = getMediaId(cleanUrl);
        const normalized = normalizeUrl(cleanUrl);

        const alreadySeen = seenIds.has(mediaId) || seenUrls.has(normalized);

        if (alreadySeen) {
          // Check for upgrade: image -> video
          if (type === 'video') {
            const existingIndex = media.findIndex(m => m.type === 'image' && (getMediaId(m.url) === mediaId || normalizeUrl(m.url) === normalized));
            if (existingIndex !== -1) {
              media.splice(existingIndex, 1);
              media.push({ type, url: cleanUrl });
              seenIds.add(mediaId);
              seenUrls.add(normalized);
            }
          }
          return;
        }

        media.push({ type, url: cleanUrl });
        seenIds.add(mediaId);
        seenUrls.add(normalized);
      };

      // 1. Meta Tags
      const metaPatterns = {
        video: [
          /<meta[^>]*property="og:video"[^>]*content="([^"]*)"/i,
          /<meta[^>]*property="og:video:secure_url"[^>]*content="([^"]*)"/i,
          /<meta[^>]*name="twitter:player:stream"[^>]*content="([^"]*)"/i
        ],
        image: [
          /<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i,
          /<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i
        ]
      };

      metaPatterns.video.forEach(pattern => {
        const match = html.match(pattern);
        if (match) addMedia('video', match[1]);
      });

      metaPatterns.image.forEach(pattern => {
        const match = html.match(pattern);
        if (match) addMedia('image', match[1]);
      });

      // 2. Targeted JSON Search
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
      let scriptMatch;
      let bestScripts: string[] = [];

      while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const content = scriptMatch[1];
        if (content.includes('"shortcode_media"') || content.includes('"display_url"') || content.includes('"video_url"')) {
          if (shortcode && content.includes(shortcode)) {
            bestScripts.unshift(content);
          } else {
            bestScripts.push(content);
          }
        }
      }

      const videoPatterns = [
        /"video_url":"([^"]+)"/g,
        /"video_versions":\[{"url":"([^"]+)"/g,
        /"playable_url":"([^"]+)"/g,
        /"video_dash_manifest":"([^"]+)"/g
      ];
      const imagePatterns = [
        /"display_url":"([^"]+)"/g,
        /"image_versions2":{[^}]*"url":"([^"]+)"/g,
        /"carousel_media":\[[^\]]*"url":"([^"]+)"/g,
        /"display_resources":\[[^\]]*"src":"([^"]+)"/g,
        /"thumbnail_src":"([^"]+)"/g
      ];

      const runPatterns = (area: string) => {
        // Try to find carousel items first
        const carouselRegex = /"carousel_media":\s*\[([\s\S]*?)\]/g;
        let carouselMatch;
        while ((carouselMatch = carouselRegex.exec(area)) !== null) {
          const carouselContent = carouselMatch[1];
          // Extract videos from carousel
          videoPatterns.forEach(pattern => {
            let m;
            while ((m = pattern.exec(carouselContent)) !== null) {
              addMedia('video', m[1]);
            }
          });
          // Extract images from carousel
          imagePatterns.forEach(pattern => {
            let m;
            while ((m = pattern.exec(carouselContent)) !== null) {
              addMedia('image', m[1]);
            }
          });
        }

        // Then run on the whole area for non-carousel or single items
        videoPatterns.forEach(pattern => {
          let m;
          while ((m = pattern.exec(area)) !== null) {
            addMedia('video', m[1]);
          }
        });
        imagePatterns.forEach(pattern => {
          let m;
          while ((m = pattern.exec(area)) !== null) {
            addMedia('image', m[1]);
          }
        });
      };

      if (bestScripts.length > 0) {
        bestScripts.forEach(script => runPatterns(script));
      } else {
        runPatterns(html);
      }

      // 3. Final Fallback
      if (media.length === 0) {
        const cdnPattern = /https:\/\/[^"'\s]+\.(?:jpg|png|mp4|m4v)[^"'\s]*/g;
        const cdnMatches = html.match(cdnPattern);
        if (cdnMatches) {
          cdnMatches.forEach(match => {
            if (match.includes('fbcdn.net') || match.includes('cdninstagram.com')) {
              const type = match.includes('.mp4') || match.includes('.m4v') ? 'video' : 'image';
              addMedia(type, match);
            }
          });
        }
      }

      if (media.length > 0) {
        return res.json({ success: true, media });
      }

      return res.status(404).json({ success: false, error: "Media not found for this post" });
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      return res.status(500).json({ success: false, error: "Failed to fetch Threads post" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  // 404 fallback for any missing routes
  app.use((req, res) => {
    res.status(404).sendFile(require("path").resolve(__dirname, "404.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
