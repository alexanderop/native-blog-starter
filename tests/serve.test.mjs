import { test } from "node:test";
import assert from "node:assert/strict";
import { rm, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fixture } from "./fixtures/site.mjs";
import { build } from "../scripts/build.mjs";
import { serve } from "../scripts/serve.mjs";
test("preview serves the declared base, HEAD and MIME, refusing escapes and writes", async (t) => {
  const f = await fixture({ count: 1, base: "/nested/blog/" });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const result = await build({ root: f.root, env: {} });
  const server = await serve({ root: result.out, base: result.base, port: 0 });
  t.after(() => new Promise((ok) => server.close(ok)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(origin + "/nested/blog/")).status, 200);
  const head = await fetch(origin + "/nested/blog/assets/app.js", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.match(head.headers.get("content-type"), /javascript/);
  assert.equal(await head.text(), "");
  assert.equal((await fetch(origin + "/nested/blog/", { method: "POST" })).status, 405);
  for (const path of ["/", "/nested/blog/%2e%2e%2fsite.config.mjs", "/nested/blog/absent/"])
    assert.equal((await fetch(origin + path)).status, 404);
  await symlink(resolve(f.root, "site.config.mjs"), resolve(result.out, "escape.txt"));
  assert.equal((await fetch(origin + "/nested/blog/escape.txt")).status, 404);
});
