export function escape(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
export function basePath(value: string): string {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(value)) throw Error("basePath must be / or /nested/path/");
  return value;
}
export function origin(value: string): string {
  const u = new URL(value);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash
  )
    throw Error("siteUrl must be an HTTP(S) origin without credentials, path, query or fragment");
  return u.origin;
}
export function safeLink(href: string): string {
  let decoded = href;
  for (let i = 0; i < 8; i++) {
    if (
      [...decoded].some(
        (c) => c.charCodeAt(0) === 92 || c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127,
      ) ||
      decoded.startsWith("//") ||
      decoded.split(/[/?#]/).some((s) => s === "." || s === "..")
    )
      throw Error(`Unsafe URL: ${href}`);
    const next = decodeURIComponent(decoded);
    if (next === decoded) break;
    decoded = next;
    if (i === 7) throw Error("URL encoding is too deeply nested");
  }
  if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href)) throw Error(`Unsupported URL: ${href}`);
  if (/^https?:/i.test(href)) {
    const u = new URL(href);
    if (u.username || u.password) throw Error("URL credentials are unsupported");
  }
  return href;
}
export function publicUrl(base: string, href: string): string {
  safeLink(href);
  return href.startsWith("/") ? base + href.slice(1) : href;
}
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section"
  );
}
