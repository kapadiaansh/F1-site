const OPENF1 = "https://api.openf1.org/v1";
const currentYear = new Date().getFullYear();

const state = {
  meetings: [],
  sessions: [],
  nextMeeting: null,
  nextSession: null,
  latestRaceSession: null,
  drivers: [],
  driverStandings: [],
  teamStandings: [],
  history: [],
  historyIndex: 0
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function safeText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value ?? "—";
}

function formatDateRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const startMonth = start.toLocaleString(undefined, { month: "short" }).toUpperCase();
  const endMonth = end.toLocaleString(undefined, { month: "short" }).toUpperCase();

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

function formatSessionDate(iso) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(iso)).toUpperCase();
}

function formatTime(iso) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(iso));
}

function formatShortTime(iso) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(iso));
}

function sessionCode(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("sprint")) return "S";
  if (normalized.includes("qualifying")) return "Q";
  if (normalized.includes("practice")) return "P";
  if (normalized.includes("race")) return "R";
  return name.charAt(0).toUpperCase() || "F";
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }
  return response.json();
}

async function loadCalendar() {
  state.meetings = await fetchJSON(`${OPENF1}/meetings?year=${currentYear}`);
  state.meetings.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

  const now = new Date();

  state.nextMeeting =
    state.meetings.find((meeting) => !meeting.is_cancelled && new Date(meeting.date_end) >= now) ||
    state.meetings[state.meetings.length - 1];

  if (!state.nextMeeting) throw new Error("No meeting found for this season.");

  state.sessions = await fetchJSON(
    `${OPENF1}/sessions?meeting_key=${state.nextMeeting.meeting_key}`
  );

  state.sessions = state.sessions
    .filter((session) => !session.is_cancelled)
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

  state.nextSession =
    state.sessions.find((session) => new Date(session.date_end) >= now) ||
    state.sessions[state.sessions.length - 1];

  renderNextRace();
  renderWeekend();
  renderSessionCenter();
  startCountdown();

  await loadLatestRaceAndStandings();
}

function renderNextRace() {
  const meeting = state.nextMeeting;
  const session = state.nextSession;
  if (!meeting || !session) return;

  safeText("#nextRaceName", meeting.meeting_name);
  safeText("#nextRaceLocation", `${meeting.location}, ${meeting.country_name}`);
  safeText("#nextRaceDates", formatDateRange(meeting.date_start, meeting.date_end));

  safeText("#nextSessionCode", sessionCode(session.session_name));
  safeText("#nextSessionDay", formatSessionDate(session.date_start));
  safeText("#nextSessionName", session.session_name);
  safeText("#nextSessionTime", formatTime(session.date_start));

  safeText("#circuitCountry", meeting.country_name.toUpperCase());
  safeText("#circuitName", meeting.circuit_short_name);
  safeText("#circuitType", meeting.circuit_type || "Grand Prix circuit");

  const words = meeting.circuit_short_name?.split(/\s+/) || ["G", "P"];
  const monogram = words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : words[0].slice(0, 2);
  safeText("#circuitMonogram", monogram.toUpperCase());

  safeText("#seasonStat", currentYear);
  safeText("#roundStat", String(state.meetings.indexOf(meeting) + 1).padStart(2, "0"));
  safeText("#nextStat", sessionCode(session.session_name));
}

function renderWeekend() {
  const container = $("#sessionList");
  if (!container) return;

  const now = new Date();
  const nextKey = state.nextSession?.session_key;

  container.innerHTML = state.sessions.map((session) => {
    const isNext = session.session_key === nextKey;
    const isPast = new Date(session.date_end) < now;
    const label = isPast ? "COMPLETED" : isNext ? "NEXT" : "UPCOMING";

    return `
      <article class="session-row ${isNext ? "is-next" : ""}">
        <div class="session-date">${formatSessionDate(session.date_start)}</div>
        <div class="session-name">${session.session_name}</div>
        <div class="session-time">
          ${formatShortTime(session.date_start)}
          <small>${label}</small>
        </div>
      </article>
    `;
  }).join("");
}

