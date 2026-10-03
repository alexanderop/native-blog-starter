import { escape as e } from "../lib/urls.mjs";
/** @param {string} title @param {string} body */
export function page(title, body) {
  return `<main id="main" class="page-shell simple-page" tabindex="-1"><h1>${e(title)}</h1><div class="prose">${body}</div></main>`;
}
