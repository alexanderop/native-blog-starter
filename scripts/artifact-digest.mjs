import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readTree } from "../lib/validate.mjs";
import { projectRoot } from "./build.mjs";
const hash = createHash("sha256");
for (const [path, bytes] of [...(await readTree(resolve(projectRoot, "dist")))].sort(([a], [b]) =>
  a.localeCompare(b),
))
  hash.update(path).update("\0").update(bytes).update("\0");
const digest = hash.digest("hex");
if (process.argv[2] === "--verify") {
  if (!process.argv[3] || digest !== (await readFile(resolve(process.argv[3]), "utf8")).trim())
    throw Error("Publication changed after validation");
}
console.log(digest);
