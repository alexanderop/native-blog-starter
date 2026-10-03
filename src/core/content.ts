import { DiagnosticError } from "./diagnostics.ts";
import * as v from "valibot";
import { markdown } from "./markdown.ts";
import { PageMetadataSchema, PostMetadataSchema, logicalRoute } from "./schemas.ts";
import type {
  Config,
  ContentSource,
  Page,
  PublishedPost,
  PageMetadata,
  PostMetadata,
} from "./types.ts";
export function parseContent(
  source: string,
  file: string,
  author: string,
  page?: false,
): PostMetadata & { readonly body: string };
export function parseContent(
  source: string,
  file: string,
  author: string,
  page: true,
): PageMetadata & { readonly body: string };
export function parseContent(
  source: string,
  file: string,
  author: string,
  page: boolean,
): (PostMetadata | PageMetadata) & { readonly body: string };
export function parseContent(
  source: string,
  file: string,
  author: string,
  page = false,
): (PostMetadata | PageMetadata) & { readonly body: string } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end < 1)
    throw new DiagnosticError({ source: file, line: 1, message: "Missing frontmatter" });
  const data: Record<string, unknown> = {};
  const allowed = Object.keys(page ? PageMetadataSchema.entries : PostMetadataSchema.entries);
  const fail = (line: number, message: string): never => {
    throw new DiagnosticError({ source: file, line, message });
  };
  for (let i = 1; i < end; i++) {
    const pair = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!pair) return fail(i + 1, "Expected field: value");
    const [, key, value] = pair;
    if (!allowed.includes(key) || Object.hasOwn(data, key))
      fail(i + 1, `Unknown or duplicate field ${key}`);
    if (["draft", "featured"].includes(key)) {
      if (!/^(true|false)$/.test(value)) fail(i + 1, `${key} must be true or false`);
      data[key] = value === "true";
    } else if (key === "tags") {
      if (!/^\[(?:\s*[a-zA-Z0-9 -]+\s*(?:,\s*[a-zA-Z0-9 -]+\s*)*)?\]$/.test(value))
        fail(i + 1, "tags must be an array of plain names");
      data[key] = [
        ...new Set(
          value
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
    } else {
      if (/^["']/.test(value) && value.at(-1) !== value[0]) fail(i + 1, "Unclosed quoted string");
      data[key] = value.replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  const raw = page
    ? { title: data.title, description: data.description }
    : {
        ...data,
        author: data.author ?? author,
        tags: data.tags ?? [],
        draft: data.draft ?? false,
        featured: data.featured ?? false,
      };
  const parsed = page ? v.safeParse(PageMetadataSchema, raw) : v.safeParse(PostMetadataSchema, raw);
  if (!parsed.success) {
    const issue = parsed.issues[0];
    const key = String(issue.path?.[0]?.key ?? "metadata");
    return fail(
      Math.max(1, lines.findIndex((line) => line.startsWith(`${key}:`)) + 1),
      data[key] === undefined ? `Missing ${key}` : issue.message,
    );
  }
  return { ...parsed.output, body: lines.slice(end + 1).join("\n") };
}

export function collect(
  sources: readonly ContentSource[],
  config: Config,
): { readonly posts: readonly PublishedPost[]; readonly pages: readonly Page[] } {
  const posts: PublishedPost[] = [],
    pages: Page[] = [];
  for (const input of sources.toSorted((a, b) => a.file.localeCompare(b.file))) {
    try {
      if (input.kind === "page") {
        const data = parseContent(input.source, input.file, config.author, true);
        const rendered = markdown(data.body, config.basePath);
        pages.push({
          ...data,
          ...rendered,
          kind: "page",
          slug: input.slug,
          route: logicalRoute(`/${input.slug}/`),
          minutes: Math.max(1, Math.ceil(rendered.text.split(/\s+/).length / 220)),
        });
      } else {
        const data = parseContent(input.source, input.file, config.author);
        if (data.draft) continue;
        const rendered = markdown(data.body, config.basePath);
        posts.push({
          ...data,
          ...rendered,
          kind: "post",
          draft: false,
          slug: input.slug,
          route: logicalRoute(`/blog/${input.slug}/`),
          minutes: Math.max(1, Math.ceil(rendered.text.split(/\s+/).length / 220)),
        });
      }
    } catch (error) {
      if (error instanceof DiagnosticError) throw error;
      throw new DiagnosticError({
        source: input.file,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { posts, pages };
}
