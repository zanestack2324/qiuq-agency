const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname);
const header = fs.readFileSync(path.join(__dirname, 'includes', 'header.html'), 'utf8');
const footer = fs.readFileSync(path.join(__dirname, 'includes', 'footer.html'), 'utf8');

const siteUrl = 'https://qiuq-developers.vercel.app';

const baseSchema = [
  {"@type":"Organization","@id":`${siteUrl}/#org`,"name":"qiuQ","url":`${siteUrl}/`,"logo":`${siteUrl}/logo.png`,"description":"Web development company based in Lagos & London specializing in web development, mobile apps, and business automation.","address":[{"@type":"PostalAddress","addressLocality":"Lagos","addressCountry":"NG"},{"@type":"PostalAddress","addressLocality":"London","addressCountry":"GB"}],"sameAs":["https://twitter.com/qiuqdev","https://www.instagram.com/qiuqdev","https://www.linkedin.com/company/qiuqdev"]},
  {"@type":"LocalBusiness","@id":`${siteUrl}/#local`,"name":"qiuQ","url":`${siteUrl}/`,"description":"Web development company in Lagos & London offering web development, mobile app development, and business automation.","telephone":"+2349025841716","email":"info@qiuq.dev","priceRange":"$$","address":[{"@type":"PostalAddress","streetAddress":"Lagos","addressLocality":"Lagos","addressCountry":"NG"},{"@type":"PostalAddress","streetAddress":"London","addressLocality":"London","addressCountry":"GB"}],"areaServed":[{"@type":"City","name":"Lagos"},{"@type":"City","name":"London"}],"openingHours":"Mo-Fr 09:00-18:00"},
  {"@type":"WebSite","@id":`${siteUrl}/#web`,"url":`${siteUrl}/`,"name":"qiuQ"}
];

function buildPage(pageFile) {
  const raw = fs.readFileSync(path.join(SRC, pageFile), 'utf8');

  const metaMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!metaMatch) { console.error(`No frontmatter in ${pageFile}`); return; }

  const meta = {};
  metaMatch[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });

  const body = raw.slice(metaMatch[0].length);
  const canonical = meta.canonical || `${siteUrl}/${meta.slug || pageFile}`;
  const pageTitle = meta.title || 'qiuQ';
  const pageDesc = meta.description || '';
  const pageOgTitle = meta.og_title || pageTitle;
  const pageOgDesc = meta.og_description || pageDesc;
  const pageKeywords = meta.keywords || 'web development, mobile app development, business automation, web development company, Lagos, London';
  const pageRobots = meta.robots || 'index, follow';

  let pageSchema = baseSchema;
  if (meta.schema) {
    try { pageSchema = baseSchema.concat(JSON.parse(meta.schema)); } catch(e) {}
  }

  if (meta.slug !== 'index.html') {
    const pageName = meta.title ? meta.title.split('|')[0].split('–')[0].split(':')[0].trim() : meta.slug;
    pageSchema.push({"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"item":{"@id":`${siteUrl}/`,"name":"Home"}},{"@type":"ListItem","position":2,"item":{"@id":canonical,"name":pageName}}]});
  }

  const jsonLd = {"@context":"https://schema.org","@graph":pageSchema};

  let html = header
    .replace(/\{\{TITLE\}\}/g, pageTitle)
    .replace(/\{\{DESCRIPTION\}\}/g, pageDesc)
    .replace(/\{\{KEYWORDS\}\}/g, pageKeywords)
    .replace(/\{\{CANONICAL\}\}/g, canonical)
    .replace(/\{\{OG_TITLE\}\}/g, pageOgTitle)
    .replace(/\{\{OG_DESCRIPTION\}\}/g, pageOgDesc)
    .replace(/\{\{JSON_LD\}\}/g, JSON.stringify(jsonLd))
    .replace(/\{\{ROBOTS\}\}/g, pageRobots);

  html += body;
  html += footer;

  const outFile = path.join(OUT, meta.slug || pageFile);
  const outDir = path.dirname(outFile);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`Built: ${meta.slug || pageFile}`);
}

const today = new Date().toISOString().slice(0, 10);

const pages = [];
function findPages(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) findPages(full);
    else if (f.endsWith('.html')) pages.push(path.relative(SRC, full));
  });
}
findPages(SRC);
pages.forEach(buildPage);

// Generate sitemap
const sitemapPages = pages.map(f => {
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
  const metaMatch = raw.match(/^---\n[\s\S]*?\n---\n/);
  if (!metaMatch) return null;
  const meta = {};
  raw.slice(0, metaMatch[0].length).split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  const slug = meta.slug || f;
  if (slug === '404.html') return null;
  const loc = slug === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${slug.replace(/\/index\.html$/, '/')}`;
  const priority = slug === 'index.html' ? '1.0' : (slug.includes('services') ? '0.9' : '0.8');
  return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
}).filter(Boolean).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPages}
</urlset>`;

fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap, 'utf8');
console.log('Built: sitemap.xml');
console.log(`\nDone! Built ${pages.length} pages.`);
