let compareDrivers = [];
let compareStandings = [];
let raceSessions = [];

async function latestRace() {
  const races = (await api(`/sessions?year=${CURRENT_YEAR}&session_name=Race`))
    .filter(s => !s.is_cancelled && new Date(s.date_end) < new Date())
    .sort((a,b)=>new Date(a.date_end)-new Date(b.date_end));
  raceSessions = races;
  return races[races.length - 1];
}

async function loadCompare() {
  try {
    const latest = await latestRace();
    if (!latest) throw new Error("No completed race");

    const [drivers, standings] = await Promise.all([
      api(`/drivers?session_key=${latest.session_key}`),
      api(`/championship_drivers?session_key=${latest.session_key}`)
    ]);

    const map = new Map();
    drivers.forEach(d => map.set(d.driver_number,d));
    compareDrivers = [...map.values()].filter(d => d.full_name).sort((a,b)=>a.full_name.localeCompare(b.full_name));
    compareStandings = standings;

    const options = compareDrivers.map(d => `<option value="${d.driver_number}">${esc(d.full_name)} · ${esc(d.team_name || "")}</option>`).join("");
    qs("#driverA").innerHTML = options;
    qs("#driverB").innerHTML = options;

    qs("#driverA").selectedIndex = 0;
    qs("#driverB").selectedIndex = Math.min(1, compareDrivers.length - 1);

    qs("#driverA").addEventListener("change", renderComparison);
    qs("#driverB").addEventListener("change", renderComparison);
    await renderComparison();
  } catch (err) {
    console.error(err);
    qs("#comparison").innerHTML = `<div class="error-message">Comparison data could not be loaded.</div>`;
  }
}

async function seasonStats(number) {
  const results = await Promise.all(
    raceSessions.map(s => api(`/session_result?session_key=${s.session_key}&driver_number=${number}`))
  );
  const flat = results.map(r => r[0]).filter(Boolean);
  return {
    races: flat.length,
    wins: flat.filter(r => Number(r.position) === 1).length,
    podiums: flat.filter(r => Number(r.position) <= 3).length,
    top10: flat.filter(r => Number(r.position) <= 10).length,
    dnfs: flat.filter(r => r.dnf).length,
    latest: flat[flat.length - 1]?.position ?? "—"
  };
}

async function renderComparison() {
  const aNum = Number(qs("#driverA").value);
  const bNum = Number(qs("#driverB").value);
  if (!aNum || !bNum) return;

  qs("#comparison").innerHTML = `<div class="page-loader">Calculating season comparison…</div>`;

  const [aStats,bStats] = await Promise.all([seasonStats(aNum),seasonStats(bNum)]);
  const a = compareDrivers.find(d => d.driver_number === aNum);
  const b = compareDrivers.find(d => d.driver_number === bNum);
  const aStand = compareStandings.find(s => s.driver_number === aNum);
  const bStand = compareStandings.find(s => s.driver_number === bNum);

  const rows = [
    ["Championship", `P${aStand?.position_current ?? "—"}`, `P${bStand?.position_current ?? "—"}`],
    ["Points", aStand?.points_current ?? "—", bStand?.points_current ?? "—"],
    ["Wins", aStats.wins, bStats.wins],
    ["Podiums", aStats.podiums, bStats.podiums],
    ["Top 10s", aStats.top10, bStats.top10],
    ["DNFs", aStats.dnfs, bStats.dnfs],
    ["Latest finish", `P${aStats.latest}`, `P${bStats.latest}`]
  ];

  qs("#comparison").innerHTML = `
    <div class="compare-driver left" style="--driver-color:${teamColor(a.team_colour)}">
      <span>#${a.driver_number}</span>
      ${a.headshot_url ? `<img src="${esc(a.headshot_url)}" alt="${esc(a.full_name)}">` : ""}
      <small>${esc(a.team_name || "")}</small>
      <h2>${esc(a.full_name)}</h2>
    </div>
    <div class="compare-metrics">
      ${rows.map(([label,av,bv]) => `
        <div class="compare-row">
          <strong>${av}</strong><span>${label}</span><strong>${bv}</strong>
        </div>`).join("")}
    </div>
    <div class="compare-driver right" style="--driver-color:${teamColor(b.team_colour)}">
      <span>#${b.driver_number}</span>
      ${b.headshot_url ? `<img src="${esc(b.headshot_url)}" alt="${esc(b.full_name)}">` : ""}
      <small>${esc(b.team_name || "")}</small>
      <h2>${esc(b.full_name)}</h2>
    </div>
  `;
}
loadCompare();