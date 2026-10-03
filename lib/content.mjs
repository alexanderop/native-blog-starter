import { readdir, readFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { markdown } from "./markdown.mjs";
/** @param {string} source @param {string} file @param {string} author @param {boolean} [page] */
export function parseContent(source, file, author, page = false) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end < 1) throw Error(`${file}:1: Missing frontmatter`);
  /** @type {Record<string, string | boolean | string[]>} */ const data = {};
  const allowed = page
    ? ["title", "description"]
    : ["title", "description", "date", "category", "author", "tags", "draft", "featured"];
  /** @param {number} line @param {string} message */
  const fail = (line, message) => {
    throw Error(`${file}:${line}: ${message}`);
  };
  for (let i = 1; i < end; i++) {
    const pair = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!pair) fail(i + 1, "Expected field: value");
    if (!pair) continue;
    const [, key, value] = pair;
    if (!allowed.includes(key) || Object.hasOwn(data, key))
      fail(i + 1, `Unknown or duplicate field ${key}`);
    if (["draft", "featured"].includes(key)) {
      if (!/^(true|false)$/.test(value)) fail(i + 1, `${key} must be true or false`);
      data[key] = value === "true";
    } else if (key === "tags") {
      if (!/^\[(?:\s*[a-zA-Z0-9 -]+\s*(?:,\s*[a-zA-Z0-9 -]+\s*)*)?\]$/.test(value))
        fail(i + 1, "tags must be an array of plain names");
      data[key] = [
        ...new Set(
          value
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
    } else {
      if (/^["']/.test(value) && value.at(-1) !== value[0]) fail(i + 1, "Unclosed quoted string");
      data[key] = value.replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  for (const key of page ? ["title", "description"] : ["title", "description", "date", "category"])
    if (typeof data[key] !== "string" || !data[key]) fail(1, `Missing ${key}`);
  const date = String(data.date ?? "1970-01-01");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    fail(lines.findIndex((l) => l.startsWith("date:")) + 1, "Invalid date");
  return {
    title: String(data.title),
    description: String(data.description),
    date,
    category: String(data.category ?? ""),
    author: String(data.author ?? author),
    tags: Array.isArray(data.tags) ? data.tags : [],
    draft: data.draft === true,
    featured: data.featured === true,
    body: lines.slice(end + 1).join("\n"),
  };
}
/** @param {string} root @param {import('./types.js').Config} config @param {boolean} [page] @returns {Promise<import('./types.js').Document[]>} */
export async function collect(root, config, page = false) {
  const dir = resolve(root, "content", page ? "pages" : "blog");
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "_drafts") continue;
    const file = resolve(dir, entry.name);
    if ((await lstat(file)).isSymbolicLink())
      throw Error(`${file}: Content symlinks are unsupported`);
    if (!entry.isFile() || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.name))
      throw Error(`${file}: Expected a lowercase hyphenated Markdown filename`);
    const data = parseContent(await readFile(file, "utf8"), file, config.author, page);
    if (data.draft) continue;
    const slug = entry.name.slice(0, -3);
    const route = page ? `/${slug}/` : `/blog/${slug}/`;
    let rendered;
    try {
      rendered = markdown(data.body, config.basePath);
    } catch (error) {
      throw Error(`${file}: ${error instanceof Error ? error.message : error}`);
    }
    result.push({
      ...data,
      slug,
      route,
      ...rendered,
      minutes: Math.max(1, Math.ceil(rendered.text.split(/\s+/).length / 220)),
    });
  }
  return result;
}
