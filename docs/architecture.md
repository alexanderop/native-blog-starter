# Architecture

The TypeScript tooling uses a functional core and an imperative shell. The core transforms input values into a validated publication plan. The shell reads files and the selected local theme, runs the core, and commits the plan to disk. Valibot validates configuration, metadata, and manifests. Its schemas define the corresponding TypeScript types.

```text
scripts/build.ts
  readProject(root, env)         src/shell/read-project.ts
  highlightProject(inputs)     src/shell/highlight.ts
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

## Syntax highlighting

`markdown.ts` returns raw code blocks from the same parser that renders them. `collect` filters drafts before parsing bodies and attaches each block's full source location. `highlightProject` uses this pure collection pass to discover public code before loading Shiki.

The shell creates one highlighter for the supported languages used in a build and disposes it in `finally`. Blocks share a result when their exact language label and text match. Valibot validates returned token colors against a finite semantic vocabulary. Joined token text must equal the input. Unsupported labels produce located warnings, while unexpected adapter failures stop publication.

`ProjectInputs.highlights` is a readonly map of project-owned tokens, keyed by the language and text tuple. The pure renderer owns escaping and maps finite roles to fixed CSS classes. Its plain text projection stays separate from highlighted HTML, so spans cannot change search or reading time. Demo variants reuse the same snapshot across all three designs. This repeats the small pure Markdown pass instead of introducing a document AST or async core APIs.

`SyntaxEngineFactory` is the shell's injectable effect boundary. Tests inject failures through the normal build entrypoints to verify disposal and unchanged output. Production uses Shiki. No highlighter types or effects enter `src/core`.
