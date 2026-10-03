import type { Post, Config, Publication } from "../types.ts";
import { escape as e, publicUrl } from "../urls.ts";
import { related } from "../publication.ts";
export function article(p: Post, pub: Publication, c: Config): string {
  const index = pub.posts.findIndex((post) => post.slug === p.slug),
    newer = index < 0 ? undefined : pub.posts[index - 1],
    older = index < 0 ? undefined : pub.posts[index + 1],
    suggestions = c.article.related ? related(p, pub.posts) : [];
  return `<main id="main" class="article-page page-shell" tabindex="-1"><header class="article-hero"><span class="badge">${p.draft ? "Draft · " : ""}${e(p.category)}</span><h1>${e(p.title)}</h1><p class="standfirst">${e(p.description)}</p><p class="article-meta">${e(p.author)} <span>·</span> <time datetime="${p.date}">${p.date}</time>${p.updated ? ` <span>·</span> <span>Updated <time datetime="${p.updated}">${p.updated}</time></span>` : ""} <span>·</span> ${p.minutes} min read</p></header>
 <div class="article-body-grid"><aside class="article-rail" aria-label="Reading guide">${c.article.contents && p.headings.length ? `<nav class="contents-tree" aria-label="Table of contents"><h2 class="eyebrow">On this page</h2><ul>${p.headings.map((h) => `<li class="toc-level-${h.level}"><a href="#${h.id}">${e(h.title)}</a></li>`).join("")}</ul></nav>` : ""}<copy-actions class="share-actions"><button hidden data-copy-url>Copy URL ↗</button>${p.draft ? "" : `<button hidden data-copy-markdown="${c.basePath}markdown/${p.slug}.md">Copy Markdown</button><a href="${c.basePath}markdown/${p.slug}.md" download>Download Markdown ↓</a>`}<span data-copy-status role="status"></span></copy-actions></aside>
 <article class="prose">${p.html}</article></div><nav class="article-neighbors" aria-label="Adjacent articles">${older ? `<a href="${publicUrl(c.basePath, older.route)}">← Older: ${e(older.title)}</a>` : ""}${newer ? `<a href="${publicUrl(c.basePath, newer.route)}">Newer: ${e(newer.title)} →</a>` : ""}</nav>${suggestions.length ? `<section class="related-section"><h2>Keep exploring</h2>${suggestions.map((s) => `<a href="${publicUrl(c.basePath, s.route)}">${e(s.title)} ↗</a>`).join("")}</section>` : ""}</main>`;
}
