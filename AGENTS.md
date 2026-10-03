# Native blog starter

Read README.md and docs/authoring.md. Keep this a small, static publication system.

- Node standard-library imports and local modules only in the generator. Browser output has no package runtime. Development tooling dependencies are allowed.
- Keep strict checked JavaScript. Node and DOM environments have separate tsconfigs.
- Site identity belongs in site.config.mjs and public/brand. Articles and pages belong in content. Never make tests depend on retaining sample content.
- Treat authored content as data. Escape at HTML boundaries. Extend the bounded Markdown contract with behavior fixtures, not unsupported compatibility claims.
- All publication endpoints use the same draft-filtered collection and URL helpers. Private media stays outside public.
- Theme colors belong in public/assets/tokens.css. Keep native scrolling, visible focus, reduced motion, no-JavaScript reading, and installed font licenses.
- Run pnpm verify for behavior changes. For layout changes run pnpm test:visual on macOS and inspect desktop and narrow screenshots. Never update snapshots without review.
- Keep pnpm, pinned tooling, and lockfile. Vite+ runs contributor checks; native Node owns build and development serving.
- Publish the exact output that passed validation. Never upload the source directory.
