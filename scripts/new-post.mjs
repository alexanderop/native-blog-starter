import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "../lib/config.mjs";
import { projectRoot } from "./build.mjs";
const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
  throw Error("Usage: pnpm new-post lowercase-hyphenated-slug");
const c = await loadConfig(projectRoot);
await writeFile(
  resolve(projectRoot, "content/blog", slug + ".md"),
  `---\ntitle: ${slug.replaceAll("-", " ")}\ndescription: A short description.\ndate: ${new Date().toISOString().slice(0, 10)}\nauthor: ${c.author}\ncategory: Notes\ntags: []\ndraft: true\n---\n\n## Start here\n\nWrite your note.\n`,
  { flag: "wx" },
);
console.log(`Created draft content/blog/${slug}.md`);
