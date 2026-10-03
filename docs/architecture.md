# Architecture

The generator reads local configuration and content into plain records, computes one public collection, renders a file plan, validates references, and publishes a staged directory. It uses only local modules and Node's standard library. Browser files operate on already complete HTML.

| Boundary                       | Owner                                 | Verification                                           |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------ |
| Configuration and public URLs  | `lib/config.mjs`, `lib/urls.mjs`      | Invalid origins, unsafe links, nested paths            |
| Metadata and bounded Markdown  | `lib/content.mjs`, `lib/markdown.mjs` | Semantic output, diagnostics, escaping                 |
| Public collection              | `lib/publication.mjs`                 | Draft filtering, chronology, pagination, related posts |
| HTML and publication endpoints | `templates/`, `lib/outputs.mjs`       | Brand replacement and full artifact crawl              |
| Filesystem publication         | `scripts/build.mjs`                   | Install-free build, failures retain old output         |
| Reader interactions            | `public/assets/`                      | Real browser keyboard, theme, no-JS, overflow, axe     |

Templates receive records, never filesystem access. Every endpoint uses the filtered publication. The private `.preview/build.json` manifest records the output path, URL settings, article count, and deterministic digest; it is never copied into `dist/`.

The generator stages output beside the destination. It moves the previous output aside, promotes the staged output, then removes the backup. A failed promotion restores the old output. This is not an atomic exchange of nonempty directories. Concurrent builds targeting the same output are unsupported. The dev watcher serializes and coalesces builds in fresh child processes, so configuration edits take effect.

Vite+ checks formatting and JavaScript lint. Separate `allowJs`, `checkJs`, strict `noEmit` TypeScript projects cover every generator, template, script, and browser source file. Node tests prove deliberate errors fail each environment. The publication path never imports these tools.

The current implementation preserves the proposed bounded Markdown approach. It rejects all public symlinks, a stricter policy than allowing in-root symlinks. Images are responsive; the native generator does not discover raster dimensions. Authors should choose stable aspect ratios and optimize media before adding it. There is no media pipeline.

The spec's earlier status describes the research task. This new repository implements the chosen design. The source repositories are unchanged. Actual local verification is recorded in `docs/verification.md`; CI definitions do not imply remote runs have occurred.
