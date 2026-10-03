# Reusable native blog starter specification

Status is proposed, ready for implementation planning. No behavior in this document has been implemented by this research task. Research date is 2026-10-03. The baseline is commit `0a250ff`, with separate uncommitted preview-server work observed in the checkout.

The [arena decision record](./reusable-blog-starter-arena.md) records the alternatives, independent scores, selected base, and unresolved evidence.

## Product contract

An owner can create a repository from this template, change its identity, write posts, and publish static files. Ordinary customization requires no edits to the generator or HTML renderers.

The starter keeps the editorial grid, readable typography, semantic tokens, sticky desktop reading guide, native scrolling, self-hosted fonts, and reduced-motion support. The default is one finished blog theme. There is no theme engine or component framework.

The dependency contract has separate boundaries.

| Boundary | Required contract |
| --- | --- |
| Published pages | Complete HTML and local CSS. Local JavaScript adds optional interactions. No framework, package CDN, or third-party browser runtime. |
| Generator | Native `.mjs` modules and Node standard-library imports. `node scripts/build.mjs` works without `node_modules`. |
| Contributor tools | Pinned Vite+, Playwright, axe, and type-check tooling may be development dependencies. Quality checks require installation. |

A parser imported while building is a build dependency even if listed under `devDependencies`. This proposal preserves the install-free generator. A maintained Markdown parser remains an explicit alternative in the arena record. It is not silently approved by the acceptance of development tooling.

