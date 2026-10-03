# Architecture

The TypeScript tooling uses a functional core and an imperative shell. The core transforms input values into a validated publication plan. The shell reads files and the selected local theme, runs the core, and commits the plan to disk. Valibot validates configuration, metadata, and manifests. Its schemas define the corresponding TypeScript types.

```text
scripts/build.ts
  readProject(root, env)         src/shell/read-project.ts
  prepareBuild(inputs)          src/core/prepare-build.ts
  commitBuild(plan, options)    src/shell/commit-build.ts
```

`prepareBuild` returns a discriminated result. Success contains the files, configuration, and publication. Failure contains diagnostics. Parsing or validation failure happens before output staging. All endpoints derive from one draft-filtered collection.

## Domain boundaries

`src/core/schemas.ts` owns configuration and metadata schemas plus validated logical routes and output paths. `src/core/types.ts` defines readonly content and publication models. Pages have their own metadata. Published posts have `draft: false`. Arrays use readonly interfaces; publication ordering copies inputs with `toSorted`.

`src/core/content.ts` parses the restricted frontmatter syntax before schema validation. It retains duplicate-field and line diagnostics. Valibot validates parsed values, not Markdown syntax. Drafts are excluded before body rendering. The shell skips `_drafts` directories before reading them.

`src/core/markdown.ts` owns the bounded Markdown grammar. `publication.ts` computes ordering and archives. `outputs.ts` and `templates/` render HTML, feeds, downloads, and search data. `validate.ts` checks the completed file map for missing links, fragments, CSS assets, and duplicate IDs.

Local mutation while constructing a map is allowed. The core must not mutate caller inputs or inspect ambient state. `node:path` provides deterministic path operations and is the only permitted Node runtime import in the core.

## Filesystem publication

`src/shell/read-project.ts` loads configuration, sources, and public assets. It rejects symlinks at publication boundaries. `manifest.ts` validates persisted build metadata from `unknown`. The private `.preview/build.json` records the output path, URL settings, article count, and deterministic digest. It is never copied into `dist`.

`commit-build.ts` stages files beside the destination, moves previous output aside, promotes the new directory, and replaces the manifest. Failed promotion restores the old output. This is not an atomic exchange of nonempty directories. Concurrent builds targeting the same output are unsupported. The development watcher serializes and coalesces builds in fresh child processes.

## Enforcement and execution

Node 24 runs erasable TypeScript directly. `tsc` checks types separately with strict `NodeNext`, `noEmit`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. Native type stripping does not typecheck code. Browser assets remain checked JavaScript with a separate DOM configuration.

The recursive Oxc AST policy rejects core imports outside the core, unapproved dependencies, and common ambient effects. Browser files cannot import tooling or packages. Negative fixtures prove those checks run. This policy is an architectural guard, not a security sandbox.

The build requires installed tooling dependencies, including Valibot. Only static files are deployed. No TypeScript sources or tooling dependencies belong in `dist`. Browser journeys and accessibility checks remain separate from pure-core properties and real filesystem tests. See [testing contracts](testing.md) and [local verification](verification.md).

## Local themes

Configuration selects a safe theme slug, defaulting to `editorial`. The shell validates that selection before reading the two CSS files under `themes/<slug>`. The core receives a typed theme snapshot, checks its identity, and emits its token and layout files. Inactive themes are not read or published. Shared templates retain the interaction, content, and accessibility contracts. See [themes](themes.md).

## Draft previews and build-time rendering

`prepareDraftPreview` starts from the validated publication, renders drafts into additional local pages, and validates the combined file map. Drafts never enter `Publication.posts`; the article template accepts either state explicitly. Draft previews use `.preview/drafts/` and a separate manifest. The shell rejects attempts to direct a draft build into `dist/`, and rejects a symlinked preview parent. Ordinary builds cannot target the draft directory.

The core uses image-size's byte-only API, with Valibot validating measured dimensions. Filesystem image APIs remain forbidden. Highlight.js runs with an isolated instance and an explicit small language registry; unknown languages and large code blocks stay plain text. The import policy permits only these specific package entry points. Both dependencies are pinned contributor dependencies and are absent from browser assets.

## Light-DOM Web Components

The generator emits complete HTML inside `<site-finder>` and `<copy-actions>`. Deferred native modules upgrade that markup in place; there is no client-side template rendering, Shadow DOM, framework, or package runtime. Articles, native contents links, and Markdown downloads work before upgrade and without JavaScript. Enhancement buttons start with `hidden` and are revealed only when their component connects successfully.

`public/assets/site-finder.js` owns the native dialog, search state, scoped result rendering, retry behavior, and focus restoration. The host's `data-search` contains the generated base-aware index URL. The header button targets the host ID with `data-finder` and the native dialog ID with `aria-controls`. A registry installs one shared set of document trigger/shortcut listeners while connected Finders exist, and removes it when the last Finder disconnects. Search responses are checked for valid fields and same-origin destinations under the configured base before rendering.

`public/assets/copy-actions.js` owns each article's copy buttons and status. It uses the existing download URL, leaves the native download link intact, and handles clipboard/fetch failure locally. Each instance has independent state. A new copy action cancels the previous fetch; disconnecting aborts pending work and prevents stale status updates.

Both components use AbortController to release listeners and fetches on disconnect and can reconnect without duplicate handlers. Existing child elements are read in `connectedCallback`, after the deferred module loads. `app.js` imports the two modules and retains the reading indicator. `theme.js` still applies the color preference in the head before first paint.

These choices follow the [MDN lifecycle guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) and [platform semantics](https://html.spec.whatwg.org/multipage/custom-elements.html). Real buttons, inputs, links, and dialogs retain their native semantics; the custom wrappers add behavior. Light DOM keeps theme selectors and labels/ARIA references in the same tree. Customized built-ins (`is=`) are avoided because Safari does not support them. [Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom) can render shadow content without JavaScript, but this starter does not need that extra styling boundary.

Component browser regressions cover failed module loading, multiple copy instances, reconnecting without duplicate writes, disconnecting during a search request, retrying invalid search responses, and working shortcuts after reconnection. Existing journeys cover focus, keyboard navigation, no-JavaScript reading, every theme, and nested hosting. No new dependencies are required.
