# Choose a theme

Set `theme` in `site.config.mjs`, then run `pnpm build` or start `pnpm dev`. The development server rebuilds when the selection or a theme file changes. Refresh the browser after a successful rebuild.

```js
export default {
  // Keep the rest of your configuration.
  theme: "minimal",
};
```

The starter includes three original designs.

| Theme       | Appearance                                                                       |
| ----------- | -------------------------------------------------------------------------------- |
| `editorial` | Spatial grid, warm neutral colors, sticky reading guide. This is the default.    |
| `minimal`   | Verdana text, blue links, a 720px reading column, borderless article list.       |
| `paper`     | Monospace text, a 768px shell, blue light links and orange on navy in dark mode. |

The minimal design takes inspiration from [Bear Blog's focus on reading](https://bearblog.dev/). The paper design takes inspiration from [AstroPaper's minimal blog presentation](https://github.com/satnaing/astro-paper). These themes use original CSS and the starter's shared templates. Neither project is installed or imported. The visual reference for paper is the [live AstroPaper demo](https://astro-paper.pages.dev/). The minimal design also uses the [Hugo Bear Blog demo](https://janraasch.github.io/hugo-bearblog/) as a rendered reference for the default Bear typography and layout. We retain our own branding, article metadata, navigation, and reading tools; these are adaptations rather than template ports.

The selected design and the reader's color preference are separate settings. Every bundled design supports light, dark, and system modes. The existing color button remembers the reader's preference. Reading, archives, downloads, and system color mode work without JavaScript.

## Add a local theme

1. Copy `themes/editorial/` into `themes/my-journal/`.
2. Edit `tokens.css` for colors, fonts, spacing, and reading width.
3. Edit `theme.css` for layout and component styling.
4. Set `theme: "my-journal"` in `site.config.mjs`.
5. Run `pnpm verify`, then inspect desktop and narrow views in both color modes.

Names use lowercase letters, digits, and single hyphens between words. No registry changes or package installation are needed to add a theme. The TypeScript build tooling still requires its installed dependencies, including Valibot.

Both CSS files are required. An empty `theme.css` keeps the shared layout. Only the selected folder is read. A missing or symlinked selected theme fails before the last successful publication is replaced. A broken inactive theme does not affect the build.

## Theme contract

Shared semantic HTML, search, table of contents, feeds, and URL handling stay in the generator. Themes supply CSS rather than executable plugins or alternative templates.

The generator publishes the selected files at `assets/tokens.css` and `assets/theme.css`. The shared base stylesheet imports the tokens; the layout links `theme.css` after the base stylesheet so layout overrides win. Both stylesheet URLs include the configured deployment prefix. Reserved theme output paths cannot be overwritten by files in `public/assets`.

Keep literal colors in `tokens.css`. Preserve all existing semantic token names. Define the light palette on `:root`, the explicit dark palette on `:root[data-theme="dark"]`, and system dark colors inside `prefers-color-scheme` for roots without an explicit light preference. `data-design-theme` identifies the build-selected theme; `data-theme` belongs to reader color preference.

Keep custom fonts and images under `public/`. CSS URLs resolve from the emitted `assets/` directory. For example, `url("../fonts/my-font.woff2")` refers to `public/fonts/my-font.woff2`. Keep asset license files. There is no theme JavaScript runtime, external stylesheet service, or framework dependency in the publication.

Preserve visible keyboard focus, readable contrast, responsive images, horizontally scrollable code and tables, and reduced-motion behavior. Do not hide content or navigation just to fit a narrow viewport. Built-in browser checks exercise every bundled theme at root and nested paths, on desktop and mobile, with keyboard search and accessibility checks in both color modes. Add equivalent browser coverage when shipping a new theme.

## Build the theme demo

Run `pnpm build:demo` to publish the same content in all three bundled themes with a visible theme switcher. The editorial version uses the root URL. Minimal and paper use `themes/minimal/` and `themes/paper/`. Switching themes keeps the current article or archive route.

The switcher uses native links styled as a segmented control. It works without JavaScript. Each version links to its own articles, search index, and downloads. The light/dark preference continues across theme versions.

The ordinary `pnpm build` still publishes only the selected theme. The demo is an explicit alternate build, with additional static copies and no new browser dependencies. Set `SITE_URL` and `BASE_PATH` as for any other build. Enable the **demo** input in the Publish Pages workflow to deploy this version.
