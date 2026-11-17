(() => {
  const h = window.h;
  const pages = {
    'page-index': 'index.html', 'page-ueber-probe': 'ueber-probe.html',
    'page-unterstuetzung': 'unterstuetzung.html', 'page-team': 'team.html',
    'page-kontakt': 'kontakt.html', 'page-impressum': 'impressum.html',
    'page-datenschutz': 'datenschutz.html', news: 'index.html',
    team: 'team.html', settings: 'kontakt.html', downloads: 'index.html#downloads'
  };
  Object.entries(pages).forEach(([name, page]) => {
    const Preview = window.createClass({
      render() {
        const data = this.props.entry.get('data').toJS();
        const resolveMedia = value => {
          if (Array.isArray(value)) return value.map(resolveMedia);
          if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, ['source', 'image', 'file', 'flyer'].includes(key) && typeof item === 'string' ? String(this.props.getAsset(item)) : resolveMedia(item)]));
          return value;
        };
        const send = () => this.frame?.contentWindow?.postMessage({ type: 'probe:cms-preview', kind: name.startsWith('page-') ? 'page' : name, data: resolveMedia(data) }, location.origin);
        this.send = send;
        return h('div', {},
          h('p', {style:{fontFamily:'sans-serif',padding:'12px',background:'#e4f7fb'}}, 'Entwurf · Veröffentlichung aktualisiert ausschließlich den Redesign-Preview.'),
          h('iframe', {src:'/'+page.replace(/(#.*)?$/, '?cms-preview=1$1'), title:'Website-Vorschau', style:{width:'100%',height:'85vh',border:0}, ref:frame => {this.frame = frame;}, onLoad:() => {
            // Wait for the public content loader before overlaying this draft.
            const doc = this.frame.contentDocument;
            doc.addEventListener('probe:cmsready', send, {once:true});
            send();
          }})
        );
      },
      componentDidUpdate() { this.send?.(); }
    });
    CMS.registerPreviewTemplate(name, Preview);
  });
})();
