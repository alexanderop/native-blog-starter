import { readFile, readdir, lstat, mkdir, writeFile, rename, rm, mkdtemp } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadConfig } from "../lib/config.mjs";
import { collect } from "../lib/content.mjs";
import { publication } from "../lib/publication.mjs";
import { outputs } from "../lib/outputs.mjs";
import { validate } from "../lib/validate.mjs";
export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
/** @param {string} path @param {string} parent */
const inside = (path, parent) => path === parent || path.startsWith(parent + sep);
/** @param {string} root @param {Map<string,Buffer|string>} files @param {string} [prefix] */
async function assets(root, files, prefix = "") {
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix + entry.name;
    if ((await lstat(resolve(root, path))).isSymbolicLink())
      throw Error(`Public symlinks are unsupported: ${path}`);
    if (entry.isDirectory()) await assets(root, files, path + "/");
    else {
      if (files.has(path)) throw Error(`Public file collides with generated output: ${path}`);
      files.set(path, await readFile(resolve(root, path)));
    }
  }
}
/** @param {{root?:string,out?:string,env?:NodeJS.ProcessEnv,beforePromote?:(stage:string)=>Promise<void>}} [options] */
export async function build({
  root = projectRoot,
  out = resolve(root, "dist"),
  env = process.env,
  beforePromote,
} = {}) {
  root = resolve(root);
  out = resolve(out);
  if (inside(root, out) || (inside(out, root) && out !== resolve(root, "dist")))
    throw Error("Output overlaps source tree");
  const existing = await lstat(out).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink()))
    throw Error("Output must be a real directory");
  const config = await loadConfig(root, env);
  const pub = publication(await collect(root, config), await collect(root, config, true), config);
  /** @type {Map<string,Buffer|string>} */ const files = new Map(outputs(config, pub));
  await assets(resolve(root, "public"), files);
  validate(files, config.basePath, config.siteUrl);
  const digest = createHash("sha256");
  for (const [path, bytes] of [...files].sort(([a], [b]) => a.localeCompare(b)))
    digest.update(path).update("\0").update(bytes).update("\0");
  const result = {
    out,
    base: config.basePath,
    origin: config.siteUrl,
    articles: pub.posts.length,
    digest: digest.digest("hex"),
  };
  await mkdir(dirname(out), { recursive: true });
  const stage = await mkdtemp(out + ".stage-");
  const backup = stage + ".previous";
  const metaDir = resolve(root, ".preview");
  const manifest = resolve(metaDir, "build.json");
  const metaTemp = resolve(metaDir, `build-${process.pid}-${Date.now()}.json`);
  let moved = false;
  try {
    for (const [path, bytes] of files) {
      const target = resolve(stage, path);
      if (!inside(target, stage)) throw Error("Invalid output path");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
    await mkdir(metaDir, { recursive: true });
    await writeFile(metaTemp, JSON.stringify(result), { flag: "wx" });
    if (beforePromote) await beforePromote(stage);
    try {
      await rename(out, backup);
      moved = true;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    let promoted = false;
    try {
      await rename(stage, out);
      promoted = true;
      await rename(metaTemp, manifest);
    } catch (error) {
      if (promoted) await rm(out, { recursive: true, force: true });
      if (moved) await rename(backup, out);
      throw error;
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
    await rm(metaTemp, { force: true });
  }
  if (moved)
    await rm(backup, { recursive: true, force: true }).catch((error) =>
      console.warn(`Publication succeeded; old backup remains at ${backup}: ${error.message}`),
    );
  console.log(`Built ${result.articles} articles at ${out} (${result.base})`);
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
