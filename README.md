# Native blog starter

A small editorial blog you can own. Write Markdown, configure your identity, and publish static HTML. Native scrolling, a spatial editorial grid, a sticky reading guide, local fonts, and light/dark themes are included.

The published site requires no packages. Build tooling uses TypeScript and Valibot. Shiki adds syntax colors during the build, with no highlighter runtime in the browser. Vite+, Oxc, Playwright, axe, and fast-check provide contributor checks. There is no framework, hydration, bundler, Markdown package, analytics, or package CDN in the publication.

## Start

Use Node 24.11 or later in the 24.x line. `.node-version` pins the tested contributor runtime to 24.12.0. Use pnpm 10.28.2.

```sh
pnpm install
pnpm dev
# http://127.0.0.1:5260
```

The watcher rebuilds after changes. Refresh your browser yourself. A failed edit prints a diagnostic and retains the last successful publication. `PORT=5300 pnpm dev` selects an explicit port. Without it, development startup tries up to ten ports.

After installing dependencies, you can also run the tooling directly:

```sh
node scripts/build.ts
node scripts/serve.ts
```

## Theme demo

Run `pnpm build:demo` followed by `pnpm preview` to compare editorial, minimal, and paper using the two sample posts. The theme switcher keeps the current article and works without JavaScript. [Theme documentation](docs/themes.md) covers custom themes and the demo build.

## Make it yours

1. Edit `site.config.mjs`. Set your name, description, author, language, public origin, and navigation.
2. Replace `public/brand/lantern.svg` and `public/brand/social.svg`, or configure other local files. Use a PNG/JPEG social image if your social platform does not support SVG previews.
3. Replace `content/pages/about.md` and the two sample posts. You can delete every post. An empty journal is valid.
4. Run `pnpm new-post a-useful-note`. It creates a draft without overwriting an existing file.
5. Choose `editorial`, `minimal`, or `paper` with `theme` in `site.config.mjs`. Read [themes](docs/themes.md) to customize tokens or add your own local design.
6. Run `pnpm verify` before publishing.

Navigation is an array of `{ label, to }` entries. Internal destinations use `/about/`, regardless of the deployment prefix. Social links use the same shape and also accept HTTP(S) and mailto. `featuredSlug` is optional. `postsPerPage` defaults in the supplied configuration to ten. `article.contents` and `article.related` control those article sections. Unknown options fail the build.

## Author and publish

Read [the authoring contract](docs/authoring.md), [deployment guide](docs/deployment.md), and [architecture](docs/architecture.md).

```sh
SITE_URL=https://example.org BASE_PATH=/my-journal/ pnpm build
pnpm verify:static
pnpm preview
```

Deploy only `dist/`. The preview server is a loopback-only development tool. A production static-file service can serve the same files on a Node host.

Posts, archives, category pages, About, contents links, and downloads work without JavaScript. Finder, theme controls, and copy buttons progressively enhance the HTML. Finder supports `/`, Command/Ctrl+K, arrow keys, Enter, Escape, and retry after a fetch failure.

## Verify

```sh
pnpm exec playwright install chromium
pnpm verify
pnpm test:visual # reviewed macOS references
```

`verify` runs Vite+ format/lint checks, strict TypeScript and browser JavaScript checking, core boundary and color policy checks, Node tests, the owner publication build, artifact validation, and browser journeys. Fast-check generates parser and metadata round-trip cases inside the Node suite. See [testing invariants and replaying failures](docs/testing.md). Browser tests build their own 23-post fixtures at root and nested paths. They do not require your sample posts or brand.

`pnpm format` deliberately writes formatting changes. `pnpm check` never fixes files. `pnpm test:visual --update-snapshots` updates references only after intentional visual changes; inspect every changed image. Fixture visual references use the supplied theme, while brand/content customization checks are independent of appearance.

CI defines Linux behavior checks and macOS screenshots. A separate manually triggered Pages workflow validates and uploads the same artifact. Creating this local project does not activate GitHub hosting.

## Tooling boundary

The pinned Vite+ 1.0.0 installation supplies Vite 8.3.1, Vitest 5.0.1, Oxlint 1.85.0, and Oxfmt 0.70.0. Vite/Vitest overrides follow the [local CLI documentation](https://viteplus.dev/guide/local-cli). pnpm may report a Vite peer-range warning because the core alias has package version 1.0.0 while exposing Vite 8.3.1. We do not use Vitest or Vite's build pipeline.

The [Vite+ check](https://viteplus.dev/guide/check) type-aware path is opt-in. This starter uses separate strict `tsc` projects so Node and browser globals cannot leak into one another. Negative tests prove both projects reject a deliberate type error.

`pnpm build` runs our Node generator. `pnpm exec vp run build` also invokes that script. `pnpm exec vp build` invokes Vite and is not this project's build command. Task caching is not configured.

Code and original artwork use the MIT license. Self-hosted fonts retain their original licenses under `public/fonts/`. The [research specification](docs/specs/reusable-blog-starter.md) and [arena record](docs/specs/reusable-blog-starter-arena.md) preserve the design decisions; implementation notes live in the architecture guide.
