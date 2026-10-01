async function loadCalendarPage() {
  qs("#calendarYear").textContent = CURRENT_YEAR;

  try {
    const meetings = (await api(`/meetings?year=${CURRENT_YEAR}`))
      .filter(m => !m.is_cancelled)
      .sort((a,b) => new Date(a.date_start) - new Date(b.date_start));

    const complete = meetings.filter(m => new Date(m.date_end) < new Date()).length;
    qs("#seasonProgress").textContent = `${complete} / ${meetings.length} weekends complete`;

    qs("#calendarGrid").innerHTML = meetings.map((m, i) => {
      const status = statusForMeeting(m);
      const klass = status.toLowerCase().replace(" ", "-");
      const date = new Date(m.date_start);
      return `
        <a class="round-card ${klass}" href="race.html?meeting=${m.meeting_key}">
          <div class="round-card-top">
            <span class="round-no">R${String(i + 1).padStart(2,"0")}</span>
            <span class="round-status">${status}</span>
          </div>
          <div class="round-date">
            <strong>${date.getDate()}</strong>
            <span>${date.toLocaleString(undefined,{month:"short"}).toUpperCase()}</span>
          </div>
          <div class="round-copy">
            <small>${esc(m.country_name)}</small>
            <h2>${esc(m.meeting_name)}</h2>
            <p>${esc(m.circuit_short_name)} · ${esc(m.location)}</p>
          </div>
          <div class="round-arrow">↗</div>
        </a>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    qs("#calendarGrid").innerHTML = `<div class="error-message">Calendar data could not be loaded.</div>`;
  }
}
loadCalendarPage();