function startCountdown() {
  const session = state.nextSession;
  if (!session) return;

  const target = new Date(session.date_start);

  const tick = () => {
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      safeText("#days", "00");
      safeText("#hours", "00");
      safeText("#minutes", "00");
      safeText("#seconds", "00");

      if (now <= new Date(session.date_end)) {
        safeText("#sessionState", "LIVE");
      } else {
        safeText("#sessionState", "COMPLETE");
      }
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    safeText("#days", String(days).padStart(2, "0"));
    safeText("#hours", String(hours).padStart(2, "0"));
    safeText("#minutes", String(minutes).padStart(2, "0"));
    safeText("#seconds", String(seconds).padStart(2, "0"));
  };

  tick();
  setInterval(tick, 1000);
}

function startClock() {
  const tick = () => {
    safeText(
      "#localClock",
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date())
    );
  };
  tick();
  setInterval(tick, 1000);
}

function renderSessionCenter() {
  const now = new Date();
  const active = state.sessions.find(
    (session) =>
      new Date(session.date_start) <= now &&
      now <= new Date(session.date_end)
  );

  if (active) {
    safeText("#centerTitle", `${active.session_name} in progress`);
    safeText(
      "#centerCopy",
      `${state.nextMeeting.meeting_name} is currently on track. Real-time position data can be added later with live API access.`
    );
    safeText("#sessionState", "LIVE");
  } else {
    safeText("#centerTitle", "No session live");
    safeText(
      "#centerCopy",
      `Next: ${state.nextSession.session_name} at ${formatTime(state.nextSession.date_start)}.`
    );
  }
}

async function loadLatestRaceAndStandings() {
  const allRaceSessions = await fetchJSON(
    `${OPENF1}/sessions?year=${currentYear}&session_name=Race`
  );

  const now = new Date();
  const completed = allRaceSessions
    .filter((session) => !session.is_cancelled && new Date(session.date_end) < now)
    .sort((a, b) => new Date(b.date_end) - new Date(a.date_end));

  state.latestRaceSession = completed[0];

  if (!state.latestRaceSession) {
    renderNoResultsYet();
    return;
  }

  const sessionKey = state.latestRaceSession.session_key;

  const [drivers, driverStandings, teamStandings, result] = await Promise.all([
    fetchJSON(`${OPENF1}/drivers?session_key=${sessionKey}`),
    fetchJSON(`${OPENF1}/championship_drivers?session_key=${sessionKey}`),
    fetchJSON(`${OPENF1}/championship_teams?session_key=${sessionKey}`),
    fetchJSON(`${OPENF1}/session_result?session_key=${sessionKey}`)
  ]);

  state.drivers = dedupeDrivers(drivers);
  state.driverStandings = driverStandings.sort(
    (a, b) => a.position_current - b.position_current
  );
  state.teamStandings = teamStandings.sort(
    (a, b) => a.position_current - b.position_current
  );

  renderStandings("drivers");
  renderLatestRace(result);
}

function dedupeDrivers(drivers) {
  const map = new Map();
  drivers.forEach((driver) => map.set(driver.driver_number, driver));
  return [...map.values()];
}

function driverByNumber(number) {
  return state.drivers.find((driver) => driver.driver_number === number);
}

