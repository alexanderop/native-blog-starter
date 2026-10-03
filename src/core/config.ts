import { DiagnosticError } from "./diagnostics.ts";
import * as v from "valibot";
import { ConfigSchema } from "./schemas.ts";
import type { Config, ConfigOverrides } from "./types.ts";
export function parseConfig(raw: unknown, env: ConfigOverrides = {}): Config {
  const overrides = {
    ...(env.SITE_URL === undefined ? {} : { siteUrl: env.SITE_URL }),
    ...(env.BASE_PATH === undefined ? {} : { basePath: env.BASE_PATH }),
  };
  const candidate =
    raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw, ...overrides } : raw;
  const result = v.safeParse(ConfigSchema, candidate);
  if (!result.success)
    throw new DiagnosticError({
      source: "site.config.mjs",
      message: result.issues
        .map(
          (issue) =>
            `${issue.type === "strict_object" ? "Unknown configuration key" : "Invalid configuration"}: ${issue.path?.map((item) => String(item.key)).join(".") ?? "config"}: ${issue.message}`,
        )
        .join("\n"),
    });
  return result.output;
}
