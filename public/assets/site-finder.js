/** @typedef {{title:string,description:string,content:string,url:string,category:string,tags:string[]}} Entry */
/** @type {Set<SiteFinder>} */
const connected = new Set();
/** @type {AbortController | undefined} */
let shortcuts;

function connectShortcuts() {
  if (shortcuts) return;
  shortcuts = new AbortController();
  const { signal } = shortcuts;
  document.addEventListener(
    "click",
    (event) => {
      const trigger =
        event.target instanceof Element ? event.target.closest("[data-finder]") : null;
      const finder = document.getElementById(trigger?.getAttribute("data-finder") ?? "");
      if (finder instanceof SiteFinder && connected.has(finder)) void finder.open();
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.defaultPrevented) return;
      const typing =
        event.target instanceof HTMLElement &&
        (event.target.matches("input,textarea,select") || event.target.isContentEditable);
      if (
        (event.key === "/" && !typing) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")
      ) {
        const finder =
          [...connected].find((el) => el.querySelector("dialog[open]")) ??
          connected.values().next().value;
        if (!finder) return;
        event.preventDefault();
        void finder.open();
      }
    },
    { signal },
  );
}

/** @param {unknown} value @returns {value is Entry[]} */
function validEntries(value) {
  return (
    Array.isArray(value) &&
    value.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      return (
        ["title", "description", "content", "url", "category"].every(
          (key) => typeof entry[key] === "string",
        ) &&
        Array.isArray(entry.tags) &&
        entry.tags.every((/** @type {unknown} */ tag) => typeof tag === "string")
      );
    })
  );
}

/** @param {SiteFinder} host @param {AbortSignal} signal */
function mount(host, signal) {
  const dialog = host.querySelector("dialog"),
    input = host.querySelector('input[role="combobox"]'),
    results = host.querySelector('[role="listbox"]'),
    status = host.querySelector(".finder-status"),
    retry = host.querySelector("button[data-retry]"),
    close = host.querySelector("button[data-close]");
  if (
    !(dialog instanceof HTMLDialogElement) ||
    !(input instanceof HTMLInputElement) ||
    !(results instanceof HTMLElement) ||
    !results.id ||
    !(status instanceof HTMLElement) ||
    !(retry instanceof HTMLButtonElement) ||
    !(close instanceof HTMLButtonElement) ||
    !host.dataset.search
  )
    return;
  const searchUrl = new URL(host.dataset.search, location.href);
  /** @type {Entry[] | undefined} */ let index;
  /** @type {Entry[]} */ let found = [];
  /** @type {Element | null} */ let returnFocus = null;
  let selected = 0,
    loading = false;
  const resultId = (/** @type {number} */ n) => `${results.id}-result-${n}`;
  const select = (/** @type {number} */ n) => {
    selected = n;
    results.querySelectorAll('[role="option"]').forEach((option, i) => {
      option.setAttribute("aria-selected", String(i === n));
      if (i === n) option.scrollIntoView({ block: "nearest" });
    });
    if (found.length) input.setAttribute("aria-activedescendant", resultId(n));
    else input.removeAttribute("aria-activedescendant");
  };
  const render = () => {
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
      option.id = resultId(i);
      option.className = "finder-result";
      option.setAttribute("role", "option");
      const title = document.createElement("strong"),
        detail = document.createElement("span");
      title.textContent = entry.title;
      detail.textContent = `${entry.category} · ${entry.description}`;
      option.append(title, detail);
      results.append(option);
    });
    status.textContent = found.length
      ? `${found.length} results`
      : "No matching notes. Try another search.";
    input.setAttribute("aria-expanded", String(found.length > 0));
    select(0);
  };
  const open = async () => {
    if (signal.aborted) return;
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
      const response = await fetch(searchUrl, { signal });
      if (!response.ok) throw Error("Search unavailable");
      /** @type {unknown} */ const data = await response.json();
      if (signal.aborted) return;
      if (!validEntries(data)) throw Error("Invalid search index");
      const base = new URL(".", searchUrl);
      if (
        data.some((entry) => {
          const url = new URL(entry.url, location.href);
          return url.origin !== location.origin || !url.pathname.startsWith(base.pathname);
        })
      )
        throw Error("Invalid search destination");
      index = data;
      if (dialog.open) render();
    } catch {
      if (!signal.aborted) {
        status.textContent = "Search could not load. Try again.";
        retry.hidden = false;
      }
    } finally {
      loading = false;
    }
  };
  retry.addEventListener(
    "click",
    () => {
      void open();
    },
    { signal },
  );
  close.addEventListener("click", () => dialog.close(), { signal });
  dialog.addEventListener(
    "close",
    () => {
      if (dialog.open) return;
      const target =
        returnFocus instanceof HTMLElement &&
        returnFocus.isConnected &&
        returnFocus !== document.body
          ? returnFocus
          : document.getElementById("main");
      target?.focus({ preventScroll: true });
    },
    { signal },
  );
  input.addEventListener(
    "input",
    () => {
      if (index) render();
    },
    { signal },
  );
  results.addEventListener(
    "click",
    (event) => {
      const option =
        event.target instanceof Element ? event.target.closest('[role="option"]') : null;
      const i = [...results.children].findIndex((child) => child === option);
      if (found[i]) location.assign(found[i].url);
    },
    { signal },
  );
  input.addEventListener(
    "keydown",
    (event) => {
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
    },
    { signal },
  );
  signal.addEventListener(
    "abort",
    () => {
      dialog.close();
      results.replaceChildren();
      input.removeAttribute("aria-activedescendant");
      input.setAttribute("aria-expanded", "false");
      status.textContent = "";
      retry.hidden = true;
    },
    { once: true },
  );
  return open;
}

class SiteFinder extends HTMLElement {
  /** @type {AbortController | undefined} */ #connection;
  /** @type {(() => Promise<void>) | undefined} */ #open;
  connectedCallback() {
    if (this.#connection) return;
    const controller = new AbortController();
    this.#open = mount(this, controller.signal);
    if (!this.#open) {
      controller.abort();
      return;
    }
    this.#connection = controller;
    connected.add(this);
    connectShortcuts();
    this.#showTriggers(true);
  }
  disconnectedCallback() {
    this.#connection?.abort();
    this.#connection = undefined;
    this.#open = undefined;
    connected.delete(this);
    this.#showTriggers(false);
    if (!connected.size) {
      shortcuts?.abort();
      shortcuts = undefined;
    }
  }
  /** @param {boolean} visible */
  #showTriggers(visible) {
    for (const button of document.querySelectorAll("button[data-finder]"))
      if (button instanceof HTMLButtonElement && button.dataset.finder === this.id)
        button.hidden = !visible;
  }
  async open() {
    await this.#open?.();
  }
}
customElements.define("site-finder", SiteFinder);
