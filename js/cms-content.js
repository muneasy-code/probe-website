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
    const container = document.querySelector("[data-cms-news-list]");
    if (!container || !Array.isArray(state.news?.items)) return;

    const lang = currentLanguage();
    container.innerHTML = "";

    state.news.items.forEach((item) => {
      const content = localized(item, lang);
      const article = document.createElement("article");
      article.className = "news-preview-card";

      const date = document.createElement("p");
      date.className = "news-date";
      date.textContent = safeText(content.date);

      const title = document.createElement("h3");
      title.textContent = safeText(content.title);

      const text = document.createElement("p");
      text.textContent = safeText(content.text);

      article.append(date, title, text);
      container.appendChild(article);
    });
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
    return response.json();
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
