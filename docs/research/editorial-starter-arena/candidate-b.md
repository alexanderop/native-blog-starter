# Design proposal for the reusable native editorial starter

## Recommendation

Build a small static blog generator whose output has zero browser runtime dependencies. Allow pinned build and development dependencies. Keep Node as the generator runtime, add `markdown-it` for CommonMark authoring, and add Vite+ as the single development tool for formatting, linting, type checks, and unit tests. Do not move page generation into Vite.

This contract resolves the ambiguous phrase "zero dependencies" into three promises.

| Boundary | Proposed promise |
| --- | --- |
| Published site | No framework, package loader, CDN script, or client runtime dependency. Generated HTML contains each article in full. JavaScript adds optional interactions. |
| Generator | Node plus a small, pinned set of packages installed through pnpm. `markdown-it` is the only v1 content dependency. |
| Contributor tools | Vite+ and Playwright are development dependencies. They never ship in `dist/`. |

The current repository makes the stronger claim that a clean copy builds without `node_modules`. That behavior is verified by `tests/build.test.mjs`, not merely stated in the README. Adopting `markdown-it` deliberately ends that build-time guarantee. Keep the current repository or a tagged release as the "no install" edition if that property remains a product goal. Do not call the new contract dependency-free.

The limited v1 is a blog starter, not a framework. A new owner should change one config file, replace tokens and artwork, delete sample posts, write normal Markdown, run one command, and deploy `dist/`.

## Current evidence and problems to fix

The existing native edition already proves valuable behavior. It emits complete article HTML, RSS, a sitemap, `robots.txt`, a search index, Markdown downloads, a 404 page, and base-path-aware links. It excludes files under `_drafts` because the collector reads only direct files in `content/blog`, and excludes `draft: true` before generating any publication output. Node tests, Playwright journeys, axe audits, and macOS screenshots exist.

Several current implementation details prevent this from becoming a dependable starter.

- `lib/content.mjs` implements a private Markdown dialect. It omits ordinary lists and images, and its inline parser cannot claim CommonMark behavior.
- `templates/render.mjs` contains the shell, homepage, article, workbench, footer, and Finder markup in large template strings. Branding text is mixed into those templates.
- `site.mjs` declares `showWorkbench` and `showSpaceFooter`, but the renderer ignores both flags.
- The navigation compares paths with different slash forms. For example, generated `about` and configured `/about/` do not match.
- The homepage emits every post. Client code hides later rows, so "Load more" reduces visibility but does not reduce the initial document.
- Related posts are the first posts other than the current one. Category and tags do not affect the selection.
- Theme fallback depends on `theme.js`. The article remains readable without JavaScript, but the explicit theme control and persisted preference do not.
- CSS has grown through inherited overrides. A starter owner cannot tell which declaration is authoritative without tracing much of `styles.css`.

These are verified against commit `0a250ff` and the live checkout. The checkout also had external, uncommitted work in `README.md`, `scripts/dev.mjs`, `scripts/serve.mjs`, and `tests/serve.test.mjs` during this review. This proposal does not treat that preview-server work as part of the committed baseline. The rest of this document specifies proposed behavior.

## Onboarding and configuration

The first-run path should have four steps.

1. Run `pnpm install` and `pnpm dev`.
2. Edit `site.config.ts` and `public/assets/tokens.css`.
3. Delete `content/blog/_examples/` and add a post under `content/blog/`.
4. Run `pnpm verify`, then publish `dist/`.

Use one checked `site.config.ts` object for publication identity and behavior. It should contain `name`, `wordmark`, `description`, `language`, `author`, `siteUrl`, `basePath`, `navigation`, `categories`, `featuredSlug`, social links, and optional section settings. Optional sections should be data, not disconnected booleans. `workbench: null` omits the section. A populated `workbench` object supplies its heading and entries. Apply the same rule to the decorative footer.

Treat environment values as deployment overrides. `SITE_URL` and `BASE_PATH` override config in CI. Validate the resolved config before reading content. `siteUrl` is an origin without a path. `basePath` is `/` or one slash-delimited repository prefix with leading and trailing slashes. A single URL helper owns links for pages, assets, feeds, canonical URLs, Markdown downloads, and search results.

Normalize every logical page path to a trailing-slash form before both rendering and navigation comparison. The home path is `/`. This fixes current-page state without browser repair code.

## Content and Markdown policy

Use Markdown files with constrained frontmatter. Required fields are `title`, `description`, `date`, and `category`. Optional fields are `author`, `tags`, `featured`, `draft`, `image`, and `imageAlt`. The site author is the default author. Validate dates as real ISO calendar dates, slugs as lowercase letters, digits, and hyphens, categories against config, and images as local paths or HTTPS URLs. Reject unknown fields in v1 so spelling mistakes fail the build.

Keep the current small frontmatter parser for v1. Its scalar and array rules are documented and already tested. Do not call it YAML. A YAML dependency can wait until multiline metadata or nested values have a real use.

