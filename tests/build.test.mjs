import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, rm, cp, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { build, projectRoot } from "../scripts/build.mjs";
import { fixture } from "./fixtures/site.mjs";
import { readTree, validate } from "../lib/validate.mjs";
async function setup(t, options) {
  const f = await fixture(options);
  t.after(() => rm(f.root, { recursive: true, force: true }));
  return f;
}
for (const base of ["/", "/people/alex/"])
  for (const count of [0, 1, 23])
    test(`custom owner, ${count} posts, ${base}`, async (t) => {
      const f = await setup(t, { count, base, name: "Another Publication" });
      const result = await build({ root: f.root, env: {} });
      const files = await readTree(result.out);
      assert.equal(result.articles, count);
      validate(files, base, "https://journal.example");
      const all = [...files]
        .filter(([p]) => !/\.(woff2)$/.test(p))
        .map(([, b]) => String(b))
        .join("\n");
      for (const forbidden of [
        "Fieldnotes",
        "PRIVATE_DIRECTORY_SENTINEL",
        "PRIVATE_TITLE_SENTINEL",
        "PRIVATE_METADATA_SENTINEL",
        "PRIVATE_BODY_SENTINEL",
        "a-place-for-your-words",
        "the-shape-of-a-note",
      ])
        assert.ok(!all.includes(forbidden), forbidden);
      assert.match(String(files.get("index.html")), /Another Publication/);
      assert.equal(files.has("archive/page/3/index.html"), count === 23);
      const archives = [...files].filter(([p]) => /^archive\/(?:page\/\d+\/)?index.html$/.test(p));
      const routes = archives.flatMap(([, b]) =>
        [...String(b).matchAll(/class="post-row" href="([^"]+)"/g)].map((m) => m[1]),
      );
      assert.equal(routes.length, count);
      assert.equal(new Set(routes).size, count);
      const next = await build({ root: f.root, env: {} });
      assert.equal(next.digest, result.digest);
    });
test("invalid content, failed writes, asset collision and symlinks retain last publication", async (t) => {
  const f = await setup(t, { count: 1 });
  const first = await build({ root: f.root, env: {} });
  const before = await readFile(resolve(first.out, "index.html"), "utf8");
  await assert.rejects(
    build({
      root: f.root,
      env: {},
      beforePromote: async (stage) => {
        await writeFile(resolve(stage, "partial"), "partial");
        throw Error("simulated write failure");
      },
    }),
    /simulated/,
  );
  assert.equal(await readFile(resolve(first.out, "index.html"), "utf8"), before);
  const path = resolve(f.root, "content/blog/note-01.md");
  const content = await readFile(path, "utf8");
  await writeFile(path, content + "\n[Bad](/missing/)");
  await assert.rejects(build({ root: f.root, env: {} }), /Missing local/);
  await writeFile(path, content);
  await writeFile(resolve(f.root, "public/index.html"), "collision");
  await assert.rejects(build({ root: f.root, env: {} }), /collides/);
  await rm(resolve(f.root, "public/index.html"));
  await symlink("/etc", resolve(f.root, "public/outside"));
  await assert.rejects(build({ root: f.root, env: {} }), /symlinks/);
  assert.equal(await readFile(resolve(first.out, "index.html"), "utf8"), before);
  await assert.rejects(build({ root: f.root, out: f.root, env: {} }), /overlaps/);
});
test("copied project builds without node_modules or package resolution", async (t) => {
  const f = await setup(t, { count: 1 });
  for (const dir of ["lib", "templates", "scripts"])
    await cp(resolve(projectRoot, dir), resolve(f.root, dir), { recursive: true });
  const result = spawnSync(process.execPath, ["scripts/build.mjs"], {
    cwd: f.root,
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(resolve(f.root, "dist/index.html"), "utf8"), /Fixture Journal/);
});
test("reserved routes and configuration errors are actionable", async (t) => {
  const f = await setup(t, { count: 1 });
  await writeFile(
    resolve(f.root, "site.config.mjs"),
    `export default ${JSON.stringify({ ...f.config, unknown: true })}`,
  );
  await assert.rejects(build({ root: f.root, env: {} }), /Unknown configuration/);
  await writeFile(
    resolve(f.root, "site.config.mjs"),
    `export default ${JSON.stringify({ ...f.config, featuredSlug: "missing" })}`,
  );
  await assert.rejects(build({ root: f.root, env: {} }), /featuredSlug/);
  await writeFile(resolve(f.root, "site.config.mjs"), `export default ${JSON.stringify(f.config)}`);
  await cp(resolve(f.root, "content/pages/about.md"), resolve(f.root, "content/pages/archive.md"));
  await assert.rejects(build({ root: f.root, env: {} }), /Reserved/);
});

test("promotion failure restores directory and manifest; source-file output is refused", async (t) => {
  const f = await setup(t, { count: 1 });
  const first = await build({ root: f.root, env: {} });
  const before = await readFile(resolve(first.out, "index.html"), "utf8");
  const manifest = await readFile(resolve(f.root, ".preview/build.json"), "utf8");
  await assert.rejects(
    build({ root: f.root, env: {}, beforePromote: (stage) => rm(stage, { recursive: true }) }),
  );
  assert.equal(await readFile(resolve(first.out, "index.html"), "utf8"), before);
  assert.equal(await readFile(resolve(f.root, ".preview/build.json"), "utf8"), manifest);
  await assert.rejects(
    build({ root: f.root, out: resolve(f.root, "site.config.mjs"), env: {} }),
    /overlaps/,
  );
});
test("future publication, featured home placement, chronology and optional article sections", async (t) => {
  const f = await setup(t, { count: 3 });
  const path = resolve(f.root, "content/blog/note-01.md");
  await writeFile(
    path,
    (await readFile(path, "utf8")).replace("date: 2026-09-01", "date: 2099-01-01"),
  );
  await writeFile(
    resolve(f.root, "site.config.mjs"),
    `export default ${JSON.stringify({ ...f.config, featuredSlug: "note-02", postsPerPage: 1, article: { contents: false, related: false } })}`,
  );
  const result = await build({ root: f.root, env: {} });
  const files = await readTree(result.out);
  const home = String(files.get("index.html"));
  assert.match(home, /class="post-row" href="\/blog\/note-02\//);
  assert.equal([...home.matchAll(/class="post-row"/g)].length, 1);
  const rss = String(files.get("rss.xml"));
  assert.ok(rss.indexOf("note-01") < rss.indexOf("note-03"));
  const article = String(files.get("blog/note-03/index.html"));
  assert.ok(!article.includes("Table of contents"));
  assert.ok(!article.includes("Keep exploring"));
  assert.match(article, /Newer: Fixture note 01/);
  assert.match(article, /Older: Fixture note 02/);
});
