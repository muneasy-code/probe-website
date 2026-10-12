/* ProBe Light: minimal mobile route switching.
   No changes to desktop or the established multilingual navigation.
   URL hashes allow browser Back/Forward and direct links to each path.
*/
(() => {
  "use strict";
  const query = (selector, root = document) => root.querySelector(selector);
  const media = window.matchMedia("(max-width: 820px)");
  const landing = query("[data-mobile-landing]");
  const views = [...document.querySelectorAll("[data-mobile-view]")];
  if (!landing || views.length !== 2) return;
  const flow = query(".mobile-entry");
  const headerMenu = query(".main-nav");
  const fullSectionHashes = new Set(["#netzwerk", "#wege", "#kontakt"]);
  let lastRoute = null;
  let lastChoice = null;
  let navigationIsInteractive = false;

  function normalizedRoute() {
    const hash = decodeURIComponent(window.location.hash || "").toLowerCase();
    if (hash === "#einrichtung" || hash === "#pflege") return hash.slice(1);
    if (new URLSearchParams(window.location.search).get("full") === "1"
        || fullSectionHashes.has(hash)) return "full";
    return "start";
  }
  function showRoute({focus = false} = {}) {
    const route = normalizedRoute();
    const mobile = media.matches;
    document.body.classList.toggle("mobile-full-view", mobile && route === "full");
    if (!mobile) {
      // Landing/details never need to appear on desktop; keep originals untouched.
      lastRoute = route;
      return;
    }
    landing.hidden = route !== "start";
    views.forEach((view) => { view.hidden = view.dataset.mobileView !== route; });
    headerMenu?.classList.remove("open");
    if (flow) flow.dataset.activeRoute = route;
    if (route !== lastRoute) {
      if (route === "full") {
        const target = document.querySelector(window.location.hash || "body");
        if (target) requestAnimationFrame(() => target.scrollIntoView({block:"start"}));
      } else {
        window.scrollTo({top:0,behavior:"instant"});
      }
      if (focus && (route === "einrichtung" || route === "pflege")) {
        query("[data-mobile-heading]", views.find(v=>v.dataset.mobileView===route))?.focus({preventScroll:true});
      } else if (focus && route === "start" && lastChoice) {
        lastChoice.focus({preventScroll:true});
      }
    }
    lastRoute = route;
  }

  document.querySelectorAll("[data-mobile-choice]").forEach((link) => {
    link.addEventListener("click", () => {
      navigationIsInteractive = true;
      lastChoice = link;
      // Let the actual anchor update the hash and browser history.
      // hashchange renders the selected destination.
    });
  });
  document.querySelectorAll("[data-mobile-back]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigationIsInteractive = true;
      // Replace rather than append a route when going back via the visible control.
      const url = window.location.pathname + window.location.search;
      history.replaceState(null, "", url);
      showRoute({focus:true});
    });
  });
  window.addEventListener("hashchange", () => showRoute({focus:navigationIsInteractive}));
  if (media.addEventListener) media.addEventListener("change", () => showRoute());
  else if (media.addListener) media.addListener(() => showRoute());
  showRoute();
})();
