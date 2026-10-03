import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function literal(value: unknown): string | undefined {
  return record(value) && typeof value.value === "string" ? value.value : undefined;
}
function within(path: string, root: string): boolean {
  return path === root || path.startsWith(root + sep);
}
export function checkSource(path: string, source: string, root = projectRoot): void {
  const core = within(path, resolve(root, "src/core"));
  const browser = within(path, resolve(root, "public/assets"));
  const parsed = parseSync(path, source);
  if (parsed.errors.length) throw Error(`${path}: Invalid syntax`);
  function dependency(specifier: string): void {
    if (specifier.startsWith(".")) {
      const target = resolve(dirname(path), specifier);
      if (core && !within(target, resolve(root, "src/core")))
        throw Error(`${path}: Core cannot import outside core: ${specifier}`);
      if (browser && !within(target, resolve(root, "public/assets")))
        throw Error(`${path}: Browser cannot import tooling: ${specifier}`);
      return;
    }
    if (
      core &&
      ![
        "valibot",
        "node:path",
        "image-size",
        "highlight.js/lib/core",
        ...["javascript", "typescript", "xml", "css", "json", "bash"].map(
          (name) => `highlight.js/lib/languages/${name}`,
        ),
      ].includes(specifier)
    )
      throw Error(`${path}: Core dependency is not pure or approved: ${specifier}`);
    if (browser) throw Error(`${path}: Browser package dependency: ${specifier}`);
  }
  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      for (const child of value) walk(child);
      return;
    }
    if (!record(value)) return;
    if (
      ["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(
        String(value.type),
      )
    ) {
      const specifier = literal(value.source);
      if (specifier !== undefined) dependency(specifier);
      if (core && specifier === "node:path") {
        if (
          value.type !== "ImportDeclaration" ||
          !Array.isArray(value.specifiers) ||
          value.specifiers.some(
            (spec) =>
              !record(spec) ||
              spec.type !== "ImportSpecifier" ||
              !record(spec.imported) ||
              spec.imported.name !== "posix" ||
              !record(spec.local) ||
              spec.local.name !== "posix",
          )
        )
          throw Error(`${path}: Core may import only posix from node:path`);
      }
    }
    if (value.type === "ImportExpression") {
      const specifier = literal(value.source);
      if (core) throw Error(`${path}: Core dynamic imports are unsupported`);
      if (specifier !== undefined) dependency(specifier);
      else if (browser) throw Error(`${path}: Dynamic dependency must be a literal`);
    }
    if (core || browser) {
      if (
        value.type === "CallExpression" &&
        record(value.callee) &&
        value.callee.type === "Identifier" &&
        ["require", "eval"].includes(String(value.callee.name))
      )
        throw Error(`${path}: Dynamic code or require is unsupported`);
    }
    if (core) {
      if (
        value.type === "Identifier" &&
        [
          "process",
          "console",
          "globalThis",
          "fetch",
          "setTimeout",
          "setInterval",
          "window",
          "document",
          "navigator",
          "performance",
        ].includes(String(value.name))
      )
        throw Error(`${path}: Core cannot use effectful global ${value.name}`);
      if (value.type === "MemberExpression" && record(value.object) && record(value.property)) {
        const owner = value.object.name;
        const member = value.computed ? literal(value.property) : value.property.name;
        if (owner === "posix" && !["normalize", "join", "dirname"].includes(String(member)))
          throw Error(`${path}: Core path operation can read ambient state or is unapproved`);
        if ((owner === "Date" && member === "now") || (owner === "Math" && member === "random"))
          throw Error(`${path}: Core cannot read ambient time or randomness`);
      }
      if (value.type === "CallExpression" && record(value.callee) && value.callee.name === "Date")
        throw Error(`${path}: Core cannot read ambient time`);
      if (
        value.type === "NewExpression" &&
        record(value.callee) &&
        value.callee.name === "Date" &&
        Array.isArray(value.arguments) &&
        value.arguments.length === 0
      )
        throw Error(`${path}: Core cannot read ambient time`);
    }
    for (const child of Object.values(value)) walk(child);
  }
  walk(parsed.program);
}
export async function checkPolicy(root = projectRoot): Promise<void> {
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!/\.(?:[cm]?js|ts|css)$/.test(entry.name) || entry.name.endsWith(".d.ts")) continue;
      const source = await readFile(path, "utf8");
      if (entry.name.endsWith(".css")) {
        if (
          entry.name !== "tokens.css" &&
          /(?:#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)\()/i.test(source)
        )
          throw Error(`${relative(root, path)}: Define colors in tokens.css`);
      } else checkSource(path, source, root);
    }
  }
  for (const directory of ["src", "scripts", "public/assets", "themes"])
    await visit(resolve(root, directory));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkPolicy();
  console.log("Core/shell boundaries, browser imports and semantic color policy passed");
}
