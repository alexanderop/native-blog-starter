# Authoring

Posts live directly in `content/blog/`. Pages live in `content/pages/`. Filenames use lowercase ASCII words separated by single hyphens. A post called `a-useful-note.md` publishes at `/blog/a-useful-note/`. Renaming it changes its URL. Configure redirects at your host when moving published content.

```md
---
title: A useful note
description: One clear thought about building for the web.
date: 2026-10-03
category: Notes
tags: [craft, web]
draft: true
---

## Start here

Write a paragraph.
```

## Metadata

This is a restricted format, not YAML. Each line is `key: value`. Strings may have matching single or double quotes. The outer pair is removed; interior quotes and backslashes remain literal. Markdown downloads quote text fields to preserve their contents. Multiline scalars, comments, escapes inside quoted strings, and nested structures are unsupported. Required fields are title, description, date, and category. Author defaults to site configuration. Tags are a bracketed, comma-separated array of plain names using letters, digits, spaces, and hyphens. Duplicate tags are removed.

`draft` and `featured` accept only `true` or `false`. Unknown and duplicate fields fail with the filename and line. Standalone pages accept only title and description.

Dates must be valid UTC calendar dates in `YYYY-MM-DD` form. Future dates publish immediately unless `draft: true`. There is no scheduling. Drafts never enter page, feed, search, sitemap, archive, or download output. `_drafts/` is skipped without reading its contents.

All files in `public/` are intentionally public, including unused images. Private draft media must remain elsewhere. Symlinks are rejected. Do not store credentials or private metadata in publication files.

One featured post can move to the first homepage slot. `featuredSlug` overrides that choice. Multiple featured posts require an explicit configured choice. Archive, feed, and previous/next order always use date descending, then slug. Related reading requires a shared category or tag and ranks category, shared tags, date, then slug.

## Body syntax

- Paragraphs are separated by blank lines. Adjacent lines join with spaces.
- `##`, `###`, and `####` produce headings. The page title supplies h1. Heading IDs are unique and deterministic.
- `**strong**`, `*emphasis*`, `_emphasis_`, and single-backtick inline code are supported. Use simple balanced delimiters; nested emphasis is not a supported grammar. Code contents stay literal.
- Inline links use `[label](/about/)`. Link labels are plain text. Destinations contain no spaces or closing parentheses. HTTP(S), mailto, fragments, and logical root paths are accepted. Source-relative Markdown links are unsupported.
- Flat `- ` or `* ` lists and `1. ` numbered lists have single-paragraph items. Markers require an ASCII space and nonblank item text; incomplete items fail with a diagnostic. Numbering renders from one. Nested lists are rejected.
- Standalone `![description](/media/image.svg)` images use local files. Empty alt explicitly marks a decorative image. Images scale to the reading width; there is no image processing or remote image fetch.
- Consecutive `> ` lines form one blockquote.
- Triple-backtick fences optionally accept a word-like language label. Close on its own line. Code is escaped, horizontally scrollable, and not syntax highlighted.
- Pipe tables require a header and separator line. Every row has the same number of cells and starts/ends with a pipe. Write `\|` for a literal pipe inside a cell.
- Backslash escapes are supported for backslash, backtick, asterisk, underscore, brackets, parentheses, exclamation mark, and pipe.
- Authored raw HTML is displayed as escaped text. It never executes.

Links and fragments are checked against the completed publication. Use `/archive/`, never `/my-repository/archive/`; the configured base is added centrally. Missing links fail before output replaces the last successful build.

## Editorial blocks

These accept plain paragraph lines with inline formatting. Headings, fences, and nested editorial blocks are unsupported inside them.

```md
::callout{title="A useful detail"}
Explain the detail here.
::

::note-figure{label="A short loop" caption="What the reader should notice."}
Write → Preview → Revise
::
```

This parser is deliberately bounded and is not CommonMark. Before expanding syntax, add concrete authoring fixtures. If ordinary content requires a broad CommonMark implementation, reconsider the build-dependency contract and a maintained parser. Do not grow an undocumented replacement for CommonMark.
