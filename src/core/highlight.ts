import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import { escape } from "./urls.ts";

const highlighter = hljs.newInstance();
for (const [name, grammar] of Object.entries({ javascript, typescript, xml, css, json, bash }))
  highlighter.registerLanguage(name, grammar);
highlighter.registerAliases("vue", { languageName: "xml" });

export function highlight(code: string, language: string): string {
  // No language guessing; large examples remain literal and cheap to render.
  if (!language || code.length > 50_000 || !highlighter.getLanguage(language)) return escape(code);
  return highlighter.highlight(code, { language, ignoreIllegals: true }).value;
}
