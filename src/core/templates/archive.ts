import type { PublishedPost, Config, Publication, Archive } from "../types.ts";
import { escape as e, publicUrl } from "../urls.ts";
export function rows(posts: readonly PublishedPost[], c: Config): string {
  return posts.length
    ? posts
        .map(
          (p) =>
            `<a class="post-row" href="${publicUrl(c.basePath, p.route)}"><time datetime="${p.date}">${p.date}</time><div><h2>${e(p.title)}</h2><p>${e(p.description)}</p><span class="eyebrow">${e(p.category)}</span></div><span class="post-duration">${p.minutes} min</span></a>`,
        )
        .join("")
    : '<p class="empty-state">No posts are published yet.</p>';
}
export function archivePage(c: Config, pub: Publication, archive?: Archive): string {
  return `<main id="main" class="page-shell home-grid" tabindex="-1"><div class="intro-rail"><p class="eyebrow">Independent publishing</p><h1>${e(archive?.title ?? c.name)}</h1><p>${e(c.description)}</p><p class="micro">Open files. Your words.</p></div><section class="home-feed" aria-label="Articles"><nav class="categories" aria-label="Categories"><a href="${c.basePath}archive/">All notes</a>${pub.categories.map((n) => `<a href="${publicUrl(c.basePath, n.to)}">${e(n.label)}</a>`).join("")}</nav>${rows(archive?.posts ?? pub.home, c)}<nav class="pagination" aria-label="Pagination">${archive ? (archive.previous ? `<a href="${publicUrl(c.basePath, archive.previous)}">← Newer notes</a>` : "") + (archive.next ? `<a href="${publicUrl(c.basePath, archive.next)}">Older notes →</a>` : "") : `<a href="${c.basePath}archive/">Explore the archive →</a>`}</nav></section></main>`;
}
