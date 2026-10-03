import { test } from "node:test";
import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import fc from "fast-check";
import { fixture } from "./fixtures/site.mjs";
import { readProject } from "../src/shell/read-project.ts";
import { readManifest } from "../src/shell/manifest.ts";
import { prepareBuild } from "../src/core/prepare-build.ts";
import { publication } from "../src/core/publication.ts";

function plan(inputs) {
  const result = prepareBuild(inputs);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}
function freeze(value) {
  if (value && typeof value === "object" && !ArrayBuffer.isView(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

test("publication is deterministic, preserves input and paginates every post once", async (t) => {
  const f = await fixture({ count: 8, base: "/journal/" });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const input = await readProject(f.root);
  const snapshot = structuredClone(input);
  freeze(input.config);
  freeze(input.sources);
  const first = plan(input);
  const entries = [...first.files].sort(([a], [b]) => a.localeCompare(b));
  fc.assert(
    fc.property(
      fc.shuffledSubarray(input.sources, {
        minLength: input.sources.length,
        maxLength: input.sources.length,
      }),
      (sources) => {
        assert.deepEqual(
          [...plan({ ...input, sources }).files].sort(([a], [b]) => a.localeCompare(b)),
          entries,
        );
      },
    ),
    { seed: 20261003, numRuns: 50 },
  );
  assert.deepEqual(structuredClone(input), snapshot);
  const posts = freeze([...first.publication.posts]);
  const pages = freeze([...first.publication.pages]);
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 }), (postsPerPage) => {
      const result = publication(posts, pages, { ...first.config, postsPerPage });
      const archive = result.archives.filter((entry) => entry.route.startsWith("/archive/"));
      assert.deepEqual(
        archive.flatMap((entry) => entry.posts.map((post) => post.slug)),
        posts.map((post) => post.slug),
      );
      assert.ok(archive.every((entry) => entry.posts.length <= postsPerPage));
    }),
    { seed: 20261003, numRuns: 30 },
  );
  assert.ok(first.publication.pages.every((page) => !("date" in page) && !("draft" in page)));
});

test("generated draft bodies never reach rendering or any endpoint", async (t) => {
  const f = await fixture({ count: 1 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const input = await readProject(f.root);
  const original = input.sources.find(
    (source) => source.kind === "post" && source.slug === "note-01",
  );
  const baseline = [...plan(input).files];
  fc.assert(
    fc.property(fc.string({ maxLength: 100 }), (body) => {
      const source =
        original.source.replace("draft: false", "draft: true").split("\n\n")[0] +
        "\n\n```\nPRIVATE_GENERATED_SENTINEL" +
        body;
      const draft = { ...original, slug: "generated-draft", file: "generated-draft.md", source };
      const result = plan({ ...input, sources: [...input.sources, draft] });
      assert.deepEqual([...result.files], baseline);
      assert.ok(result.publication.posts.every((post) => post.draft === false));
    }),
    { seed: 20261003, numRuns: 50 },
  );
});

test("manifest boundary rejects untrusted shape and keeps valid decoded fields", async (t) => {
  const f = await fixture({ count: 0 });
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const path = resolve(f.root, "manifest.json");
  const valid = {
    out: resolve(f.root, "dist"),
    base: "/journal/",
    origin: "https://journal.example",
    articles: 0,
    digest: "a".repeat(64),
  };
  await writeFile(path, JSON.stringify(valid));
  assert.deepEqual(await readManifest(path), valid);
  for (const value of [
    null,
    [],
    { ...valid, articles: "1" },
    { ...valid, surprise: true },
    { ...valid, base: "../outside" },
    { ...valid, digest: "wrong" },
    { ...valid, origin: "file:///tmp/site" },
  ]) {
    await writeFile(path, JSON.stringify(value));
    await assert.rejects(readManifest(path), /Invalid build manifest/);
  }
});
