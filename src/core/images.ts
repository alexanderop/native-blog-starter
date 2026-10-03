import { imageSize } from "image-size";
import * as v from "valibot";
import { safeLink } from "./urls.ts";

const dimension = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100_000));
const DimensionsSchema = v.object({ width: dimension, height: dimension });
type Dimensions = Readonly<v.InferOutput<typeof DimensionsSchema>>;

export function imageDimensions(
  url: string,
  assets?: ReadonlyMap<string, Uint8Array>,
  width?: string,
  height?: string,
): Dimensions | undefined {
  safeLink(url);
  if (width !== undefined || height !== undefined)
    return v.parse(DimensionsSchema, { width: Number(width), height: Number(height) });
  // Standalone grammar tests may render without an asset snapshot. Site builds always supply it.
  if (!assets) return undefined;
  const path = decodeURIComponent(new URL(url, "https://local.invalid").pathname.slice(1));
  const bytes = assets.get(path);
  if (!bytes) throw Error(`Missing image asset ${url}`);
  try {
    const measured = imageSize(bytes);
    const rotated = measured.orientation !== undefined && measured.orientation >= 5;
    return v.parse(DimensionsSchema, {
      width: rotated ? measured.height : measured.width,
      height: rotated ? measured.width : measured.height,
    });
  } catch {
    throw Error(
      `Cannot determine image dimensions for ${url}; use {width=960 height=360} with the actual dimensions`,
    );
  }
}
