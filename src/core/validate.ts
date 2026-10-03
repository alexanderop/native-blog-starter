import { posix } from "node:path";
import * as v from "valibot";
const SearchEntriesSchema = v.array(v.object({ url: v.string() }));
const textOf = (value: string | Uint8Array): string =>
  typeof value === "string" ? value : new TextDecoder().decode(value);

const decode = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

export function validate(
  files: ReadonlyMap<string, Uint8Array | string>,
  base: string,
  origin: string,
): void {
  function check(href: string, from: string): void {
    href = decode(href);
    if (/^(mailto:|data:)/.test(href)) return;
    const fromRoute = from.endsWith("index.html") ? from.slice(0, -10) : from;
    const u = new URL(href, origin + base + fromRoute);
    if (u.origin !== origin) return;
    if (!u.pathname.startsWith(base)) throw Error(`${from}: URL leaves base path: ${href}`);
    let path = decodeURIComponent(u.pathname.slice(base.length));
    if (!path || path.endsWith("/")) path += "index.html";
    if (!files.has(path)) throw Error(`${from}: Missing local destination ${href}`);
    if (u.hash) {
      const target = textOf(files.get(path) ?? "");
      const id = decodeURIComponent(u.hash.slice(1));
      const ids = [...target.matchAll(/\bid="([^"]+)"/g)].map((m) => decode(m[1]));
      if (!ids.includes(id)) throw Error(`${from}: Missing anchor ${href}`);
    }
  }
  for (const [path, bytes] of files) {
    const text = textOf(bytes);
    if (path.endsWith(".html")) {
      const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      if (new Set(ids).size !== ids.length) throw Error(`${path}: Duplicate IDs`);
      for (const m of text.matchAll(/\b(?:href|src)="([^"]+)"/g)) check(m[1], path);
      for (const m of text.matchAll(/property="og:(?:image|url)" content="([^"]+)"/g))
        check(m[1], path);
    }
    if (path.endsWith(".css"))
      for (const m of text.matchAll(/(?:url\(["']?|@import\s+["'])([^"')\s;]+)/g)) {
        const target = posix.normalize(posix.join(posix.dirname(path), m[1]));
        if (!files.has(target)) throw Error(`${path}: Missing CSS asset ${m[1]}`);
      }
    if (path === "search.json")
      for (const entry of v.parse(SearchEntriesSchema, JSON.parse(text))) check(entry.url, path);
    if (path.endsWith(".xml"))
      for (const m of text.matchAll(/<(?:loc|link)>([^<]+)</g)) check(m[1], path);
  }
}
