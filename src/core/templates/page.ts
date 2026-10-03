import { escape as e } from "../urls.ts";
export function page(title: string, body: string): string {
  return `<main id="main" class="page-shell simple-page" tabindex="-1"><h1>${e(title)}</h1><div class="prose">${body}</div></main>`;
}
