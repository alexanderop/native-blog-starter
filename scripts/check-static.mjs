import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readTree, validate } from "../lib/validate.mjs";
import { projectRoot } from "./build.mjs";
const manifest = JSON.parse(await readFile(resolve(projectRoot, ".preview/build.json"), "utf8"));
validate(await readTree(manifest.out), manifest.base, manifest.origin);
console.log(`Validated ${manifest.out}`);
