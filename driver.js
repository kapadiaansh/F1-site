const driverNumber = Number(getParam("number"));

async function getCompletedRaces() {
  return (await api(`/sessions?year=${CURRENT_YEAR}&session_name=Race`))
    .filter(s => !s.is_cancelled && new Date(s.date_end) < new Date())
    .sort((a,b) => new Date(a.date_end) - new Date(b.date_end));
}

async function loadDriverProfile() {
  if (!driverNumber) {
    qs("#driverProfile").innerHTML = `<div class="error-message">No driver was selected.</div>`;
    return;
  }

  try {
    const races = await getCompletedRaces();
    const latest = races[races.length - 1];
    if (!latest) throw new Error("No completed race");

    const [driverRows, standings] = await Promise.all([
      api(`/drivers?session_key=${latest.session_key}&driver_number=${driverNumber}`),
      api(`/championship_drivers?session_key=${latest.session_key}&driver_number=${driverNumber}`)
    ]);

    const driver = driverRows[0];
    const standing = standings[0];
    if (!driver) throw new Error("Driver not found");

    document.title = `${driver.full_name} // APEX`;

    qs("#driverProfile").innerHTML = `
      <div class="profile-accent" style="--driver-color:${teamColor(driver.team_colour)}"></div>
      <div class="profile-copy">
        <a class="back-link" href="drivers.html">← All drivers</a>
        <p class="kicker">${esc(driver.team_name || "")}</p>
        <h1>${esc(driver.first_name || "")}<br><strong>${esc(driver.last_name || driver.full_name)}</strong></h1>
        <div class="profile-number">#${driver.driver_number}</div>
        <div class="profile-stat-row">
          <div><small>CHAMPIONSHIP</small><strong>P${standing?.position_current ?? "—"}</strong></div>
          <div><small>POINTS</small><strong>${standing?.points_current ?? "—"}</strong></div>
          <div><small>CODE</small><strong>${esc(driver.name_acronym || "—")}</strong></div>
          <div><small>TEAM</small><strong>${esc(driver.team_name || "—")}</strong></div>
        </div>
      </div>
      <div class="profile-photo" style="--driver-color:${teamColor(driver.team_colour)}">
        ${driver.headshot_url ? `<img src="${esc(driver.headshot_url)}" alt="${esc(driver.full_name)}">` : `<span>${esc(driver.name_acronym || "")}</span>`}
      </div>
    `;

    const lastFive = races.slice(-5).reverse();
    const resultSets = await Promise.all(lastFive.map(r => api(`/session_result?session_key=${r.session_key}&driver_number=${driverNumber}`)));

    qs("#recentResults").innerHTML = lastFive.map((race, i) => {
      const result = resultSets[i][0];
      let pos = "—";
      if (result) {
        if (result.dsq) pos = "DSQ";
        else if (result.dns) pos = "DNS";
        else if (result.dnf) pos = `DNF · P${result.position ?? "—"}`;
        else pos = `P${result.position ?? "—"}`;
      }
      return `
        <a class="recent-result-row" href="race.html?meeting=${race.meeting_key}">
          <span>${fmtDate(race.date_start,{year:undefined})}</span>
          <strong>${esc(race.country_name)} Grand Prix</strong>
          <b>${pos}</b>
          <i>↗</i>
        </a>`;
    }).join("");
  } catch (err) {
    console.error(err);
    qs("#driverProfile").innerHTML = `<div class="error-message">This driver profile could not be loaded.</div>`;
    qs("#recentResults").innerHTML = "";
  }
}
loadDriverProfile();