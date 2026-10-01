let allSeasons = [];

async function loadArchive() {
  allSeasons = window.APEX_SEASONS || [];
  renderSeasons(allSeasons);

  const status = qs("#archiveStatus");
  status.innerHTML = `
    <span class="status-dot"></span>
    <strong>Season archive ready</strong>
    <small>1950–${CURRENT_YEAR}</small>
  `;

  qsa("#decadeTabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      qsa("#decadeTabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const decade = btn.dataset.decade;
      const filtered = decade === "all"
        ? allSeasons
        : allSeasons.filter(s => Math.floor(s.year / 10) * 10 === Number(decade));
      renderSeasons(filtered);
    });
  });
}

function renderSeasons(seasons) {
  const now = new Date().getFullYear();
  qs("#seasonArchive").innerHTML = [...seasons].reverse().map(s => `
    <a class="season-card ${s.year === now ? "current-season-card" : ""}" href="season.html?year=${s.year}">
      <span class="season-year">${s.year}</span>
      <small>${esc(s.era || "Formula racing history")}</small>
      <div class="season-line"></div>
      <strong>${s.year === now ? "CURRENT SEASON" : "EXPLORE SEASON"}</strong>
      <i>↗</i>
    </a>
  `).join("");
}

loadArchive();
