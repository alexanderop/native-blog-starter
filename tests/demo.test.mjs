import { test } from "node:test";
import assert from "node:assert/strict";
import { rm, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fixture } from "./fixtures/site.mjs";
import { buildDemo } from "../scripts/build-demo.ts";
import { readTree } from "../src/shell/read-project.ts";
for (const base of ["/", "/native-blog-starter/"]) {
  test(`demo publishes two posts with route-preserving theme links at ${base}`, async (t) => {
    const f = await fixture({ count: 2, base });
    t.after(() => rm(f.root, { recursive: true, force: true }));
    const result = await buildDemo({ root: f.root, env: {} });
    assert.equal(result.articles, 2);
    const files = await readTree(result.out);
    for (const prefix of ["", "themes/minimal/", "themes/paper/"]) {
      const home = String(files.get(prefix + "index.html"));
      assert.equal([...home.matchAll(/class="post-row"/g)].length, 2);
      const article = String(files.get(prefix + "blog/note-02/index.html"));
      for (const target of ["", "themes/minimal/", "themes/paper/"])
        assert.ok(article.includes(`href="${base}${target}blog/note-02/"`));
      assert.ok(article.includes(`href="${base}assets/demo.css"`));
      const rss = String(files.get(prefix + "rss.xml"));
      assert.equal([...rss.matchAll(/<item>/g)].length, 2);
    }
    const published = [...files.values()].map(String).join("\n");
    assert.ok(!published.includes("PRIVATE_TITLE_SENTINEL"));
    assert.ok(!published.includes("PRIVATE_DIRECTORY_SENTINEL"));
    assert.ok(!published.includes("node_modules"));
    const first = await readTree(result.out);
    await writeFile(resolve(f.root, "public/assets/demo.css"), "collision");
    await assert.rejects(buildDemo({ root: f.root, env: {} }), /collision/);
    assert.deepEqual(await readTree(result.out), first);
    assert.match(await readFile(resolve(f.root, ".preview/build.json"), "utf8"), /"articles":2/);
  });
}
