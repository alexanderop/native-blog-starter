import { escape as e, publicUrl } from "../lib/urls.mjs";
import { header } from "./header.mjs";
import { footer } from "./footer.mjs";
/** @param {import('../lib/types.js').Config} c @param {string} route @param {string} title @param {string} description @param {string} body */
export function layout(c, route, title, description, body) {
  return `<!doctype html>
<html lang="${e(c.language)}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title === c.name ? title : `${title} · ${c.name}`)}</title><meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(c.siteUrl + publicUrl(c.basePath, route))}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="${route.startsWith("/blog/") ? "article" : "website"}"><meta property="og:url" content="${e(c.siteUrl + publicUrl(c.basePath, route))}"><meta property="og:image" content="${e(c.siteUrl + publicUrl(c.basePath, c.socialImage))}">
<link rel="icon" href="${e(publicUrl(c.basePath, c.favicon))}"><link rel="alternate" type="application/rss+xml" title="${e(c.name)}" href="${c.basePath}rss.xml">
<link rel="stylesheet" href="${c.basePath}assets/base.css"><script src="${c.basePath}assets/theme.js"></script><script type="module" src="${c.basePath}assets/app.js"></script></head>
<body data-base="${c.basePath}">${header(c, route)}${body}${footer(c)}
<dialog class="finder-panel" aria-labelledby="finder-heading"><div class="finder-heading"><h2 id="finder-heading">Finder</h2><button data-close aria-label="Close Finder">Esc</button></div>
<label for="finder-input">Search articles and headings</label><input id="finder-input" type="search" placeholder="A word, an idea, a heading…" role="combobox" aria-autocomplete="list" aria-controls="finder-results" aria-expanded="false" autocomplete="off">
<p class="finder-status" role="status"></p><button data-retry hidden>Retry search</button><div id="finder-results" role="listbox" aria-label="Search results"></div><p class="finder-help">↑ ↓ to navigate · Enter to open · Esc to close</p></dialog></body></html>`;
}
