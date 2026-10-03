export interface Link {
  label: string;
  to: string;
}
export interface Config {
  name: string;
  description: string;
  language: string;
  author: string;
  siteUrl: string;
  basePath: string;
  navigation: Link[];
  logo: string;
  favicon: string;
  socialImage: string;
  socialLinks: Link[];
  featuredSlug?: string;
  postsPerPage: number;
  article: { contents: boolean; related: boolean };
}
export interface Heading {
  id: string;
  title: string;
  level: number;
}
export interface Document {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  category: string;
  tags: string[];
  draft: boolean;
  featured: boolean;
  body: string;
  route: string;
  html: string;
  headings: Heading[];
  text: string;
  minutes: number;
}
export interface Archive {
  route: string;
  title: string;
  posts: Document[];
  previous?: string;
  next?: string;
}
export interface Publication {
  posts: Document[];
  pages: Document[];
  archives: Archive[];
  categories: Link[];
  home: Document[];
}
