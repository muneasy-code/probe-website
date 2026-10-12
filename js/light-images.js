/* ProBe Light — independent image mapping.
   Preload first: missing files never replace working pictures on preview.
   Load only on redesign-light; legacy/main have no reference to this file.
*/
(() => {
  const assets = [
    {path:"probe-light-hero.webp", image:".page-home .campaign-hero-media img"},
    {path:"probe-light-begleitung.webp", image:".page-home .campaign-story-image img"},
    {path:"probe-light-einrichtungen.webp", surface:".page-home .audience-card-organisations", gradient:"linear-gradient(90deg,rgba(255,255,255,.98),rgba(255,255,255,.90) 40%,rgba(255,255,255,.15) 100%)"},
    {path:"probe-light-team.webp", surface:".page-home .audience-card-people", gradient:"linear-gradient(90deg,rgba(255,255,255,.98),rgba(255,255,255,.90) 40%,rgba(255,255,255,.15) 100%)"},
    {path:"probe-light-einrichtungen.webp", surface:".page-team .team-hero", gradient:"linear-gradient(90deg,rgba(255,255,255,.99),rgba(255,255,255,.9) 49%,rgba(255,255,255,.1))"},
    {path:"probe-light-beratung.webp", surface:".page-about .about-hero", gradient:"linear-gradient(90deg,rgba(255,255,255,.99),rgba(255,255,255,.9) 48%,rgba(255,255,255,.12))"},
    {path:"probe-light-begleitung.webp", surface:".page-support .support-hero-image", gradient:"linear-gradient(90deg,rgba(255,255,255,.99),rgba(255,255,255,.9) 47%,rgba(255,255,255,.12))"},
    {path:"probe-light-team.webp", surface:".page-contact .contact-page-hero", gradient:"linear-gradient(90deg,rgba(255,255,255,.99),rgba(255,255,255,.9) 47%,rgba(255,255,255,.12))"}
  ];
  const cache = new Map();
  const assetUrl = (path) => new URL(path, document.baseURI).href;
  function verify(path) {
    if (cache.has(path)) return cache.get(path);
    const pending = new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(assetUrl(path));
      probe.onerror = () => resolve(null);
      probe.src = assetUrl(path);
    });
    cache.set(path,pending);
    return pending;
  }
  function mount() {
    for (const asset of assets) {
      const target = document.querySelector(asset.image || asset.surface);
      if (!target) continue;
      verify(asset.path).then((url) => {
        if (!url || !target.isConnected) return;
        if (asset.image) {
          // Preserve CMS image slots and alt labels for content management.
          target.src = url;
          target.removeAttribute("srcset");
        } else {
          target.style.backgroundImage = asset.gradient + ', url("' + url + '")';
        }
      });
    }
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
