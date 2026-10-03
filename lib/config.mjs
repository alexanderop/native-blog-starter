import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { basePath, origin, safeLink } from "./urls.mjs";
/** @param {unknown} value @returns {asserts value is Record<string, unknown>} */
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Expected a configuration object");
}
/** @param {Record<string, unknown>} value @param {string[]} allowed */
function keys(value, allowed) {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) throw Error(`Unknown configuration key: ${key}`);
}
/** @param {unknown} value @param {string} name @returns {string} */
function text(value, name) {
  if (typeof value !== "string" || !value.trim()) throw Error(`Invalid configuration: ${name}`);
  return value;
}
/** @param {unknown} value @param {boolean} external @returns {import('./types.js').Link[]} */
function links(value, external) {
  if (!Array.isArray(value)) throw Error("Navigation/socialLinks must be arrays");
  return value.map((item) => {
    object(item);
    keys(item, ["label", "to"]);
    const to = safeLink(text(item.to, "to"));
    if (!external && (!to.startsWith("/") || !to.endsWith("/")))
      throw Error("Navigation targets must be logical directory routes");
    return { label: text(item.label, "label"), to };
  });
}
/** @param {string} root @param {NodeJS.ProcessEnv} [env] @returns {Promise<import('./types.js').Config>} */
export async function loadConfig(root, env = process.env) {
  const raw = (
    await import(
      `${pathToFileURL(resolve(root, "site.config.mjs")).href}?load=${Date.now()}-${Math.random()}`
    )
  ).default;
  object(raw);
  keys(raw, [
    "name",
    "description",
    "language",
    "author",
    "siteUrl",
    "basePath",
    "navigation",
    "logo",
    "favicon",
    "socialImage",
    "socialLinks",
    "featuredSlug",
    "postsPerPage",
    "article",
  ]);
  const strings = Object.fromEntries(
    ["name", "description", "language", "author", "logo", "favicon", "socialImage"].map((key) => [
      key,
      text(raw[key], key),
    ]),
  );
  for (const key of ["logo", "favicon", "socialImage"])
    if (!safeLink(strings[key]).startsWith("/")) throw Error(`${key} must be a local asset`);
  if (
    typeof raw.postsPerPage !== "number" ||
    !Number.isInteger(raw.postsPerPage) ||
    raw.postsPerPage < 1 ||
    raw.postsPerPage > 100
  )
    throw Error("postsPerPage must be an integer from 1 to 100");
  object(raw.article);
  keys(raw.article, ["contents", "related"]);
  if (typeof raw.article.contents !== "boolean" || typeof raw.article.related !== "boolean")
    throw Error("article options must be booleans");
  const featuredSlug =
    raw.featuredSlug === undefined ? undefined : text(raw.featuredSlug, "featuredSlug");
  return {
    name: strings.name,
    description: strings.description,
    language: strings.language,
    author: strings.author,
    logo: strings.logo,
    favicon: strings.favicon,
    socialImage: strings.socialImage,
    siteUrl: origin(env.SITE_URL ?? text(raw.siteUrl, "siteUrl")),
    basePath: basePath(env.BASE_PATH ?? text(raw.basePath, "basePath")),
    navigation: links(raw.navigation, false),
    socialLinks: links(raw.socialLinks, true),
    featuredSlug,
    postsPerPage: raw.postsPerPage,
    article: { contents: raw.article.contents, related: raw.article.related },
  };
}
