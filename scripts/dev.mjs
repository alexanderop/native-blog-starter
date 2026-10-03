import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { projectRoot } from "./build.mjs";
import { serve } from "./serve.mjs";
async function rebuild() {
  return new Promise((resolveDone) => {
    const child = spawn(process.execPath, ["scripts/build.mjs"], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    child.once("error", () => resolveDone(false));
    child.once("exit", (code) => resolveDone(code === 0));
  });
}
if (!(await rebuild()))
  throw Error("Initial build failed. Fix the content before starting the preview.");
const manifest = JSON.parse(await readFile(resolve(projectRoot, ".preview/build.json"), "utf8"));
let server = await serve({ base: manifest.base, attempts: process.env.PORT ? 1 : 10 });
let busy = false,
  pending = false;
/** @type {ReturnType<typeof setTimeout>|undefined} */ let timer;
async function drain() {
  pending = true;
  if (busy) return;
  busy = true;
  try {
    while (pending) {
      pending = false;
      if (!(await rebuild())) continue;
      const next = JSON.parse(await readFile(resolve(projectRoot, ".preview/build.json"), "utf8"));
      if (next.base === manifest.base) continue;
      const address = server.address();
      await new Promise((ok) => server.close(ok));
      server = await serve({
        base: next.base,
        port: typeof address === "object" && address ? address.port : undefined,
      });
      manifest.base = next.base;
    }
  } finally {
    busy = false;
  }
}
for (const path of ["content", "public", "lib", "templates", "site.config.mjs"])
  watch(resolve(projectRoot, path), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void drain().catch((error) => console.error(error));
    }, 150);
  });
console.log("Watching. Refresh the browser after a successful rebuild.");
