import { escape as e, publicUrl, slugify } from "./urls.mjs";
/** @param {string} source @param {string} base @returns {string} */
export function inline(source, base) {
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
/** @param {string} source @param {string} [base] */
export function markdown(source, base = "/") {
  const lines = source.split(/\r?\n/),
    html = [],
    used = new Set(["main", "finder-heading", "finder-input", "finder-results"]);
  /** @type {import('./types.js').Heading[]} */ const headings = [];
  /** @param {string} value */ const cells = (value) =>
    value
      .slice(1, -1)
      .split(/(?<!\\)\|/)
      .map((s) => s.trim());
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
        `<pre tabindex="0" aria-label="${e(label || "Code")} example"><code>${e(code.join("\n"))}</code></pre>`,
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
    const image = line.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (image) {
      if (!image[2].startsWith("/media/")) throw Error("Images must be in /media/");
      html.push(
        `<figure><img src="${e(publicUrl(base, image[2]))}" alt="${e(image[1])}" loading="lazy" decoding="async"></figure>`,
      );
      i++;
      continue;
    }
    if (/^(?:[-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\d/.test(line),
        pattern = ordered ? /^\d+\. (.+)$/ : /^[-*] (.+)$/;
      const items = [];
      while (i < lines.length) {
        const match = lines[i].match(pattern);
        if (!match) break;
        items.push(`<li>${inline(match[1], base)}</li>`);
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
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:amp|lt|gt|quot|#39);/g,
      (s) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[s] ?? s,
    )
    .replace(/\s+/g, " ")
    .trim();
  return { html: output, headings, text };
}
