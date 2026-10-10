(() => {
  "use strict";

  const SUPPORTED_LANGUAGES = ["de", "en", "ar", "ru", "tr", "uk", "vi"];
  const CONTACT_LABELS = {
    de: { phone: "Telefon:", email: "E-Mail:" },
    en: { phone: "Phone:", email: "Email:" },
    ar: { phone: "الهاتف:", email: "البريد الإلكتروني:" },
    ru: { phone: "Телефон:", email: "Эл. почта:" },
    tr: { phone: "Telefon:", email: "E-posta:" },
    uk: { phone: "Телефон:", email: "Ел. пошта:" },
    vi: { phone: "Điện thoại:", email: "Email:" }
  };
  const TEAM_ACTION_LABELS = {
    de: { more: "Mehr über", contact: "Kontakt aufnehmen" },
    en: { more: "More about", contact: "Get in touch" },
    ar: { more: "المزيد عن", contact: "تواصل معنا" },
    ru: { more: "Подробнее о", contact: "Связаться" },
    tr: { more: "Daha fazlası:", contact: "İletişime geç" },
    uk: { more: "Більше про", contact: "Зв’язатися" },
    vi: { more: "Tìm hiểu thêm về", contact: "Liên hệ" }
  };

  const state = {
    news: null,
    team: null,
    settings: null,
    page: null,
    downloads: null
  };

  function currentLanguage() {
    const lang = document.documentElement.lang || localStorage.getItem("probeLanguage") || "de";
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : "de";
  }

  function localized(source, lang) {
    if (!source) return {};

    const fallback = source.de || {};
    const selected = source[lang] || {};
    const merged = { ...fallback };

    Object.entries(selected).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        merged[key] = value;
      }
    });

    return merged;
  }

  function safeText(value) {
    return typeof value === "string" ? value : "";
  }

  function renderNews() {
    const container = document.querySelector("[data-cms-news-list], [data-cms-news-archive]");
    if (!container || !Array.isArray(state.news?.items)) return;
    const lang = currentLanguage();
    const isArchive = container.hasAttribute("data-cms-news-archive");
    const activeId = isArchive ? new URLSearchParams(location.search).get("beitrag") : null;
    const links = {
      de: { more: "Alle Meldungen ansehen", read: "Beitrag lesen", back: "Zurück zur Übersicht" },
      en: { more: "All news", read: "Read article", back: "Back to news" },
      ar: { more: "كل الأخبار", read: "قراءة الخبر", back: "العودة إلى الأخبار" },
      ru: { more: "Все новости", read: "Читать статью", back: "Назад к новостям" },
      tr: { more: "Tüm haberler", read: "Haberi oku", back: "Haberlere dön" },
      uk: { more: "Усі новини", read: "Читати новину", back: "Назад до новин" },
      vi: { more: "Tất cả tin tức", read: "Đọc bài viết", back: "Quay lại tin tức" }
    };
    const labels = links[lang] || links.de;
    const dateValue = (item) => {
      const val = item.date || item.de?.date || "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return Date.parse(val+"T12:00:00") || 0;
      const german = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      return german ? Date.parse(german[3]+"-"+german[2]+"-"+german[1]+"T12:00:00") || 0 : 0;
    };
    const entries = state.news.items.map((item,i) => ({item,i}))
      .filter(({item}) => item.visible !== false)
      .sort((a,b) => dateValue(b.item)-dateValue(a.item) || a.i-b.i);
    const filtered = activeId ? entries.filter(({item,i}) => String(item.id||"beitrag-"+i)===activeId) : entries;
    const shown = isArchive ? filtered : filtered.slice(0,3);
    container.replaceChildren();
    shown.forEach(({item,i}) => {
      const content = localized(item,lang);
      const article = document.createElement("article");
      article.className = "news-preview-card probe-news-card";
      const id = safeText(item.id || "beitrag-"+i);
      const href = "/aktuelles.html?beitrag="+encodeURIComponent(id);
      if (safeUrl(item.image)) {
        const image = document.createElement("img");
        image.src = safeUrl(item.image);
        image.className = "probe-news-image";
        image.alt = safeText(content.title);
        image.loading = "lazy";
        article.appendChild(image);
      }
      const date = document.createElement("p");
      date.className = "news-date";
      const dateText = item.date || content.date || "";
      date.textContent = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? new Intl.DateTimeFormat(lang, {day:"2-digit",month:"long",year:"numeric"}).format(new Date(dateText+"T12:00:00")) : safeText(dateText);
      const title = document.createElement("h3");
      if (!activeId) {
        const titleLink = document.createElement("a");
        titleLink.href = href;
        titleLink.textContent = safeText(content.title);
        title.append(titleLink);
      } else title.textContent = safeText(content.title);
      const text = document.createElement("p");
      text.className = "probe-news-text";
      text.textContent = safeText(content.text);
      article.append(date,title,text);
      if (!activeId) {
        const link = document.createElement("a");
        link.className = "probe-news-read";
        link.href = href;
        link.textContent = labels.read+" →";
        article.append(link);
      }
      container.appendChild(article);
    });
    if (activeId) {
      const back = document.createElement("a");
      back.href = "/aktuelles.html";
      back.className = "probe-news-more";
      back.textContent = "← "+labels.back;
      container.append(back);
    }
    if (!isArchive) {
      document.querySelectorAll("[data-cms-news-more]").forEach(n=>n.remove());
      if (entries.length>3) {
        const more = document.createElement("a");
        more.setAttribute("data-cms-news-more","");
        more.className = "probe-news-more";
        more.href = "/aktuelles.html";
        more.textContent = labels.more+" →";
        container.after(more);
      }
    }
  }

  function renderTeam() {
    const container = document.querySelector("[data-cms-team-list]");
    if (!container || !Array.isArray(state.team?.members)) return;

    const lang = currentLanguage();
    const labels = CONTACT_LABELS[lang] || CONTACT_LABELS.de;
    const actionLabels = TEAM_ACTION_LABELS[lang] || TEAM_ACTION_LABELS.de;
    container.innerHTML = "";

    state.team.members.forEach((member) => {
      if (member.visible === false) return;
      const content = localized(member.translations, lang);
      const card = document.createElement("article");
      card.className = "team-card";

      const header = document.createElement("div");
      header.className = "team-card-header";

      const displayName = safeText(content.name || member.name);
      const image = document.createElement("img");
      image.className = "team-photo";
      image.src = safeUrl(member.image) || "/foto-platzhalter.png";
      image.alt = safeText(member.imageAlt || content.imageAlt || displayName || "Teammitglied");
      image.style.objectPosition = imagePosition(member.imagePosition);

      const identity = document.createElement("div");
      identity.className = "team-card-identity";

      const region = document.createElement("p");
      region.className = "team-region";
      region.textContent = safeText(content.region);

      const name = document.createElement("h3");
      name.textContent = displayName;

      const role = document.createElement("p");
      role.className = "team-role";
      role.textContent = safeText(content.role);

      identity.append(region, name, role);
      header.append(image, identity);

      const actions = document.createElement("div");
      actions.className = "team-card-actions";

      if (safeText(content.about).trim()) {
      const details = document.createElement("details");
      details.className = "team-details";

      const summary = document.createElement("summary");
      const summaryText = document.createElement("span");
      const firstName = safeText(member.name).split(/\s+/)[0];
      summaryText.textContent = `${actionLabels.more} ${firstName}`;
      const summaryIcon = document.createElement("span");
      summaryIcon.setAttribute("aria-hidden", "true");
      summaryIcon.textContent = "＋";
      summary.append(summaryText, summaryIcon);

      const detailsBody = document.createElement("div");
      detailsBody.className = "team-details-body";

      const about = document.createElement("p");
      about.className = "team-about";
      about.textContent = safeText(content.about);

      if (member.phone) {
        const phone = document.createElement("a");
        phone.href = `tel:${String(member.phone).replace(/[^+\d]/g, "")}`;
        phone.textContent = `${labels.phone} ${member.phone}`;
        detailsBody.appendChild(phone);
      }

      detailsBody.prepend(about);
      details.append(summary, detailsBody);
      actions.appendChild(details);
      }

      if (member.email || member.contactUrl) {
        const contactButton = document.createElement("a");
        contactButton.className = "team-contact-button";
        contactButton.href = member.email ? `mailto:${member.email}` : safeUrl(member.contactUrl);
        contactButton.setAttribute("aria-label", `${actionLabels.contact}: ${displayName}`);
        const contactText = document.createElement("span");
        contactText.textContent = actionLabels.contact;
        const contactIcon = document.createElement("span");
        contactIcon.setAttribute("aria-hidden", "true");
        contactIcon.textContent = "↗";
        contactButton.append(contactText, contactIcon);
        actions.appendChild(contactButton);
      }

      if (member.phone && !safeText(content.about).trim()) {
        const phone = document.createElement("a");
        phone.className = "team-contact-button";
        phone.href = `tel:${String(member.phone).replace(/[^+\d]/g, "")}`;
        phone.textContent = `${labels.phone} ${member.phone}`;
        actions.appendChild(phone);
      }

      card.append(header, actions);
      container.appendChild(card);
    });
  }

  function applySettings() {
    const settings = state.settings;
    if (!settings) return;

    const contact = settings.contact || {};

    document.querySelectorAll("[data-cms-contact-email]").forEach((element) => {
      const prefix = element.dataset.cmsPrefix || "";
      element.textContent = prefix + safeText(contact.email);
      if (element.tagName === "A") element.href = `mailto:${contact.email}`;
    });

    document.querySelectorAll("[data-cms-contact-phone]").forEach((element) => {
      const prefix = element.dataset.cmsPrefix || "";
      element.textContent = prefix + safeText(contact.phone);
      if (element.tagName === "A") element.href = `tel:${String(contact.phone || "").replace(/[^+\d]/g, "")}`;
    });

    document.querySelectorAll("[data-cms-contact-address]").forEach((element) => {
      const prefix = element.dataset.cmsPrefix || "";
      element.textContent = prefix + safeText(contact.address);
    });

    if (settings.flyer) {
      document.querySelectorAll("[data-cms-flyer-link]").forEach((element) => {
        element.href = safeUrl(settings.flyer);
      });
    }
  }

  function safeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value, location.href);
      if (url.protocol === "blob:" && window.parent !== window && new URLSearchParams(location.search).has("cms-preview")) return url.href;
      return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }

  function imagePosition(value) {
    return /^\d{1,3}%\s+\d{1,3}%$/.test(value || "") ? value : "50% 50%";
  }

  function formattedText(value) {
    const template = document.createElement("template");
    template.innerHTML = safeText(value);
    const clean = document.createDocumentFragment();
    function copy(node, target) {
      if (node.nodeType === 3) { target.appendChild(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== 1) return;
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(node.tagName)) return;
      const allowed = ["BR", "SPAN", "STRONG", "EM", "B", "I"].includes(node.tagName);
      const element = allowed ? document.createElement(node.tagName.toLowerCase()) : target;
      if (allowed) target.appendChild(element);
      node.childNodes.forEach(child => copy(child, element));
    }
    template.content.childNodes.forEach(node => copy(node, clean));
    return clean;
  }

  function applyPage() {
    const page = state.page;
    if (!page) return;
    const texts = localized(page.texts, currentLanguage());
    document.querySelectorAll("[data-i18n], [data-i18n-html], [data-i18n-placeholder]").forEach(element => {
      const key = element.dataset.i18n || element.dataset.i18nHtml || element.dataset.i18nPlaceholder;
      if (!Object.hasOwn(texts, key)) return;
      if (element.dataset.i18nPlaceholder) element.setAttribute("placeholder", texts[key]);
      else if (element.dataset.i18nHtml) element.replaceChildren(formattedText(texts[key]));
      else element.textContent = texts[key];
    });
    document.querySelectorAll("[data-cms-text]").forEach(element => {
      const value = page.plain?.[element.dataset.cmsText];
      if (typeof value === "string") element.textContent = value;
    });
    (page.images || []).forEach(item => {
      const url = safeUrl(item.source);
      if (!url) return;
      if (item.background) {
        document.querySelectorAll(item.key).forEach(element => {
          // Replace only the image layer; retain the design's gradient overlays.
          const background = getComputedStyle(element).backgroundImage;
          const replacement = `url(${JSON.stringify(url)})`;
          element.style.setProperty("background-image", /url\(.*?\)/.test(background) ? background.replace(/url\(.*?\)/g, replacement) : replacement, "important");
          if (item.position) element.style.setProperty("background-position", imagePosition(item.position), "important");
        });
      } else {
        document.querySelectorAll("[data-cms-image]").forEach(element => {
          if (element.dataset.cmsImage !== item.key) return;
          element.src = url;
          element.alt = safeText(item.alt);
          if (item.position) element.style.objectPosition = imagePosition(item.position);
        });
      }
    });
    (page.links || []).forEach(item => {
      document.querySelectorAll("[data-cms-link]").forEach(element => {
        if (element.dataset.cmsLink === item.key && safeUrl(item.url)) element.href = safeUrl(item.url);
      });
    });
  }

  function renderDownloads() {
    const container = document.querySelector("[data-cms-download-list]");
    if (!container || !Array.isArray(state.downloads?.items)) return;
    const headings = {de:"Downloads & Materialien",en:"Downloads & materials",ar:"التنزيلات والمواد",ru:"Загрузки и материалы",tr:"İndirmeler ve materyaller",uk:"Завантаження та матеріали",vi:"Tải xuống và tài liệu"};
    document.querySelector("[data-cms-download-heading]").textContent = headings[currentLanguage()];
    container.replaceChildren();
    state.downloads.items.filter(item => item.visible !== false).forEach(item => {
      if (!safeUrl(item.file)) return;
      const content = localized(item.translations, currentLanguage());
      const card = document.createElement("article"); card.className = "news-preview-card";
      const title = document.createElement("h3"); title.textContent = safeText(content.title);
      const text = document.createElement("p"); text.textContent = safeText(content.description);
      const link = document.createElement("a"); link.href = safeUrl(item.file); link.download = ""; link.textContent = safeText(content.title) + " ↓";
      card.append(title, text, link); container.appendChild(card);
    });
    container.closest("section").hidden = container.children.length === 0;
  }

  function renderAll() {
    applyPage(); renderNews(); renderTeam(); applySettings(); renderDownloads();
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const fallback = await response.json();
    // Nur im Redesign integrierte Seiten lesen öffentliche Freigaben.
    // Die bestehende produktive main-Website enthält diese Anbindung nicht.
    const match = url.match(/\/content\/(.+)\.json/);
    if (!match) return fallback;
    const slug = match[1];
    const api = "https://gwdfakptvnjixighnxiy.supabase.co/rest/v1/probe_cms_published?slug=eq."+encodeURIComponent(slug)+"&select=content";
    try {
      const result = await fetch(api, {
        headers: {
          "apikey": "sb_publishable_Y-Oi7-tSnpKRauu2BiX5dA_QJ1SXY4h",
          "Accept": "application/json"
        },
        cache: "no-store",
        signal: AbortSignal.timeout(3500)
      });
      if (!result.ok) return fallback;
      const rows = await result.json();
      return rows?.[0]?.content || fallback;
    } catch (error) {
      console.warn("ProBe Redaktion: statische Fallback-Inhalte werden verwendet.", error);
      return fallback;
    }
  }

  async function loadCmsContent() {
    const tasks = [
      fetchJson("/content/news.json").then((data) => { state.news = data; }),
      fetchJson("/content/team.json").then((data) => { state.team = data; }),
      fetchJson("/content/settings.json").then((data) => { state.settings = data; }),
      fetchJson(`/content/page-${location.pathname.split("/").pop()?.replace(/\.html$/, "") || "index"}.json`).then(data => { state.page = data; }),
      fetchJson("/content/downloads.json").then(data => { state.downloads = data; })
    ];

    const results = await Promise.allSettled(tasks);
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.warn("ProBe CMS-Inhalte konnten nicht vollständig geladen werden:", result.reason);
      }
    });

    renderAll();
    document.dispatchEvent(new CustomEvent("probe:cmsready"));
  }

  document.addEventListener("probe:languagechange", () => {
    renderAll();
  });

  window.addEventListener("message", event => {
    if (!new URLSearchParams(location.search).has("cms-preview") || event.origin !== location.origin || window.parent === window) return;
    if (event.source !== window.parent && event.source !== window.top) return;
    if (event.data?.type !== "probe:cms-preview") return;
    const { kind, data } = event.data;
    if (!["page", "news", "team", "settings", "downloads"].includes(kind) || !data || typeof data !== "object") return;
    state[kind] = data;
    renderAll();
  });

  document.addEventListener("DOMContentLoaded", loadCmsContent);
})();
