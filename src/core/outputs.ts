import { outputPath } from "./schemas.ts";
import type { Config, Publication, OutputPath } from "./types.ts";
import { layout } from "./templates/layout.ts";
import { archivePage } from "./templates/archive.ts";
import { article } from "./templates/article.ts";
import { page } from "./templates/page.ts";
import { escape as e, publicUrl } from "./urls.ts";
export function outputs(c: Config, pub: Publication): ReadonlyMap<OutputPath, string> {
  const plan: Map<OutputPath, string> = new Map();
  const put = (path: string, value: string) => {
    const key = outputPath(path);
    if (plan.has(key)) throw Error(`Output collision: ${path}`);
    plan.set(key, value);
  };
  const scalar = (value: string) => `'${value}'`;
  const html = (route: string, title: string, body: string, description: string = c.description) =>
    put(`${route.slice(1)}index.html`, layout(c, route, title, description, body));
  html("/", c.name, archivePage(c, pub));
  for (const a of pub.archives) html(a.route, a.title, archivePage(c, pub, a));
  for (const p of pub.pages) html(p.route, p.title, page(p.title, p.html), p.description);
  for (const p of pub.posts) {
    html(p.route, p.title, article(p, pub, c), p.description);
    put(
      `markdown/${p.slug}.md`,
      `---\ntitle: ${scalar(p.title)}\ndescription: ${scalar(p.description)}\ndate: ${p.date}${p.updated ? `\nupdated: ${p.updated}` : ""}\ndraft: false\nauthor: ${scalar(p.author)}\ncategory: ${scalar(p.category)}\ntags: [${p.tags.join(", ")}]\n---\n${p.body}`,
    );
  }
  put(
    "404.html",
    layout(
      c,
      "/404.html",
      "Page not found",
      c.description,
      page(
        "This page wandered off.",
        `<p>The address may have changed.</p><p><a href="${c.basePath}">Back to the journal →</a></p>`,
      ),
    ),
  );
  const search = pub.posts.flatMap((p) => [
    {
      title: p.title,
      description: p.description,
      content: p.text,
      url: publicUrl(c.basePath, p.route),
      category: p.category,
      tags: p.tags,
    },
    ...p.headings.map((h) => ({
      title: h.title,
      description: p.title,
      content: h.title,
      url: `${publicUrl(c.basePath, p.route)}#${h.id}`,
      category: p.category,
      tags: p.tags,
    })),
  ]);
  put("search.json", JSON.stringify(search));
  put(
    "rss.xml",
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${e(c.name)}</title><link>${e(c.siteUrl + c.basePath)}</link><description>${e(c.description)}</description>${pub.posts.map((p) => `<item><title>${e(p.title)}</title><link>${e(c.siteUrl + publicUrl(c.basePath, p.route))}</link><guid>${e(c.siteUrl + publicUrl(c.basePath, p.route))}</guid><description>${e(p.description)}</description><pubDate>${new Date(p.date).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`,
  );
  const modified = new Map<string, string | undefined>(pub.posts.map((p) => [p.route, p.updated]));
  put(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", ...pub.archives.map((a) => a.route), ...pub.pages.map((p) => p.route), ...pub.posts.map((p) => p.route)].map((route) => `<url><loc>${e(c.siteUrl + publicUrl(c.basePath, route))}</loc>${modified.get(route) ? `<lastmod>${modified.get(route)}</lastmod>` : ""}</url>`).join("")}</urlset>`,
  );
  put(
    "robots.txt",
    `User-agent: *\nAllow: ${c.basePath}\nSitemap: ${c.siteUrl + c.basePath}sitemap.xml\n`,
  );
  return plan;
}
