import type { PublishedPost, Config, Publication } from "../types.ts";
import { escape as e, publicUrl } from "../urls.ts";
import { related } from "../publication.ts";
export function article(p: PublishedPost, pub: Publication, c: Config): string {
  const index = pub.posts.indexOf(p),
    newer = pub.posts[index - 1],
    older = pub.posts[index + 1],
    suggestions = c.article.related ? related(p, pub.posts) : [];
  return `<main id="main" class="article-page page-shell" tabindex="-1"><header class="article-hero"><span class="badge">${e(p.category)}</span><h1>${e(p.title)}</h1><p class="standfirst">${e(p.description)}</p><p class="article-meta">${e(p.author)} <span>·</span> <time datetime="${p.date}">${p.date}</time> <span>·</span> ${p.minutes} min read</p></header>
 <div class="article-body-grid"><aside class="article-rail" aria-label="Reading guide">${c.article.contents && p.headings.length ? `<nav class="contents-tree" aria-label="Table of contents"><h2 class="eyebrow">On this page</h2><ul>${p.headings.map((h) => `<li class="toc-level-${h.level}"><a href="#${h.id}">${e(h.title)}</a></li>`).join("")}</ul></nav>` : ""}<div class="share-actions"><button class="js-only" data-copy-url>Copy URL ↗</button><button class="js-only" data-copy-markdown="${c.basePath}markdown/${p.slug}.md">Copy Markdown</button><a href="${c.basePath}markdown/${p.slug}.md" download>Download Markdown ↓</a><span data-copy-status role="status"></span></div></aside>
 <article class="prose">${p.html}</article></div><nav class="article-neighbors" aria-label="Adjacent articles">${older ? `<a href="${publicUrl(c.basePath, older.route)}">← Older: ${e(older.title)}</a>` : ""}${newer ? `<a href="${publicUrl(c.basePath, newer.route)}">Newer: ${e(newer.title)} →</a>` : ""}</nav>${suggestions.length ? `<section class="related-section"><h2>Keep exploring</h2>${suggestions.map((s) => `<a href="${publicUrl(c.basePath, s.route)}">${e(s.title)} ↗</a>`).join("")}</section>` : ""}</main>`;
}
