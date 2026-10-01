const meetingKey = Number(getParam("meeting"));

async function loadRace() {
  if (!meetingKey) {
    qs("#raceHero").innerHTML = `<div class="error-message">No race weekend selected.</div>`;
    return;
  }

  try {
    const [meetingRows, sessions] = await Promise.all([
      api(`/meetings?meeting_key=${meetingKey}`),
      api(`/sessions?meeting_key=${meetingKey}`)
    ]);
    const meeting = meetingRows[0];
    if (!meeting) throw new Error("Meeting not found");

    const ordered = sessions
      .filter(s => !s.is_cancelled)
      .sort((a,b) => new Date(a.date_start) - new Date(b.date_start));

    document.title = `${meeting.meeting_name} // APEX`;

    qs("#raceHero").innerHTML = `
      <a class="back-link" href="calendar.html">← Full calendar</a>
      <div class="race-hero-grid">
        <div>
          <p class="kicker">${statusForMeeting(meeting)}</p>
          <h1>${esc(meeting.meeting_name)}</h1>
          <p class="page-lead">${esc(meeting.circuit_short_name)} · ${esc(meeting.location)}, ${esc(meeting.country_name)}</p>
        </div>
        <div class="race-date-block">
          <span>${new Date(meeting.date_start).toLocaleString(undefined,{month:"short"}).toUpperCase()}</span>
          <strong>${new Date(meeting.date_start).getDate()}</strong>
          <i>—</i>
          <strong>${new Date(meeting.date_end).getDate()}</strong>
        </div>
      </div>
    `;

    qs("#raceSessions").innerHTML = ordered.map(s => {
      const now = new Date();
      const live = new Date(s.date_start) <= now && now <= new Date(s.date_end);
      const done = new Date(s.date_end) < now;
      return `
        <div class="race-session-item ${live ? "live-session" : ""}">
          <div><small>${fmtDate(s.date_start,{weekday:"short",year:undefined})}</small><strong>${esc(s.session_name)}</strong></div>
          <span>${fmtDateTime(s.date_start)}</span>
          <b>${live ? "LIVE" : done ? "COMPLETE" : "UPCOMING"}</b>
        </div>`;
    }).join("");

    const race = ordered.find(s => s.session_name === "Race");
    if (!race || new Date(race.date_end) >= new Date()) {
      qs("#raceResult").innerHTML = `<div class="future-result"><span>RESULT PENDING</span><p>The finishing order will appear here after the race result is published.</p></div>`;
      return;
    }

    const [result, drivers] = await Promise.all([
      api(`/session_result?session_key=${race.session_key}`),
      api(`/drivers?session_key=${race.session_key}`)
    ]);
    const dmap = new Map(drivers.map(d => [d.driver_number,d]));

    qs("#raceResult").innerHTML = result
      .filter(r => Number(r.position) <= 10)
      .sort((a,b) => Number(a.position)-Number(b.position))
      .map(r => {
        const d = dmap.get(r.driver_number);
        return `
          <a class="race-finisher" href="driver.html?number=${r.driver_number}">
            <span>P${r.position}</span>
            <i style="--driver-color:${teamColor(d?.team_colour)}"></i>
            <div><strong>${esc(d?.full_name || `#${r.driver_number}`)}</strong><small>${esc(d?.team_name || "")}</small></div>
            <b>${r.dnf ? "DNF" : r.dsq ? "DSQ" : r.gap_to_leader === 0 ? "WIN" : esc(r.gap_to_leader ?? "")}</b>
          </a>`;
      }).join("");
  } catch (err) {
    console.error(err);
    qs("#raceHero").innerHTML = `<div class="error-message">Race-weekend data could not be loaded.</div>`;
  }
}
loadRace();