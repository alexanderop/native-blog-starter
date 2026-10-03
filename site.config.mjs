/** @satisfies {import('./src/core/schemas.ts').ConfigInput} */
export default {
  name: "Fieldnotes",
  theme: "editorial",
  description: "Notes on making useful things. Engineering, design, and the space between them.",
  language: "en",
  author: "Alex Morgan",
  siteUrl: "https://example.com",
  basePath: "/",
  navigation: [
    { label: "Journal", to: "/" },
    { label: "Archive", to: "/archive/" },
    { label: "About", to: "/about/" },
  ],
  logo: "/brand/lantern.svg",
  favicon: "/brand/lantern.svg",
  socialImage: "/brand/social.svg",
  socialLinks: [],
  postsPerPage: 10,
  article: { contents: true, related: true },
};
