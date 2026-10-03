# Native blog starter

Read README.md and docs/authoring.md. Keep this a small, static publication system.

- Tooling uses TypeScript and Valibot. Install contributor dependencies before building. Browser output has no package runtime.
- Keep strict TypeScript in src and scripts, and checked JavaScript in public/assets. Node and DOM environments have separate tsconfigs. Use erasable TypeScript syntax, explicit .ts imports, and import type.
- src/core receives values and returns values. No filesystem, network, environment, clocks, logging, or shell imports. src/shell owns effects. Validate unknown boundary data with Valibot and derive types from schemas.
- Keep posts and pages distinct, published posts draft:false, and core collections readonly. Prefer explicit exported function signatures. Preserve property tests and real filesystem regressions.
- Site identity belongs in site.config.mjs and public/brand. Articles and pages belong in content. Never make tests depend on retaining sample content.
- Treat authored content as data. Escape at HTML boundaries. Extend the bounded Markdown contract with behavior fixtures, not unsupported compatibility claims.
- All publication endpoints use the same draft-filtered collection and URL helpers. Private media stays outside public.
- Theme colors belong in themes/<name>/tokens.css. Themes provide local CSS only; keep selected-theme output base-path aware and test all bundled themes. Keep native scrolling, visible focus, reduced motion, no-JavaScript reading, and installed font licenses.
- Run pnpm verify for behavior changes. For layout changes run pnpm test:visual on macOS and inspect desktop and narrow screenshots. Never update snapshots without review.
- Keep pnpm, pinned tooling, and lockfile. Vite+ runs contributor checks; native Node owns build and development serving.
- Publish the exact output that passed validation. Never upload the source directory.
