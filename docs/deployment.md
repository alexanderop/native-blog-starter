# Deploy static files

Set `siteUrl` to the final HTTP(S) origin with no credentials, path, query, or fragment. Set `basePath` to `/` or a prefix such as `/people/alex/`. Environment variables `SITE_URL` and `BASE_PATH` override configuration.

```sh
SITE_URL=https://example.org BASE_PATH=/journal/ pnpm build
pnpm verify:static
node scripts/artifact-digest.ts > .preview/deploy.digest
# Upload dist/ without rebuilding it.
node scripts/artifact-digest.ts --verify .preview/deploy.digest
```

The digest command excludes no generated files. It fails when any file changes. Do the equality check immediately before your upload step. Keep the expected digest outside `dist/`.

Upload only `dist/` to a static host with directory-index support. A production Node static-file service can serve these same files. `scripts/serve.ts` is only a loopback preview server. Hosting behavior for `404.html` varies; configure the host's not-found page explicitly. Root URLs and trailing-slash directory routes must preserve the configured prefix.

## GitHub Pages

Create a repository from the starter, push your files, and choose GitHub Actions as the Pages source. Run the included **Publish Pages** workflow manually with the final origin and base prefix. Enable its **demo** input to publish all three themes with the route-preserving theme switcher. For a project repository the prefix is usually `/repository-name/`; a user site or custom domain may use `/`. Confirm your actual Pages URL first.

The workflow installs locked contributor tools, builds with those final settings, validates output, records a digest, checks equality immediately before artifact upload, and deploys that artifact. It does not rebuild between validation and upload. It uses the protected `github-pages` environment. Publishing requires repository permissions and an enabled Pages account setting.

The separate CI workflow checks behavior on Linux and visual references on macOS. Enable required checks in your repository settings if you want to prevent merging failures. A local template cannot change those account settings itself.
