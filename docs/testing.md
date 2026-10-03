# Testing publication contracts

Run `pnpm verify` for checks, Node tests, a production build, static validation, and browser journeys. Fast-check is pinned as a development dependency. Valibot is a build-time dependency. Installed tooling is required to build; generated files have no package runtime.

## What the review exposed

The original tests exercised valid authored examples, ordinary file writes, and symlinks beneath the asset directory. They missed unfinished edits, editor-style file replacement, quote-sensitive exports, and a symlink at the directory boundary itself.

| Contract                                                   | Test method                                                                            | Why                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Bounded Markdown completes or reports a syntax error       | Generated Markdown in externally timed child processes                                 | A synchronous infinite loop blocks same-process test timers.              |
| Valid lists preserve item order and text                   | Generated valid lists plus literal HTML examples                                       | A parser that rejects everything must not pass a termination check alone. |
| Downloaded metadata and body survive parsing unchanged     | Generated scalar values through publication output, then parse the downloaded Markdown | Quotes, spaces, backslashes, and Unicode expose serialization loss.       |
| Editor saves keep updating the site                        | Real temp-file writes and repeated rename operations                                   | Mocked watch callbacks do not reproduce replaced-inode behavior.          |
| A symlinked public root never changes the last publication | Real symlink plus byte comparison of output and manifest                               | Pure path-string tests cannot exercise filesystem traversal.              |

The property tests use bounded generators for this project's supported grammar. They do not claim CommonMark conformance or exhaustive proof. The metadata property compares output to independently generated values, not to a value computed by the serializer under test.

## Red before green

Before applying the fixes, the generated termination property found the hang after three trials and reduced it to `- `. The metadata property also found leading-space loss, beyond the quoted-title failure identified in review. Six new regression/property tests failed on the original code.

The test suite keeps the smallest explicit examples alongside generated cases. The filesystem tests verify the old artifact remains readable after rejection and that consecutive configuration replacements update both identity and serving prefixes.

## Reproduce a property failure

Default runs use seed `20261003`. The termination property runs 150 cases, valid-list rendering runs 75, and metadata round-tripping runs 500. Failures report the seed, shrinking path, and smallest counterexample. Fast-check documents its [property model](https://fast-check.dev/docs/core-blocks/properties/) and [runner results](https://fast-check.dev/docs/core-blocks/runners/).

```sh
pnpm exec node --test tests/properties.test.mjs
FC_SEED=12345 pnpm exec node --test tests/properties.test.mjs
FC_SEED=20261003 FC_PATH='2:2:1:3:2:2:1:1:0' pnpm exec node --test --test-name-pattern='bounded Markdown' tests/properties.test.mjs
```

Use the reported path with the matching test name and unchanged generator. Generator edits can invalidate an old shrinking path. Keep any new confirmed counterexample as an explicit regression before changing the generator.

For broader local exploration, run additional seeds. CI keeps the default seed reproducible. Property tests complement browser keyboard/accessibility journeys and filesystem integration tests; they do not replace those tests.

## TypeScript architecture coverage

`tests/core.test.mjs` checks source-order independence, unchanged inputs, draft isolation before Markdown rendering, exact archive coverage, and manifest decoding. `tests/architecture.test.mjs` exercises the AST-based import policy, including nested folders, re-exports, dynamic imports, and ambient effects. Negative compiler fixtures reject draft publication, readonly collection mutation, and unchecked result access.

The policy allows deterministic `node:path` helpers in the core. It rejects filesystem and network imports, shell access, and common ambient effects. It is an architectural check, not a sandbox for hostile source code. Valibot schemas stay pure and do not perform I/O.

Theme integration tests build every bundled theme at root and nested paths. They cover custom theme folders, unused broken themes, missing CSS, traversal, reserved asset collisions, and symlinks. Development-process tests exercise stylesheet edits and changing the configured theme. Browser journeys run against every bundled theme on desktop, mobile, and nested hosting.

## Syntax highlighting coverage

`tests/highlight.test.mjs` checks exact code-text preservation and escaping with generated values, plus literal Shiki cases for aliases, multiline comments, embedded Vue, empty blocks, trailing newlines, and long lines. Plain search results must equal the unhighlighted renderer. Drafts with invalid fences are skipped before engine creation. Repeated code shares one tokenization result.

Both normal and demo builds must publish colored markup. Adapter validation and tokenization failures must dispose the engine and preserve the previous files. Browser journeys assert exact DOM text, distinct computed colors, contrast in light and dark modes, system preference switching, custom-theme fallbacks, and reading without JavaScript. Artifact and network checks guard against a browser Shiki runtime.
