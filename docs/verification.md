# Local verification

Verified on 2026-10-03 on macOS with Node 24.12.0 and pnpm 10.28.2.

- `pnpm verify` covers Vite+ formatting/lint, strict checked JavaScript for Node and DOM, native-import and semantic-color policies, 18 Node/process tests, the owner-site build, static artifact validation, and 15 Playwright journeys.
- The independent publication fixtures cover zero, one, and 23 posts at `/` and `/people/alex/`, replacement identity/assets, complete sample removal, draft sentinels, deterministic output, invalid content, promotion rollback, and a copied build with no installed packages.
- Process tests cover configuration/base-path reload, last-good output after an invalid edit, invalid startup, and draft creation without overwrite. Preview tests cover HEAD, MIME types, missing routes, unsupported methods, and symlink/path escape refusal.
- The browser matrix covers desktop, phone, and nested hosting. It exercises keyboard search and heading results, failed search/retry, focus restoration, theme persistence through navigation/reload, blocked storage, no-JavaScript archives, contents navigation, Markdown downloads, long-title/code/table overflow, and axe checks in both themes.
- `pnpm test:visual` compares 12 macOS images across desktop/phone, light/dark, home/article/Finder. References were generated, visually inspected, and then passed a separate comparison run.
- Manual review used the sample publication at `http://127.0.0.1:5260/`. Computer Use returned `Browser is not available: chrome`, so the documented agent-browser fallback was used. Desktop and phone screenshots show the editorial layout and Finder. Evidence is under the ignored `artifacts/browser-review/` directory.
- The deployment digest command successfully verified the built artifact. The Pages workflow checks it immediately before upload.

These are local results. Linux CI, GitHub-hosted macOS CI, Pages permissions, and production deployment have not run. Browser accessibility checks do not prove complete accessibility conformance. The bounded Markdown grammar remains intentionally narrower than CommonMark.
