import { highlight } from "./highlight.ts";
import { imageDimensions } from "./images.ts";
import type { Heading, RenderedMarkdown } from "./types.ts";
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
export function markdown(
  source: string,
  base: string = "/",
  assets?: ReadonlyMap<string, Uint8Array>,
): RenderedMarkdown {
  const lines = source.split(/\r?\n/),
    html = [],
    used = new Set([
      "journal-finder",
      "finder-dialog",
      "main",
      "finder-heading",
      "finder-input",
      "finder-results",
    ]);
  const headings: Heading[] = [];
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
      const code = [];
      const label = line.slice(3);
      i++;
      while (i < lines.length && lines[i] !== "```") code.push(lines[i++]);
      if (i === lines.length) throw Error("Unclosed code fence");
      i++;
      html.push(
        `<pre tabindex="0" aria-label="${e(label || "Code")} example"><code>${highlight(code.join("\n"), label)}</code></pre>`,
      );
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
      html.push(
        `<h${heading[1].length} id="${id}">${inline(heading[2], base)}</h${heading[1].length}>`,
      );
      i++;
      continue;
    }
    const image = line.match(
      /^!\[([^\]]*)\]\(([^\s)]+)\)(?:\{width=([1-9]\d*) height=([1-9]\d*)\})?$/,
    );
    if (line.startsWith("![") && !image) throw Error("Invalid image syntax or dimensions");
    if (image) {
      if (!image[2].startsWith("/media/")) throw Error("Images must be in /media/");
      const dimensions = imageDimensions(image[2], assets, image[3], image[4]);
      html.push(
        `<figure><img src="${e(publicUrl(base, image[2]))}" alt="${e(image[1])}"${dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : ""} loading="lazy" decoding="async"></figure>`,
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
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    if (line.startsWith("> ")) {
      const quote = [];
      while (lines[i]?.startsWith("> ")) quote.push(lines[i++].slice(2));
      html.push(`<blockquote><p>${inline(quote.join(" "), base)}</p></blockquote>`);
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
      html.push(
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
      html.push(
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
    html.push(`<p>${inline(paragraph.join(" "), base)}</p>`);
  }
  const output = html.join("\n");
  const text = output
    .replace(/<\/?span\b[^>]*>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:amp|lt|gt|quot|#39|#x27);/g,
      (s) =>
        ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'" })[
          s
        ] ?? s,
    )
    .replace(/\s+/g, " ")
    .trim();
  return { html: output, headings, text };
}
