import { slugify } from "./urls.mjs";
/** @param {import('./types.js').Document[]} posts @param {import('./types.js').Document[]} pages @param {import('./types.js').Config} config @returns {import('./types.js').Publication} */
export function publication(posts, pages, config) {
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const featured = config.featuredSlug
    ? posts.find((p) => p.slug === config.featuredSlug)
    : posts.find((p) => p.featured);
  if (config.featuredSlug && !featured) throw Error("featuredSlug does not name a published post");
  if (!config.featuredSlug && posts.filter((p) => p.featured).length > 1)
    throw Error("Multiple featured posts need an explicit featuredSlug");
  const categories = [...new Set(posts.map((p) => p.category))]
    .sort()
    .map((label) => ({ label, to: `/category/${slugify(label)}/` }));
  if (new Set(categories.map((c) => c.to)).size !== categories.length)
    throw Error("Category slugs collide");
  /** @type {import('./types.js').Archive[]} */ const archives = [];
  for (const category of [{ label: "Archive", to: "/archive/" }, ...categories]) {
    const subset =
      category.to === "/archive/" ? posts : posts.filter((p) => p.category === category.label);
    const count = Math.max(1, Math.ceil(subset.length / config.postsPerPage));
    /** @param {number} page */ const route = (page) =>
      page === 1 ? category.to : `${category.to}page/${page}/`;
    for (let page = 1; page <= count; page++)
      archives.push({
        route: route(page),
        title: `${category.label}${page > 1 ? ` · Page ${page}` : ""}`,
        posts: subset.slice((page - 1) * config.postsPerPage, page * config.postsPerPage),
        previous: page > 1 ? route(page - 1) : undefined,
        next: page < count ? route(page + 1) : undefined,
      });
  }
  for (const page of pages)
    if (
      ["archive", "blog", "category", "markdown", "assets", "brand", "media", "fonts"].includes(
        page.slug,
      )
    )
      throw Error(`Reserved page route: ${page.route}`);
  return {
    posts,
    pages,
    categories,
    archives,
    home: (featured ? [featured, ...posts.filter((p) => p !== featured)] : posts).slice(
      0,
      config.postsPerPage,
    ),
  };
}
/** @param {import('./types.js').Document} post @param {import('./types.js').Document[]} posts */
export function related(post, posts) {
  const shared = (/** @type {import('./types.js').Document} */ p) =>
    p.tags.filter((t) => post.tags.includes(t)).length;
  return posts
    .filter((p) => p !== post && (p.category === post.category || shared(p) > 0))
    .sort(
      (a, b) =>
        Number(b.category === post.category) - Number(a.category === post.category) ||
        shared(b) - shared(a) ||
        b.date.localeCompare(a.date) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, 3);
}
