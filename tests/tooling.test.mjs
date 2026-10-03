import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "../scripts/build.mjs";
test("checked JavaScript rejects type errors in Node and browser environments", async (t) => {
  const dir = await mkdtemp(resolve(tmpdir(), "native-types-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [env, code] of [
    ["node", "import { readFile } from 'node:fs/promises'; await readFile(42);"],
    ["browser", "document.title = 42;"],
  ]) {
    const file = resolve(dir, `${env}.mjs`);
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
