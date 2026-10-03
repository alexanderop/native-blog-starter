import { test } from "node:test";
import assert from "node:assert/strict";
import { markdown, inline } from "../src/core/markdown.ts";
import { parseContent } from "../src/core/content.ts";
import { safeLink, origin, basePath, publicUrl } from "../src/core/urls.ts";
test("bounded Markdown produces semantic lists, images, unique headings, tables and escaped code", () => {
  const result = markdown(
    "## Same\n\n## Same\n\n#### Detail\n\n- One\n- Two\n\n1. First\n2. Second\n\n![A view](/media/image.svg)\n\n```js\n<script>literal</script>\n```\n\n> One\n> Two\n\n| A \\| B | C |\n| --- | --- |\n| D | E |",
    "/journal/",
  );
  assert.deepEqual(
    result.headings.map((h) => h.id),
    ["same", "same-2", "detail"],
  );
  assert.match(result.html, /<ul><li>One<\/li><li>Two/);
  assert.match(result.html, /<ol>/);
  assert.match(result.html, /src="\/journal\/media\/image.svg"/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.match(result.html, /<blockquote><p>One Two/);
  assert.match(result.html, /<th scope="col">A \| B/);
  assert.equal(
    inline("`**literal**` and **bold** and _italic_", "/"),
    "<code>**literal**</code> and <strong>bold</strong> and <em>italic</em>",
  );
});
test("unsafe URLs and unsupported syntax fail rather than execute", () => {
  for (const url of [
    "javascript:alert(1)",
    "//evil.test/a",
    "/a/../b",
    "/a/%2e%2e/b",
    "/%252e%252e/x",
    "/a%5cb",
    "/a%00b",
    "file:///a",
  ])
    assert.throws(() => safeLink(url));
  for (const body of [
    "```js\nunclosed",
    "  - nested",
    "# second h1",
    "![remote](https://evil.test/x)",
    "::widget{}\nx\n::",
  ])
    assert.throws(() => markdown(body));
  assert.equal(markdown("<script>x</script>").html, "<p>&lt;script&gt;x&lt;/script&gt;</p>");
  assert.equal(
    publicUrl("/people/alex/", "/about/?mode=x#story"),
    "/people/alex/about/?mode=x#story",
  );
  for (const url of [
    "https://x.test/path",
    "https://me:secret@x.test",
    "https://x.test/?q=x",
    "https://x.test/#x",
  ])
    assert.throws(() => origin(url));
  assert.throws(() => basePath("/missing-trailing"));
  assert.equal(basePath("/people/alex/"), "/people/alex/");
});
test("frontmatter diagnostics, default author and calendar validation", () => {
  const source =
    "---\ntitle: A\ndescription: B\ndate: 2026-10-03\ncategory: Notes\ntags: [one, one, two]\ndraft: false\n---\nHello";
  const parsed = parseContent(source, "post.md", "Default");
  assert.equal(parsed.author, "Default");
  assert.deepEqual(parsed.tags, ["one", "two"]);
  for (const extra of ["title: Duplicate", "unknown: value", "draft: maybe", "tags: [broken"])
    assert.throws(
      () =>
        parseContent(
          source.replace("\n---\nHello", `\n${extra}\n---\nHello`),
          "post.md",
          "Default",
        ),
      /post.md:\d+:/,
    );
  assert.throws(
    () => parseContent(source.replace("2026-10-03", "2026-02-30"), "post.md", "Default"),
    /Invalid date/,
  );
});
