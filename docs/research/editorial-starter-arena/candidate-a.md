# A reusable native editorial starter

## Recommendation

Keep the Node generator and dependency-free browser output. Make ordinary customization possible through content, site configuration, and semantic CSS tokens. Keep Vite+ optional for development checks. Do not put Vite in charge of publishing this version.

The contract is precise. Building and previewing requires Node and this repository, without an install. Quality tooling may have development dependencies. Browser output has no third-party JavaScript dependencies. A Markdown package remains a build dependency even when package.json lists it under devDependencies. Adopting one would explicitly change the first promise.

This proposal preserves the current repository rule. It also identifies the alternative worth choosing if broad Markdown compatibility matters more than install-free builds. Nothing here authorizes implementation or a migration of the Nuxt sibling.

The Laziness Protocol shaped the decision to keep one package, remove demo-only sections, and avoid a plugin API. Test Where the Failure Happens shaped the requirement for actual generated-site journeys and customization fixtures. Both principle instructions were read. Throughput checkpoint is n/a for this read-only investigation.

## What the repository establishes

The inspected native checkout already has a useful foundation. `AGENTS.md` requires local or node: imports in build and runtime code. `package.json` contains only Playwright and axe development packages. `tests/build.test.mjs` builds an isolated copy without node_modules. `.github/workflows/verify.yml` has separate Linux behavior and macOS visual jobs. `scripts/check-static.mjs` checks generated links and search anchors under `/fieldnotes/`.

These are source observations at commit `0a250ff` plus live uncommitted work, not claims that tests passed in this investigation. Existing changes in `README.md`, `scripts/dev.mjs`, `scripts/serve.mjs`, and untracked `tests/serve.test.mjs` remain untouched.

The main gaps are product boundaries rather than framework capability.

- `site.mjs` contains `showWorkbench` and `showSpaceFooter`, but `templates/render.mjs` always renders both sections.
- Navigation compares `about` against `/about`, so configured non-home links do not receive the expected current-page state.
- Brand labels, footer copy, the RSS label, and About content contain hardcoded Fieldnotes text outside configuration.
- The homepage renders every post summary and browser code hides rows for filtering and load-more. It does not embed every article body in homepage HTML. The separate search index does include article bodies.
- Related links are the first three other posts, without a relevance rule.
- `tokens.css` switches themes through a JavaScript-applied class. No-JavaScript readers always receive the light tokens.
- `styles.css` ends with repeated enhancement overrides. The renderer contains long markup strings that combine unrelated page concerns.
- The owned Markdown parser has no image or list support. Even the README's underscore emphasis example does not match its asterisk-only emphasis transformation.

The Nuxt README and design/testing documents establish the editorial identity worth retaining. Keep the spatial grid, sticky reading guide, native scrolling, readable theme roles, local fonts and license files. Do not transplant Vue-specific lint contracts into plain HTML.

## The clone-to-publication experience

A new owner edits `site.mjs`, `public/assets/tokens.css`, `public/brand/`, and Markdown under `content/`. They should not need to inspect the generator to change a name, logo, navigation item, author, introduction, or About page.

Ship two sample posts, one authoring reference, and an About page. Move the remaining demonstration corpus into test fixtures or documentation examples. Remove the workbench and decorative space footer from the default product. Remove their ineffective flags and dedicated browser behavior rather than inventing section configuration. Preserve the lantern as replaceable original sample artwork.

The first-run guide has four observable milestones. Run `node scripts/dev.mjs` and see the sample homepage. Change the publication name and see it in the header and metadata. Add a post and follow its generated link. Set the public origin and publish only `dist/`.

Offer a small `new-post` script that writes one valid file and refuses to overwrite an existing path. No setup wizard, account creation, or remote content dependency belongs in v1. Include a customization checklist that points to exact files and a deployment guide separate from the authoring reference.

## Authoring and configuration contracts

Keep flat `content/blog/<slug>.md` files. A slug matches lowercase ASCII letters, digits, and hyphens and cannot be empty. Use the filename as the stable URL identity. Changing a title does not change the URL. Moving or renaming a published file requires an owner-managed redirect outside v1.

Required post metadata is `title`, `description`, `date`, and `category`. `author` defaults to the configured author. Optional metadata is `tags`, `draft`, and `featured`. Dates use validated calendar dates in YYYY-MM-DD form. Tags are strings with duplicate removal. Unknown keys and duplicate fields fail with filename and field diagnostics. Categories derive from published content rather than a second list that can drift.

Keep the current metadata format explicitly named a restricted frontmatter format, not YAML. Document quoting and comma restrictions. Reject unsupported syntax instead of accepting malformed values. Do not add nested metadata, automatic scheduling, series, or multiple author profiles in v1. A future date is still published unless `draft` is true.

