import * as v from "valibot";
import { safeLink, basePath, origin } from "./urls.ts";
const text = v.pipe(
  v.string(),
  v.check((s) => Boolean(s.trim()), "Expected non-empty text"),
);
function accepts(check: (value: string) => string, value: string): boolean {
  try {
    check(value);
    return true;
  } catch {
    return false;
  }
}
const link = v.pipe(
  text,
  v.check((value) => accepts(safeLink, value), "Unsafe or unsupported URL"),
);
const localAsset = v.pipe(
  link,
  v.check((s) => s.startsWith("/"), "Expected a local asset"),
);
export const LogicalRouteSchema = v.pipe(
  link,
  v.check(
    (s) => s.startsWith("/") && s.endsWith("/") && !/[?#]/.test(s),
    "Expected a logical directory route",
  ),
  v.brand("LogicalRoute"),
);
export type LogicalRoute = v.InferOutput<typeof LogicalRouteSchema>;
export const OutputPathSchema = v.pipe(
  v.string(),
  v.check(
    (s) =>
      Boolean(s) &&
      !s.startsWith("/") &&
      !s.includes("\\") &&
      !s.includes("\0") &&
      s.split("/").every((part) => Boolean(part) && part !== "." && part !== ".."),
    "Invalid output path",
  ),
  v.brand("OutputPath"),
);
export type OutputPath = v.InferOutput<typeof OutputPathSchema>;
export const ThemeIdSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Theme must be a lowercase hyphenated name"),
);
export const ConfigThemeSchema = v.optional(ThemeIdSchema, "editorial");
export const ConfigSchema = v.strictObject({
  theme: ConfigThemeSchema,
  name: text,
  description: text,
  language: text,
  author: text,
  siteUrl: v.pipe(
    text,
    v.check(
      (value) => accepts(origin, value),
      "siteUrl must be an HTTP(S) origin without credentials, path, query or fragment",
    ),
    v.transform(origin),
  ),
  basePath: v.pipe(
    text,
    v.check((value) => accepts(basePath, value), "basePath must be / or /nested/path/"),
  ),
  navigation: v.pipe(
    v.array(v.pipe(v.strictObject({ label: text, to: LogicalRouteSchema }), v.readonly())),
    v.readonly(),
  ),
  logo: localAsset,
  favicon: localAsset,
  socialImage: localAsset,
  socialLinks: v.pipe(
    v.array(v.pipe(v.strictObject({ label: text, to: link }), v.readonly())),
    v.readonly(),
  ),
  featuredSlug: v.optional(text),
  postsPerPage: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
  article: v.pipe(v.strictObject({ contents: v.boolean(), related: v.boolean() }), v.readonly()),
});
export type ConfigInput = Readonly<v.InferInput<typeof ConfigSchema>>;
export type Config = Readonly<v.InferOutput<typeof ConfigSchema>>;
const metadataText = v.pipe(v.string(), v.minLength(1));
export const PageMetadataSchema = v.strictObject({
  title: metadataText,
  description: metadataText,
});
export const PostMetadataSchema = v.strictObject({
  ...PageMetadataSchema.entries,
  date: v.pipe(
    v.string(),
    v.check(
      (date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) === date,
      "Invalid date",
    ),
  ),
  category: metadataText,
  author: v.string(),
  tags: v.pipe(v.array(v.string()), v.readonly()),
  draft: v.boolean(),
  featured: v.boolean(),
});
export type PageMetadata = Readonly<v.InferOutput<typeof PageMetadataSchema>>;
export type PostMetadata = Readonly<v.InferOutput<typeof PostMetadataSchema>>;
export const logicalRoute = (value: string): LogicalRoute => v.parse(LogicalRouteSchema, value);
export const outputPath = (value: string): OutputPath => v.parse(OutputPathSchema, value);
