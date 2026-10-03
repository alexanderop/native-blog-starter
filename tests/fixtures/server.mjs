import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { fixture } from "./site.mjs";
import { build, projectRoot } from "../../scripts/build.ts";
import { serve } from "../../scripts/serve.ts";
for (const [name, base, port, theme] of [
  ["root", "/", 5271, "editorial"],
  ["nested", "/people/alex/", 5272, "editorial"],
  ["minimal", "/", 5273, "minimal"],
  ["minimal-nested", "/people/alex/", 5274, "minimal"],
  ["paper", "/", 5275, "paper"],
  ["paper-nested", "/people/alex/", 5276, "paper"],
]) {
  const root = resolve(projectRoot, ".fixture-site", name);
  await rm(root, { recursive: true, force: true });
  await fixture({ root, base, theme });
  const result = await build({ root, env: {} });
  await serve({ root: result.out, base, port });
}

const demoRoot = resolve(projectRoot, ".fixture-site/demo");
await rm(demoRoot, { recursive: true, force: true });
await fixture({ root: demoRoot, count: 2, base: "/native-blog-starter/" });
const { buildDemo } = await import("../../scripts/build-demo.ts");
const demo = await buildDemo({ root: demoRoot, env: {} });
await serve({ root: demo.out, base: demo.base, port: 5277 });
