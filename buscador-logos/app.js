(function () {
  "use strict";

  const DEFAULT_SIZE = 512;

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
  const downloadBtn = document.getElementById("download-btn");
  const fallbackNote = document.getElementById("download-fallback-note");
  const sizeButtons = Array.from(document.querySelectorAll(".size-btn"));
  const searchBtn = document.getElementById("search-btn");

  let currentSize = DEFAULT_SIZE;
  let currentMatch = null; // { name, domain, source }

  populateAutocomplete();
  sizeButtons.forEach((btn) => btn.addEventListener("click", () => onSizeChange(btn)));
  form.addEventListener("submit", onSubmit);
  downloadBtn.addEventListener("click", onDownload);
  suggestionsList.addEventListener("click", onSuggestionClick);

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

  // Cadena de resolución: 1) base propia curada 2) dominio inferido del nombre
  function resolveBrand(query) {
    const q = normalize(query);
    if (!q) return null;

    const exact = BRANDS.find(
      (b) => normalize(b.name) === q || (b.aliases || []).some((a) => normalize(a) === q)
    );
    if (exact) return { name: exact.name, domain: exact.domain, curated: true };

    const partial = BRANDS.find(
      (b) =>
        normalize(b.name).includes(q) ||
        (b.aliases || []).some((a) => normalize(a).includes(q))
    );
    if (partial) return { name: partial.name, domain: partial.domain, curated: true };

    return null;
  }

  function guessDomain(query) {
    const slug = slugifyDomain(query);
    if (!slug) return null;
    return { name: query.trim(), domain: `${slug}.com`, curated: false };
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

  function logoUrl(domain, size) {
    return `https://logo.clearbit.com/${domain}?size=${size}`;
  }

  function faviconFallbackUrl(domain, size) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  }

  function onSizeChange(btn) {
    currentSize = Number(btn.dataset.size);
    sizeButtons.forEach((b) => b.classList.toggle("active", b === btn));
    if (currentMatch) renderResult(currentMatch);
  }

  function onSubmit(e) {
    e.preventDefault();
    const query = input.value;
    runSearch(query);
  }

  function onSuggestionClick(e) {
    const btn = e.target.closest("button[data-brand]");
    if (!btn) return;
    input.value = btn.dataset.brand;
    runSearch(btn.dataset.brand);
  }

  function runSearch(rawQuery) {
    const query = (rawQuery || "").trim();
    resultEl.classList.add("hidden");
    notFoundEl.classList.add("hidden");
    statusEl.textContent = "";

    if (!query) {
      statusEl.textContent = "Escribe el nombre de una marca para buscar.";
      return;
    }

    statusEl.textContent = `Buscando "${query}"...`;
    searchBtn.disabled = true;

    const curated = resolveBrand(query);
    const candidate = curated || guessDomain(query);

    if (!candidate) {
      statusEl.textContent = "";
      searchBtn.disabled = false;
      showNotFound(query);
      return;
    }

    // El fallback de favicon casi siempre devuelve una imagen (incluso genérica) aunque el
    // dominio no exista, así que solo se usa para marcas verificadas en la base curada;
    // para dominios inferidos se confía únicamente en Clearbit para no dar falsos positivos.
    const urlsToTry = candidate.curated
      ? [logoUrl(candidate.domain, currentSize), faviconFallbackUrl(candidate.domain, currentSize)]
      : [logoUrl(candidate.domain, currentSize)];

    tryLoadLogo(urlsToTry)
      .then((sourceUsed) => {
        currentMatch = {
          name: candidate.name,
          domain: candidate.domain,
          curated: candidate.curated,
          source: sourceUsed,
        };
        statusEl.textContent = "";
        renderResult(currentMatch);
      })
      .catch(() => {
        statusEl.textContent = "";
        showNotFound(query);
      })
      .finally(() => {
        searchBtn.disabled = false;
      });
  }

  // Intenta cada URL de la cadena de fuentes hasta que una cargue correctamente
  function tryLoadLogo(urls) {
    return urls.reduce(
      (chain, url) => chain.catch(() => loadImage(url).then(() => url)),
      Promise.reject()
    );
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 1 && img.naturalHeight > 1) resolve(url);
        else reject(new Error("empty image"));
      };
      img.onerror = () => reject(new Error("failed to load"));
      img.src = url;
    });
  }

  function renderResult(match) {
    const url =
      match.source && match.source.includes("google.com/s2/favicons")
        ? faviconFallbackUrl(match.domain, currentSize)
        : logoUrl(match.domain, currentSize);

    previewImg.src = url;
    previewImg.alt = `Logo de ${match.name}`;
    resultName.textContent = match.name;

    const providerLabel = url.includes("google.com/s2/favicons")
      ? "favicon del sitio oficial (Google)"
      : "Clearbit Logo API";

    resultSource.innerHTML = `Fuente: ${providerLabel} · dominio: ${match.domain} · <a href="https://${match.domain}" target="_blank" rel="noopener noreferrer">sitio oficial</a>`;

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
