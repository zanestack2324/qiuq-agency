const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname);
const header = fs.readFileSync(path.join(__dirname, 'includes', 'header.html'), 'utf8');
const footer = fs.readFileSync(path.join(__dirname, 'includes', 'footer.html'), 'utf8');

const siteUrl = 'https://qiuq.dev';

const baseSchema = [
  {"@type":"Organization","@id":"https://qiuq.dev/#org","name":"qiuQ","url":"https://qiuq.dev/","logo":"https://qiuq.dev/logo.png","description":"Creative digital agency based in Lagos & London specializing in web design, mobile apps, and business automation.","address":[{"@type":"PostalAddress","addressLocality":"Lagos","addressCountry":"NG"},{"@type":"PostalAddress","addressLocality":"London","addressCountry":"GB"}],"sameAs":["https://twitter.com/qiuqdev","https://www.instagram.com/qiuqdev","https://www.linkedin.com/company/qiuqdev"]},
  {"@type":"LocalBusiness","@id":"https://qiuq.dev/#local","name":"qiuQ","url":"https://qiuq.dev/","description":"Web design agency in Lagos & London offering website design, mobile app development, and business automation.","telephone":"+2349025841716","email":"info@qiuq.dev","priceRange":"$$","address":[{"@type":"PostalAddress","streetAddress":"Lagos","addressLocality":"Lagos","addressCountry":"NG"},{"@type":"PostalAddress","streetAddress":"London","addressLocality":"London","addressCountry":"GB"}],"areaServed":[{"@type":"City","name":"Lagos"},{"@type":"City","name":"London"}],"openingHours":"Mo-Fr 09:00-18:00"},
  {"@type":"WebSite","@id":"https://qiuq.dev/#web","url":"https://qiuq.dev/","name":"qiuQ"},
  {"@type":"AggregateRating","@id":"https://qiuq.dev/#rating","itemReviewed":{"@id":"https://qiuq.dev/#org"},"ratingValue":"4.9","bestRating":"5","ratingCount":"50","reviewCount":"50"}
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
  const canonical = meta.canonical || `${siteUrl}/${meta.slug || pageFile.replace('.html', '.html')}`;
  const pageTitle = meta.title || 'qiuQ';
  const pageDesc = meta.description || '';
  const pageOgTitle = meta.og_title || pageTitle;
  const pageOgDesc = meta.og_description || pageDesc;
  const pageKeywords = meta.keywords || 'web design, mobile app development, business automation, digital agency, Lagos, London';

  let pageSchema = baseSchema;
  if (meta.schema) {
    try { pageSchema = baseSchema.concat(JSON.parse(meta.schema)); } catch(e) {}
  }

  if (meta.slug !== 'index.html') {
    const pageName = meta.title ? meta.title.split('|')[0].split('–')[0].split(':')[0].trim() : meta.slug;
    pageSchema.push({"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"item":{"@id":"https://qiuq.dev/","name":"Home"}},{"@type":"ListItem","position":2,"item":{"@id":canonical,"name":pageName}}]});
  }

  const jsonLd = {"@context":"https://schema.org","@graph":pageSchema};

  let html = header
    .replace(/\{\{TITLE\}\}/g, pageTitle)
    .replace(/\{\{DESCRIPTION\}\}/g, pageDesc)
    .replace(/\{\{KEYWORDS\}\}/g, pageKeywords)
    .replace(/\{\{CANONICAL\}\}/g, canonical)
    .replace(/\{\{OG_TITLE\}\}/g, pageOgTitle)
    .replace(/\{\{OG_DESCRIPTION\}\}/g, pageOgDesc)
    .replace(/\{\{JSON_LD\}\}/g, JSON.stringify(jsonLd));

  html += body;
  html += footer;

  const outFile = path.join(OUT, meta.slug || pageFile);
  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`Built: ${meta.slug || pageFile}`);
}

const today = new Date().toISOString().slice(0, 10);

const pages = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
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
  const loc = slug === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${slug}`;
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
