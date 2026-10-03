import type { BundledLanguage } from "shiki";
import { bundledLanguages, createHighlighter } from "shiki";
import * as v from "valibot";
import { parseConfig } from "../core/config.ts";
import { collect } from "../core/content.ts";
import { codeKey } from "../core/markdown.ts";
import type { Diagnostic, ProjectInputs, SyntaxRole, SyntaxToken } from "../core/types.ts";

const scopes: Readonly<Record<Exclude<SyntaxRole, "plain">, readonly string[]>> = {
  comment: ["comment"],
  keyword: ["keyword", "storage"],
  string: ["string"],
  number: ["constant.numeric", "constant.language"],
  function: ["entity.name.function", "support.function"],
  type: ["entity.name.type", "support.type", "entity.name.tag"],
  variable: ["variable", "entity.other.attribute-name"],
  punctuation: ["punctuation"],
};
const TokenSchema = v.object({
  content: v.string(),
  color: v.optional(
    v.picklist([
      "",
      "var(--syntax-plain)",
      "var(--syntax-comment)",
      "var(--syntax-keyword)",
      "var(--syntax-string)",
      "var(--syntax-number)",
      "var(--syntax-function)",
      "var(--syntax-type)",
      "var(--syntax-variable)",
      "var(--syntax-punctuation)",
    ]),
  ),
});
const LinesSchema = v.array(v.array(TokenSchema));
const roles: Readonly<Record<string, SyntaxRole>> = {
  "var(--syntax-plain)": "plain",
  "var(--syntax-comment)": "comment",
  "var(--syntax-keyword)": "keyword",
  "var(--syntax-string)": "string",
  "var(--syntax-number)": "number",
  "var(--syntax-function)": "function",
  "var(--syntax-type)": "type",
  "var(--syntax-variable)": "variable",
  "var(--syntax-punctuation)": "punctuation",
};
export interface SyntaxEngine {
  readonly tokenize: (text: string, language: string) => unknown;
  readonly dispose: () => void;
}
export type SyntaxEngineFactory = (languages: readonly string[]) => Promise<SyntaxEngine>;

function isBundledLanguage(language: string): language is BundledLanguage {
  return Object.hasOwn(bundledLanguages, language);
}

async function createSyntaxEngine(languages: readonly string[]): Promise<SyntaxEngine> {
  const theme = {
    name: "native-semantic",
    settings: [
      { settings: { foreground: "var(--syntax-plain)" } },
      ...Object.entries(scopes).map(([role, scope]) => ({
        scope: [...scope],
        settings: { foreground: `var(--syntax-${role})` },
      })),
    ],
  };
  const highlighter = await createHighlighter({ langs: [...languages], themes: [theme] });
  return {
    tokenize: (text, language) => {
      if (!isBundledLanguage(language)) throw Error(`Unsupported code language "${language}"`);
      return highlighter.codeToTokensBase(text, { lang: language, theme });
    },
    dispose: () => highlighter.dispose(),
  };
}

export async function highlightProject(
  inputs: ProjectInputs,
  createEngine: SyntaxEngineFactory = createSyntaxEngine,
): Promise<{ readonly inputs: ProjectInputs; readonly warnings: readonly Diagnostic[] }> {
  const config = parseConfig(inputs.config, inputs.env);
  const { codeBlocks } = collect(inputs.sources, config);
  const warnings: Diagnostic[] = [];
  const supported = codeBlocks.filter((block) => {
    if (["", "text", "txt", "plaintext"].includes(block.language)) return false;
    if (Object.hasOwn(bundledLanguages, block.language)) return true;
    warnings.push({
      source: block.source,
      line: block.line,
      message: `Unsupported code language "${block.language}"; publishing plain code`,
    });
    return false;
  });
  const highlights = new Map<string, readonly SyntaxToken[]>();
  if (!supported.length) return { inputs: { ...inputs, highlights }, warnings };
  const engine = await createEngine([...new Set(supported.map((block) => block.language))]);
  try {
    for (const block of supported) {
      const key = codeKey(block);
      if (highlights.has(key)) continue;
      try {
        const lines = v.parse(LinesSchema, engine.tokenize(block.text, block.language));
        const tokens: SyntaxToken[] = [];
        for (const [index, line] of lines.entries()) {
          if (index) tokens.push({ text: "\n", role: "plain" });
          for (const token of line)
            tokens.push({ text: token.content, role: token.color ? roles[token.color] : "plain" });
        }
        if (tokens.map((token) => token.text).join("") !== block.text)
          throw Error("Syntax highlighting changed code text");
        highlights.set(key, tokens);
      } catch (error) {
        throw Error(
          `${block.source}:${block.line}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
  } finally {
    engine.dispose();
  }
  return { inputs: { ...inputs, highlights }, warnings };
}
