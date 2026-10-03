import { escape as e, publicUrl } from "../lib/urls.mjs";
/** @param {import('../lib/types.js').Config} c @param {string} route */
export function header(c, route) {
  const nav = c.navigation
    .map(
      (n) =>
        `<a href="${e(publicUrl(c.basePath, n.to))}" ${n.to === route ? 'aria-current="page"' : ""}>${e(n.label)}</a>`,
    )
    .join("");
  return `<a class="skip-link" href="#main">Skip to content</a>
 <header class="site-header"><a class="brand" href="${c.basePath}" aria-label="${e(c.name)} home"><img src="${e(publicUrl(c.basePath, c.logo))}" width="44" height="44" alt=""></a>
 <nav aria-label="Main navigation">${nav}</nav><div class="header-actions"><button class="js-only" data-finder>Finder <kbd>/</kbd></button><button class="js-only" data-theme aria-label="Color theme: system. Change theme">◐</button></div></header>`;
}
