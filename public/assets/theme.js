(() => {
  let preference = "system";
  try {
    preference = localStorage.getItem("journal-theme") || "system";
  } catch {
    preference = "system";
  }
  if (!["system", "light", "dark"].includes(preference)) preference = "system";
  function apply() {
    if (preference === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = preference;
    document
      .querySelector("button[data-theme]")
      ?.setAttribute("aria-label", `Color theme: ${preference}. Change theme`);
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("button[data-theme]")) return;
    preference = ["system", "light", "dark"][
      (["system", "light", "dark"].indexOf(preference) + 1) % 3
    ];
    try {
      localStorage.setItem("journal-theme", preference);
    } catch {
      /* Storage can be disabled by the browser. */
    }
    apply();
  });
  document.addEventListener("DOMContentLoaded", apply);
  apply();
})();
