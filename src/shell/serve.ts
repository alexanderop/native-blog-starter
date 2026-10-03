import { createServer } from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { projectRoot } from "./project-root.ts";
const types: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};
export interface ServeOptions {
  readonly noindex?: boolean;
  readonly port?: number;
  readonly root?: string;
  readonly base?: string;
  readonly attempts?: number;
}
export async function serve({
  port = Number(process.env.PORT ?? 5260),
  root = resolve(projectRoot, "dist"),
  base = "/",
  attempts = 1,
  noindex = false,
}: ServeOptions = {}): Promise<import("node:http").Server> {
  root = await realpath(root);
  const server = createServer(async (req, res) => {
    if (noindex) res.setHeader("X-Robots-Tag", "noindex, nofollow");
    try {
      if (!["GET", "HEAD"].includes(req.method ?? "")) {
        res.writeHead(405, { Allow: "GET, HEAD" });
        res.end();
        return;
      }
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      if (!path.startsWith(base) || path.includes("\\")) throw Error("Not found");
      let target = resolve(root, path.slice(base.length) || "index.html");
      if (target !== root && !target.startsWith(root + sep)) throw Error("Not found");
      if ((await stat(target)).isDirectory()) target = resolve(target, "index.html");
      target = await realpath(target);
      if (!target.startsWith(root + sep)) throw Error("Not found");
      const body = await readFile(target);
      res.writeHead(200, {
        "Content-Type": types[extname(target)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        req.method === "HEAD"
          ? undefined
          : await readFile(resolve(root, "404.html")).catch(() => Buffer.from("Not found")),
      );
    }
  });
  for (let i = 0; i < attempts; i++) {
    try {
      await new Promise<void>((ok, fail) => {
        const listening = () => {
          server.off("error", error);
          ok();
        };
        const error = (err: Error) => {
          server.off("listening", listening);
          fail(err);
        };
        server.once("error", error);
        server.once("listening", listening);
        server.listen(port + i, "127.0.0.1");
      });
      break;
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "EADDRINUSE") ||
        i === attempts - 1
      )
        throw error;
    }
  }
  const address = server.address();
  if (address && typeof address === "object")
    console.log(`Preview: http://127.0.0.1:${address.port}${base}`);
  return server;
}