Vite+ becomes the standard installed lint and format tool for contributors. It does not own page generation. The public repository commands remain `pnpm` scripts. A global `vp` installation is unnecessary. The project-local CLI supports this arrangement. [Vite+ local CLI](https://viteplus.dev/guide/local-cli).

## Scope of the first release

The release includes the following capabilities.

- Authored posts and standalone pages.
- A chronological homepage, real archive pages, and category archives.
- Previous and next articles in chronological order.
- Related reading based on shared category or tags.
- Finder with keyboard navigation, heading search, failure messages, and retry.
- Light, dark, and system theme preferences.
- Article contents links, readable code and tables, and Markdown downloads.
- RSS, sitemap, canonical URLs, social metadata, and a generated 404 page.
- Root and repository-subdirectory hosting.
- Development checks, browser journeys, accessibility checks, and reviewed visual references.

The workbench tabs and decorative space footer leave the default starter. Their old flags and exclusive code are removed. The original lantern can remain a replaceable sample logo. Optional article contents and related-reading sections may have configuration because they are blog functions.

V1 excludes a CMS, authentication, comments, analytics integration, MDX, arbitrary author components, localization, a plugin API, image transformation, automatic upstream updates, and a production application server. Full CommonMark compatibility and scheduled publishing are not promised.

## First use and ownership

The main onboarding path is `pnpm install`, `pnpm dev`, edit the site identity, then write a post. The README also documents direct Node commands for owners who only need to preview or publish without quality tools.

The template contains two public sample posts, one draft, and an About page. One post demonstrates every supported body construct. Test-only edge cases live under `tests/fixtures/`, never under the owner's publication content. The current twelve-article demonstration corpus leaves the default publication.

The owner changes these files.

| Location | Owner-facing purpose |
| --- | --- |
| `site.config.mjs` | Name, description, language, default author, navigation, public origin, base path, logo, social links, and optional featured article. |
| `content/blog/` | Post files. The filename determines the permanent article slug. |
| `content/pages/` | Standalone page files such as `about.md`. |
| `public/brand/` | Replaceable logo, favicon, and default social image. |
| `public/media/` | Explicitly public article images. |
| `public/assets/tokens.css` | Theme roles, typography, spacing, radii, and reading width. |

A small `pnpm new-post <slug>` command creates a valid draft using the configured author and current UTC date. It refuses to overwrite a file. It performs no Git or network operation. A setup wizard is unnecessary.

Deleting all sample posts must leave a valid empty blog. The empty homepage explains that no posts are published. It has no broken featured link or inactive pagination control. A missing explicitly configured featured slug is a build error. An unset featured slug needs no replacement.

The clone acceptance fixture replaces all identity fields, sample content, and brand artwork. It then proves that no Fieldnotes name, sample-post sentinel, or sample route remains in any generated text output. It must pass without renderer edits.

## Configuration and data model

Configuration is an executable local `.mjs` file owned by the developer. Its exported value is validated once. Article files are data and never execute code.

The public configuration includes `name`, `description`, `language`, `author`, `siteUrl`, `basePath`, `navigation`, `logo`, `favicon`, `socialImage`, `socialLinks`, `featuredSlug`, `postsPerPage`, and `article` options for contents and related reading. Use a default page size of ten. Validate positive integer page sizes and sensible limits. Derive category navigation from published posts rather than maintaining a second category list.

`SITE_URL` and `BASE_PATH` override configuration. Unknown configuration keys fail with a named diagnostic. Every accepted option has a behavior test. There are no inactive settings.

The generator uses these internal records.

| Record | Meaning |
| --- | --- |
| `ResolvedConfig` | Validated identity, publication origin, normalized base, and settings. |
| `SourcePost` | Source path, validated public metadata, body text, and explicit draft flag. |
| `PublishedPost` | Public slug, logical route, escaped/rendered body, headings, searchable plain text, and reading time. |
| `ContentPage` | Validated standalone-page metadata, route, and rendered body. |
| `Publication` | Published posts and pages with deterministic archives and article neighbors. |
| `BuildPlan` | Unique output paths mapped to generated bytes or public files to copy. No draft records. |

Keep these as plain records with checked JSDoc types. Separate Node and browser type-check environments. No TypeScript compilation is necessary to execute the generator.

## Authoring contract

Post filenames match lowercase ASCII letters, digits, and hyphens. A title edit does not change the URL. Renaming a published file changes its URL, and redirects remain a documented hosting responsibility in v1.

Frontmatter uses the existing restricted scalar format, improved with precise diagnostics. It is not called YAML. Required post fields are `title`, `description`, `date`, and `category`. Optional fields are `author`, `tags`, `draft`, and `featured`. The author defaults to site configuration. Tags are trimmed strings with duplicates removed. Unknown fields, duplicate keys, invalid booleans, malformed arrays, and impossible calendar dates fail with a source path and line number.

Dates use `YYYY-MM-DD` and represent UTC calendar days. A future date does not schedule publication. Every non-draft post publishes when a build runs. The authoring guide must state this beside the draft field. Sorting is date descending, then slug. Featured placement affects only the homepage, never feed or neighbor chronology. A configured featured slug takes precedence over one frontmatter-featured post. Multiple frontmatter-featured posts without a configured choice are rejected.

Standalone pages use title and description metadata. They do not require post dates or categories. Page slugs cannot collide with reserved publication routes or existing article paths. Missing internal navigation targets fail the build.

The supported Markdown subset must be useful enough to write an ordinary article.

| Syntax | V1 behavior |
| --- | --- |
| Paragraphs and h2 through h4 headings | Semantic HTML. The title supplies h1. Heading IDs are deterministic and unique across the document. |
| Emphasis, strong text, and inline code | Document exact delimiter and escaping rules. Delimiter text inside code stays literal. |
| Ordered and unordered lists | Flat lists with single-paragraph items. Nested lists are explicitly unsupported. |
| Links | Inline links with validated URLs and checked local destinations. |
| Images | Standalone local images with alt text. Empty alt text explicitly means decorative. |
| Blockquotes | Consecutive quote lines form one block. |
| Fenced code | Escaped content, optional language label, keyboard-scrollable overflow. No syntax-highlighting dependency. |
| Pipe tables | Header cells and a narrow-screen scroll region. Document the supported pipe-escaping rule. |
| Existing editorial blocks | Keep validated callout and note-figure blocks. Convert media-tabs content to sequential sections. |
| Raw HTML | Display as escaped text. It is never executed or treated as a trusted embed. |

Use a small block/inline parsing structure with explicit precedence. Do not keep extending one chain of regex replacements. Unsupported constructs that the parser recognizes receive a source diagnostic rather than quietly masquerading as supported Markdown.

Fixtures must cover interactions between code delimiters, links, escaping, headings, and lists. This is a defined subset, not a CommonMark conformance claim. The [CommonMark specification](https://spec.commonmark.org/0.31.2/) illustrates why nested constructs and delimiter precedence require a real contract.

The authoring milestone has a stop condition. If the agreed fixture set requires a broad CommonMark implementation or ambiguous rendering remains, stop parser expansion. Present the maintained-parser alternative with an explicit revision to the build-dependency contract before proceeding. Do not vendor a parser and describe it as code we wrote.

## URLs, assets, and publication safety

`siteUrl` is an HTTP or HTTPS origin. Reject credentials, a non-root pathname, a query, or a fragment. Do not silently truncate invalid input. `basePath` is `/` or a normalized slash-delimited prefix such as `/journal/` or `/people/alex/`.

Logical HTML routes use a leading and trailing slash. File URLs retain their extensions. One module converts logical routes to public paths and absolute URLs. Navigation compares logical routes before adding the base. Content uses logical site-root links, never pre-prefixed deployment paths.

Inline links accept HTTP, HTTPS, mailto, same-document fragments, and logical site-root paths. V1 does not accept source-relative Markdown file links. Reject protocol-relative links, backslashes, traversal segments, control characters, and executable schemes. Decode and normalize for validation so encoded traversal cannot escape checking. Preserve valid fragments and queries. Validate local paths and fragments against the completed route and asset inventory.

Images come from `public/media/`. They receive responsive CSS and alt attributes. Reserve image layout when dimensions are known. V1 performs no remote fetches or image transformations. Third-party hosted images and embedded video are outside the initial contract.

Everything in `public/` is public, including unused images. Private draft assets belong outside that tree. Directory symlinks and file symlinks that escape allowed roots are rejected. Public files cannot overwrite generated routes or reserved endpoint names. The output directory cannot overlap the source tree.

Skip `_drafts` directories before reading their contents. Files flagged `draft: true` never enter `Publication`. All article pages, feeds, search data, archives, sitemap entries, and Markdown downloads derive from that same filtered collection. Arbitrary private metadata is unsupported. Downloads contain only the documented public frontmatter and source body.

Build all output into a separate staging directory. Validate the plan, write results, and check local references before replacing the last successful output. Failures retain the previous publication. Implement and test promotion with rollback on the supported platforms. Do not assume every platform can atomically replace a nonempty directory.

The development loop serializes builds, coalesces file changes, and retains the last successful site after a failed edit. It prints the file diagnostic. It reloads configuration on each build. A clean start with invalid content fails instead of serving stale files without explanation. Manual browser refresh remains the documented v1 behavior.

## Reader-facing output

The homepage contains at most `postsPerPage` summaries. A featured post occupies one slot and does not repeat on that homepage. `/archive/` and subsequent archive pages list every published post chronologically. Categories have native archive links. Archives never depend on JavaScript to expose later posts.

Articles have chronological previous and next links. Related posts exclude the current article and require a shared category or tag. Rank by same category, shared-tag count, date descending, then slug. Show at most three results. Omit the section when no result qualifies.

Finder loads the static search index on demand. It indexes published titles, descriptions, categories, tags, headings, and plain body text. Heading results link to real generated IDs. Empty, loading, unavailable, and retry states remain accessible. Closing restores focus to the opener or the main landmark after a keyboard shortcut.

CSS applies the system color preference before JavaScript. The early theme script applies an explicit saved preference and handles blocked storage. Native links perform page navigation. Article reading, archive navigation, and contents links remain available without JavaScript. Finder and copy buttons are hidden when their scripts cannot run.

Generated output includes HTML routes, local assets, `404.html`, `rss.xml`, `sitemap.xml`, `robots.txt`, `search.json`, and published Markdown downloads. RSS uses chronological order. Canonical links, feed URLs, social metadata, and sitemap URLs share the URL module. Social images use configured static files. No image-generation service is required.

A build manifest may remain in the tooling output directory for artifact verification. It must not include absolute source paths, draft metadata, or wall-clock timestamps. Do not add a new public endpoint solely for tests.

## Module ownership

Use one private package and ordinary JavaScript imports.

```text
site.config.mjs
content/blog/
content/pages/
public/brand/
public/media/
public/fonts/
public/assets/tokens.css
public/assets/base.css
public/assets/layout.css
public/assets/components.css
public/assets/theme.js
public/assets/app.js
lib/config.mjs
lib/urls.mjs
lib/content.mjs
lib/markdown.mjs
lib/publication.mjs
lib/outputs.mjs
templates/layout.mjs
templates/header.mjs
templates/footer.mjs
templates/archive.mjs
templates/article.mjs
templates/page.mjs
scripts/build.mjs
scripts/dev.mjs
scripts/serve.mjs
scripts/new-post.mjs
scripts/check-static.mjs
tests/fixtures/
tests/e2e/
vite.config.mjs
```

`content` reads and validates authored files. `publication` selects public content and computes archive and neighbor data. Templates render records without filesystem access. `outputs` prepares endpoints and the file plan. `build` owns filesystem publication. Browser modules never import Node modules.

Split templates by shared section or page. Use multiline literals. Do not create helpers for every HTML tag. Remove obsolete CSS declarations as the files are separated. Keep explicit layer order and semantic tokens. Preserve font license files.

## Development tools and commands

Install Vite+ locally as a pinned development dependency. Keep pnpm and its lockfile. Follow the selected release's documented Vite/Vitest dependency alignment. Do not copy `latest` into the final manifest. [Manual installation guidance](https://viteplus.dev/guide/local-cli).

Use the Node 24 line supported by the selected Vite+ release for the contributor baseline. Record the exact supported range and CI patch during implementation. The currently documented bundled test runner requires at least 24.11 within that line. Do not express this as an unbounded `>=22.18` range. [Vite+ test requirements](https://viteplus.dev/guide/test).

| Command | Proposed responsibility |
| --- | --- |
| `pnpm dev` | Owned Node rebuild and preview loop. |
| `pnpm build` | Native production generator. Same result as direct Node invocation. |
| `pnpm preview` | Serve an existing artifact locally. |
| `pnpm check` | Non-mutating format/lint checks and verified type-check coverage. |
| `pnpm format` | Explicit Oxfmt write command. |
| `pnpm test` | Existing Node test runner with independent fixture content. |
| `pnpm test:e2e` | Playwright against a built fixture publication. |
| `pnpm test:visual` | Reviewed platform-specific screenshot comparisons. |
| `pnpm verify:static` | Validate generated routes, files, anchors, and publication exclusions. |
| `pnpm verify` | Checks, unit/build tests, fixture build, static validation, and browser journeys. |

Vite+ distinguishes built-ins from scripts. `pnpm exec vp run build` invokes our build script. `pnpm exec vp build` invokes Vite. The same distinction applies to dev and test. Keep task caching off initially, including any configured tasks. The site is small and publication inputs include environment values. [Vite+ task runner](https://viteplus.dev/guide/run).

`vp check` provides formatting and linting, with type checking dependent on configuration. Its installation alone does not prove that our `.mjs` and browser files are covered. Establish a failing type fixture in each environment, then prove the configured command catches it. If the selected release cannot cover checked JavaScript, use a separate development-only `tsc --noEmit` step with `allowJs`, `checkJs`, and strict checks. [Vite+ check](https://viteplus.dev/guide/check), [TypeScript checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html).

Do not migrate Node tests to Vitest merely because Vite+ bundles it. Keep Playwright and axe. Vue template lint rules do not apply to this native HTML starter. Preserve dedicated semantic-color policy checks and browser contrast checks. General JavaScript lint does not replace them.

## Acceptance and CI

Tests use independent fixtures. They never require the owner to retain sample titles, authors, article counts, or slugs. The fixture factory supplies data, while assertions state independent expected outcomes.

| Given | When | Then | Verification |
| --- | --- | --- | --- |
| No installed packages | Node builds a valid fixture | Complete static output exists without dependency resolution | Isolated process/build test |
| A renamed site with samples removed | The owner builds | Brand, feeds, metadata, links, and labels use only the new identity | Artifact crawl and browser |
| Zero posts, one post, or 23 posts | The owner builds | Empty state and archive pages are valid, with no missing or repeated archive entries | Node and no-JavaScript browser |
| Root or nested base hosting | A reader follows pages, assets, anchors, or downloads | Every local destination resolves under the selected base | Artifact crawl and HTTP browser journeys |
| Draft title, body, slug, and metadata sentinels | Every endpoint is generated | No sentinel or draft artifact exists | Full output scan |
| Invalid metadata, unsafe URLs, collisions, or a write failure | A rebuild runs | It fails with a useful diagnostic and retains the last successful output | Node and process tests |
| Supported formatting mixed with delimiter edge cases | A post renders | Expected semantic HTML and safe literal text appear | Parser fixtures and browser layout |
| Finder was opened by button or shortcut | A reader searches, navigates, closes, or retries | Correct destination, keyboard selection, focus restoration, and recovery | Playwright |
| Storage is blocked or JavaScript is disabled | The reader loads light/dark system modes | Content remains readable and the correct fallback applies | Real browser |
| A saved theme preference | The reader visits two pages and reloads | The preference persists | Real browser persistence |
| Long titles, code, tables, and images | The viewport narrows | The page has no horizontal overflow; designated regions can scroll | Browser layout and reviewed screenshots |

Linux CI runs checks, Node/process tests, and built-site journeys. macOS runs the committed visual references until a separate baseline migration is reviewed. Both gates are required. Accessibility checks cover meaningful page and Finder states in both themes. Keyboard tests, axe results, and screenshots are separate evidence.

Reference snapshots belong to the fixture theme. Intentional owner theme changes require explicit baseline review. Config/content customization checks must remain independent of the original visual appearance.

CI installs from the lockfile. No tests or deployment tasks use cached success as a substitute for validating changed publication configuration. If `setup-vp` is adopted, pin an exact supported release or SHA. Its documentation warns against the obsolete `v1` tag. Keeping the existing Node/pnpm setup and running the local CLI is also valid. [Vite+ CI](https://viteplus.dev/guide/ci).

## Deployment contract

Publish only generated output. The standard target is static hosting with directory indexes. A Node hosting platform may serve the same files through its production static-file service. The local preview script is not the production server.

The deployment recipe builds with the final public origin and base path, validates that exact output directory, and uploads the same artifact. It must not rebuild with different values after verification. Record an artifact digest and verify it is unchanged at upload. Destination-specific 404 behavior is documented because hosts differ.

Provide a GitHub Pages recipe and a generic static-host guide. The template checkbox, remote creation, permissions, and deployment activation are later publishing actions. None occur during this specification task. [GitHub template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository).

## Implementation sequence

1. Separate fixture content from owner content. Add customization, empty-site, and exact-output acceptance tests. Preserve the external preview-server work already in progress.
2. Add pinned contributor tooling and checked-JavaScript coverage. Update the repository policy from test-only dependencies to development dependencies. Prove the native build still runs without installation.
3. Centralize configuration and URL rules. Split readable templates, move standalone page prose into content, remove default demo sections, and consolidate CSS. Verify branding replacement and both hosting prefixes.
4. Complete the bounded authoring grammar and diagnostics. Add lists and local images. Run the parser stop-condition review before expanding syntax further.
5. Add native archives, article neighbors, related reading, system-theme fallback, and staged publication with failure recovery. Verify the reader and publication scenarios.
6. Reduce sample content, finish the authoring reference and deployment guides, review screenshots, and verify the clone-to-publication journey in an isolated copy.

Each step must end with its affected behavioral checks. Run the full suite when integration or rendered behavior changes. Implementation may split a step further, but it must not preserve obsolete settings or intermediate APIs after their callers migrate.

## Remaining evidence

The architecture choice is resolved for this spec. Vite+ supplies contributor checks, and native Node supplies publication. The implementation must still prove package-version compatibility, JavaScript type-check coverage, parser fixture completeness, and staging promotion on supported operating systems. No packages were installed, no new behavior was tested, and no deployment was performed during this research task.
