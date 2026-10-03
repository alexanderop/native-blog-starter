import type { PublishedPost, Config, Publication, Archive, Page } from "./types.ts";
import { logicalRoute } from "./schemas.ts";
import { slugify } from "./urls.ts";
export function publication(
  posts: readonly PublishedPost[],
  pages: readonly Page[],
  config: Config,
): Publication {
  posts = posts.toSorted((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const featured = config.featuredSlug
    ? posts.find((p) => p.slug === config.featuredSlug)
    : posts.find((p) => p.featured);
  if (config.featuredSlug && !featured) throw Error("featuredSlug does not name a published post");
  if (!config.featuredSlug && posts.filter((p) => p.featured).length > 1)
    throw Error("Multiple featured posts need an explicit featuredSlug");
  const categories = [...new Set(posts.map((p) => p.category))]
    .sort()
    .map((label) => ({ label, to: logicalRoute(`/category/${slugify(label)}/`) }));
  if (new Set(categories.map((c) => c.to)).size !== categories.length)
    throw Error("Category slugs collide");
  const archives: Archive[] = [];
  for (const category of [{ label: "Archive", to: logicalRoute("/archive/") }, ...categories]) {
    const subset =
      category.to === "/archive/" ? posts : posts.filter((p) => p.category === category.label);
    const count = Math.max(1, Math.ceil(subset.length / config.postsPerPage));
    const route = (page: number) =>
      page === 1 ? category.to : logicalRoute(`${category.to}page/${page}/`);
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
export function related(
  post: Pick<PublishedPost, "slug" | "tags" | "category">,
  posts: readonly PublishedPost[],
): readonly PublishedPost[] {
  const shared = (p: PublishedPost) => p.tags.filter((t) => post.tags.includes(t)).length;
  return posts
    .filter((p) => p.slug !== post.slug && (p.category === post.category || shared(p) > 0))
    .sort(
      (a, b) =>
        Number(b.category === post.category) - Number(a.category === post.category) ||
        shared(b) - shared(a) ||
        b.date.localeCompare(a.date) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, 3);
}
