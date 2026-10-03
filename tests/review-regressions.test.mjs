import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, readFile, writeFile, rm, rename, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fixture } from "./fixtures/site.mjs";
import { build, projectRoot } from "../scripts/build.ts";
import { readTree } from "../src/shell/read-project.ts";
async function eventually(check, message) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await delay(50);
  }
  throw Error(message);
}

test("rejects a symlinked public root without changing the previous publication", async (t) => {
  const f = await fixture({ count: 1 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const first = await build({ root: f.root, env: {} });
  const previous = await readTree(first.out);
  const manifest = await readFile(resolve(f.root, ".preview/build.json"), "utf8");
  await rename(resolve(f.root, "public"), resolve(f.root, "shared-assets"));
  await writeFile(resolve(f.root, "shared-assets/private.txt"), "DO_NOT_PUBLISH");
  await symlink(resolve(f.root, "shared-assets"), resolve(f.root, "public"));
  await assert.rejects(build({ root: f.root, env: {} }), /symlink/i);
  assert.deepEqual(await readTree(first.out), previous);
  assert.equal(await readFile(resolve(f.root, ".preview/build.json"), "utf8"), manifest);
});

test("consecutive atomic config saves update identity and serving prefixes", async (t) => {
  const f = await fixture({ count: 1 });
  let child;
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise((ok) => child.once("exit", ok));
    }
    await rm(f.root, { recursive: true, force: true });
  });
  for (const dir of ["src", "scripts"])
    await cp(resolve(projectRoot, dir), resolve(f.root, dir), { recursive: true });
  child = spawn(process.execPath, ["scripts/dev.ts"], {
    cwd: f.root,
    env: { PATH: process.env.PATH, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (bytes) => {
    log += bytes;
  });
  child.stderr.on("data", (bytes) => {
    log += bytes;
  });
  await eventually(() => log.includes("Watching."), "Development server did not start");
  const origin = log.match(/Preview: (http:\/\/127.0.0.1:\d+)/)[1];
  for (const [name, basePath] of [
    ["First identity", "/first/"],
    ["Second identity", "/second/"],
    ["Final identity", "/final/"],
  ]) {
    const temp = resolve(f.root, "site.config.pending");
    await writeFile(temp, `export default ${JSON.stringify({ ...f.config, name, basePath })}`);
    await rename(temp, resolve(f.root, "site.config.mjs"));
    await eventually(async () => {
      try {
        const response = await fetch(origin + basePath);
        return response.ok && (await response.text()).includes(name);
      } catch {
        return false;
      }
    }, `Atomic save did not publish ${name}`);
  }
  assert.equal((await fetch(origin + "/first/")).status, 404);
  assert.equal((await fetch(origin + "/second/")).status, 404);
  const before = log.match(/Built /g).length;
  await writeFile(resolve(f.root, "unrelated.txt"), "Not an input");
  await delay(350);
  assert.equal(log.match(/Built /g).length, before);
});
