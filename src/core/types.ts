import type { Config, LogicalRoute, OutputPath, PageMetadata, PostMetadata } from "./schemas.ts";
export type {
  ConfigInput,
  Config,
  LogicalRoute,
  OutputPath,
  PageMetadata,
  PostMetadata,
} from "./schemas.ts";
export interface Heading {
  readonly id: string;
  readonly title: string;
  readonly level: number;
}
export interface CodeBlock {
  readonly language: string;
  readonly text: string;
  readonly bodyLine: number;
}
export interface LocatedCodeBlock extends CodeBlock {
  readonly source: string;
  readonly line: number;
}
export type SyntaxRole =
  | "plain"
  | "comment"
  | "keyword"
  | "string"
  | "number"
  | "function"
  | "type"
  | "variable"
  | "punctuation";
export interface SyntaxToken {
  readonly text: string;
  readonly role: SyntaxRole;
}
export type HighlightSnapshot = ReadonlyMap<string, readonly SyntaxToken[]>;
export interface RenderedMarkdown {
  readonly html: string;
  readonly headings: readonly Heading[];
  readonly text: string;
}
export interface RenderedContent extends RenderedMarkdown {
  readonly slug: string;
  readonly route: LogicalRoute;
  readonly body: string;
  readonly minutes: number;
}
export type Post = PostMetadata & RenderedContent & { readonly kind: "post" };
export type PublishedPost = Omit<Post, "draft"> & { readonly draft: false };
export type Page = PageMetadata & RenderedContent & { readonly kind: "page" };
export interface Archive {
  readonly route: LogicalRoute;
  readonly title: string;
  readonly posts: readonly PublishedPost[];
  readonly previous?: LogicalRoute;
  readonly next?: LogicalRoute;
}
export interface Publication {
  readonly posts: readonly PublishedPost[];
  readonly pages: readonly Page[];
  readonly archives: readonly Archive[];
  readonly categories: readonly { readonly label: string; readonly to: LogicalRoute }[];
  readonly home: readonly PublishedPost[];
}
export interface ConfigOverrides {
  readonly SITE_URL?: string;
  readonly BASE_PATH?: string;
}
export interface ContentSource {
  readonly file: string;
  readonly slug: string;
  readonly kind: "post" | "page";
  readonly source: string;
}
export interface ThemeSource {
  readonly id: string;
  readonly tokensCss: string;
  readonly themeCss: string;
}
export interface ProjectInputs {
  readonly highlights?: HighlightSnapshot;
  readonly theme: ThemeSource;
  readonly config: unknown;
  readonly env?: ConfigOverrides;
  readonly sources: readonly ContentSource[];
  readonly assets: ReadonlyMap<string, Uint8Array>;
}
export interface Diagnostic {
  readonly source: string;
  readonly message: string;
  readonly line?: number;
}
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly Diagnostic[] };
export interface ValidatedBuildPlan {
  readonly files: ReadonlyMap<OutputPath, string | Uint8Array>;
  readonly config: Config;
  readonly publication: Publication;
  readonly articles: number;
}
