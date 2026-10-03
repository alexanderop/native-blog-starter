import type { ProjectInputs, Result, ValidatedBuildPlan, Post } from "./types.ts";
import { prepareBuild } from "./prepare-build.ts";
import { parseContent } from "./content.ts";
import { markdown } from "./markdown.ts";
import { logicalRoute, outputPath } from "./schemas.ts";
import { article } from "./templates/article.ts";
import { layout } from "./templates/layout.ts";
import { page } from "./templates/page.ts";
import { escape as e, publicUrl } from "./urls.ts";
import { validate } from "./validate.ts";
import { DiagnosticError } from "./diagnostics.ts";

// Drafts are separate pages in a local artifact, never members of Publication.posts.
export function prepareDraftPreview(inputs: ProjectInputs): Result<ValidatedBuildPlan> {
  const built = prepareBuild(inputs);
  if (!built.ok) return built;
  const plan = built.value;
  const c = plan.config;
  const files = new Map(plan.files);
  const drafts: Post[] = [];
  try {
    for (const source of inputs.sources) {
      if (source.kind !== "post") continue;
      const data = parseContent(source.source, source.file, c.author);
      if (!data.draft) continue;
      try {
        const rendered = markdown(data.body, c.basePath, inputs.assets);
        const post: Post = {
          ...data,
          ...rendered,
          kind: "post",
          slug: source.slug,
          route: logicalRoute(`/blog/${source.slug}/`),
          minutes: Math.max(1, Math.ceil(rendered.text.split(/\s+/).length / 220)),
        };
        const path = outputPath(`blog/${post.slug}/index.html`);
        if (files.has(path)) throw Error(`Draft preview output collision: ${path}`);
        files.set(
          path,
          layout(
            c,
            post.route,
            `Draft: ${post.title}`,
            post.description,
            article(post, plan.publication, c),
          ),
        );
        drafts.push(post);
      } catch (error) {
        throw new DiagnosticError({
          source: source.file,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const indexPath = outputPath("drafts/index.html");
    if (files.has(indexPath)) throw Error("/drafts/ is reserved while previewing drafts");
    files.set(
      indexPath,
      layout(
        c,
        "/drafts/",
        "Local drafts",
        "Unpublished local previews",
        page(
          "Local drafts",
          drafts.length
            ? `<ul>${drafts.map((p) => `<li><a href="${e(publicUrl(c.basePath, p.route))}">${e(p.title)}</a></li>`).join("")}</ul>`
            : "<p>No drafts yet. Create one with pnpm new-post.</p>",
        ),
      ),
    );
    for (const [path, value] of files) {
      if (path.endsWith(".html") && typeof value === "string")
        files.set(
          path,
          value
            .replace("</head>", '<meta name="robots" content="noindex, nofollow"></head>')
            .replace(
              /(<a class="skip-link"[^>]*>Skip to content<\/a>)/,
              `$1<aside class="draft-preview-banner" aria-label="Draft preview">Local draft preview · <a href="${c.basePath}drafts/">View drafts</a></aside>`,
            ),
        );
    }
    files.set(outputPath("robots.txt"), "User-agent: *\nDisallow: /\n");
    validate(files, c.basePath, c.siteUrl);
    return { ok: true, value: { ...plan, files } };
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof DiagnosticError
          ? error.diagnostic
          : {
              source: "draft preview",
              message: error instanceof Error ? error.message : String(error),
            },
      ],
    };
  }
}
