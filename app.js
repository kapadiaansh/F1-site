(() => {
  function mergeData(base, overlay) {
    if (!overlay || typeof overlay !== "object") return base;
    const out = {...base};
    for (const [key,value] of Object.entries(overlay)) {
      if (Array.isArray(value)) out[key] = value;
      else if (value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = mergeData(base[key] || {}, value);
      } else if (value !== undefined && value !== null) out[key] = value;
    }
    return out;
  }
  const D = mergeData(window.F1_DATA, window.F1_ONLINE_DATA);
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const pad = n => String(n).padStart(2,"0");

  const state = {
    timeMode: "local",
    standingType: "drivers",
    standingExpanded: false,
    resultExpanded: false,
    raceFilter: "all",
    historyIndex: 0,
    newsSource: "all"
  };

  function formatDate(iso, options={}) {
    return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",...options}).format(new Date(iso));
  }

  function timeInZone(iso, zone) {
    return new Intl.DateTimeFormat(undefined,{
      timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false
    }).format(new Date(iso));
  }

  function localTime(iso) {
    return new Intl.DateTimeFormat(undefined,{
      hour:"2-digit",minute:"2-digit",hour12:false,timeZoneName:"short"
    }).format(new Date(iso));
  }

  function dayLabel(iso, zone) {
    return new Intl.DateTimeFormat(undefined,{
      timeZone:zone,weekday:"short",day:"2-digit",month:"short"
    }).format(new Date(iso)).toUpperCase();
  }

  function getNextSession() {
    const now = new Date();
    return D.nextRace.sessions.find(s => new Date(s.end) >= now) || D.nextRace.sessions.at(-1);
  }

  function updateCountdown() {
    const target = new Date(D.nextRace.sessions.at(-1).start);
    const diff = Math.max(0, target - new Date());
    $("#cdDays").textContent = pad(Math.floor(diff/86400000));
    $("#cdHours").textContent = pad(Math.floor((diff%86400000)/3600000));
    $("#cdMinutes").textContent = pad(Math.floor((diff%3600000)/60000));
    $("#cdSeconds").textContent = pad(Math.floor((diff%60000)/1000));
  }

  function updateClock() {
    $("#clock").textContent = new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  }

  function renderNextSession() {
    const s = getNextSession();
    $("#nextSessionBadge").textContent = s.short;
    $("#nextSessionCode").textContent = s.short;
    $("#nextSessionDate").textContent = dayLabel(s.start,D.nextRace.timezone);
    $("#nextSessionName").textContent = s.name;
    $("#nextSessionTime").textContent = `${timeInZone(s.start,D.nextRace.timezone)} TRACK TIME`;
  }

  function renderSessions() {
    const now = new Date();
    $("#sessionList").innerHTML = D.nextRace.sessions.map((s,i) => {
      const isLive = new Date(s.start) <= now && now <= new Date(s.end);
      const isNext = s === getNextSession();
      const time = state.timeMode === "track" ? timeInZone(s.start,D.nextRace.timezone) : localTime(s.start);
      const zone = state.timeMode === "track" ? "MYT" : "YOUR TIME";
      return `<article class="session-row ${isLive?"live":isNext?"next":""}">
        <div class="session-short">${s.short}</div>
        <div class="session-info"><small>${dayLabel(s.start,D.nextRace.timezone)}</small><strong>${s.name}</strong></div>
        <div class="session-time"><strong>${time}</strong><span>${isLive?"LIVE":isNext?"NEXT · "+zone:zone}</span></div>
      </article>`;
    }).join("");
  }

  function renderWeather() {
    $("#weatherStrip").innerHTML = D.nextRace.weather.map(w => `
      <article class="weather-card">
        <div><small>${w.day.toUpperCase()}</small><strong>${w.label}</strong><span>${w.high}° / ${w.low}°C</span></div>
        <div class="rain"><b>${w.rain}%</b><span>RAIN</span></div>
      </article>`).join("");
  }

  function renderStandings() {
    const query = $("#standingSearch").value.trim().toLowerCase();
    let data;
    if (state.standingType === "drivers") {
      data = D.drivers.filter(d => `${d.name} ${d.team} ${d.code}`.toLowerCase().includes(query));
      $("#standingMeta").textContent = `${data.length} DRIVERS`;
      if (!state.standingExpanded && !query) data = data.slice(0,10);
      $("#standingsRows").innerHTML = data.map(d => `
        <div class="standing-row">
          <span class="pos">${pad(d.pos)}</span>
          <div class="driver-cell"><i class="driver-color" style="--c:${d.color}"></i><div class="driver-name"><strong>${d.name}</strong><small>#${d.number} · ${d.code}</small></div></div>
          <span class="team-name">${d.team}</span>
          <span class="pts">${d.points}<small>PTS</small></span>
        </div>`).join("");
      $("#showMore").hidden = Boolean(query);
      $("#showMore").innerHTML = state.standingExpanded ? 'Show top 10 <span>↑</span>' : 'Show all standings <span>↓</span>';
    } else {
      data = D.teams.filter(t => t.team.toLowerCase().includes(query));
      $("#standingMeta").textContent = `${data.length} CONSTRUCTORS`;
      $("#standingsRows").innerHTML = data.map(t => `
        <div class="standing-row">
          <span class="pos">${pad(t.pos)}</span>
          <div class="driver-cell"><i class="driver-color" style="--c:${t.color}"></i><div class="driver-name"><strong>${t.team}</strong><small>CONSTRUCTOR</small></div></div>
          <span class="team-name">2026 Championship</span>
          <span class="pts">${t.points}<small>PTS</small></span>
        </div>`).join("");
      $("#showMore").hidden = true;
    }
  }

  function renderResults() {
    const top = D.latestResult.results;
    $("#podium").innerHTML = [top[1],top[0],top[2]].map((r,i) => `
      <article class="podium-card ${r.pos===1?"first":""}">
        <span class="place">P${r.pos}</span><span class="num">#${r.number}</span>
        <h3>${r.name}</h3><p>${r.team}</p><strong class="gap">${r.time}</strong>
      </article>`).join("");

    const rows = state.resultExpanded ? top : top.slice(0,5);
    $("#resultRows").innerHTML = rows.map(r => `
      <div class="result-row">
        <span class="rpos">${r.pos}</span><span class="rdriver">${r.name}</span><span class="rteam">${r.team}</span><span class="rgap">${r.time}</span><span class="rpts">${r.points}</span>
      </div>`).join("");
    $("#toggleResults").innerHTML = state.resultExpanded ? 'Top 5 only <span>↑</span>' : 'Full top 10 <span>↓</span>';
  }

  function renderCalendar() {
    let races = D.races;
    if (state.raceFilter === "complete") races = races.filter(r => r.winner);
    if (state.raceFilter === "upcoming") races = races.filter(r => !r.winner);
    $("#calendarTrack").innerHTML = races.map(r => {
      const d = new Date(`${r.date}T12:00:00`);
      const isNext = r.round === D.nextRace.round;
      return `<article class="race-card ${isNext?"next":""}">
        <div class="round"><span>ROUND ${pad(r.round)}</span><span class="${isNext?"status":""}">${r.winner?"COMPLETE":isNext?"NEXT":"UPCOMING"}</span></div>
        <div class="race-date">${pad(d.getDate())}<span>${d.toLocaleString(undefined,{month:"short"}).toUpperCase()}</span></div>
        <h3>${r.name}</h3><p>${r.country}</p>
        <div class="winner">${r.winner?`WINNER · <strong>${r.winner}</strong>`:"RACE PENDING"}</div>
      </article>`;
    }).join("");

    requestAnimationFrame(() => {
      const track = $("#calendarTrack");
      const next = $("#calendarTrack .next");
      if (track && next && state.raceFilter === "all") {
        track.scrollLeft = Math.max(0, next.offsetLeft - track.clientWidth / 2 + next.clientWidth / 2);
      }
    });
  }

  function driverStats(driver) {
    const wins = D.races.filter(r => r.winner === driver.name).length;
    const podiums = D.races.filter(r => r.podium?.includes(driver.name)).length;
    const latest = D.latestResult.results.find(r => r.name === driver.name);
    return { wins, podiums, latest: latest ? `P${latest.pos}` : "DNF/—" };
  }

  function renderCompare() {
    const a = D.drivers.find(d => d.number === Number($("#compareA").value));
    const b = D.drivers.find(d => d.number === Number($("#compareB").value));
    const as = driverStats(a), bs = driverStats(b);
    const metrics = [
      ["Championship",`P${a.pos}`,`P${b.pos}`],
      ["Points",a.points,b.points],
      ["Wins",as.wins,bs.wins],
      ["Podiums",as.podiums,bs.podiums],
      ["Baku finish",as.latest,bs.latest]
    ];
    $("#compareBoard").innerHTML = `
      <article class="compare-driver" style="--c:${a.color}"><span>#${a.number}</span><div class="big-code">${a.code}</div><small>${a.team}</small><h3>${a.name}</h3></article>
      <div class="compare-metrics">${metrics.map(m=>`<div class="metric-row"><b>${m[1]}</b><span>${m[0]}</span><b>${m[2]}</b></div>`).join("")}</div>
      <article class="compare-driver right" style="--c:${b.color}"><span>#${b.number}</span><div class="big-code">${b.code}</div><small>${b.team}</small><h3>${b.name}</h3></article>`;
  }

  function todaysHistory() {
    const now = new Date();
    const key = `${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const matches = D.history.filter(h => h.date === key);
    if (matches.length) return matches;
    return [{
      year:"ARCHIVE",
      category:"FEATURED HISTORY",
      title:"More daily history is being added",
      text:"The historical layer is built to surface date-specific Formula racing moments. This date does not have a curated entry yet, so the archive will expand here over time."
    }];
  }

  function localHistoryStories() {
    const archive = window.F1_HISTORY;
    if (!archive?.days) return D.history || [];
    const now = new Date();
    const key = `${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    return archive.days[key] || D.history || [];
  }

  function mediaCreditHtml(media) {
    if (!media) return "";
    const creator = media.creator ? `© ${media.creator}` : "";
    const license = media.license || "";
    const page = media.page || "#";
    return `<a href="${page}" target="_blank" rel="noopener noreferrer">${creator}${creator && license ? " · " : ""}${license}</a>`;
  }

  function renderMedia() {
    const media = window.F1_MEDIA || {};
    if (media.hero?.url) {
      $("#heroPhoto").src = media.hero.url;
      $("#heroPhoto").alt = media.hero.alt || "";
      $("#heroCredit").innerHTML = mediaCreditHtml(media.hero);
    }
    const circuit = media.circuit;
    if (circuit?.url) {
      const img = $("#circuitLayoutImage");
      img.src = circuit.url;
      img.hidden = false;
      $(".track-art").classList.add("has-layout");
    }
  }

  function renderHistory() {
    const stories = localHistoryStories();
    if (!stories.length) return;
    if (state.historyIndex >= stories.length) state.historyIndex = 0;
    const h = stories[state.historyIndex];
    const now = new Date();
    $("#historyDay").textContent = pad(now.getDate());
    $("#historyMonth").textContent = now.toLocaleString(undefined,{month:"short"}).toUpperCase();
    $("#historyYear").textContent = h.year;
    $("#historyCategory").textContent = h.category || "F1 HISTORY";
    $("#historyTitle").textContent = h.title;
    $("#historyText").textContent = h.text || "";
    $("#historyCount").textContent = `${pad(state.historyIndex+1)} / ${pad(stories.length)}`;
    $("#historySourceLink").href = h.sourceUrl || "#";
    $("#historySourceStatus").textContent = window.F1_HISTORY?.generatedAt
      ? `F1DB archive · refreshed ${relativeTime(window.F1_HISTORY.generatedAt)}`
      : "F1 history";

    const media = window.F1_MEDIA?.history?.[h.event];
    const image = $("#historyImage");
    if (media?.url) {
      image.src = media.url;
      image.alt = media.alt || h.title;
      $("#historyCredit").innerHTML = mediaCreditHtml(media);
    } else {
      image.removeAttribute("src");
      image.alt = "";
      $("#historyCredit").textContent = "Licensed event image not found yet";
    }
  }

  function renderDataSourceStatus() {
    const online = window.F1_ONLINE_DATA?.meta;
    const dot = $("#dataSourceDot");
    if (online?.verified) {
      dot.classList.add("online");
      $("#dataSourceName").textContent = online.source || "F1DB";
      $("#dataSourceNote").textContent = `Online data overlay · ${online.version || "latest release"}`;
    } else {
      $("#dataSourceName").textContent = "Verified fallback";
      $("#dataSourceNote").textContent = "Last-known-good data remains active until online normalization validates.";
    }
  }

  function populateCompare() {
    const html = D.drivers.map(d => `<option value="${d.number}">${d.name} · ${d.team}</option>`).join("");
    $("#compareA").innerHTML = html;
    $("#compareB").innerHTML = html;
    $("#compareA").value = 12;
    $("#compareB").value = 63;
  }

  function setupEvents() {
    $$(".time-toggle button").forEach(btn => btn.addEventListener("click",() => {
      $$(".time-toggle button").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
      state.timeMode = btn.dataset.time; renderSessions();
    }));

    $$(".tabs button").forEach(btn => btn.addEventListener("click",() => {
      $$(".tabs button").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
      state.standingType = btn.dataset.standing; $("#standingSearch").value=""; renderStandings();
    }));

    $("#standingSearch").addEventListener("input",renderStandings);
    $("#showMore").addEventListener("click",()=>{state.standingExpanded=!state.standingExpanded;renderStandings()});
    $("#toggleResults").addEventListener("click",()=>{state.resultExpanded=!state.resultExpanded;renderResults()});

    $$(".calendar-filter button").forEach(btn => btn.addEventListener("click",() => {
      $$(".calendar-filter button").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
      state.raceFilter=btn.dataset.raceFilter; renderCalendar();
    }));


    $$(".news-tabs button").forEach(btn => btn.addEventListener("click",() => {
      $$(".news-tabs button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      state.newsSource = btn.dataset.newsSource;
      renderNews();
    }));

    $("#compareA").addEventListener("change",renderCompare);
    $("#compareB").addEventListener("change",renderCompare);
    $("#historyPrev").addEventListener("click",()=>{{const items=todaysHistory();state.historyIndex=(state.historyIndex-1+items.length)%items.length;renderHistory()}});
    $("#historyNext").addEventListener("click",()=>{{const items=todaysHistory();state.historyIndex=(state.historyIndex+1)%items.length;renderHistory()}});

    const menuBtn=$("#menuBtn"), nav=$("#nav");
    menuBtn.addEventListener("click",()=>{const open=nav.classList.toggle("open");menuBtn.setAttribute("aria-expanded",String(open))});
    $$("#nav a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menuBtn.setAttribute("aria-expanded","false")}));
  }

  function setupScroll() {
    const topbar=$("#topbar"), progress=$("#progress");
    const sections=$$(".section-anchor");
    window.addEventListener("scroll",()=>{
      topbar.classList.toggle("scrolled",scrollY>25);
      const max=document.documentElement.scrollHeight-innerHeight;
      progress.style.width=`${max?scrollY/max*100:0}%`;
      let current="home";
      sections.forEach(s=>{if(s.getBoundingClientRect().top<160) current=s.id});
      $$("#nav a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+current));
    },{passive:true});

    const observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target)}})
    },{threshold:.12});
    $$(".reveal").forEach(el=>observer.observe(el));
  }

  function init() {
    renderNextSession();
    renderSessions();
    renderWeather();
    renderStandings();
    renderResults();
    renderCalendar();
    renderNews();
    renderMedia();
    renderDataSourceStatus();
    populateCompare();
    renderCompare();
    renderHistory();
    setupEvents();
    setupScroll();
    updateCountdown(); updateClock();
    setInterval(updateCountdown,1000);
    setInterval(updateClock,1000);
  }

  document.addEventListener("DOMContentLoaded",init);
})();