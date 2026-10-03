# Arena decision for the native blog starter

Current implementation note: the owner subsequently approved TypeScript and Valibot for build tooling and local CSS themes. The original research contract below is preserved as historical evidence. See [current architecture](../architecture.md) and [themes](../themes.md).

Research completed on 2026-10-03. The deliverable is the [proposed implementation specification](./reusable-blog-starter.md). Application code, package installation, commits, remote creation, and deployment are outside this task.

## Decision

Use candidate A as the base. Keep the install-free Node generator and plain browser output. Add project-local Vite+ as the contributor lint/format tool. Preserve Node tests and Playwright journeys. Complete a bounded authoring grammar before describing the repository as ready for ordinary blog authors.

A package used by the generator would change the dependency contract even if package.json called it a development dependency. The user accepted development tooling dependencies. That does not by itself authorize retiring the install-free build.

Candidate B offers the stronger Markdown compatibility option. Its maintained parser belongs in a future explicit contract revision if our bounded grammar cannot meet the required authoring fixtures. No parallel editions or new parser plugin interface are planned.

## Panel and method

Two independent agents received the same brief and inspected the live checkout and official documentation. They wrote to separate directories. A separate current-state explainer checked the content/publication flow. The judge received the rubric and both completed proposals before seeing the parent's scores.

| Role | Model | Artifact |
| --- | --- | --- |
| Candidate A | GPT-6 Astra | [Native generator with optional tooling](../research/editorial-starter-arena/candidate-a.md) |
| Candidate B | GPT-5.6 Sol | [Native generator with parser dependencies](../research/editorial-starter-arena/candidate-b.md) |
| Current-state explainer | GPT-6 Astra | Source observations incorporated below |
| Independent cross-judge | GPT-5.6 Sol | [Verdict and detailed scores](../research/editorial-starter-arena/verdict.md) |

This is a same-family panel with two model variants. It is not cross-family review. All candidates completed. There were no dropouts. The preserved candidate documents are research proposals, not accepted requirements. The final spec takes precedence where they differ.

The investigation used the how workflow for the current-state explanation and the arena workflow for competing designs. The throughput checkpoint was not applicable to read-only research.

## Rubric and scores

Each criterion is scored from one to five. Scores express design judgment, not measured performance.

| Criterion | Parent A | Parent B | Judge A | Judge B |
| --- | ---: | ---: | ---: | ---: |
| Dependency and scope fidelity | 5 | 2 | 5 | 4 |
| Onboarding and everyday authoring | 4 | 5 | 4 | 5 |
| Vite+ evidence and reproducibility | 4 | 3 | 5 | 3 |
| Publication safety and URL correctness | 5 | 3 | 5 | 4 |
| Small maintainable architecture | 4 | 3 | 5 | 4 |
| Verification after customization | 5 | 4 | 5 | 4 |
| Total | 27 | 20 | 29 | 24 |

Both selected A. The parent penalized B more for recommending a changed build contract. The judge gave B credit for disclosing that change. The difference did not change the chosen base.

Both candidates agreed that Node should retain page generation. Neither found evidence that moving this publication model into Vite would improve v1 enough to justify a second route and asset pipeline. Their central disagreement was Markdown compatibility versus install-free builds.

## Accepted grafts and refinements

- B's explicit dependency table makes the generator, browser, and contributor boundaries visible. The final table keeps A's generator guarantee.
- B's conventional pnpm interface becomes the primary contributor workflow. Direct Node commands remain supported for build and preview.
- B's custom-brand assertions become a clone test that first removes all sample content. It scans the complete generated publication without sample-content exemptions.
- B's shared-tag ranking joins A's category-based related reading. Nonmatching articles are not used as filler.
- A's staged publication and exact-artifact deployment remain required. The promotion mechanism needs platform tests rather than an unsupported claim about atomic directory replacement.
- The final spec keeps the existing behavior of escaping authored raw HTML. It does not describe disabled HTML rendering as a sanitizer or a guarantee that every unsafe input is rejected.
- Vite+ is an expected installed quality tool in development and CI. It remains outside the native generator import graph. The word optional refers to running the generator without those tools, not skipping contributor checks.

## Rejected changes

