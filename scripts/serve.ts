import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectRoot } from "./build.ts";
import { serve } from "../src/shell/serve.ts";
import { readManifest } from "../src/shell/manifest.ts";
export { serve };
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await readManifest(resolve(projectRoot, ".preview/build.json"));
  await serve({ root: manifest.out, base: manifest.base });
}
