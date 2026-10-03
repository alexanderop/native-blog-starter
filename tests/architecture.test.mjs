import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkSource, checkPolicy } from "../scripts/check-policy.ts";

test("core rejects effectful imports, escapes and ambient effects", () => {
  const root = resolve("/test-project");
  const file = resolve(root, "src/core/nested/content.ts");
  for (const source of [
    'import "node:fs";',
    'export { readFile } from "node:fs/promises";',
    'const module = import("node:http");',
    'import { load } from "../../shell/read-project.ts";',
    'import { load } from "../../../scripts/build.ts";',
    "const module = import(target);",
    'const file = require("node:fs");',
    'console.log("side effect");',
    "const env = process.env;",
    "const now = Date.now();",
    "const now = Date();",
    'import { resolve } from "node:path"; resolve("relative");',
    'import { posix } from "node:path"; posix.resolve("relative");',
    'import { posix } from "node:path"; posix.relative("a", "b");',
    "const now = new Date();",
    "const random = Math.random();",
    'fetch("https://example.test");',
  ])
    assert.throws(() => checkSource(file, source, root), undefined, source);
  checkSource(
    file,
    'import * as v from "valibot"; import { parse } from "../content.ts"; const date = new Date("2026-10-03");',
    root,
  );
  checkSource(file, 'import { posix } from "node:path"; posix.join("a", "b");', root);
  checkSource(file, '// import "node:fs";\nconst prose = \'import "node:fs"\';', root);
});

test("browser rejects packages and tooling while shell may perform IO", () => {
  const root = resolve("/test-project");
  const file = resolve(root, "public/assets/search.js");
  for (const source of [
    'import "valibot";',
    'export * from "../../src/core/content.ts";',
    'import("node:fs")',
  ])
    assert.throws(() => checkSource(file, source, root));
  checkSource(file, 'import { open } from "./dialog.js";', root);
  checkSource(
    resolve(root, "src/shell/read-project.ts"),
    'import { readFile } from "node:fs/promises";',
    root,
  );
});

test("policy discovers violations in nested core directories", async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), "blog-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ["src/core/deep", "scripts", "public/assets", "themes"])
    await mkdir(resolve(root, dir), { recursive: true });
  await writeFile(resolve(root, "src/core/deep/escape.ts"), 'import "node:fs";');
  await assert.rejects(checkPolicy(root), /Core dependency/);
});
