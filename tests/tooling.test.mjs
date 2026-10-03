import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "../scripts/build.ts";
test("TypeScript tooling and checked browser JavaScript reject type errors", async (t) => {
  const dir = await mkdtemp(resolve(tmpdir(), "native-types-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [env, code] of [
    ["node", "import { readFile } from 'node:fs/promises'; await readFile(42);"],
    ["browser", "document.title = 42;"],
  ]) {
    const file = resolve(dir, `${env}.${env === "node" ? "ts" : "mjs"}`);
    await writeFile(file, code);
    const config = JSON.parse(
      await (
        await import("node:fs/promises")
      ).readFile(resolve(projectRoot, `tsconfig.${env}.json`), "utf8"),
    );
    config.include = [file];
    config.compilerOptions.typeRoots = [resolve(projectRoot, "node_modules/@types")];
    await writeFile(resolve(dir, "tsconfig.json"), JSON.stringify(config));
    const result = spawnSync(
      resolve(projectRoot, "node_modules/.bin/tsc"),
      ["-p", resolve(dir, "tsconfig.json")],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /TS(?:2322|2769|2345)/);
  }
});

test("domain types reject drafts in published state, mutation and unchecked results", async (t) => {
  const dir = await mkdtemp(resolve(tmpdir(), "native-domain-types-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const model = resolve(projectRoot, "src/core/types.ts");
  for (const [name, source, diagnostic] of [
    [
      "draft",
      `import type { PublishedPost } from ${JSON.stringify(model)}; const draft: PublishedPost["draft"] = true;`,
      /TS2322/,
    ],
    [
      "mutation",
      `import type { Publication } from ${JSON.stringify(model)}; declare const publication: Publication; publication.posts.push(publication.posts[0]);`,
      /TS2339/,
    ],
    [
      "result",
      `import type { Result } from ${JSON.stringify(model)}; declare const result: Result<string>; console.log(result.value);`,
      /TS2339/,
    ],
  ]) {
    const file = resolve(dir, `${name}.mts`);
    await writeFile(file, source);
    const config = {
      extends: resolve(projectRoot, "tsconfig.node.json"),
      include: [file],
      compilerOptions: { typeRoots: [resolve(projectRoot, "node_modules/@types")] },
    };
    await writeFile(resolve(dir, "tsconfig.json"), JSON.stringify(config));
    const result = spawnSync(
      resolve(projectRoot, "node_modules/.bin/tsc"),
      ["-p", resolve(dir, "tsconfig.json")],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0, name);
    assert.match(result.stdout + result.stderr, diagnostic, name);
  }
});
