import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { readManifest } from "./manifest.ts";
import { basename, resolve } from "node:path";
import { projectRoot } from "./project-root.ts";
import { serve } from "./serve.ts";
export async function startDevelopment(drafts = false): Promise<void> {
  const manifestPath = resolve(
    projectRoot,
    drafts ? ".preview/drafts.json" : ".preview/build.json",
  );
  const output = resolve(projectRoot, drafts ? ".preview/drafts" : "dist");
  async function rebuild(): Promise<boolean> {
    return new Promise<boolean>((resolveDone) => {
      const child = spawn(
        process.execPath,
        [drafts ? "scripts/build-drafts.ts" : "scripts/build.ts"],
        {
          cwd: projectRoot,
          stdio: "inherit",
        },
      );
      child.once("error", () => resolveDone(false));
      child.once("exit", (code) => resolveDone(code === 0));
    });
  }
  if (!(await rebuild()))
    throw Error("Initial build failed. Fix the content before starting the preview.");
  let manifest = await readManifest(manifestPath);
  let server = await serve({
    root: output,
    noindex: drafts,
    base: manifest.base,
    attempts: process.env.PORT ? 1 : 10,
  });
  let busy = false,
    pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function drain(): Promise<void> {
    pending = true;
    if (busy) return;
    busy = true;
    try {
      while (pending) {
        pending = false;
        if (!(await rebuild())) continue;
        const next = await readManifest(manifestPath);
        if (next.base === manifest.base) continue;
        const address = server.address();
        await new Promise<void>((ok, fail) =>
          server.close((error) => (error ? fail(error) : ok())),
        );
        server = await serve({
          root: output,
          noindex: drafts,
          base: next.base,
          port: typeof address === "object" && address ? address.port : undefined,
        });
        manifest = next;
      }
    } finally {
      busy = false;
    }
  }
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void drain().catch((error) => console.error(error));
    }, 150);
  };
  for (const path of ["content", "public", "themes", "src", "scripts"])
    watch(resolve(projectRoot, path), { recursive: true }, () => {
      changed();
    });
  watch(projectRoot, { recursive: false }, (_event, filename) => {
    if (filename == null || basename(String(filename)) === "site.config.mjs") changed();
  });
  if (drafts) console.log(`Local drafts: ${manifest.base}drafts/ (never upload .preview/)`);
  console.log("Watching. Refresh the browser after a successful rebuild.");
}
