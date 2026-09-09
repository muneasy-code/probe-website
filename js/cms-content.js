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
    settings: null
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
    if (!container || !state.news?.items?.length) return;

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
    if (!container || !state.team?.members?.length) return;

    const lang = currentLanguage();
    const labels = CONTACT_LABELS[lang] || CONTACT_LABELS.de;
    const actionLabels = TEAM_ACTION_LABELS[lang] || TEAM_ACTION_LABELS.de;
    container.innerHTML = "";

    state.team.members.forEach((member) => {
      const content = localized(member.translations, lang);
      const card = document.createElement("article");
      card.className = "team-card";

      const header = document.createElement("div");
      header.className = "team-card-header";

      const image = document.createElement("img");
      image.className = "team-photo";
      image.src = member.image || "/foto-platzhalter.png";
      image.alt = member.name || "Teammitglied";

      const identity = document.createElement("div");
      identity.className = "team-card-identity";

      const region = document.createElement("p");
      region.className = "team-region";
      region.textContent = safeText(content.region);

      const name = document.createElement("h3");
      name.textContent = safeText(member.name);

      const role = document.createElement("p");
      role.className = "team-role";
      role.textContent = safeText(content.role);

      identity.append(region, name, role);
      header.append(image, identity);

      const actions = document.createElement("div");
      actions.className = "team-card-actions";

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

      if (member.email) {
        const contactButton = document.createElement("a");
        contactButton.className = "team-contact-button";
        contactButton.href = `mailto:${member.email}`;
        contactButton.setAttribute("aria-label", `${actionLabels.contact}: ${member.name}`);
        const contactText = document.createElement("span");
        contactText.textContent = actionLabels.contact;
        const contactIcon = document.createElement("span");
        contactIcon.setAttribute("aria-hidden", "true");
        contactIcon.textContent = "↗";
        contactButton.append(contactText, contactIcon);
        actions.appendChild(contactButton);
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
        element.href = settings.flyer;
      });
    }
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
      fetchJson("/content/settings.json").then((data) => { state.settings = data; })
    ];

    const results = await Promise.allSettled(tasks);
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.warn("ProBe CMS-Inhalte konnten nicht vollständig geladen werden:", result.reason);
      }
    });

    renderNews();
    renderTeam();
    applySettings();
  }

  document.addEventListener("probe:languagechange", () => {
    renderNews();
    renderTeam();
  });

  document.addEventListener("DOMContentLoaded", loadCmsContent);
})();
