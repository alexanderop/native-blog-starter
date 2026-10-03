import { layout } from "../templates/layout.mjs";
import { archivePage } from "../templates/archive.mjs";
import { article } from "../templates/article.mjs";
import { page } from "../templates/page.mjs";
import { escape as e, publicUrl } from "./urls.mjs";
/** @param {import('./types.js').Config} c @param {import('./types.js').Publication} pub */
export function outputs(c, pub) {
  /** @type {Map<string,string>} */ const plan = new Map();
  /** @param {string} path @param {string} value */ const put = (path, value) => {
    if (plan.has(path)) throw Error(`Output collision: ${path}`);
    plan.set(path, value);
  };
  /** @param {string} route @param {string} title @param {string} body @param {string} [description] */ const html =
    (route, title, body, description = c.description) =>
      put(`${route.slice(1)}index.html`, layout(c, route, title, description, body));
  html("/", c.name, archivePage(c, pub));
  for (const a of pub.archives) html(a.route, a.title, archivePage(c, pub, a));
  for (const p of pub.pages) html(p.route, p.title, page(p.title, p.html), p.description);
  for (const p of pub.posts) {
    html(p.route, p.title, article(p, pub, c), p.description);
    put(
      `markdown/${p.slug}.md`,
      `---\ntitle: ${p.title}\ndescription: ${p.description}\ndate: ${p.date}\nauthor: ${p.author}\ncategory: ${p.category}\ntags: [${p.tags.join(", ")}]\n---\n${p.body}`,
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
  put(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", ...pub.archives.map((a) => a.route), ...pub.pages.map((p) => p.route), ...pub.posts.map((p) => p.route)].map((route) => `<url><loc>${e(c.siteUrl + publicUrl(c.basePath, route))}</loc></url>`).join("")}</urlset>`,
  );
  put(
    "robots.txt",
    `User-agent: *\nAllow: ${c.basePath}\nSitemap: ${c.siteUrl + c.basePath}sitemap.xml\n`,
  );
  return plan;
}
