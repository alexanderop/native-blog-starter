import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile, rm, rename, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fixture } from "./fixtures/site.mjs";
import { build } from "../scripts/build.ts";
import { readTree } from "../src/shell/read-project.ts";

async function setup(t, options) {
  const f = await fixture({ count: 1, ...options });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  return f;
}
async function configure(f, theme) {
  await writeFile(
    resolve(f.root, "site.config.mjs"),
    `export default ${JSON.stringify({ ...f.config, theme })}`,
  );
}
for (const theme of ["editorial", "minimal", "paper"])
  for (const base of ["/", "/people/alex/"])
    test(`${theme} publishes selected local CSS at ${base}`, async (t) => {
      const f = await setup(t, { theme, base });
      const result = await build({ root: f.root, env: {} });
      const files = await readTree(result.out);
      assert.equal(
        String(files.get("assets/tokens.css")),
        await readFile(resolve(f.root, "themes", theme, "tokens.css"), "utf8"),
      );
      assert.equal(
        String(files.get("assets/theme.css")),
        await readFile(resolve(f.root, "themes", theme, "theme.css"), "utf8"),
      );
      for (const [path, bytes] of files) {
        assert.ok(!path.startsWith("themes/"));
        if (!path.endsWith(".html")) continue;
        const html = String(bytes);
        assert.ok(html.includes(`data-design-theme="${theme}"`), path);
        assert.ok(html.includes(`href="${base}assets/theme.css"`), path);
        assert.ok(
          html.indexOf(`${base}assets/base.css`) < html.indexOf(`${base}assets/theme.css`),
          path,
        );
      }
    });

test("custom local themes need no registry and inactive broken themes are ignored", async (t) => {
  const f = await setup(t);
  await mkdir(resolve(f.root, "themes/unused"));
  await writeFile(resolve(f.root, "themes/unused/theme.css"), "UNUSED_THEME_SENTINEL");
  await cp(resolve(f.root, "themes/editorial"), resolve(f.root, "themes/my-journal"), {
    recursive: true,
  });
  await writeFile(
    resolve(f.root, "themes/my-journal/theme.css"),
    ':root { --custom-layout: "CUSTOM_THEME_SENTINEL"; }',
  );
  await configure(f, "my-journal");
  const result = await build({ root: f.root, env: {} });
  const files = await readTree(result.out);
  assert.match(String(files.get("assets/theme.css")), /CUSTOM_THEME_SENTINEL/);
  assert.ok(![...files.values()].some((bytes) => String(bytes).includes("UNUSED_THEME_SENTINEL")));
  await configure(f, undefined);
  await build({ root: f.root, env: {} });
  assert.match(
    await readFile(resolve(result.out, "index.html"), "utf8"),
    /data-design-theme="editorial"/,
  );
});

test("invalid theme selections, missing CSS and asset collisions preserve the publication", async (t) => {
  const f = await setup(t);
  const first = await build({ root: f.root, env: {} });
  const before = await readTree(first.out);
  const manifest = await readFile(resolve(f.root, ".preview/build.json"), "utf8");
  for (const theme of ["../outside", "/absolute", "unknown-theme", "Paper", ""]) {
    await configure(f, theme);
    await assert.rejects(build({ root: f.root, env: {} }), /[Tt]heme/);
    assert.deepEqual(await readTree(first.out), before);
  }
  await configure(f, "editorial");
  const tokens = resolve(f.root, "themes/editorial/tokens.css");
  const original = await readFile(tokens);
  await rm(tokens);
  await assert.rejects(build({ root: f.root, env: {} }), /missing required stylesheet/);
  await writeFile(tokens, original);
  await writeFile(resolve(f.root, "public/assets/theme.css"), "collision");
  await assert.rejects(build({ root: f.root, env: {} }), /collides/);
  assert.deepEqual(await readTree(first.out), before);
  assert.equal(await readFile(resolve(f.root, ".preview/build.json"), "utf8"), manifest);
});

test("theme directory and stylesheet symlinks are rejected before publication", async (t) => {
  const f = await setup(t);
  const first = await build({ root: f.root, env: {} });
  const before = await readTree(first.out);
  for (const path of ["themes/editorial/theme.css", "themes/editorial", "themes"]) {
    const target = resolve(f.root, path);
    const moved = resolve(f.root, "saved-theme");
    await rename(target, moved);
    await symlink(moved, target);
    try {
      await assert.rejects(build({ root: f.root, env: {} }), /symlinks/);
      assert.deepEqual(await readTree(first.out), before);
    } finally {
      await rm(target);
      await rename(moved, target);
    }
  }
});
