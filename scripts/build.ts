import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readProject } from "../src/shell/read-project.ts";
import { commitBuild, checkOutput } from "../src/shell/commit-build.ts";
import { prepareBuild } from "../src/core/prepare-build.ts";
import type { ConfigOverrides } from "../src/core/types.ts";
import type { BuildManifest } from "../src/shell/manifest.ts";
import { projectRoot } from "../src/shell/project-root.ts";
export { projectRoot };
export interface BuildOptions {
  readonly root?: string;
  readonly out?: string;
  readonly env?: ConfigOverrides;
  readonly beforePromote?: (stage: string) => Promise<void>;
}
export async function build(options: BuildOptions = {}): Promise<BuildManifest> {
  const root = resolve(options.root ?? projectRoot);
  const out = resolve(options.out ?? resolve(root, "dist"));
  await checkOutput(root, out);
  const result = prepareBuild(await readProject(root, options.env ?? process.env));
  if (!result.ok)
    throw Error(
      result.errors
        .map(
          (error) =>
            `${error.source}${error.line === undefined ? "" : `:${error.line}`}: ${error.message}`,
        )
        .join("\n"),
    );
  const manifest = await commitBuild(result.value, {
    root,
    out,
    beforePromote: options.beforePromote,
  });
  console.log(`Built ${manifest.articles} articles at ${out} (${manifest.base})`);
  return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
