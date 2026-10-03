import type { Config } from "../types.ts";
import { escape as e, publicUrl } from "../urls.ts";
export function header(c: Config, route: string): string {
  const nav = c.navigation
    .map(
      (n) =>
        `<a href="${e(publicUrl(c.basePath, n.to))}" ${n.to === route ? 'aria-current="page"' : ""}>${e(n.label)}</a>`,
    )
    .join("");
  return `<a class="skip-link" href="#main">Skip to content</a>
 <header class="site-header"><a class="brand" href="${c.basePath}" aria-label="${e(c.name)} home"><img src="${e(publicUrl(c.basePath, c.logo))}" width="44" height="44" alt=""></a>
 <nav aria-label="Main navigation">${nav}</nav><div class="header-actions"><button hidden data-finder="journal-finder" aria-controls="finder-dialog">Finder <kbd>/</kbd></button><button class="js-only" data-theme aria-label="Color theme: system. Change theme">◐</button></div></header>`;
}
