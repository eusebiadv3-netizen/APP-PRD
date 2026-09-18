(function () {
  "use strict";

  const DEFAULT_SIZE = 512;
  const FETCH_TIMEOUT_MS = 5000;
  const DOMAIN_TLDS = ["com", "io", "co", "net", "org"];
  const GOOD_ENOUGH_RATIO = 0.85; // a match is "good enough" if it reaches 85% of the requested size

  const form = document.getElementById("search-form");
  const input = document.getElementById("brand-input");
  const suggestionsDatalist = document.getElementById("brand-suggestions");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const notFoundEl = document.getElementById("not-found");
  const notFoundQueryEl = document.getElementById("not-found-query");
  const suggestionsIntro = document.getElementById("suggestions-intro");
  const suggestionsList = document.getElementById("suggestions-list");
  const previewImg = document.getElementById("logo-preview");
  const resultName = document.getElementById("result-name");
  const resultSource = document.getElementById("result-source");
  const qualityNote = document.getElementById("quality-note");
  const downloadBtn = document.getElementById("download-btn");
  const fallbackNote = document.getElementById("download-fallback-note");
  const sizeButtons = Array.from(document.querySelectorAll(".size-btn"));
  const searchBtn = document.getElementById("search-btn");
  const manualDomainForm = document.getElementById("manual-domain-form");
  const manualDomainInput = document.getElementById("manual-domain-input");

  let currentSize = DEFAULT_SIZE;
  let currentMatch = null; // { name, kind, domain?, filename?, wikidataId?, url, width, height }
  let searchToken = 0; // descarta resultados de búsquedas previas si el usuario ya lanzó otra
  let lastSearch = null; // { type: "query" | "manual", value } — para re-resolver al cambiar de resolución

  populateAutocomplete();
  sizeButtons.forEach((btn) => btn.addEventListener("click", () => onSizeChange(btn)));
  form.addEventListener("submit", onSubmit);
  downloadBtn.addEventListener("click", onDownload);
  suggestionsList.addEventListener("click", onSuggestionClick);
  manualDomainForm.addEventListener("submit", onManualDomainSubmit);

  function populateAutocomplete() {
    const seen = new Set();
    BRANDS.forEach((brand) => {
      if (!seen.has(brand.name)) {
        const opt = document.createElement("option");
        opt.value = brand.name;
        suggestionsDatalist.appendChild(opt);
        seen.add(brand.name);
      }
    });
  }

  function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip accents
      .trim();
  }

  function slugifyDomain(str) {
    return normalize(str).replace(/[^a-z0-9]+/g, "");
  }

  function hyphenSlug(str) {
    return normalize(str)
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  // Nivel 1 de la cadena de resolución: base propia curada (instantánea, alta confianza)
  function resolveCurated(query) {
    const q = normalize(query);
    if (!q) return null;

    const exact = BRANDS.find(
      (b) => normalize(b.name) === q || (b.aliases || []).some((a) => normalize(a) === q)
    );
    if (exact) return { name: exact.name, domain: exact.domain };

    const partial = BRANDS.find(
      (b) =>
        normalize(b.name).includes(q) ||
        (b.aliases || []).some((a) => normalize(a).includes(q))
    );
    if (partial) return { name: partial.name, domain: partial.domain };

    return null;
  }

  function suggestSimilar(query, limit) {
    const q = normalize(query);
    if (!q) return [];

    return BRANDS.filter((b) => {
      const name = normalize(b.name);
      const aliases = (b.aliases || []).map(normalize);
      return (
        name.startsWith(q[0]) ||
        aliases.some((a) => a.startsWith(q[0])) ||
        levenshteinClose(q, name) ||
        aliases.some((a) => levenshteinClose(q, a))
      );
    })
      .slice(0, limit)
      .map((b) => b.name);
  }

  // Aproximacion simple de distancia de edicion para detectar errores de tipeo cercanos
  function levenshteinClose(a, b) {
    if (Math.abs(a.length - b.length) > 3) return false;
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[a.length][b.length] <= 2;
  }

  function clearbitUrl(domain, size) {
    return `https://logo.clearbit.com/${domain}?size=${size}`;
  }

  function faviconUrl(domain, size) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  }

  // El ancho pedido a Commons es solo una meta de render: si el original es un SVG,
  // Commons genera un thumbnail nítido a ese ancho (por eso esta fuente da mejor
  // calidad "para presentaciones" que un logo PNG pequeño ya cacheado en otra fuente).
  function wikimediaFileUrl(filename, size) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${size}`;
  }

  // Resuelve con las dimensiones reales de la imagen, para poder comparar calidad entre fuentes
  function loadImage(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;
      const timer = timeoutMs
        ? setTimeout(() => {
            if (!settled) {
              settled = true;
              reject(new Error("timeout"));
            }
          }, timeoutMs)
        : null;
      img.onload = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (img.naturalWidth > 1 && img.naturalHeight > 1) {
          resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
        } else {
          reject(new Error("empty image"));
        }
      };
      img.onerror = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        reject(new Error("failed to load"));
      };
      img.src = url;
    });
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("bad status");
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function isGoodEnough(dims, size) {
    return dims && dims.width >= size * GOOD_ENOUGH_RATIO;
  }

  // Fuente universal via Wikidata/Wikimedia Commons: cubre prácticamente cualquier
  // marca/empresa con presencia notable en internet, no solo las precargadas, y suele
  // dar mejor calidad porque muchos logos ahí son vectoriales (SVG) en origen.
  async function findViaWikidata(query, size) {
    const searchUrl =
      "https://www.wikidata.org/w/api.php?action=wbsearchentities" +
      `&search=${encodeURIComponent(query)}&language=es&uselang=es&format=json&origin=*&type=item&limit=6`;

    let searchData;
    try {
      searchData = await fetchJson(searchUrl);
    } catch (err) {
      return null;
    }

    const hits = (searchData && searchData.search) || [];
    for (const hit of hits) {
      const claimsUrl =
        `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${hit.id}` +
        "&property=P154&format=json&origin=*";
      let claimsData;
      try {
        claimsData = await fetchJson(claimsUrl);
      } catch (err) {
        continue;
      }
      const claims = claimsData && claimsData.claims && claimsData.claims.P154;
      const filename =
        claims && claims[0] && claims[0].mainsnak && claims[0].mainsnak.datavalue
          ? claims[0].mainsnak.datavalue.value
          : null;
      if (!filename) continue;

      const url = wikimediaFileUrl(filename, size);
      try {
        const dims = await loadImage(url, FETCH_TIMEOUT_MS);
        return {
          name: hit.label || query,
          kind: "wikimedia",
          filename,
          wikidataId: hit.id,
          url,
          width: dims.width,
          height: dims.height,
        };
      } catch (err) {
        continue;
      }
    }
    return null;
  }

  function domainCandidates(query) {
    const bases = Array.from(new Set([slugifyDomain(query), hyphenSlug(query)])).filter(Boolean);
    const domains = [];
    bases.forEach((base) => DOMAIN_TLDS.forEach((tld) => domains.push(`${base}.${tld}`)));
    return domains;
  }

  // Dominio inferido del nombre, probando variantes de TLD/formato contra Clearbit.
  // No se usa el favicon de Google aquí porque casi siempre responde con un ícono genérico
  // aunque el dominio no exista, lo que daría falsos positivos para dominios no verificados.
  async function findViaGuessedDomain(query, size) {
    for (const domain of domainCandidates(query)) {
      const url = clearbitUrl(domain, size);
      try {
        const dims = await loadImage(url, FETCH_TIMEOUT_MS);
        return { name: query.trim(), kind: "clearbit", domain, url, width: dims.width, height: dims.height };
      } catch (err) {
        continue;
      }
    }
    return null;
  }

  async function findViaClearbitDomain(name, domain, size) {
    const url = clearbitUrl(domain, size);
    try {
      const dims = await loadImage(url, FETCH_TIMEOUT_MS);
      return { name, kind: "clearbit", domain, url, width: dims.width, height: dims.height };
    } catch (err) {
      return null;
    }
  }

  async function findViaFaviconDomain(name, domain, size) {
    const url = faviconUrl(domain, size);
    try {
      const dims = await loadImage(url, FETCH_TIMEOUT_MS);
      return { name, kind: "favicon", domain, url, width: dims.width, height: dims.height };
    } catch (err) {
      return null;
    }
  }

  // Ejecuta las fuentes en orden, pero si la primera coincidencia entrega una imagen
  // más chica de lo pedido, sigue probando las siguientes para ver si alguna da mejor
  // calidad — y se queda con la de mayor resolución real entre todas las que sí cargaron.
  async function resolveBestMatch(attempts, size) {
    let best = null;
    for (const attempt of attempts) {
      const result = await attempt();
      if (!result) continue;
      if (!best || result.width > best.width) best = result;
      if (isGoodEnough(best, size)) break;
    }
    return best;
  }

  function attemptsForQuery(query, size, curated) {
    if (curated) {
      return [
        () => findViaClearbitDomain(curated.name, curated.domain, size),
        () => findViaWikidata(curated.name, size),
        () => findViaFaviconDomain(curated.name, curated.domain, size),
      ];
    }
    return [() => findViaWikidata(query, size), () => findViaGuessedDomain(query, size)];
  }

  function attemptsForManualDomain(domain, size) {
    return [
      () => findViaClearbitDomain(domain, domain, size),
      () => findViaFaviconDomain(domain, domain, size),
    ];
  }

  function onSizeChange(btn) {
    currentSize = Number(btn.dataset.size);
    sizeButtons.forEach((b) => b.classList.toggle("active", b === btn));
    if (lastSearch) rerunLastSearch();
  }

  function rerunLastSearch() {
    if (!lastSearch) return;
    if (lastSearch.type === "manual") runManualDomainSearch(lastSearch.value, { silent: true });
    else runSearch(lastSearch.value, { silent: true });
  }

  function onSubmit(e) {
    e.preventDefault();
    runSearch(input.value);
  }

  function onSuggestionClick(e) {
    const btn = e.target.closest("button[data-brand]");
    if (!btn) return;
    input.value = btn.dataset.brand;
    runSearch(btn.dataset.brand);
  }

  function onManualDomainSubmit(e) {
    e.preventDefault();
    const domain = normalize(manualDomainInput.value)
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .trim();
    if (!domain) return;
    runManualDomainSearch(domain);
  }

  async function runManualDomainSearch(domain, opts) {
    const silent = opts && opts.silent;
    const token = ++searchToken;
    lastSearch = { type: "manual", value: domain };
    if (!silent) {
      statusEl.textContent = `Probando "${domain}"...`;
      notFoundEl.classList.add("hidden");
    }

    const match = await resolveBestMatch(attemptsForManualDomain(domain, currentSize), currentSize);
    if (token !== searchToken) return;

    statusEl.textContent = "";
    if (match) {
      currentMatch = match;
      renderResult(match);
    } else if (!silent) {
      showNotFound(domain);
    }
  }

  async function runSearch(rawQuery, opts) {
    const silent = opts && opts.silent;
    const query = (rawQuery || "").trim();

    if (!silent) {
      resultEl.classList.add("hidden");
      notFoundEl.classList.add("hidden");
      statusEl.textContent = "";
    }

    if (!query) {
      statusEl.textContent = "Escribe el nombre de una marca para buscar.";
      return;
    }

    const token = ++searchToken;
    lastSearch = { type: "query", value: query };
    searchBtn.disabled = true;
    if (!silent) statusEl.textContent = `Buscando "${query}"...`;

    try {
      const curated = resolveCurated(query);
      const match = await resolveBestMatch(attemptsForQuery(query, currentSize, curated), currentSize);
      if (token !== searchToken) return;

      statusEl.textContent = "";
      if (match) {
        currentMatch = match;
        renderResult(match);
      } else if (!silent) {
        showNotFound(query);
      }
    } finally {
      if (token === searchToken) searchBtn.disabled = false;
    }
  }

  function renderResult(match) {
    previewImg.src = match.url;
    previewImg.alt = `Logo de ${match.name}`;
    resultName.textContent = match.name;

    let providerLabel;
    let providerLinkUrl;
    let providerLinkLabel;

    if (match.kind === "wikimedia") {
      providerLabel = "Wikimedia Commons (via Wikidata)";
      providerLinkUrl = `https://www.wikidata.org/wiki/${match.wikidataId}`;
      providerLinkLabel = "ver en Wikidata";
    } else if (match.kind === "favicon") {
      providerLabel = `favicon del sitio oficial (Google) · dominio: ${match.domain}`;
      providerLinkUrl = `https://${match.domain}`;
      providerLinkLabel = "sitio oficial";
    } else {
      providerLabel = `Clearbit Logo API · dominio: ${match.domain}`;
      providerLinkUrl = `https://${match.domain}`;
      providerLinkLabel = "sitio oficial";
    }

    resultSource.innerHTML = `Fuente: ${providerLabel} · <a href="${providerLinkUrl}" target="_blank" rel="noopener noreferrer">${providerLinkLabel}</a> · ${match.width}×${match.height}px`;

    if (!isGoodEnough(match, currentSize)) {
      qualityNote.textContent = `Esta fuente solo entrega ${match.width}×${match.height}px (pediste ${currentSize}px). Es la mejor calidad disponible encontrada automáticamente; si necesitas más resolución para una presentación, revisa el enlace de la fuente arriba o prueba un dominio manual con un logo en mayor calidad.`;
      qualityNote.classList.remove("hidden");
    } else {
      qualityNote.classList.add("hidden");
    }

    fallbackNote.classList.add("hidden");
    resultEl.classList.remove("hidden");
    notFoundEl.classList.add("hidden");
  }

  function showNotFound(query) {
    notFoundQueryEl.textContent = query;
    const suggestions = suggestSimilar(query, 5);
    suggestionsList.innerHTML = "";

    if (suggestions.length) {
      suggestionsIntro.classList.remove("hidden");
      suggestions.forEach((name) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.brand = name;
        btn.textContent = name;
        li.appendChild(btn);
        suggestionsList.appendChild(li);
      });
    } else {
      suggestionsIntro.classList.add("hidden");
    }

    manualDomainInput.value = "";
    resultEl.classList.add("hidden");
    notFoundEl.classList.remove("hidden");
  }

  async function onDownload() {
    if (!currentMatch) return;
    const url = previewImg.src;
    const filename = `${slugifyDomain(currentMatch.name)}-logo-${currentSize}.png`;

    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error("network response not ok");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      fallbackNote.classList.add("hidden");
    } catch (err) {
      // Algunas fuentes no permiten CORS para descarga directa: se abre en pestaña nueva
      window.open(url, "_blank", "noopener,noreferrer");
      fallbackNote.classList.remove("hidden");
    }
  }
})();
