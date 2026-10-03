import { resolve } from "node:path";
import { readTree } from "../src/shell/read-project.ts";
import { validate } from "../src/core/validate.ts";
import { readManifest } from "../src/shell/manifest.ts";
import { projectRoot } from "./build.ts";
const manifest = await readManifest(resolve(projectRoot, ".preview/build.json"));
validate(await readTree(manifest.out), manifest.base, manifest.origin);
console.log(`Validated ${manifest.out}`);
