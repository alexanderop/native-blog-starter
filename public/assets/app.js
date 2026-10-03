import "./site-finder.js";
import "./copy-actions.js";

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
