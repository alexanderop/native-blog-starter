import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import fc from "fast-check";
import { fixture } from "./fixtures/site.mjs";
import { readProject, readTree } from "../src/shell/read-project.ts";
import { highlightProject } from "../src/shell/highlight.ts";
import { markdown, codeKey } from "../src/core/markdown.ts";
import { build } from "../scripts/build.ts";
import { buildDemo } from "../scripts/build-demo.ts";

async function project(t, body) {
  const f = await fixture({ count: 1 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const inputs = await readProject(f.root);
  const page = inputs.sources.find((source) => source.kind === "page");
  return {
    ...inputs,
    sources: [{ ...page, source: `---\ntitle: Code\ndescription: Example\n---\n${body}` }],
  };
}
const fence = (text, language = "ts") => `\`\`\`${language}\n${text}\n\`\`\``;
const plainText = (html) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(amp|lt|gt|quot|#39);/g,
      (_, key) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[key],
    );

test("injected tokens preserve literal code and search across arbitrary safe fence content", () => {
  fc.assert(
    fc.property(
      fc.string().filter((text) => !text.split(/\r?\n/).includes("```") && !text.includes("\r")),
      (text) => {
        const source = fence(text);
        const tokens = [...text].map((text) => ({ text, role: "keyword" }));
        const rendered = markdown(
          source,
          "/",
          new Map([[codeKey({ language: "ts", text }), tokens]]),
        );
        assert.equal(plainText(rendered.html), text);
        assert.equal(rendered.text, markdown(source).text);
        assert.equal(rendered.codeBlocks[0].text, text);
      },
    ),
    { seed: 20261003, numRuns: 100 },
  );
  const text = '<script title="bad">&</script>';
  const key = codeKey({ language: "ts", text });
  assert.throws(
    () => markdown(fence(text), "/", new Map([[key, [{ text, role: 'keyword" onclick="bad' }]]])),
    /Invalid syntax role/,
  );
  assert.throws(
    () => markdown(fence(text), "/", new Map([[key, [{ text: "changed", role: "plain" }]]])),
    /changed code text/,
  );
});

test("real Shiki preserves aliases, multiline state, Vue, empty and trailing lines", async (t) => {
  const cases = [
    ["js", '/* first\nsecond */\nconst message = "<script>&";'],
    ["ts", "type Count = number;\nconst count: Count = 42;"],
    [
      "vue",
      '<script setup lang="ts">\nconst message = "hello";\n</script>\n<template>{{ message }}</template>',
    ],
    ["js", ""],
    ["js", "\n"],
    ["js", "const value = 42;\n\n"],
    ["javascript", `const longLine = "${"x".repeat(25000)}";`],
  ];
  const source = cases.map(([language, text]) => fence(text, language)).join("\n\n");
  const input = await project(t, source);
  const result = await highlightProject(input);
  assert.deepEqual(result.warnings, []);
  for (const [language, text] of cases) {
    const tokens = result.inputs.highlights.get(codeKey({ language, text }));
    assert.equal(tokens.map((token) => token.text).join(""), text);
  }
  const js = result.inputs.highlights.get(codeKey({ language: cases[0][0], text: cases[0][1] }));
  assert.ok(js.some((token) => token.role === "comment" && token.text.includes("second")));
  assert.ok(js.some((token) => token.role === "keyword" && token.text === "const"));
  const vue = result.inputs.highlights.get(codeKey({ language: cases[2][0], text: cases[2][1] }));
  assert.ok(vue.some((token) => token.role === "keyword" && token.text === "const"));
  const rendered = markdown(source, "/", result.inputs.highlights);
  assert.equal(rendered.text, markdown(source).text);
  assert.match(rendered.html, /&lt;script&gt;&amp;/);
});

test("plain labels and private invalid bodies never initialize Shiki; unsupported occurrences warn at source lines", async (t) => {
  const input = await project(
    t,
    ["", "text", "txt", "plaintext", "unknownlang", "unknownlang"]
      .map((lang) => fence("literal", lang))
      .join("\n\n"),
  );
  const result = await highlightProject(
    {
      ...input,
      sources: [
        ...input.sources,
        {
          file: "private.md",
          kind: "post",
          slug: "private",
          source:
            "---\ntitle: Private\ndescription: Private\ndate: 2026-10-03\ncategory: Private\ndraft: true\n---\n```ts\nunclosed",
        },
      ],
    },
    async () => {
      throw Error("must not initialize");
    },
  );
  assert.deepEqual(
    result.warnings.map(({ line, message }) => ({ line, message })),
    [
      { line: 21, message: 'Unsupported code language "unknownlang"; publishing plain code' },
      { line: 25, message: 'Unsupported code language "unknownlang"; publishing plain code' },
    ],
  );
  assert.equal(result.warnings[0].source, input.sources[0].file);
  assert.equal(
    markdown(fence("literal", "unknownlang"), "/", result.inputs.highlights).html,
    '<pre tabindex="0" aria-label="unknownlang example"><code>literal</code></pre>',
  );
});

test("one engine tokenizes repeated code once and disposes on rejected adapter output", async (t) => {
  const input = await project(t, `${fence("const n = 1;")}\n\n${fence("const n = 1;")}`);
  let initialized = 0,
    tokenized = 0,
    disposed = 0;
  const result = await highlightProject(input, async () => {
    initialized++;
    return {
      tokenize: (text) => {
        tokenized++;
        return [[{ content: text, color: "var(--syntax-keyword)" }]];
      },
      dispose: () => {
        disposed++;
      },
    };
  });
  assert.equal(
    markdown(fence("const n = 1;"), "/", result.inputs.highlights).html,
    '<pre tabindex="0" aria-label="ts example"><code><span class="syntax-keyword">const n = 1;</span></code></pre>',
  );
  assert.deepEqual([initialized, tokenized, disposed], [1, 1, 1]);
  for (const output of [
    [[{ content: "wrong", color: "var(--syntax-keyword)" }]],
    [[{ content: "const n = 1;", color: "red" }]],
  ]) {
    let closed = false;
    await assert.rejects(
      highlightProject(input, async () => ({
        tokenize: () => output,
        dispose: () => {
          closed = true;
        },
      })),
      /about\.md:5:/,
    );
    assert.equal(closed, true);
  }
});

for (const publish of [build, buildDemo]) {
  test(`${publish.name} emits highlighted native artifacts and preserves publication on highlighter failure`, async (t) => {
    const f = await fixture({ count: 1, base: "/journal/" });
    t.after(() => rm(f.root, { recursive: true, force: true }));
    await appendFile(
      resolve(f.root, "content/pages/about.md"),
      `\n${fence('const safe = "<script>&";')}\n`,
    );
    await writeFile(
      resolve(f.root, "content/blog/secret.md"),
      "---\ntitle: PRIVATE_SYNTAX\ndescription: Hidden\ndate: 2026-10-03\ncategory: Private\ndraft: true\n---\n```ts\nunclosed",
    );
    const result = await publish({ root: f.root, env: {} });
    const files = await readTree(result.out);
    const prefixes = publish === buildDemo ? ["", "themes/minimal/", "themes/paper/"] : [""];
    for (const prefix of prefixes) {
      assert.match(
        String(files.get(prefix + "blog/note-01/index.html")),
        /class="syntax-keyword">const<\/span>/,
      );
      assert.match(String(files.get(prefix + "about/index.html")), /class="syntax-string"/);
      assert.match(String(files.get(prefix + "about/index.html")), /&lt;script&gt;&amp;/);
    }
    const artifacts = [...files.values()].map(String).join("\n");
    assert.doesNotMatch(artifacts, /PRIVATE_SYNTAX|node_modules|shiki\/|\.wasm/);
    let disposed = false;
    await assert.rejects(
      publish({
        root: f.root,
        env: {},
        syntaxEngineFactory: async () => ({
          tokenize: () => {
            throw Error("Unexpected highlighter failure");
          },
          dispose: () => {
            disposed = true;
          },
        }),
      }),
      /Unexpected highlighter failure/,
    );
    assert.equal(disposed, true);
    assert.deepEqual(await readTree(result.out), files);
  });
}
