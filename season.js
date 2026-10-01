const historicalYear = Number(getParam("year"));

function eraForYear(y) {
  if (y <= 1959) return "The Origins";
  if (y <= 1969) return "The Sixties";
  if (y <= 1979) return "The Seventies";
  if (y <= 1989) return "Turbo & Innovation";
  if (y <= 1999) return "The Nineties";
  if (y <= 2009) return "The 2000s";
  if (y <= 2013) return "Hybrid Transition";
  if (y <= 2021) return "Hybrid Era";
  return "Ground Effect Era";
}

async function loadSeasonPage() {
  if (!historicalYear || historicalYear < 1950 || historicalYear > CURRENT_YEAR) {
    qs("#seasonHero").innerHTML = `<div class="historical-placeholder"><p class="kicker">ARCHIVE</p><h2>Select a season</h2><p>Choose any championship year from 1950 onward from the archive page.</p></div>`;
    return;
  }

  document.title = `${historicalYear} Season // APEX`;

  qs("#seasonHero").innerHTML = `
    <a class="back-link" href="archive.html">← Historical archive</a>
    <p class="kicker">${eraForYear(historicalYear)}</p>
    <h1>${historicalYear}</h1>
    <p class="page-lead">Historical championship season page.</p>
  `;

  if (historicalYear === 2026 && window.APEX_CURRENT_SNAPSHOT) {
    const d = window.APEX_CURRENT_SNAPSHOT;
    qs("#seasonContent").innerHTML = `
      <div class="historical-kpis">
        <div><small>ROUNDS</small><strong>${d.races.length}</strong></div>
        <div><small>LEADER</small><strong>${d.drivers[0].name}</strong></div>
        <div><small>CONSTRUCTOR</small><strong>${d.teams[0].team}</strong></div>
        <div><small>DRIVERS</small><strong>${d.drivers.length}</strong></div>
      </div>
      <div class="historical-season-grid">
        <section>
          <div class="subsection-title"><p class="kicker">CHAMPIONSHIP</p><h2>Driver standings</h2></div>
          <div class="history-table">
            ${d.drivers.slice(0,20).map(x=>`
              <div class="history-table-row">
                <span>${x.position}</span><strong>${x.name}</strong><small>${x.team}</small><b>${x.points} PTS</b>
              </div>`).join("")}
          </div>
        </section>
        <section>
          <div class="subsection-title"><p class="kicker">CALENDAR</p><h2>Race winners</h2></div>
          <div class="history-table">
            ${d.races.map(r=>`
              <div class="history-table-row race-history-row">
                <span>R${String(r.round).padStart(2,"0")}</span><strong>${r.name}</strong><small>${r.circuit}</small><b>${r.winner || "UPCOMING"}</b>
              </div>`).join("")}
          </div>
        </section>
      </div>`;
  } else {
    qs("#seasonContent").innerHTML = `
      <div class="historical-placeholder">
        <p class="kicker">ARCHIVE EXPANSION</p>
        <h2>${historicalYear} season page is ready</h2>
        <p>
          The navigation and season route are working. Detailed historical results for this year
          are being added to our local archive progressively, so the site remains reliable and
          does not depend on a live third-party API.
        </p>
      </div>`;
  }
}
loadSeasonPage();
