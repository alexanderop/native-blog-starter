---
title: The shape of a note
description: A working example of headings, lists, links, code, tables, and a little breathing room.
date: 2026-10-02
category: Craft
tags: [writing, craft]
---

## Make the idea visible

Use **strong text** for an important point and _emphasis_ when the sentence needs it. Keep `inline code` literal. A [link to the archive](/archive/) helps a reader explore.

### Work in a useful order

1. Describe the problem.
2. Show a concrete example.
3. Explain the result.

#### One detail at a time

Flat lists keep a sequence readable. This is a small Markdown subset, so nested lists and embedded HTML are intentionally outside it.

## Show the code

```js
/* Code is highlighted at build time.
   The browser receives only HTML and CSS. */
const message = "<p>Keep authored code literal.</p>";
console.log(message);
```

> A useful note leaves enough detail for the next person.
> That next person may be you.

## Compare the choices

| Part       | Responsibility     |
| ---------- | ------------------ |
| Markdown   | Your words         |
| CSS tokens | The visual theme   |
| Node       | Static publication |

::callout{title="Try it locally"}
Edit this file, rebuild, and refresh your browser. The source remains an ordinary text file.
::

::note-figure{label="A small loop" caption="Observe the result before changing the next thing."}
Write → Preview → Read → Revise
::

## Keep it yours

Raw HTML such as <script>alert('example')</script> appears as text. The authoring guide documents the exact supported syntax. Replace this sample when you are ready.
