import { escape as e, publicUrl } from "../lib/urls.mjs";
/** @param {import('../lib/types.js').Document[]} posts @param {import('../lib/types.js').Config} c */
export function rows(posts, c) {
  return posts.length
    ? posts
        .map(
          (p) =>
            `<a class="post-row" href="${publicUrl(c.basePath, p.route)}"><time datetime="${p.date}">${p.date}</time><div><h2>${e(p.title)}</h2><p>${e(p.description)}</p><span class="eyebrow">${e(p.category)}</span></div><span class="post-duration">${p.minutes} min</span></a>`,
        )
        .join("")
    : '<p class="empty-state">No posts are published yet.</p>';
}
/** @param {import('../lib/types.js').Config} c @param {import('../lib/types.js').Publication} pub @param {import('../lib/types.js').Archive} [archive] */
export function archivePage(c, pub, archive) {
  return `<main id="main" class="page-shell home-grid" tabindex="-1"><div class="intro-rail"><p class="eyebrow">Independent publishing</p><h1>${e(archive?.title ?? c.name)}</h1><p>${e(c.description)}</p><p class="micro">Open files. Your words.</p></div><section class="home-feed" aria-label="Articles"><nav class="categories" aria-label="Categories"><a href="${c.basePath}archive/">All notes</a>${pub.categories.map((n) => `<a href="${publicUrl(c.basePath, n.to)}">${e(n.label)}</a>`).join("")}</nav>${rows(archive?.posts ?? pub.home, c)}<nav class="pagination" aria-label="Pagination">${archive ? (archive.previous ? `<a href="${publicUrl(c.basePath, archive.previous)}">← Newer notes</a>` : "") + (archive.next ? `<a href="${publicUrl(c.basePath, archive.next)}">Older notes →</a>` : "") : `<a href="${c.basePath}archive/">Explore the archive →</a>`}</nav></section></main>`;
}
