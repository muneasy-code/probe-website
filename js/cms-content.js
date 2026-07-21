(() => {
  "use strict";

  const SUPPORTED_LANGUAGES = ["de", "en", "ar", "ru", "tr"];
  const CONTACT_LABELS = {
    de: { phone: "Telefon:", email: "E-Mail:" },
    en: { phone: "Phone:", email: "Email:" },
    ar: { phone: "الهاتف:", email: "البريد الإلكتروني:" },
    ru: { phone: "Телефон:", email: "Эл. почта:" },
    tr: { phone: "Telefon:", email: "E-posta:" }
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
    container.innerHTML = "";

    state.team.members.forEach((member) => {
      const content = localized(member.translations, lang);
      const card = document.createElement("div");
      card.className = "team-card";

      const image = document.createElement("img");
      image.className = "team-photo";
      image.src = member.image || "/foto-platzhalter.png";
      image.alt = member.name || "Teammitglied";

      const region = document.createElement("p");
      region.className = "team-region";
      region.textContent = safeText(content.region);

      const name = document.createElement("h3");
      name.textContent = safeText(member.name);

      const role = document.createElement("p");
      role.className = "team-role";
      role.textContent = safeText(content.role);

      const about = document.createElement("p");
      about.className = "team-about";
      about.textContent = safeText(content.about);

      const contact = document.createElement("div");
      contact.className = "team-contact";

      if (member.phone) {
        const phone = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = labels.phone + " ";
        phone.append(strong, document.createTextNode(member.phone));
        contact.appendChild(phone);
      }

      if (member.email) {
        const email = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = labels.email + " ";
        const link = document.createElement("a");
        link.href = `mailto:${member.email}`;
        link.textContent = member.email;
        email.append(strong, link);
        contact.appendChild(email);
      }

      card.append(image, region, name, role, about, contact);
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
