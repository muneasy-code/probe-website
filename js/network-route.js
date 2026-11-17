(() => {
  "use strict";
  const media = window.matchMedia("(max-width: 820px)");

  function updateNetworkLinks() {
    document.querySelectorAll('a[data-i18n="networkNav"], a[data-network-route]').forEach((link) => {
      if (link.closest(".network-card")) return;
      link.setAttribute("href", media.matches ? "netzwerk.html" : "index.html#netzwerk");
    });
  }

  document.addEventListener("DOMContentLoaded", updateNetworkLinks);
  // CMS hydration and language changes can update navigation after DOM ready.
  document.addEventListener("probe:cmsready", updateNetworkLinks);
  document.addEventListener("probe:languagechange", updateNetworkLinks);
  // Resolve the destination at activation time as a final safeguard.
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[data-i18n="networkNav"], a[data-network-route]');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
        link.target === "_blank" || link.closest(".network-card")) return;
    const destination = media.matches ? "netzwerk.html" : "index.html#netzwerk";
    if (link.getAttribute("href") !== destination) link.setAttribute("href", destination);
  }, true);
  if (media.addEventListener) media.addEventListener("change", updateNetworkLinks);
  else if (media.addListener) media.addListener(updateNetworkLinks);
})();