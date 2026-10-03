import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { fixture } from "./site.mjs";
import { build, projectRoot } from "../../scripts/build.mjs";
import { serve } from "../../scripts/serve.mjs";
for (const [name, base, port] of [
  ["root", "/", 5271],
  ["nested", "/people/alex/", 5272],
]) {
  const root = resolve(projectRoot, ".fixture-site", name);
  await rm(root, { recursive: true, force: true });
  await fixture({ root, base });
  const result = await build({ root, env: {} });
  await serve({ root: result.out, base, port });
}
