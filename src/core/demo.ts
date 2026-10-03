import { parseConfig } from "./config.ts";
import { prepareBuild } from "./prepare-build.ts";
import { outputPath } from "./schemas.ts";
import { escape as e } from "./urls.ts";
import { validate } from "./validate.ts";
import type {
  OutputPath,
  ProjectInputs,
  Result,
  ThemeSource,
  ValidatedBuildPlan,
} from "./types.ts";

export const demoThemeIds = ["editorial", "minimal", "paper"] as const;
const labels = { editorial: "Editorial", minimal: "Minimal", paper: "Paper" } as const;
const demoCss = `
.demo-bar { padding: 12px var(--gutter); border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12px 24px; background: var(--raised); color: var(--ink); font: 13px/1.5 var(--font-mono); }
.demo-choices { display: flex; flex-wrap: wrap; gap: 4px; }
.demo-bar a { display: inline-block; padding: 8px 12px; border: 1px solid var(--line); border-radius: 6px; }
.demo-bar a[aria-current] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.demo-bar a:hover { text-decoration: underline; text-underline-offset: 3px; }
.demo-bar .demo-source { border-color: transparent; }
@media (max-width: 500px) { .demo-bar { gap: 8px; } .demo-label { width: 100%; text-align: center; } .demo-bar .demo-source { padding-block: 4px; } }
`;

export function prepareDemo(
  inputs: ProjectInputs,
  themes: readonly ThemeSource[],
): Result<ValidatedBuildPlan> {
  try {
    const config = parseConfig(inputs.config, inputs.env);
    const files = new Map<OutputPath, string | Uint8Array>();
    let rootPlan: ValidatedBuildPlan | undefined;
    const variants = demoThemeIds.map((id) => ({
      id,
      base: config.basePath + (id === "editorial" ? "" : `themes/${id}/`),
    }));
    for (const variant of variants) {
      const theme = themes.find((candidate) => candidate.id === variant.id);
      if (!theme) throw Error(`Demo requires theme ${variant.id}`);
      const result = prepareBuild({
        ...inputs,
        theme,
        config: { ...config, theme: variant.id, basePath: variant.base },
        env: {},
      });
      if (!result.ok) return result;
      if (variant.id === "editorial") rootPlan = result.value;
      const prefix = variant.base.slice(config.basePath.length);
      for (const [path, bytes] of result.value.files) {
        const destination = outputPath(prefix + path);
        if (files.has(destination)) throw Error(`Demo output collision: ${destination}`);
        let content = bytes;
        if (path.endsWith(".html") && typeof bytes === "string") {
          const route =
            path === "index.html" ? "" : path.endsWith("/index.html") ? path.slice(0, -10) : path;
          const links = variants
            .map(
              (choice) =>
                `<a href="${e(choice.base + route)}"${choice.id === variant.id ? ' aria-current="true"' : ""}>${labels[choice.id]}</a>`,
            )
            .join("");
          const toolbar = `<nav class="demo-bar" aria-label="Design theme"><span class="demo-label">Try a theme</span><div class="demo-choices">${links}</div><a class="demo-source" href="https://github.com/alexanderop/native-blog-starter">Use this starter ↗</a></nav>`;
          content = bytes
            .replace(
              "</head>",
              `<link rel="stylesheet" href="${config.basePath}assets/demo.css"></head>`,
            )
            .replace('<header class="site-header">', `${toolbar}<header class="site-header">`);
        }
        files.set(destination, content);
      }
    }
    const stylesheet = outputPath("assets/demo.css");
    if (files.has(stylesheet)) throw Error(`Demo output collision: ${stylesheet}`);
    files.set(stylesheet, demoCss);
    validate(files, config.basePath, config.siteUrl);
    if (!rootPlan) throw Error("Demo requires an editorial publication");
    return { ok: true, value: { ...rootPlan, files } };
  } catch (error) {
    return {
      ok: false,
      errors: [{ source: "demo", message: error instanceof Error ? error.message : String(error) }],
    };
  }
}
