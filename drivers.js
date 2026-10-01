let driverCards = [];

async function latestRaceSession() {
  const sessions = await api(`/sessions?year=${CURRENT_YEAR}&session_name=Race`);
  return sessions
    .filter(s => !s.is_cancelled && new Date(s.date_end) < new Date())
    .sort((a,b) => new Date(b.date_end) - new Date(a.date_end))[0];
}

async function loadDrivers() {
  try {
    const latest = await latestRaceSession();
    if (!latest) throw new Error("No completed race");

    const [drivers, standings] = await Promise.all([
      api(`/drivers?session_key=${latest.session_key}`),
      api(`/championship_drivers?session_key=${latest.session_key}`)
    ]);

    const byNum = new Map();
    drivers.forEach(d => byNum.set(d.driver_number, d));
    const standingMap = new Map(standings.map(s => [s.driver_number, s]));

    driverCards = [...byNum.values()]
      .filter(d => d.full_name)
      .map(d => ({...d, standing: standingMap.get(d.driver_number)}))
      .sort((a,b) => (a.standing?.position_current ?? 99) - (b.standing?.position_current ?? 99));

    renderDrivers(driverCards);
    qs("#driverCount").textContent = `${driverCards.length} drivers`;

    qs("#driverSearch").addEventListener("input", e => {
      const term = e.target.value.trim().toLowerCase();
      const filtered = driverCards.filter(d =>
        d.full_name.toLowerCase().includes(term) ||
        (d.team_name || "").toLowerCase().includes(term) ||
        String(d.driver_number).includes(term)
      );
      renderDrivers(filtered);
      qs("#driverCount").textContent = `${filtered.length} drivers`;
    });
  } catch (err) {
    console.error(err);
    qs("#driverGrid").innerHTML = `<div class="error-message">Driver data could not be loaded yet.</div>`;
  }
}

function renderDrivers(drivers) {
  qs("#driverGrid").innerHTML = drivers.map(d => `
    <a class="driver-card" href="driver.html?number=${d.driver_number}" style="--driver-color:${teamColor(d.team_colour)}">
      <div class="driver-card-head">
        <span class="driver-position">P${d.standing?.position_current ?? "—"}</span>
        <span class="driver-number">#${d.driver_number}</span>
      </div>
      <div class="driver-photo-wrap">
        ${d.headshot_url ? `<img src="${esc(d.headshot_url)}" alt="${esc(d.full_name)}" loading="lazy">` : `<div class="driver-placeholder">${esc(d.name_acronym || "")}</div>`}
      </div>
      <div class="driver-card-copy">
        <small>${esc(d.team_name || "Team unavailable")}</small>
        <h2>${esc(d.full_name)}</h2>
        <div class="driver-card-stats">
          <span><b>${d.standing?.points_current ?? "—"}</b> PTS</span>
          <span>${esc(d.country_code || "")}</span>
        </div>
      </div>
    </a>
  `).join("");
}
loadDrivers();