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
  if (media.addEventListener) media.addEventListener("change", updateNetworkLinks);
  else if (media.addListener) media.addListener(updateNetworkLinks);
})();