import { DiagnosticError } from "./diagnostics.ts";
import { parseConfig } from "./config.ts";
import { collect } from "./content.ts";
import { publication } from "./publication.ts";
import { outputs } from "./outputs.ts";
import { outputPath } from "./schemas.ts";
import { validate } from "./validate.ts";
import type { ProjectInputs, Result, ValidatedBuildPlan, OutputPath } from "./types.ts";
export function prepareBuild(inputs: ProjectInputs): Result<ValidatedBuildPlan> {
  try {
    const config = parseConfig(inputs.config, inputs.env);
    if (inputs.theme.id !== config.theme)
      throw Error(
        `Theme snapshot ${inputs.theme.id} does not match configured theme ${config.theme}`,
      );
    const content = collect(inputs.sources, config, inputs.assets);
    const pub = publication(content.posts, content.pages, config);
    const files = new Map<OutputPath, string | Uint8Array>(outputs(config, pub));
    files.set(outputPath("assets/tokens.css"), inputs.theme.tokensCss);
    files.set(outputPath("assets/theme.css"), inputs.theme.themeCss);
    for (const [name, bytes] of inputs.assets) {
      const path = outputPath(name);
      if (files.has(path)) throw Error(`Public file collides with generated output: ${path}`);
      files.set(path, bytes);
    }
    validate(files, config.basePath, config.siteUrl);
    return { ok: true, value: { files, config, publication: pub, articles: pub.posts.length } };
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof DiagnosticError
          ? error.diagnostic
          : { source: "project", message: error instanceof Error ? error.message : String(error) },
      ],
    };
  }
}