| Proposal | Reason |
| --- | --- |
| Add markdown-it now | This would retire the install-free generator. It remains a clearly named alternative. |
| Convert all generator modules to TypeScript | Checked JavaScript preserves direct Node execution and avoids a new loader/compiler choice. |
| Replace Node tests with Vitest immediately | No missing test capability justifies the migration. Vite+ can run existing scripts. |
| Generalize the workbench into section configuration | Removing demo-only UI makes the starter easier to own. |
| Support both parser editions | Two maintenance contracts would expand v1 without demonstrated demand. |
| Use an unbounded Node `>=22.18` engine | This includes versions outside the quoted toolchain support. Select and pin a supported Node 24 range. |
| Build again after deployment validation | It would upload a different artifact than the one checked. |
| Add task caching immediately | Publication configuration and side effects require correctness work; no timing evidence establishes a need. |

## Current-state evidence

The baseline commit is `0a250ff`. The live checkout also contains external edits in `README.md`, `scripts/dev.mjs`, `scripts/serve.mjs`, and an untracked `tests/serve.test.mjs`. This task preserves them.

Source inspection found these implementation gaps.

- `site.mjs` declares unused visibility flags. Template strings contain hardcoded publication identity.
- Navigation compares `about` with `/about`, so the active-page check differs by slash form.
- The builder embeds About/handbook content directly and reads only immediate post files.
- The body renderer lacks normal list/image authoring. It has no full CommonMark contract.
- The homepage includes all summaries and JavaScript hides later entries. Search separately contains article text.
- Tests rely on sample titles, routes, and twelve-post counts.
- The theme tokens require a JavaScript class for dark mode.
- The output directory is removed after parsing but before all rendering and writing succeeds.

These are code observations, not newly reproduced browser failures. The existing earlier test results do not prove the proposed design.

## Principles that changed the design

| Read principle | Concrete decision |
| --- | --- |
| Laziness Protocol | Keep one package and native tests. Remove demo sections instead of building a section framework. |
| Separate Before Serializing Shared State | Give each candidate its own output directory. Only the parent writes the synthesized spec. |
| Redesign From First Principles | Treat branding and content ownership as starter requirements across templates, feeds, tests, and onboarding. |
| Test Where the Failure Happens | Require built-site keyboard, persistence, no-JavaScript, accessibility, and layout checks. Keep parser and publication rules in Node. |
| Prove It Works | Review the actual spec, source claims, and document links. Label all future compatibility checks as unverified. |

## Source record

Official tool documentation was read on the research date. Version-sensitive requirements must be rechecked when packages are installed.

- [Vite+ local CLI](https://viteplus.dev/guide/local-cli) documents pinned local tooling and dependency alignment.
- [Vite+ run](https://viteplus.dev/guide/run) distinguishes built-in commands, repository scripts, and task caching.
- [Vite+ dev](https://viteplus.dev/guide/dev) identifies the built-in Vite development server.
- [Vite+ check](https://viteplus.dev/guide/check) explains the configured format, lint, and type-check path.
- [Vite+ format](https://viteplus.dev/guide/fmt) describes Oxfmt and its project configuration.
- [Vite+ test](https://viteplus.dev/guide/test) names the bundled Vitest runner and supported Node versions.
- [Vite+ CI](https://viteplus.dev/guide/ci) explains supported setup options and action versioning.
- [TypeScript checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html) establishes JavaScript checking without a source migration.
- [CommonMark](https://spec.commonmark.org/0.31.2/) provides the syntax reference for the bounded-parser tradeoff.
- [Pondlife site assembly](https://raw.githubusercontent.com/WebOrigami/pondlife-zero-deps/main/src/site.js) and [post pipeline](https://raw.githubusercontent.com/WebOrigami/pondlife-zero-deps/main/src/posts.js) provide modularity, pagination, and neighbor-link precedents.
- [Jim Jordan's implementation account](https://jimjordan.design/posts/building-this-blog) distinguishes client dependencies from build dependencies.
- [GitHub template repository documentation](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) covers the later distribution step.

## Verification of this deliverable

The parent read both candidate artifacts and the judge's verdict. The judge then reviewed the synthesized spec. Local document links, required acceptance areas, and Markdown whitespace were checked. Source and package files were not changed by this task. No application tests were rerun because the deliverable contains documentation only.

Implementation still needs package/version validation, checked-JavaScript proof, parser fixture completion, staging failure tests, and the full customization/browser gates. Those are release requirements, not results of this research.
