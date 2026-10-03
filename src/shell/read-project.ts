import { readdir, readFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as v from "valibot";
import { ConfigThemeSchema } from "../core/schemas.ts";
import type { ThemeSource, ContentSource, ConfigOverrides, ProjectInputs } from "../core/types.ts";

export async function readConfig(root: string): Promise<unknown> {
  const imported: unknown = await import(
    `${pathToFileURL(resolve(root, "site.config.mjs")).href}?load=${Date.now()}-${Math.random()}`
  );
  if (!imported || typeof imported !== "object" || !("default" in imported))
    throw Error("Expected a default configuration export");
  return imported.default;
}

export async function readTree(root: string, prefix = ""): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) {
      for (const [key, value] of await readTree(root, path + "/")) files.set(key, value);
    } else files.set(path, await readFile(resolve(root, path)));
  }
  return files;
}

async function readAssets(root: string, prefix = ""): Promise<Map<string, Uint8Array>> {
  if (!prefix) {
    const entry = await lstat(root);
    if (entry.isSymbolicLink() || !entry.isDirectory())
      throw Error("Public root must be a real directory; symlinks are unsupported");
  }
  const files = new Map<string, Uint8Array>();
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix + entry.name;
    const info = await lstat(resolve(root, path));
    if (info.isSymbolicLink()) throw Error(`Public symlinks are unsupported: ${path}`);
    if (info.isDirectory()) {
      for (const [key, value] of await readAssets(root, path + "/")) files.set(key, value);
    } else if (info.isFile()) files.set(path, await readFile(resolve(root, path)));
    else throw Error(`Public assets must be regular files: ${path}`);
  }
  return files;
}

async function readSources(root: string): Promise<readonly ContentSource[]> {
  const sources: ContentSource[] = [];
  for (const kind of ["post", "page"] as const) {
    const dir = resolve(root, "content", kind === "post" ? "blog" : "pages");
    const info = await lstat(dir);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw Error(`${dir}: Content must be a real directory; symlinks are unsupported`);
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (entry.name === "_drafts") continue;
      const file = resolve(dir, entry.name);
      if ((await lstat(file)).isSymbolicLink())
        throw Error(`${file}: Content symlinks are unsupported`);
      if (!entry.isFile() || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.name))
        throw Error(`${file}: Expected a lowercase hyphenated Markdown filename`);
      sources.push({
        file,
        slug: entry.name.slice(0, -3),
        kind,
        source: await readFile(file, "utf8"),
      });
    }
  }
  return sources;
}

export async function readTheme(root: string, rawConfig: unknown): Promise<ThemeSource> {
  const selected =
    rawConfig && typeof rawConfig === "object" && "theme" in rawConfig
      ? rawConfig.theme
      : undefined;
  const result = v.safeParse(ConfigThemeSchema, selected);
  if (!result.success)
    throw Error(
      `Invalid configuration theme: ${result.issues.map((issue) => issue.message).join("; ")}`,
    );
  const id = result.output;
  const themesRoot = resolve(root, "themes");
  const themeRoot = resolve(themesRoot, id);
  for (const path of [themesRoot, themeRoot]) {
    const info = await lstat(path).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        throw Error(`Theme "${id}" is missing: expected ${themeRoot}/tokens.css and theme.css`);
      throw error;
    });
    if (info.isSymbolicLink() || !info.isDirectory())
      throw Error(`Theme directories must be real directories; symlinks are unsupported: ${path}`);
  }
  async function stylesheet(name: string): Promise<string> {
    const path = resolve(themeRoot, name);
    const info = await lstat(path).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        throw Error(`Theme "${id}" is missing required stylesheet ${name}`);
      throw error;
    });
    if (info.isSymbolicLink() || !info.isFile())
      throw Error(`Theme stylesheets must be regular files; symlinks are unsupported: ${path}`);
    return readFile(path, "utf8");
  }
  return { id, tokensCss: await stylesheet("tokens.css"), themeCss: await stylesheet("theme.css") };
}

export async function readProject(root: string, env: ConfigOverrides = {}): Promise<ProjectInputs> {
  const config = await readConfig(root);
  const theme = await readTheme(root, config);
  return {
    config,
    theme,
    env,
    sources: await readSources(root),
    assets: await readAssets(resolve(root, "public")),
  };
}
