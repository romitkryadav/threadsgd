const fs = require('fs');
const BASE = 'https://threadsgrab.com';
const LANGUAGES = ["af","ar","bn","de","es","fa","fr","hi","id","it","ja","ko","ne","pl","pt","ru","sv","th","tr","uk","ur","vi","zh"];
const TOOLS = ["threads-video-downloader","threads-image-downloader","threads-profile-picture-downloader","threads-follower-counter"];
const ROOT_PAGES = ['about', 'contact', 'privacy-policy', 'disclaimer', 'blog'];
const BLOG_PAGES = ['blog/how-to-download-threads-videos'];
const urls = new Set([BASE + '/']);
for (const page of ROOT_PAGES) urls.add(BASE + '/' + page);
for (const page of BLOG_PAGES) urls.add(BASE + '/' + page);
for (const lang of LANGUAGES) { urls.add(BASE + '/' + lang); for (const tool of TOOLS) urls.add(BASE + '/' + lang + '/' + tool); }
const exists = url => { const pathname = new URL(url).pathname; if (pathname === '/') return fs.existsSync('index.html'); return fs.existsSync(pathname.slice(1) + '.html'); };
const validUrls = [...urls].filter(exists).sort();
const xml = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...validUrls.map(url => '  <url><loc>' + url + '</loc></url>'),'</urlset>',''].join('\n');
fs.writeFileSync('sitemap.xml', xml, 'utf8');
console.log('sitemap.xml written with ' + validUrls.length + ' URLs');