Configuration contains publication identity, language, default author, introduction, navigation, logo/favicon paths, social image, and optional featured-post slug. Validate referenced posts and pages. No configured featured post means a chronological homepage. Order posts by date descending and slug as the tie-breaker. Treat featured placement as a separate homepage choice so it cannot reorder RSS.

Read authored About and handbook text from `content/pages/`. These are fixed supported page routes, not an arbitrary route-generation API. Escape configuration and metadata at rendering boundaries. Only the renderer's own generated article HTML enters the layout as trusted HTML.

## Markdown and assets

V1 needs ordinary paragraphs, headings, emphasis, links, blockquotes, fenced code, tables, images, and lists. Lists and images are core author expectations in the [CommonMark reference](https://commonmark.org/help/). Their absence is a release blocker for a reusable blog starter.

Preserve a deliberately bounded grammar. Add flat ordered and unordered lists and standalone images. Support headings h2 through h4 with shared unique IDs across the whole article. Document unsupported nesting and reference links. Add fixtures for syntax interactions, Unicode headings, escaping, empty alt text, fenced-code delimiters, and malformed blocks. Do not claim CommonMark compliance. Reduce custom blocks to the existing callout and figure forms with explicit validated attributes. Convert media-tabs examples into ordinary sequential sections.

Local authored URLs start with a site-root path such as `/media/example.webp` or `/blog/a-note/`. The build prepends BASE_PATH exactly once. Fragment links remain local. External links accept HTTP, HTTPS, and mailto. Reject executable schemes, protocol-relative URLs, traversal, backslashes, and control characters. Validate local target files and article fragments after all routes are known.

Images live in `public/media/`, with descriptive alt text unless explicitly decorative. Public assets are intentionally public, including unused files. Warn against storing private draft media there. Copy images unchanged, with lazy loading below the initial viewport and responsive CSS. No remote downloads, transformation service, format conversion, or inferred dimensions in v1. Owners can prepare optimized files outside the starter. Preserve font licenses during replacement.

This grammar remains the largest maintenance tradeoff. If users need arbitrary CommonMark documents, use a maintained parser rather than extending regexes indefinitely. [markdown-it](https://markdown-it.github.io/markdown-it/) documents CommonMark support and configurable rules. That alternative changes the build-dependency promise and needs an explicit contract decision before implementation. Do not ship two parser engines or quietly vendor one.

## URLs and generated output

SITE_URL is an HTTP or HTTPS origin, without credentials, path, query, or fragment. Reject extra components instead of silently discarding them. BASE_PATH is `/` or a normalized directory prefix such as `/journal/`. All generated internal URLs use trailing slashes for HTML routes. File URLs retain their extensions.

One URL module owns route normalization, local public URLs, and absolute canonical URLs. Navigation compares normalized routes before prefixing the base. Canonical links, sharing links, feed entries, sitemap entries, Markdown downloads, CSS assets, Finder results, and the 404 page use that same contract.

Generate the homepage, paginated archive pages, category archive pages, articles, About, handbook, `404.html`, `rss.xml`, `sitemap.xml`, `robots.txt`, `search.json`, and published Markdown downloads. Homepage and archive pages contain a fixed number of summaries. Real next/previous links work without JavaScript. Replace homepage text filtering with the existing sitewide Finder. Category links navigate to generated category archives. Fetch the search index only when Finder opens.

Related reading is at most three posts sharing the current category, ordered newest first. Omit the section when none match. Do not fill it with arbitrary posts.

Exclude `_drafts` before reading content and exclude `draft: true` before constructing the shared published collection. Every endpoint derives from that collection. Build into a staging directory, validate outputs, and replace the prior output only after success. Never expose partially written pages during rebuilds. Keep runtime dates out of generation except explicitly defined metadata so repeated builds are predictable.

## Ownership and development tooling

Use one private package. Proposed modules have concrete responsibilities.

| Location | Responsibility |
| --- | --- |
| `site.mjs`, `content/`, `public/brand/`, tokens | Owner customization |
| `lib/config.mjs`, `lib/urls.mjs` | Boundary validation and URL rules |
| `lib/content.mjs`, `lib/markdown.mjs` | Published collection and bounded syntax |
| `templates/` | Multiline shell, header/footer, archive, article, simple-page renderers |
| `scripts/build.mjs` | Read, render, validate, publish files |
| `public/assets/` | Layered CSS and optional browser enhancements |
| `tests/` | Fixtures, Node behavior, browser journeys, screenshots |

Do not introduce a template language. Use readable multiline template literals with small render functions at page or shared-section boundaries. Do not wrap every HTML element. Consolidate CSS into tokens, base, layout, components, and enhancements, deleting overrides whose original rules are obsolete.

Retain JavaScript modules with checked JSDoc for shared shapes. A development-only checker can validate them without requiring TypeScript compilation to build. Keep browser modules separate from Node modules.

Vite+ can help with consistent static checks, but it is not needed to produce this site. `vp check` combines formatting, linting, and configured type checking. Type checking requires `lint.options.typeCheck`; it is not an unconditional guarantee. [Vite+ check](https://viteplus.dev/guide/check) documents this configuration. `vp lint` and `vp fmt` provide the individual tools. Use non-mutating format checks in CI and explicit formatting during authoring. [Lint](https://viteplus.dev/guide/lint), [format](https://viteplus.dev/guide/fmt).

Keep `pnpm build`, `dev`, `preview`, `test`, `verify`, and `verify:static` as the documented repository commands. Optional Vite+ users run `vp run build` and `vp run dev` to invoke those scripts. `vp build` runs Vite's build and `vp dev` runs its development server. They do not call the native scripts. Ordinary package scripts are uncached by default. Leave them uncached until all content, config, asset, and environment inputs are modeled. [Task runner](https://viteplus.dev/guide/run), [build](https://viteplus.dev/guide/build), [dev](https://viteplus.dev/guide/dev).

If adopting Vite+, pin a project-local development dependency and use `pnpm exec vp`; do not require a global installation. Follow its documented Vite/Vitest resolution alignment when integrating those tools. Revise AGENTS.md's test-only tooling sentence to reflect the user's acceptance of development dependencies, while preserving the build/runtime import restriction. The optional-tooling decision does not authorize replacing the native build. [Project-local CLI](https://viteplus.dev/guide/local-cli).

`vp test` invokes bundled Vitest, while `vp run test` can retain the Node tests. Keep Node tests and direct Playwright/axe journeys. A Vitest migration adds no needed coverage here. The current documented Vite+ test runtime also requires newer Node versions than the repository's 22.13 minimum. Validate a separate tooling engine range before adoption. [Vite+ tests](https://viteplus.dev/guide/test).

## Alternatives and release gates

| Alternative | Decision |
| --- | --- |
| Native generator with optional tooling | Recommended. Preserves install-free publication and existing tests. |
| Vite owns development and build | Defer. Asset processing and reload are useful, but require integration between generated routes, watch behavior, and bundling. |
| Native generator with Markdown/YAML packages | Strong alternative when compatibility wins. Explicitly loses zero build dependencies. |
| New framework or general plugin system | Reject for v1. Neither is necessary for cloning, writing, and publishing. |

[Pondlife zero-deps](https://github.com/WebOrigami/pondlife-zero-deps) demonstrates that a plain-JavaScript dependency-free blog is feasible. It does not establish this starter's authoring completeness. [Jim Jordan's blog](https://jimjordan.design/posts/building-this-blog) explicitly distinguishes zero client dependencies from two build dependencies. That is the honest alternative contract, not evidence that Markdown packages are dependency-free.

Release in four reviewable phases. First centralize identity and URLs and remove unused demo sections. Then finish the bounded authoring contract and migrate sample content. Next add real archive pagination, CSS system-theme fallback, and staging publication. Finally finish onboarding and deployment documentation and review screenshots. Each phase ends with the relevant existing verification gates before the next phase.

Acceptance requires an isolated clone without node_modules to build at `/` and `/a/b/`. Generated output must contain no draft sentinel in any file or filename. Invalid metadata and broken internal references must fail before replacing the last successful output.

A second fixture publication changes every brand field, navigation, fonts, colors, and content count. It must contain no Fieldnotes branding and need no template edits. Exercise zero, one, and enough posts for multiple archive pages. A neutral configuration must not leave dead controls or missing featured links.

Browser journeys cover keyboard Finder and recovery from a failed search fetch, focus restoration, native contents navigation, long titles/code/tables, downloads, archive navigation, and responsive layout. Test both themes, reduced motion, disabled JavaScript, unavailable storage, and preference persistence across two pages and reload. CSS follows system dark mode without JavaScript; explicit saved choices override it when JavaScript is available.

Run axe on meaningful states and review desktop/narrow screenshots on macOS Chromium. Keep Linux behavior CI and macOS visual CI. Custom-brand behavior and contrast checks should not depend on the demo's screenshot baselines. Deployment consumes the exact verified artifact and waits for both jobs. Static hosting requires directory indexes and real 404 handling, without SPA rewrites. A Node host may serve the generated files, but the local preview server is not a production server contract.

Non-goals are CMS integration, comments, authentication, localization, image pipelines, MDX, analytics, plugin APIs, and automatic upstream synchronization. The owner gets a small repository they can maintain, with a publishing contract that can be proved from its generated files.
