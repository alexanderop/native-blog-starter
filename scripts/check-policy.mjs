import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { projectRoot } from "./build.mjs";
for (const dir of ["lib", "templates", "scripts", "public/assets"])
  for (const entry of await readdir(resolve(projectRoot, dir))) {
    const text = await readFile(resolve(projectRoot, dir, entry), "utf8");
    if (/\.(m?js)$/.test(entry) && entry !== "check-policy.mjs")
      for (const match of text.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g))
        if (!match[1].startsWith(".") && !match[1].startsWith("node:"))
          throw Error(`${dir}/${entry}: Build/browser dependency ${match[1]}`);
    if (
      entry.endsWith(".css") &&
      entry !== "tokens.css" &&
      /(?:#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)\()/i.test(text)
    )
      throw Error(`${entry}: Define colors in tokens.css`);
  }
console.log("Native imports and semantic color policy passed");
