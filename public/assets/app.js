export {};
/** @template {Element} T @param {string} selector @param {new (...args: never[]) => T} type @returns {T} */
function find(selector, type) {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw Error(`Missing ${selector}`);
  return el;
}
const dialog = find("dialog", HTMLDialogElement),
  input = find("#finder-input", HTMLInputElement),
  results = find("#finder-results", HTMLDivElement),
  status = find(".finder-status", HTMLParagraphElement),
  retry = find("[data-retry]", HTMLButtonElement);
/** @typedef {{title:string,description:string,content:string,url:string,category:string,tags:string[]}} Entry */
/** @type {Entry[]|undefined} */ let index;
/** @type {Entry[]} */ let found = [];
/** @type {Element|null} */ let returnFocus = null;
let selected = 0,
  loading = false;
/** @param {number} n */ function select(n) {
  selected = n;
  results
    .querySelectorAll("[role=option]")
    .forEach((option, i) => option.setAttribute("aria-selected", String(i === n)));
  if (found.length) {
    input.setAttribute("aria-activedescendant", `result-${n}`);
    document.getElementById(`result-${n}`)?.scrollIntoView({ block: "nearest" });
  } else input.removeAttribute("aria-activedescendant");
}
function render() {
  const words = input.value.toLowerCase().trim().split(/\s+/);
  found = (index ?? [])
    .filter((entry) =>
      words.every((word) =>
        `${entry.title} ${entry.description} ${entry.content} ${entry.category} ${entry.tags.join(" ")}`
          .toLowerCase()
          .includes(word),
      ),
    )
    .slice(0, 30);
  results.replaceChildren();
  found.forEach((entry, i) => {
    const option = document.createElement("div");
    option.id = `result-${i}`;
    option.className = "finder-result";
    option.setAttribute("role", "option");
    const title = document.createElement("strong"),
      detail = document.createElement("span");
    title.textContent = entry.title;
    detail.textContent = `${entry.category} · ${entry.description}`;
    option.append(title, detail);
    option.addEventListener("click", () => location.assign(entry.url));
    results.append(option);
  });
  status.textContent = found.length
    ? `${found.length} results`
    : "No matching notes. Try another search.";
  input.setAttribute("aria-expanded", String(found.length > 0));
  select(0);
}
async function openFinder() {
  if (!dialog.open) {
    returnFocus = document.activeElement;
    dialog.showModal();
  }
  input.focus();
  if (index) {
    render();
    return;
  }
  if (loading) return;
  loading = true;
  status.textContent = "Loading the journal…";
  retry.hidden = true;
  try {
    const response = await fetch(`${document.body.dataset.base}search.json`);
    if (!response.ok) throw Error("Search unavailable");
    index = await response.json();
    render();
  } catch {
    status.textContent = "Search could not load. Try again.";
    retry.hidden = false;
  } finally {
    loading = false;
  }
}
document.querySelectorAll("[data-finder]").forEach((button) =>
  button.addEventListener("click", () => {
    void openFinder();
  }),
);
retry.addEventListener("click", () => {
  void openFinder();
});
find("[data-close]", HTMLButtonElement).addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => {
  const target =
    returnFocus instanceof HTMLElement && returnFocus !== document.body
      ? returnFocus
      : find("#main", HTMLElement);
  target.focus({ preventScroll: true });
});
input.addEventListener("input", () => {
  if (index) render();
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    dialog.close();
    return;
  }
  if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) event.preventDefault();
  if (!found.length) return;
  if (event.key === "ArrowDown") select((selected + 1) % found.length);
  if (event.key === "ArrowUp") select((selected - 1 + found.length) % found.length);
  if (event.key === "Enter") location.assign(found[selected].url);
});
document.addEventListener("keydown", (event) => {
  const typing =
    event.target instanceof HTMLElement &&
    (event.target.matches("input,textarea,select") || event.target.isContentEditable);
  if (
    (event.key === "/" && !typing) ||
    ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")
  ) {
    event.preventDefault();
    void openFinder();
  }
});
for (const button of document.querySelectorAll("button[data-copy-url],button[data-copy-markdown]"))
  button.addEventListener("click", async () => {
    const status = document.querySelector("[data-copy-status]");
    if (!status) return;
    try {
      let text = location.href;
      const url = button.getAttribute("data-copy-markdown");
      if (url) {
        const response = await fetch(url);
        if (!response.ok) throw Error("Download unavailable");
        text = await response.text();
      }
      await navigator.clipboard.writeText(text);
      status.textContent = "Copied to clipboard.";
    } catch {
      status.textContent = "Could not copy. Use the download link or address bar.";
    }
  });
const headings = [
  ...document.querySelectorAll("article.prose h2[id],article.prose h3[id],article.prose h4[id]"),
];
let scheduled = false;
function updateReading() {
  const active = headings.filter((h) => h.getBoundingClientRect().top <= 150).at(-1) ?? headings[0];
  document.querySelectorAll(".contents-tree a").forEach((a) => {
    if (a.getAttribute("href") === `#${active?.id}`) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
  scheduled = false;
}
addEventListener(
  "scroll",
  () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateReading);
    }
  },
  { passive: true },
);
updateReading();
document.documentElement.classList.add("js");
