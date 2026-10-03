import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fixture } from "./fixtures/site.mjs";
import { projectRoot } from "../scripts/build.mjs";
async function eventually(check) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await delay(50);
  }
  throw Error("Expected process outcome did not arrive");
}
test("developer loop reloads configuration, retains last good build and fails an invalid clean start", async (t) => {
  const f = await fixture({ count: 1 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  for (const dir of ["lib", "templates", "scripts"])
    await cp(resolve(projectRoot, dir), resolve(f.root, dir), { recursive: true });
  const child = spawn(process.execPath, ["scripts/dev.mjs"], {
    cwd: f.root,
    env: { PATH: process.env.PATH, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (b) => {
    log += b;
  });
  child.stderr.on("data", (b) => {
    log += b;
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise((ok) => child.once("exit", ok));
    }
  });
  await eventually(() => Promise.resolve(log.includes("Watching.")));
  const origin = log.match(/Preview: (http:\/\/127.0.0.1:\d+)/)[1];
  assert.equal((await fetch(origin)).status, 200);
  const post = resolve(f.root, "content/blog/note-01.md");
  const source = await readFile(post, "utf8");
  await writeFile(post, source + "\n[Bad](/missing/)");
  await eventually(() => Promise.resolve(log.includes("Missing local destination")));
  assert.equal((await fetch(origin)).status, 200);
  await writeFile(post, source);
  await writeFile(
    resolve(f.root, "site.config.mjs"),
    `export default ${JSON.stringify({ ...f.config, name: "Changed by author", basePath: "/new/" })}`,
  );
  await eventually(async () => {
    try {
      return (await fetch(origin + "/new/")).status === 200;
    } catch {
      return false;
    }
  });
  assert.match(await (await fetch(origin + "/new/")).text(), /Changed by author/);
  assert.equal((await fetch(origin + "/")).status, 404);
  child.kill();
  await new Promise((ok) => child.once("exit", ok));
  await writeFile(post, "invalid frontmatter");
  const invalid = spawnSync(process.execPath, ["scripts/dev.mjs"], {
    cwd: f.root,
    encoding: "utf8",
    timeout: 5000,
    env: { PATH: process.env.PATH, PORT: "0" },
  });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /Initial build failed/);
});
test("new-post creates a private draft and refuses overwrite", async (t) => {
  const f = await fixture({ count: 0 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  for (const dir of ["lib", "templates", "scripts"])
    await cp(resolve(projectRoot, dir), resolve(f.root, dir), { recursive: true });
  const run = () =>
    spawnSync(process.execPath, ["scripts/new-post.mjs", "a-new-note"], {
      cwd: f.root,
      encoding: "utf8",
    });
  assert.equal(run().status, 0);
  const path = resolve(f.root, "content/blog/a-new-note.md");
  const first = await readFile(path, "utf8");
  assert.match(first, /draft: true/);
  assert.match(first, /author: Taylor Chen/);
  assert.notEqual(run().status, 0);
  assert.equal(await readFile(path, "utf8"), first);
});
