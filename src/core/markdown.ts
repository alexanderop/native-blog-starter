import type { CodeBlock, Heading, HighlightSnapshot, RenderedMarkdown } from "./types.ts";
import { escape as e, publicUrl, slugify } from "./urls.ts";
export function inline(source: string, base: string): string {
  let html = "",
    i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const escaped = rest.match(/^\\([\\`*_[\]()!|])/);
    if (escaped) {
      html += e(escaped[1]);
      i += 2;
      continue;
    }
    if (rest[0] === "`") {
      const end = source.indexOf("`", i + 1);
      if (end < 0) throw Error("Unclosed inline code");
      html += `<code>${e(source.slice(i + 1, end))}</code>`;
      i = end + 1;
      continue;
    }
    const link = rest.match(/^\[([^\]\n]+)\]\(([^\s)]+)\)/);
    if (link) {
      html += `<a href="${e(publicUrl(base, link[2]))}">${e(link[1])}</a>`;
      i += link[0].length;
      continue;
    }
    const marker = rest.startsWith("**") ? "**" : ["*", "_"].includes(rest[0]) ? rest[0] : "";
    if (marker) {
      const end = source.indexOf(marker, i + marker.length);
      if (end > i + marker.length) {
        const tag = marker === "**" ? "strong" : "em";
        html += `<${tag}>${inline(source.slice(i + marker.length, end), base)}</${tag}>`;
        i = end + marker.length;
        continue;
      }
    }
    html += e(source[i++]);
  }
  return html;
}
export function codeKey(block: Pick<CodeBlock, "language" | "text">): string {
  return JSON.stringify([block.language, block.text]);
}
export function markdown(
  source: string,
  base: string = "/",
  highlights?: HighlightSnapshot,
): RenderedMarkdown & { readonly codeBlocks: readonly CodeBlock[] } {
  const lines = source.split(/\r?\n/),
    html: string[] = [],
    used = new Set(["main", "finder-heading", "finder-input", "finder-results"]);
  const headings: Heading[] = [];
  const codeBlocks: CodeBlock[] = [];
  const plain: string[] = [];
  const push = (markup: string, searchMarkup: string = markup): void => {
    html.push(markup);
    plain.push(searchMarkup);
  };
  const cells = (value: string) =>
    value
      .slice(1, -1)
      .split(/(?<!\\)\|/)
      .map((s) => s.trim());
  const listItem = (value: string) => {
    const match = value.match(/^([-*]|\d+\.)([ \t])(.*)$/);
    if (!match) return undefined;
    if (match[2] !== " " || !match[3].trim())
      throw Error("Invalid list item: use one space and non-empty text after the marker");
    return { ordered: /\d/.test(match[1]), text: match[3] };
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^\s+[-*]\s|^\s+\d+\.\s|^#{1}\s|^#{5,}\s|^!\[.*\]\(https?:/.test(line))
      throw Error(`body line ${i + 1}: Unsupported Markdown construct`);
    if (line.startsWith("```")) {
      if (!/^```[\w-]*$/.test(line)) throw Error(`body line ${i + 1}: Invalid code fence`);
      const bodyLine = i + 1;
      const code = [];
      const label = line.slice(3);
      i++;
      while (i < lines.length && lines[i] !== "```") code.push(lines[i++]);
      if (i === lines.length) throw Error("Unclosed code fence");
      i++;
      const block = { language: label, text: code.join("\n"), bodyLine };
      codeBlocks.push(block);
      const escaped = e(block.text);
      const tokens = highlights?.get(codeKey(block));
      const classes = {
        plain: "",
        comment: "syntax-comment",
        keyword: "syntax-keyword",
        string: "syntax-string",
        number: "syntax-number",
        function: "syntax-function",
        type: "syntax-type",
        variable: "syntax-variable",
        punctuation: "syntax-punctuation",
      } as const;
      if (tokens && tokens.map((token) => token.text).join("") !== block.text)
        throw Error("Highlight tokens changed code text");
      const highlighted =
        tokens
          ?.map((token) => {
            if (!Object.hasOwn(classes, token.role)) throw Error("Invalid syntax role");
            const name = classes[token.role];
            return name ? `<span class="${name}">${e(token.text)}</span>` : e(token.text);
          })
          .join("") ?? escaped;
      const wrap = (codeHtml: string) =>
        `<pre tabindex="0" aria-label="${e(label || "Code")} example"><code>${codeHtml}</code></pre>`;
      push(wrap(highlighted), wrap(escaped));
      continue;
    }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const stem = slugify(heading[2]);
      let id = stem,
        n = 2;
      while (used.has(id)) id = `${stem}-${n++}`;
      used.add(id);
      headings.push({ id, title: heading[2], level: heading[1].length });
      push(`<h${heading[1].length} id="${id}">${inline(heading[2], base)}</h${heading[1].length}>`);
      i++;
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (image) {
      if (!image[2].startsWith("/media/")) throw Error("Images must be in /media/");
      push(
        `<figure><img src="${e(publicUrl(base, image[2]))}" alt="${e(image[1])}" loading="lazy" decoding="async"></figure>`,
      );
      i++;
      continue;
    }
    const firstItem = listItem(line);
    if (firstItem) {
      const ordered = firstItem.ordered;
      const items = [];
      while (i < lines.length) {
        const item = listItem(lines[i]);
        if (!item || item.ordered !== ordered) break;
        items.push(`<li>${inline(item.text, base)}</li>`);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    if (line.startsWith("> ")) {
      const quote = [];
      while (lines[i]?.startsWith("> ")) quote.push(lines[i++].slice(2));
      push(`<blockquote><p>${inline(quote.join(" "), base)}</p></blockquote>`);
      continue;
    }
    if (line.startsWith("|") && /^\|[\s:|-]+\|$/.test(lines[i + 1] ?? "")) {
      const headers = cells(line),
        rows = [];
      i += 2;
      while (lines[i]?.startsWith("|")) {
        const row = cells(lines[i++]);
        if (row.length !== headers.length) throw Error("Inconsistent table columns");
        rows.push(row);
      }
      push(
        `<div class="table-scroll" tabindex="0" role="region" aria-label="Article table"><table><thead><tr>${headers.map((c) => `<th scope="col">${inline(c, base)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${inline(c, base)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
      continue;
    }
    if (line.startsWith("::")) {
      const match = line.match(/^::(callout|note-figure)\{(.*)\}$/);
      if (!match) throw Error("Unsupported editorial block");
      const attrs = Object.fromEntries(
        [...match[2].matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
      );
      if (
        match[2].replace(/\w+="[^"]*"/g, "").trim() ||
        Object.keys(attrs).some(
          (k) => !(match[1] === "callout" ? ["title"] : ["label", "caption"]).includes(k),
        )
      )
        throw Error("Invalid editorial block attributes");
      const body = [];
      i++;
      while (i < lines.length && lines[i] !== "::") body.push(lines[i++]);
      if (i === lines.length) throw Error("Unclosed editorial block");
      i++;
      if (body.some((l) => /^(#|::|```)/.test(l)))
        throw Error("Editorial blocks accept plain paragraph lines only");
      push(
        match[1] === "callout"
          ? `<aside class="callout"><strong>${e(attrs.title ?? "Note")}</strong><p>${inline(body.join(" "), base)}</p></aside>`
          : `<figure class="note-figure"><div>${inline(body.join(" "), base)}</div><figcaption>${e(attrs.label ?? "")} ${e(attrs.caption ?? "")}</figcaption></figure>`,
      );
      continue;
    }
    const paragraph = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#|```|::|> |\||!\[|[-*] |\d+\. |\s+[-*]\s)/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    push(`<p>${inline(paragraph.join(" "), base)}</p>`);
  }
  const output = html.join("\n");
  const text = plain
    .join("\n")
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:amp|lt|gt|quot|#39);/g,
      (s) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[s] ?? s,
    )
    .replace(/\s+/g, " ")
    .trim();
  return { html: output, headings, text, codeBlocks };
}
