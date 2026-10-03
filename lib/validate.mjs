import { readdir, readFile } from "node:fs/promises";
import { resolve, posix } from "node:path";
/** @param {string} root @param {string} [prefix] @returns {Promise<Map<string,Buffer>>} */
export async function readTree(root, prefix = "") {
  const files = new Map();
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) {
      for (const [key, value] of await readTree(root, path + "/")) files.set(key, value);
    } else files.set(path, await readFile(resolve(root, path)));
  }
  return files;
}
/** @param {string} value */
const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
/** @param {Map<string,Buffer|string>} files @param {string} base @param {string} origin */
export function validate(files, base, origin) {
  /** @param {string} href @param {string} from */
  function check(href, from) {
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
      const target = String(files.get(path));
      const id = decodeURIComponent(u.hash.slice(1));
      const ids = [...target.matchAll(/\bid="([^"]+)"/g)].map((m) => decode(m[1]));
      if (!ids.includes(id)) throw Error(`${from}: Missing anchor ${href}`);
    }
  }
  for (const [path, bytes] of files) {
    const text = String(bytes);
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
    if (path === "search.json") for (const entry of JSON.parse(text)) check(entry.url, path);
    if (path.endsWith(".xml"))
      for (const m of text.matchAll(/<(?:loc|link)>([^<]+)</g)) check(m[1], path);
  }
}
