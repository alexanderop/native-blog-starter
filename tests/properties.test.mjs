import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { parseContent } from "../src/core/content.ts";
import { outputs } from "../src/core/outputs.ts";
import { publication } from "../src/core/publication.ts";

const options = {
  seed: Number(process.env.FC_SEED ?? 20261003),
  numRuns: 150,
  ...(process.env.FC_PATH ? { path: process.env.FC_PATH } : {}),
};
const parserPath = fileURLToPath(new URL("./fixtures/parse-markdown.mjs", import.meta.url));
function isolatedMarkdown(source) {
  const child = spawnSync(process.execPath, [parserPath], {
    input: JSON.stringify(source),
    encoding: "utf8",
    timeout: 1500,
    maxBuffer: 1024 * 1024,
  });
  assert.equal(
    child.status,
    0,
    `Parser failed to complete for ${JSON.stringify(source)}: ${child.error?.code ?? child.stderr}`,
  );
  return JSON.parse(child.stdout);
}
const marker = fc.oneof(
  fc.constantFrom("-", "*"),
  fc.integer({ min: 1, max: 99 }).map((n) => `${n}.`),
);
const listLine = fc
  .tuple(
    marker,
    fc.constantFrom(" ", "\t", "  ", " \t"),
    fc.constantFrom("", "item", " **bold**", "`code`", " ", "\\*literal\\*"),
  )
  .map((parts) => parts.join(""));
const document = fc
  .array(
    fc.oneof(
      listLine,
      fc.constantFrom(
        "",
        "## Heading",
        "Paragraph.",
        "```js",
        "```",
        "> A quote",
        "| A | B |",
        '::callout{title="Note"}',
        "::",
      ),
    ),
    { minLength: 1, maxLength: 12 },
  )
  .map((lines) => lines.join("\n"));

test("bounded Markdown always completes or reports a syntax error", () => {
  fc.assert(
    fc.property(document, (source) => {
      const result = isolatedMarkdown(source);
      assert.ok(["rendered", "rejected"].includes(result.kind));
    }),
    options,
  );
});
test("incomplete list edits terminate and valid lists retain their items", () => {
  for (const source of ["- ", "1. ", "* ", "-\titem", "A paragraph.\n\n- item\n- "])
    isolatedMarkdown(source);
  assert.equal(
    isolatedMarkdown("- First\n- Second").html,
    "<ul><li>First</li><li>Second</li></ul>",
  );
  assert.equal(
    isolatedMarkdown("1. First\n2. Second").html,
    "<ol><li>First</li><li>Second</li></ol>",
  );
});
const scalar = fc
  .array(fc.constantFrom("a", "Z", "0", " ", "'", '"', "\\", ":", "[", "]", "é", "文", "😀"), {
    minLength: 1,
    maxLength: 50,
  })
  .map((chars) => chars.join(""));
const metadata = fc.record({
  title: scalar,
  description: scalar,
  author: scalar,
  category: scalar,
});
const config = {
  name: "Property Journal",
  theme: "editorial",
  description: "Independent test publication",
  language: "en",
  author: "Default author",
  siteUrl: "https://property.example",
  basePath: "/",
  navigation: [],
  logo: "/brand/logo.svg",
  favicon: "/brand/logo.svg",
  socialImage: "/brand/logo.svg",
  socialLinks: [],
  postsPerPage: 10,
  article: { contents: true, related: true },
};
function exportedMetadata(values) {
  const authored = `---\n${Object.entries(values)
    .map(([key, value]) => `${key}: "${value}"`)
    .join("\n")}\ndate: 2026-10-03\ntags: [one, two]\n---\n\nA literal body.\n`;
  const data = parseContent(authored, "authored.md", "Default author");
  assert.deepEqual(Object.fromEntries(Object.keys(values).map((key) => [key, data[key]])), {
    ...values,
  });
  const post = {
    ...data,
    slug: "round-trip",
    route: "/blog/round-trip/",
    html: "<p>A literal body.</p>",
    headings: [],
    text: "A literal body.",
    minutes: 1,
  };
  const download = outputs(config, publication([post], [], config)).get("markdown/round-trip.md");
  const parsed = parseContent(download, "download.md", "Different fallback");
  assert.deepEqual(
    {
      title: parsed.title,
      description: parsed.description,
      author: parsed.author,
      category: parsed.category,
    },
    { ...values },
  );
  assert.equal(parsed.date, "2026-10-03");
  assert.deepEqual(parsed.tags, ["one", "two"]);
  assert.equal(parsed.body, "\nA literal body.\n");
}
test("public Markdown downloads preserve supported metadata and body", () => {
  fc.assert(fc.property(metadata, exportedMetadata), { ...options, numRuns: 500 });
});
test("downloads preserve leading quotes, literal backslashes and surrounding whitespace", () => {
  exportedMetadata({
    title: '"Quoted" words',
    description: '"Both ends"',
    author: "'Ada'",
    category: "  C:\\notes  ",
  });
});

test("valid generated lists preserve item order and text", () => {
  const item = fc
    .array(fc.constantFrom("a", "b", "c", "1", "2"), { minLength: 1, maxLength: 30 })
    .map((chars) => chars.join(""));
  fc.assert(
    fc.property(fc.boolean(), fc.array(item, { minLength: 1, maxLength: 8 }), (ordered, items) => {
      const source = items.map((text, i) => `${ordered ? `${i + 1}.` : "-"} ${text}`).join("\n");
      const result = isolatedMarkdown(source);
      assert.equal(result.kind, "rendered");
      assert.match(result.html, ordered ? /^<ol>.*<\/ol>$/ : /^<ul>.*<\/ul>$/);
      assert.deepEqual(
        [...result.html.matchAll(/<li>([^<]*)<\/li>/g)].map((match) => match[1]),
        items,
      );
    }),
    { ...options, numRuns: 75 },
  );
});