function renderStandings(type = "drivers") {
  const container = $("#standingsBody");
  if (!container) return;

  if (type === "drivers") {
    const top = state.driverStandings.slice(0, 10);

    if (!top.length) {
      container.innerHTML = `<div class="error-message">Driver standings are not available yet.</div>`;
      return;
    }

    container.innerHTML = top.map((standing) => {
      const driver = driverByNumber(standing.driver_number);
      const teamColor = driver?.team_colour ? `#${driver.team_colour}` : "#ff3b30";
      return `
        <div class="standing-row">
          <div class="position">${String(standing.position_current).padStart(2, "0")}</div>
          <div class="competitor">
            <span class="team-color" style="--team-color:${teamColor}"></span>
            <div class="competitor-name">
              <strong>${driver?.full_name || `Driver #${standing.driver_number}`}</strong>
              <small>${driver?.team_name || "Formula racing"}</small>
            </div>
          </div>
          <div class="points">${standing.points_current}<small>PTS</small></div>
        </div>
      `;
    }).join("");
  } else {
    const top = state.teamStandings.slice(0, 10);

    if (!top.length) {
      container.innerHTML = `<div class="error-message">Constructor standings are not available yet.</div>`;
      return;
    }

    container.innerHTML = top.map((standing) => `
      <div class="standing-row">
        <div class="position">${String(standing.position_current).padStart(2, "0")}</div>
        <div class="competitor">
          <span class="team-color"></span>
          <div class="competitor-name">
            <strong>${standing.team_name}</strong>
            <small>Constructor</small>
          </div>
        </div>
        <div class="points">${standing.points_current}<small>PTS</small></div>
      </div>
    `).join("");
  }
}

function renderLatestRace(result) {
  const session = state.latestRaceSession;
  safeText("#latestRaceDate", formatSessionDate(session.date_start));
  safeText("#latestRaceName", `${session.country_name} Grand Prix`);

  const podium = result
    .filter((entry) => Number(entry.position) <= 3)
    .sort((a, b) => Number(a.position) - Number(b.position));

  const podiumEl = $("#podium");

  if (!podium.length) {
    podiumEl.innerHTML = `<div class="error-message">Official result not available yet.</div>`;
    return;
  }

  podiumEl.innerHTML = podium.map((entry) => {
    const driver = driverByNumber(entry.driver_number);
    return `
      <div class="podium-row">
        <div class="podium-position">P${entry.position}</div>
        <div class="podium-driver">
          <strong>${driver?.full_name || `Driver #${entry.driver_number}`}</strong>
          <small>${driver?.team_name || ""}</small>
        </div>
        <div class="podium-number">#${entry.driver_number}</div>
      </div>
    `;
  }).join("");
}

function renderNoResultsYet() {
  safeText("#latestRaceDate", `${currentYear} SEASON`);
  safeText("#latestRaceName", "No completed race yet");
  $("#podium").innerHTML = `
    <div class="error-message">
      The latest result panel will populate automatically after the first completed race.
    </div>
  `;
  $("#standingsBody").innerHTML = `
    <div class="error-message">
      Championship standings will populate automatically after race data is published.
    </div>
  `;
}

async function loadHistory() {
  try {
    const response = await fetch("data/history.json");
    const allHistory = await response.json();

    const now = new Date();
    const key = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    state.history = allHistory.filter((item) => item.date === key);

    if (!state.history.length) {
      state.history = [
        {
          date: key,
          year: "ARCHIVE",
          category: "HISTORY DATABASE",
          title: "This date is waiting for its first curated story",
          description:
            "The daily-history engine is working. As we expand the archive, this date will automatically surface races, milestones, birthdays and notable moments."
        }
      ];
    }

    state.historyIndex = 0;
    renderHistory();
  } catch (error) {
    console.error(error);
  }
}

function renderHistory() {
  const now = new Date();
  const story = state.history[state.historyIndex];
  if (!story) return;

  safeText("#historyDay", String(now.getDate()).padStart(2, "0"));
  safeText(
    "#historyMonth",
    now.toLocaleString(undefined, { month: "short" }).toUpperCase()
  );

  safeText("#historyYear", story.year);
  safeText("#historyCategory", story.category);
  safeText("#historyTitle", story.title);
  safeText("#historyDescription", story.description);
  safeText(
    "#historyIndex",
    `${String(state.historyIndex + 1).padStart(2, "0")} / ${String(state.history.length).padStart(2, "0")}`
  );
}

function setupHistoryControls() {
  $("#prevHistory")?.addEventListener("click", () => {
    if (!state.history.length) return;
    state.historyIndex =
      (state.historyIndex - 1 + state.history.length) % state.history.length;
    renderHistory();
  });

  $("#nextHistory")?.addEventListener("click", () => {
    if (!state.history.length) return;
    state.historyIndex = (state.historyIndex + 1) % state.history.length;
    renderHistory();
  });
}

function setupTabs() {
  $$(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".segment").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      });

      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
      renderStandings(button.dataset.tab);
    });
  });
}

function setupMenu() {
  const button = $("#menuButton");
  const nav = $("#mobileNav");

  button?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      button?.setAttribute("aria-expanded", "false");
    });
  });
}

async function init() {
  startClock();
  setupTabs();
  setupHistoryControls();
  setupMenu();
  loadHistory();

  try {
    await loadCalendar();
  } catch (error) {
    console.error(error);
    safeText("#nextRaceName", "Data temporarily unavailable");
    safeText("#nextRaceLocation", "OpenF1 could not be reached");
    $("#sessionList").innerHTML = `
      <div class="error-message">
        The live data request failed. If you opened index.html directly from your computer,
        run it through a local server or GitHub Pages instead.
      </div>
    `;
    $("#standingsBody").innerHTML = `
      <div class="error-message">
        Standings will appear once the API connection is available.
      </div>
    `;
  }
}

init();
