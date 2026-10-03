import { mkdir, writeFile, rename, rm, mkdtemp, lstat } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { createHash } from "node:crypto";
import type { ValidatedBuildPlan } from "../core/types.ts";
import type { BuildManifest } from "./manifest.ts";
export interface CommitOptions {
  readonly root: string;
  readonly out: string;
  readonly beforePromote?: (stage: string) => Promise<void>;
}
const inside = (path: string, parent: string): boolean =>
  path === parent || path.startsWith(parent + sep);
export async function checkOutput(root: string, out: string): Promise<void> {
  if (inside(root, out) || (inside(out, root) && out !== resolve(root, "dist")))
    throw Error("Output overlaps source tree");
  const existing = await lstat(out).catch((error: unknown) => {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    return undefined;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink()))
    throw Error("Output must be a real directory");
}
export async function commitBuild(
  plan: ValidatedBuildPlan,
  { root, out, beforePromote }: CommitOptions,
): Promise<BuildManifest> {
  await checkOutput(root, out);
  const files = plan.files;
  const digest = createHash("sha256");
  for (const [path, bytes] of [...files].sort(([a], [b]) => a.localeCompare(b)))
    digest.update(path).update("\0").update(bytes).update("\0");
  const result: BuildManifest = {
    out,
    base: plan.config.basePath,
    origin: plan.config.siteUrl,
    articles: plan.articles,
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
      console.warn(
        `Publication succeeded; old backup remains at ${backup}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  return result;
}
