import { test } from "node:test";
import assert from "node:assert/strict";
import { rm, readFile, writeFile, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fixture } from "./fixtures/site.mjs";
import { build } from "../scripts/build.ts";
import { readTree } from "../src/shell/read-project.ts";
import { parseContent } from "../src/core/content.ts";
import { markdown } from "../src/core/markdown.ts";
import { highlight } from "../src/core/highlight.ts";

const source =
  "---\ntitle: A\ndescription: B\ndate: 2026-10-03\ncategory: Notes\ndraft: false\n---\nBody";
test("publication requires explicit draft status and validates update chronology", () => {
  assert.throws(
    () => parseContent(source.replace("draft: false\n", ""), "post.md", "A"),
    /Missing draft/,
  );
  assert.equal(parseContent(source, "post.md", "A").draft, false);
  for (const updated of ["2026-02-30", "2026-10-02", "tomorrow"])
    assert.throws(
      () =>
        parseContent(
          source.replace("draft: false", `draft: false\nupdated: ${updated}`),
          "post.md",
          "A",
        ),
      /Invalid date|must not precede/,
    );
  const valid = parseContent(
    source.replace("draft: false", "draft: true\nupdated: 2026-10-04"),
    "post.md",
    "A",
  );
  assert.equal(valid.updated, "2026-10-04");
  assert.equal(valid.draft, true);
});

test("updated dates survive downloads and appear in the article and sitemap without reordering feeds", async (t) => {
  const f = await fixture({ count: 2 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const path = resolve(f.root, "content/blog/note-01.md");
  await writeFile(
    path,
    (await readFile(path, "utf8")).replace("draft: false", "draft: false\nupdated: 2026-10-03"),
  );
  const { out } = await build({ root: f.root, env: {} });
  const html = await readFile(resolve(out, "blog/note-01/index.html"), "utf8");
  assert.match(html, /Updated <time datetime="2026-10-03">2026-10-03<\/time>/);
  const downloaded = parseContent(
    await readFile(resolve(out, "markdown/note-01.md"), "utf8"),
    "download.md",
    "Fallback",
  );
  assert.equal(downloaded.updated, "2026-10-03");
  assert.equal(downloaded.date, "2026-09-01");
  assert.equal(downloaded.draft, false);
  assert.match(
    await readFile(resolve(out, "sitemap.xml"), "utf8"),
    /note-01\/<\/loc><lastmod>2026-10-03<\/lastmod>/,
  );
  const rss = await readFile(resolve(out, "rss.xml"), "utf8");
  assert.ok(rss.indexOf("note-02") < rss.indexOf("note-01"));
  // A related article must not link to itself.
  assert.doesNotMatch(html.split("Keep exploring")[1] ?? "", /href="\/blog\/note-01\/"/);
});

test("images reserve space from local bytes or explicit dimensions, including nested hosting", () => {
  const assets = new Map([
    [
      "media/diagram.svg",
      new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240"></svg>',
      ),
    ],
    [
      "media/pixel.png",
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=",
        "base64",
      ),
    ],
    ["media/unknown.bin", new Uint8Array([1, 2, 3])],
  ]);
  const rendered = markdown(
    "![Diagram](/media/diagram.svg)\n\n![](/media/pixel.png)",
    "/journal/",
    assets,
  );
  assert.match(
    rendered.html,
    /src="\/journal\/media\/diagram.svg" alt="Diagram" width="640" height="240"/,
  );
  assert.match(rendered.html, /alt="" width="1" height="1"/);
  assert.match(
    markdown("![Diagram](/media/unknown.bin){width=320 height=120}", "/", assets).html,
    /width="320" height="120"/,
  );
  for (const body of [
    "![x](/media/unknown.bin)",
    "![x](/media/missing.svg)",
    "![x](/media/diagram.svg){width=0 height=4}",
    "![x](/media/diagram.svg){width=1 height=99999999999999999}",
  ])
    assert.throws(() => markdown(body, "/", assets));
});

