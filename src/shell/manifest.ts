import { readFile } from "node:fs/promises";
import * as v from "valibot";

export const BuildManifestSchema = v.strictObject({
  out: v.pipe(v.string(), v.nonEmpty()),
  base: v.pipe(v.string(), v.regex(/^\/(?:[a-zA-Z0-9_-]+\/)*$/)),
  origin: v.pipe(
    v.string(),
    v.url(),
    v.check((value) => {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && value === url.origin;
    }, "Expected an HTTP(S) origin"),
  ),
  articles: v.pipe(v.number(), v.integer(), v.minValue(0)),
  digest: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)),
});
export type BuildManifest = Readonly<v.InferOutput<typeof BuildManifestSchema>>;

export async function readManifest(path: string): Promise<BuildManifest> {
  const raw: unknown = JSON.parse(await readFile(path, "utf8"));
  const result = v.safeParse(BuildManifestSchema, raw);
  if (!result.success)
    throw Error(
      `Invalid build manifest ${path}: ${result.issues.map((issue) => issue.message).join("; ")}`,
    );
  return result.output;
}
