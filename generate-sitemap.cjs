const fs = require('fs');
const path = require('path');
const base = 'https://threadsgrab.com';
const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.html') && f !== '404.html');
const now = new Date().toISOString();
let body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
files.forEach(f => {
  const url = f === 'index.html' ? base : `${base}/${f}`;
  body += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
});
body += '</urlset>';
fs.writeFileSync('sitemap.xml', body, 'utf8');
console.log('sitemap.xml written with', files.length, 'entries');
