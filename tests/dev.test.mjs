import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fixture } from "./fixtures/site.mjs";
import { projectRoot } from "../scripts/build.ts";
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
  for (const dir of ["src", "scripts"])
    await cp(resolve(projectRoot, dir), resolve(f.root, dir), { recursive: true });
  const child = spawn(process.execPath, ["scripts/dev.ts"], {
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
  const lastGood = await (await fetch(origin + "/new/")).text();
  await writeFile(post, source + "\n- ");
  await eventually(() => Promise.resolve(log.includes("Invalid list item")));
  assert.equal(await (await fetch(origin + "/new/")).text(), lastGood);
  const buildsBeforeRepair = log.match(/Built /g).length;
  await writeFile(post, source + "\nRecovered publication.");
  await eventually(() => Promise.resolve(log.match(/Built /g).length > buildsBeforeRepair));
  assert.match(
    await readFile(resolve(f.root, "dist/blog/note-01/index.html"), "utf8"),
    /Recovered publication/,
  );

  const tokens = resolve(f.root, "themes/editorial/tokens.css");
  await writeFile(
    tokens,
    (await readFile(tokens, "utf8")) + "\n:root { --theme-probe: updated; }\n",
  );
  await eventually(async () =>
    (await (await fetch(origin + "/new/assets/tokens.css")).text()).includes("--theme-probe"),
  );
  await writeFile(
    resolve(f.root, "site.config.mjs"),
    `export default ${JSON.stringify({ ...f.config, basePath: "/new/", theme: "minimal" })}`,
  );
  await eventually(async () =>
    (await (await fetch(origin + "/new/")).text()).includes('data-design-theme="minimal"'),
  );
  child.kill();
  await new Promise((ok) => child.once("exit", ok));
  await writeFile(post, "invalid frontmatter");
  const invalid = spawnSync(process.execPath, ["scripts/dev.ts"], {
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
  for (const dir of ["src", "scripts"])
    await cp(resolve(projectRoot, dir), resolve(f.root, dir), { recursive: true });
  const run = () =>
    spawnSync(process.execPath, ["scripts/new-post.ts", "a-new-note"], {
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

test("draft development serves and rebuilds only its isolated preview", async (t) => {
  const f = await fixture({ count: 1, base: "/journal/" });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  for (const dir of ["src", "scripts"])
    await cp(resolve(projectRoot, dir), resolve(f.root, dir), { recursive: true });
  const production = spawnSync(process.execPath, ["scripts/build.ts"], {
    cwd: f.root,
    encoding: "utf8",
  });
  assert.equal(production.status, 0, production.stderr);
  const before = await readFile(resolve(f.root, ".preview/build.json"), "utf8");
  const child = spawn(process.execPath, ["scripts/dev.ts", "--drafts"], {
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
  await eventually(() => log.includes("Watching."));
  const origin = log.match(/Preview: (http:\/\/127.0.0.1:\d+)/)[1];
  const response = await fetch(origin + "/journal/drafts/");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(await response.text(), /PRIVATE_TITLE_SENTINEL/);
  const post = resolve(f.root, "content/blog/secret.md");
  await writeFile(post, (await readFile(post, "utf8")) + "\n\nDraft revision visible.");
  await eventually(async () =>
    (await (await fetch(origin + "/journal/blog/secret/")).text()).includes(
      "Draft revision visible.",
    ),
  );
  await writeFile(
    resolve(f.root, "site.config.mjs"),
    `export default ${JSON.stringify({ ...f.config, basePath: "/new/" })}`,
  );
  await eventually(async () => {
    try {
      return (await fetch(origin + "/new/drafts/")).status === 200;
    } catch {
      return false;
    }
  });
  assert.equal((await fetch(origin + "/journal/drafts/")).status, 404);
  assert.equal(await readFile(resolve(f.root, ".preview/build.json"), "utf8"), before);
  await assert.rejects(readFile(resolve(f.root, "dist/blog/secret/index.html")), {
    code: "ENOENT",
  });
});
