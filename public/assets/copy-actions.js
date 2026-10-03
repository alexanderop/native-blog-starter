class CopyActions extends HTMLElement {
  /** @type {AbortController | undefined} */ #connection;
  connectedCallback() {
    if (this.#connection) return;
    const status = this.querySelector("[data-copy-status]");
    if (!(status instanceof HTMLElement)) return;
    this.#connection = new AbortController();
    const { signal } = this.#connection;
    /** @type {AbortController | undefined} */ let operation;
    const buttons = this.querySelectorAll("button[data-copy-url],button[data-copy-markdown]");
    for (const button of buttons) if (button instanceof HTMLButtonElement) button.hidden = false;
    signal.addEventListener(
      "abort",
      () => {
        operation?.abort();
        status.textContent = "";
        for (const button of buttons) if (button instanceof HTMLButtonElement) button.hidden = true;
      },
      { once: true },
    );
    this.addEventListener(
      "click",
      async (event) => {
        const button =
          event.target instanceof Element
            ? event.target.closest("button[data-copy-url],button[data-copy-markdown]")
            : null;
        if (!button || button.closest("copy-actions") !== this) return;
        operation?.abort();
        const current = new AbortController();
        operation = current;
        status.textContent = "";
        try {
          let text = location.href;
          const url = button.getAttribute("data-copy-markdown");
          if (url) {
            const response = await fetch(url, { signal: current.signal });
            if (!response.ok) throw Error("Download unavailable");
            text = await response.text();
          }
          if (current.signal.aborted) return;
          await navigator.clipboard.writeText(text);
          if (!current.signal.aborted) status.textContent = "Copied to clipboard.";
        } catch {
          if (!current.signal.aborted)
            status.textContent = "Could not copy. Use the download link or address bar.";
        }
      },
      { signal },
    );
  }
  disconnectedCallback() {
    this.#connection?.abort();
    this.#connection = undefined;
  }
}
customElements.define("copy-actions", CopyActions);
