import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { demoThemeIds, prepareDemo } from "../src/core/demo.ts";
import { readProject, readTheme } from "../src/shell/read-project.ts";
import { checkOutput, commitBuild } from "../src/shell/commit-build.ts";
import { projectRoot } from "../src/shell/project-root.ts";
import type { BuildOptions } from "./build.ts";
import type { BuildManifest } from "../src/shell/manifest.ts";

export async function buildDemo(options: BuildOptions = {}): Promise<BuildManifest> {
  const root = resolve(options.root ?? projectRoot);
  const out = resolve(options.out ?? resolve(root, "dist"));
  await checkOutput(root, out);
  const inputs = await readProject(root, options.env ?? process.env);
  const themes = await Promise.all(demoThemeIds.map((theme) => readTheme(root, { theme })));
  const result = prepareDemo(inputs, themes);
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
  console.log(
    `Built theme demo with ${manifest.articles} articles and ${themes.length} designs (${manifest.base})`,
  );
  return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildDemo();
