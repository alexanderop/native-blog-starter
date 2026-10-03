import { cp, mkdir, writeFile, mkdtemp, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { projectRoot } from "../../scripts/build.ts";
export async function fixture({
  root,
  count = 23,
  base = "/",
  name = "Fixture Journal",
  theme = "editorial",
} = {}) {
  root ??= await mkdtemp(resolve(tmpdir(), "native-blog-"));
  for (const dir of ["content/blog/_drafts", "content/pages", "public/brand", "public/media"])
    await mkdir(resolve(root, dir), { recursive: true });
  await cp(resolve(projectRoot, "public/assets"), resolve(root, "public/assets"), {
    recursive: true,
  });
  await cp(resolve(projectRoot, "public/fonts"), resolve(root, "public/fonts"), {
    recursive: true,
  });
  await symlink(resolve(projectRoot, "node_modules"), resolve(root, "node_modules"), "dir");
  await writeFile(resolve(root, "package.json"), JSON.stringify({ type: "module" }));
  await cp(resolve(projectRoot, "themes"), resolve(root, "themes"), { recursive: true });
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="360"><rect width="960" height="360" fill="#a34d32"/></svg>';
  await writeFile(resolve(root, "public/brand/logo.svg"), svg);
  await writeFile(resolve(root, "public/media/diagram.svg"), svg);
  const config = {
    name,
    theme,
    description: "A publication owned by its author.",
    language: "en",
    author: "Taylor Chen",
    siteUrl: "https://journal.example",
    basePath: base,
    navigation: [
      { label: "Journal", to: "/" },
      { label: "Archive", to: "/archive/" },
      { label: "About", to: "/about/" },
    ],
    logo: "/brand/logo.svg",
    favicon: "/brand/logo.svg",
    socialImage: "/brand/logo.svg",
    socialLinks: [{ label: "Email", to: "mailto:writer@example.com" }],
    postsPerPage: 10,
    article: { contents: true, related: true },
  };
  await writeFile(resolve(root, "site.config.mjs"), `export default ${JSON.stringify(config)}`);
  await writeFile(
    resolve(root, "content/pages/about.md"),
    "---\ntitle: About the fixture\ndescription: Owned content.\n---\n\n## Our story\n\nSee the [archive](/archive/).\n",
  );
  await writeFile(
    resolve(root, "content/blog/_drafts/private.md"),
    "PRIVATE_DIRECTORY_SENTINEL <invalid>",
  );
  await writeFile(
    resolve(root, "content/blog/secret.md"),
    "---\ntitle: PRIVATE_TITLE_SENTINEL\ndescription: PRIVATE_METADATA_SENTINEL\ndate: 2026-10-01\ncategory: Private\ndraft: true\n---\nPRIVATE_BODY_SENTINEL",
  );
  for (let i = 1; i <= count; i++) {
    const id = String(i).padStart(2, "0");
    const body =
      i === count
        ? `## Start here\n\nA **useful** note with _emphasis_, a [local link](/about/), and literal \`<b>code</b>\`.\n\n- First point\n- Second point\n\n## The next step\n\n${"A longer paragraph to make reading navigation observable. ".repeat(60)}\n\n### Details\n\n![Fixture diagram](/media/diagram.svg)\n\n\`\`\`js\nconst deliberatelyLongLine = '${"x".repeat(230)}';\n\`\`\`\n\n| Column one | Column two | Column three |\n| --- | --- | --- |\n| A deliberately wide table value | Another wide table value | A third wide value |\n\n## Finish\n\nUse the native contents links.\n`
        : "## A thought\n\nAn independent fixture article.\n";
    await writeFile(
      resolve(root, `content/blog/note-${id}.md`),
      `---\ntitle: ${i === count ? "An intentionally long article title about the small choices that make independent publishing pleasant and understandable" : `Fixture note ${id}`}\ndescription: Fixture description ${id}.\ndate: 2026-09-${id}\ncategory: ${i % 2 ? "Craft" : "Engineering"}\ntags: [web, writing]\n---\n\n${body}`,
    );
  }
  return { root, config };
}