test("syntax highlighting escapes code, preserves indexed text and falls back for unknown languages", () => {
  const code = 'const message = "<script>alert(1)</script>";';
  for (const language of [
    "js",
    "ts",
    "javascript",
    "typescript",
    "html",
    "vue",
    "css",
    "json",
    "bash",
    "sh",
  ]) {
    const example = language === "json" ? '{"hello": true}' : code;
    const html = highlight(example, language);
    assert.match(html, /hljs-/);
    assert.doesNotMatch(html, /<script>/);
  }
  for (const language of ["", "unknown-language"]) {
    assert.doesNotMatch(highlight(code, language), /<span/);
    assert.match(highlight(code, language), /&lt;script&gt;/);
  }
  assert.doesNotMatch(highlight(code.repeat(3000), "js"), /<span/);
  const result = markdown("```js\nconst value = obj.member;\n```");
  assert.equal(result.text, "const value = obj.member;");
  assert.match(result.html, /tabindex="0"/);
  assert.equal(markdown("```js\nconst a = 'hello';\n```").text, "const a = 'hello';");
});

for (const base of ["/", "/journal/"])
  test(`draft previews are isolated, validated, and preserve the deployable artifact at ${base}`, async (t) => {
    const f = await fixture({ count: 1, base });
    t.after(() => rm(f.root, { recursive: true, force: true }));
    const published = await build({ root: f.root, env: {} });
    const previous = await readTree(published.out);
    const manifest = await readFile(resolve(f.root, ".preview/build.json"), "utf8");
    const preview = await build({ root: f.root, draftPreview: true, env: {} });
    assert.equal(preview.out, resolve(f.root, ".preview/drafts"));
    const files = await readTree(preview.out);
    assert.match(String(files.get("blog/secret/index.html")), /PRIVATE<em>BODY<\/em>SENTINEL/);
    assert.match(String(files.get("drafts/index.html")), new RegExp(`href="${base}blog/secret/"`));
    assert.doesNotMatch(String(files.get("blog/secret/index.html")), /Download Markdown/);
    for (const [path, bytes] of files) {
      const text = String(bytes);
      if (path.endsWith(".html")) assert.match(text, /name="robots" content="noindex, nofollow"/);
      if (["rss.xml", "sitemap.xml", "search.json", "archive/index.html"].includes(path))
        assert.doesNotMatch(text, /PRIVATE_/);
      assert.doesNotMatch(text, /PRIVATE_DIRECTORY_SENTINEL/);
    }
    assert.equal(files.has("markdown/secret.md"), false);
    assert.deepEqual(await readTree(published.out), previous);
    assert.equal(await readFile(resolve(f.root, ".preview/build.json"), "utf8"), manifest);
    await assert.rejects(
      build({ root: f.root, out: published.out, draftPreview: true, env: {} }),
      /must be .preview\/drafts/,
    );
    const path = resolve(f.root, "content/blog/secret.md");
    const original = await readFile(path, "utf8");
    await writeFile(path, original + "\n\n[Broken](/missing/)");
    await assert.rejects(
      build({ root: f.root, draftPreview: true, env: {} }),
      /Missing local destination/,
    );
    assert.deepEqual(await readTree(preview.out), files);
    await build({ root: f.root, env: {} });
    assert.deepEqual(await readTree(published.out), previous);
    await writeFile(path, original.replace("draft: true\n", ""));
    await assert.rejects(build({ root: f.root, env: {} }), /Missing draft/);
    assert.deepEqual(await readTree(published.out), previous);
  });

test("draft preview rejects a symlinked output parent", async (t) => {
  const f = await fixture({ count: 0 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await symlink(resolve(f.root, "public"), resolve(f.root, ".preview"), "dir");
  await assert.rejects(build({ root: f.root, draftPreview: true, env: {} }), /real directory/);
});
