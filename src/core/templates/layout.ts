import type { Config } from "../types.ts";
import { escape as e, publicUrl } from "../urls.ts";
import { header } from "./header.ts";
import { footer } from "./footer.ts";
export function layout(
  c: Config,
  route: string,
  title: string,
  description: string,
  body: string,
): string {
  return `<!doctype html>
<html lang="${e(c.language)}" data-design-theme="${e(c.theme)}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title === c.name ? title : `${title} · ${c.name}`)}</title><meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(c.siteUrl + publicUrl(c.basePath, route))}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="${route.startsWith("/blog/") ? "article" : "website"}"><meta property="og:url" content="${e(c.siteUrl + publicUrl(c.basePath, route))}"><meta property="og:image" content="${e(c.siteUrl + publicUrl(c.basePath, c.socialImage))}">
<link rel="icon" href="${e(publicUrl(c.basePath, c.favicon))}"><link rel="alternate" type="application/rss+xml" title="${e(c.name)}" href="${c.basePath}rss.xml">
<link rel="stylesheet" href="${c.basePath}assets/base.css"><link rel="stylesheet" href="${c.basePath}assets/theme.css"><script src="${c.basePath}assets/theme.js"></script><script type="module" src="${c.basePath}assets/app.js"></script></head>
<body data-base="${c.basePath}">${header(c, route)}${body}${footer(c)}
<site-finder id="journal-finder" data-search="${c.basePath}search.json"><dialog id="finder-dialog" class="finder-panel" aria-labelledby="finder-heading"><div class="finder-heading"><h2 id="finder-heading">Finder</h2><button data-close aria-label="Close Finder">Esc</button></div>
<label for="finder-input">Search articles and headings</label><input id="finder-input" type="search" placeholder="A word, an idea, a heading…" role="combobox" aria-autocomplete="list" aria-controls="finder-results" aria-expanded="false" autocomplete="off">
<p class="finder-status" role="status"></p><button data-retry hidden>Retry search</button><div id="finder-results" role="listbox" aria-label="Search results"></div><p class="finder-help">↑ ↓ to navigate · Enter to open · Esc to close</p></dialog></site-finder></body></html>`;
}
