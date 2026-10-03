import type { Config } from "../types.ts";
import { escape as e, publicUrl } from "../urls.ts";
export function footer(c: Config): string {
  return `<footer class="site-footer page-shell"><div><p class="footer-wordmark">${e(c.name)}</p><p>${e(c.description)}</p></div><nav aria-label="Follow"><a href="${c.basePath}rss.xml">Subscribe via RSS ↗</a>${c.socialLinks.map((n) => `<a href="${e(publicUrl(c.basePath, n.to))}">${e(n.label)}</a>`).join("")}</nav></footer>`;
}