Replace the owned body parser with `markdown-it`, configured with raw HTML disabled. The project describes itself as CommonMark-compatible and safe by default, and it supports extension rules without requiring a browser runtime ([markdown-it documentation](https://markdown-it.github.io/markdown-it/)). V1 supports CommonMark paragraphs, headings, ordered and unordered lists, links, images, blockquotes, fenced code, inline code, emphasis, and thematic breaks. Keep tables and the three existing editorial blocks through small, explicit renderer rules. Resolve root-relative image and link targets through the base-path helper. Copy referenced local images into `dist` through the normal public asset path.

Reject raw HTML rather than sanitize it. Do not evaluate Markdown, import components, or permit arbitrary attributes. Authors who need a new editorial construct add one named block with parser tests and rendered-browser coverage.

This choice costs the no-install build. It buys a familiar authoring format and removes an expanding parser maintenance obligation. Keeping the private parser is a valid alternate edition, but it is a poor default for a reusable blog because lists and images are basic content, not advanced extensions.

## Output and module ownership

Generated output remains static and host-agnostic.

- `/index.html` contains the first page of posts and real links to archive pages such as `/page/2/`. Client filtering may enhance the current page, but all posts remain reachable without JavaScript.
- `/blog/<slug>/index.html` contains the complete article, metadata, table of contents, deterministic related posts, and Markdown download link.
- `/search.json`, `/rss.xml`, `/sitemap.xml`, `/robots.txt`, `/404.html`, and `/markdown/blog/<slug>.md` remain publication outputs.
- `build-manifest.json` records the resolved base path, public post count, and generated routes for verification. It contains no draft metadata.

Choose related posts by shared category first, then shared tag count, then reverse publication date, with the slug as the final stable tie-breaker. Omit the section when fewer than two candidates exist.

Split ownership by output concern while keeping the call graph flat.

- `config/resolve.ts` validates config and environment overrides.
- `content/frontmatter.ts` parses and validates metadata.
- `content/markdown.ts` configures `markdown-it` and returns HTML plus headings.
- `content/collect.ts` is the only module that can turn source files into public posts. Draft exclusion happens here before downstream modules receive posts.
- `render/layout.ts`, `render/home.ts`, `render/article.ts`, and `render/pages.ts` return page HTML. Small escape and attribute helpers remain shared.
- `publish/build.ts` writes pages and publication endpoints from the already filtered collection.
- `public/assets/app.js` owns progressive interactions only. `theme.js` stays a tiny early script to avoid a color flash and to persist an explicit preference.

Do not create a component system, plugin API, generic template language, or package workspace. Four render modules are enough to make the markup reviewable without turning strings into a framework.

## Commands and Vite+

Vite+ helps with contributor tooling, but its built-in server and build are the wrong entry points for this generator. Official docs say `vp dev` always starts Vite's server and `vp build` always runs Vite's production build. Project scripts with the same names require `vp run dev` and `vp run build` ([Dev](https://viteplus.dev/guide/dev), [Build](https://viteplus.dev/guide/build), [Run](https://viteplus.dev/guide/run)). Keep the public commands conventional through package scripts.

| Command | Contract |
| --- | --- |
| `pnpm dev` | Run the owned Node watch, build, and preview loop. |
| `pnpm build` | Run the owned static generator once. |
| `pnpm preview` | Serve `dist` locally. This is never a production server. |
| `pnpm check` | Run `vp check` for format, lint, and type checks. |
| `pnpm test` | Run `vp test`; tests import from `vite-plus/test`. |
| `pnpm verify` | Check, unit test, build, and run Playwright journeys in sequence. |

Vite+ documents `vp check` as the combined formatter, Oxlint, and type-check command, with type checking enabled through its lint settings ([Check](https://viteplus.dev/guide/check)). `vp fmt` uses Oxfmt and `vp lint` uses Oxlint ([Format](https://viteplus.dev/guide/fmt), [Lint](https://viteplus.dev/guide/lint)). Its test command is Vitest, does not watch by default, and currently requires Node `^22.18.0 || ^24.11.0 || >=26.0.0` ([Test](https://viteplus.dev/guide/test)). Raise the starter engine to `>=22.18` and test Node 22 and 24 in CI. Install Vite+ locally so the lockfile pins the toolchain. Follow its documented pnpm overrides for the bundled Vite and Vitest versions instead of allowing duplicate instances ([project-local CLI](https://viteplus.dev/guide/local-cli)).

Do not use Vite's asset pipeline in v1. The generator already owns HTML routes, copied public files, base paths, feeds, and Markdown downloads. Moving only CSS and JavaScript through Vite would introduce two output owners and two base-path systems without a user benefit.

## Testing, CI, and custom branding

Keep tests at the boundary where a failure appears.

- Unit tests cover config validation, URL normalization, frontmatter errors, Markdown fixtures, heading IDs, escaping, related-post order, pagination, and draft filtering.
- Build tests create a temporary fixture publication with a custom name, custom categories, a custom base path, a draft sentinel, lists, images, and long code. They assert literal generated HTML, URLs, endpoint contents, and the absence of the sentinel everywhere in `dist`.
- Playwright runs against the built output. Journeys cover keyboard Finder, theme persistence across reload, table-of-contents navigation, long titles and code, pagination without JavaScript, Markdown downloads, and custom branding in metadata and visible text.
- Axe runs in both themes at desktop and phone sizes. Reviewed macOS screenshots cover the home page, an article, and Finder. CI keeps Linux behavior and macOS visual jobs separate.

The branding fixture matters. A starter can pass all example-site tests while hard-coded "Fieldnotes" strings remain in titles, labels, feeds, or the footer. One end-to-end fixture should fail on every occurrence of the default brand outside the example content directory.

Run root-hosting and `/repo/` builds in CI. Crawl every generated HTML file and verify that each internal URL resolves inside `dist`. Assert that no draft title, slug, body sentinel, search record, feed item, sitemap URL, or Markdown file exists. Keep the JavaScript-disabled article journey because complete HTML is a core product promise.

## Deployment

Deploy only `dist/`. Include GitHub Pages workflow support and document any static host that serves directory indexes and `404.html`. Vite's deployment guide confirms that project Pages requires a `/<REPO>/` base and that `dist` is the standard static artifact ([Vite static deployment](https://vite.dev/guide/static-deploy.html)). The owned generator, rather than Vite, applies that base to every output.

The workflow installs with `pnpm install --frozen-lockfile`, runs `pnpm verify`, builds once with the Pages URL and base path, uploads `dist`, and deploys it. Custom domains use `/`. Repository Pages uses `/<repository>/`. Do not offer Node hosting in v1 because the generated site needs no production process.

## Migration phases

1. Freeze current behavior with fixtures. Add custom-brand, root-path, repository-path, draft-sentinel, and JavaScript-disabled acceptance cases before changing internals.
2. Establish the explicit dependency contract. Add Vite+, TypeScript checking for JavaScript or a measured TypeScript conversion, `markdown-it`, the new Node floor, and package scripts. Keep the current generator as the build command during this phase.
3. Replace body parsing. Port content fixtures to CommonMark, add lists and images, preserve editorial blocks, and compare generated routes and browser screenshots.
4. Resolve configuration and URL ownership. Replace ignored flags with nullable section data, normalize paths once, and remove browser-side navigation correction.
5. Split render modules and simplify CSS. Move each page renderer without changing its HTML first. Then remove superseded CSS declarations and review screenshots.
6. Add archive pagination and deterministic related posts. Update no-JavaScript journeys and the search index contract.
7. Rewrite onboarding and deployment docs around the final commands. Keep the earlier no-install edition available through a tag if desired.

Each phase ends with `pnpm verify` and both root and repository-path builds. Do not preserve transitional APIs after their callers move.

## Rejected alternatives and non-goals

Reject a Vite-owned application build for v1. Vite+ improves tooling, but its built-in build does not generate this publication model. Reject a framework migration, client router, hydration, server rendering, headless CMS, live preview editor, theme marketplace, plugin API, and arbitrary author components. Reject syntax highlighting until plain escaped code produces a demonstrated reader problem. Reject in-browser full-site search indexing because `search.json` is already a clear static boundary.

Keep two alternatives explicit. If building with no install matters more than normal Markdown, retain the owned subset and document it as a separate product contract. If broad Markdown interoperability matters, accept the pinned parser dependency as recommended here. A vendored parser would hide a dependency while making updates and security ownership worse.

## Acceptance criteria

- A new owner can replace all publication identity through config, tokens, and named assets without editing a renderer.
- `pnpm build` emits a deployable `dist/` at `/` and `/repo/`; every internal URL resolves in both builds.
- The output has no browser runtime package dependency and every article remains complete with JavaScript disabled.
- CommonMark lists, images, links, blockquotes, and fenced code render safely. Raw HTML and executable URLs do not.
- `_drafts` and `draft: true` content leave no bytes or records in any publication output.
- Navigation current state uses normalized generated paths. Optional sections follow config. Related posts follow the documented deterministic rule.
- Archive pages make every post reachable without JavaScript. The homepage does not embed the entire archive.
- `pnpm verify` covers static checks, unit behavior, a production build, browser journeys, accessibility, and the custom-brand fixture.
- CI verifies Node 22 and 24, root and repository paths, Linux browser behavior, and reviewed macOS visuals.
- The README states the three dependency boundaries plainly and never claims that the generator builds without installation.

The proposal applies Laziness Protocol by keeping one package, four render modules, and no extension framework. Experience First changes the dependency decision because familiar Markdown is more valuable to a blog author than a no-install badge. Test Where the Failure Happens keeps URL, draft, keyboard, persistence, accessibility, and appearance checks at their real boundaries.
