# Local verification

Current review on 2026-10-03 on macOS with Node 24.12.0 and pnpm 10.28.2.

## Light-DOM component integration

- `pnpm verify` passes contributor checks, all 52 Node/process tests, the production build, and static validation. Of 82 browser cases, 76 pass across Chromium and desktop/mobile WebKit. All six Firefox cases fail before a page opens with the same macOS `Could not find profile folder` launch error noted below; Firefox remains enabled and the full command is nonzero locally.
- The component regressions cover failed module loading, two independent copy instances, reconnecting without duplicate writes, aborting a detached Finder request, restoring keyboard shortcuts, and retrying unsafe search responses. Existing all-theme accessibility and no-JavaScript journeys also pass.
- All 12 visual cases / 36 references pass without snapshot updates for this refactor. Fresh desktop and narrow article/Finder screenshots were inspected. Logs and screenshots are under ignored `artifacts/components/`.

## Authoring improvements

- Contributor format/lint, TypeScript, browser JavaScript, and architectural policies pass. All 52 Node/process tests pass, including draft preview isolation and watcher updates, explicit publication status, updated dates, image dimensions, and code highlighting.
- Production build and static artifact validation pass. The browser matrix now has 66 journeys: 64 passed locally across Chromium and desktop/mobile WebKit. The two Firefox journeys could not launch the browser: `Could not find profile folder.` The same failure occurred with a project-local temporary directory. This matches the reported [Playwright macOS app-data issue](https://github.com/microsoft/playwright/issues/42768); Firefox behavior is not locally verified. `pnpm verify` therefore remains nonzero on this machine. Firefox is still enabled in the Linux CI and publishing checks.
- `pnpm test:visual` passes all 12 cases / 36 images. Six article references changed only in the code colors; all six diffs were inspected before replacement, then the comparisons were rerun. Desktop and narrow draft preview screenshots were also inspected, and axe found no violations in those two views.
- Evidence is under ignored `artifacts/improvements/`: draft screenshots, reviewed code-color differences, and browser/verification logs. No production deployment or hosted CI was run.

## Earlier baseline

The following records the previous baseline before these authoring improvements; its counts and all-green result describe that earlier version.

- `pnpm verify` covers Vite+ formatting/lint, strict TypeScript tooling and checked DOM JavaScript, core boundary and semantic-color policies, 44 Node/process tests, the owner-site build, static artifact validation, and 60 Playwright journeys.
- The independent publication fixtures cover zero, one, and 23 posts at `/` and `/people/alex/`, replacement identity/assets, complete sample removal, draft sentinels, deterministic output, invalid content, promotion rollback, and copied TypeScript tooling with installed dependencies and static-only output.
- Process tests cover repeated atomic configuration/base-path replacement, last-good output and recovery after invalid links or incomplete lists, invalid startup, and draft creation without overwrite. Generated properties cover parser termination, valid-list rendering, and metadata round-tripping; filesystem regressions reject a symlinked public root without changing the previous publication. See [testing contracts](testing.md). Preview tests cover HEAD, MIME types, missing routes, unsupported methods, and symlink/path escape refusal.
- The browser matrix covers editorial, minimal, and paper themes on desktop, phone, and nested hosting. It exercises keyboard search and heading results, failed search/retry, focus restoration, theme persistence through navigation/reload, blocked storage, no-JavaScript archives, contents navigation, Markdown downloads, long-title/code/table overflow, and axe checks in both themes.
- `pnpm test:visual` passes 12 cases comparing 36 macOS images across all themes, desktop/phone, light/dark, and home/article/Finder. The 12 original editorial references are unchanged. All 24 new minimal and paper references were visually inspected, then passed a separate comparison run.
- Manual review used the sample publication at `http://127.0.0.1:5260/`. Computer Use returned `Browser is not available: chrome`, so the documented agent-browser fallback was used. Desktop and phone screenshots show the editorial layout and Finder. Evidence is under the ignored `artifacts/browser-review/` directory.
- The pre-theme TypeScript migration produced byte-identical output to the saved JavaScript build. After theme support, all 27 original artifact files remain equal after removing the intentional design attribute and stylesheet link from HTML; the added editorial stylesheet is empty. The deployment digest command successfully verified the built artifact. The Pages workflow checks it immediately before upload.

These are local results. Linux CI, GitHub-hosted macOS CI, Pages permissions, and production deployment have not run. Browser accessibility checks do not prove complete accessibility conformance. The bounded Markdown grammar remains intentionally narrower than CommonMark.
