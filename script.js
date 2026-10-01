const currentYear = 2026;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let appData = null;
let activeStandings = "drivers";

function safeText(sel, value) { const el=$(sel); if(el) el.textContent = value ?? "—"; }
function fmtDate(date) { return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date(date+"T12:00:00")); }
function fmtDay(date) { return new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(new Date(date+"T12:00:00")).toUpperCase(); }

function startClock(){
  const tick=()=>safeText("#localClock",new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date()));
  tick(); setInterval(tick,1000);
}

function startWeekendCountdown(){
  const target = new Date(appData.nextRace.dateStart + "T00:00:00+08:00");
  const tick=()=>{
    let diff = target-new Date();
    if(diff<0) diff=0;
    safeText("#days",String(Math.floor(diff/86400000)).padStart(2,"0"));
    safeText("#hours",String(Math.floor((diff%86400000)/3600000)).padStart(2,"0"));
    safeText("#minutes",String(Math.floor((diff%3600000)/60000)).padStart(2,"0"));
    safeText("#seconds",String(Math.floor((diff%60000)/1000)).padStart(2,"0"));
  };
  tick(); setInterval(tick,1000);
}

function renderHero(){
  const n=appData.nextRace;
  safeText("#nextRaceName",n.name);
  safeText("#nextRaceLocation",n.location);
  safeText("#nextRaceDates",`${fmtDate(n.dateStart)} – ${fmtDate(n.dateEnd)}`);
  safeText("#nextSessionCode","W");
  safeText("#nextSessionDay",fmtDay(n.dateStart));
  safeText("#nextSessionName","Race weekend");
  safeText("#nextSessionTime","Session times to be confirmed");
  safeText("#sessionState","UPCOMING");
  safeText("#circuitCountry",n.country.toUpperCase());
  safeText("#circuitName",n.circuit);
  safeText("#circuitType","Grand Prix circuit");
  safeText("#circuitMonogram","SP");
  safeText("#seasonStat",appData.season);
  safeText("#roundStat",String(n.round).padStart(2,"0"));
  safeText("#nextStat","R16");
  safeText("#centerTitle",`${n.name} next`);
  safeText("#centerCopy",`Round ${n.round} runs ${fmtDate(n.dateStart)} to ${fmtDate(n.dateEnd)} at ${n.circuit}.`);
  startWeekendCountdown();
}

function renderWeekend(){
  $("#sessionList").innerHTML = appData.nextRace.sessions.map((s,i)=>`
    <article class="session-row ${i===0?"is-next":""}">
      <div class="session-date">${fmtDay(s.date)}</div>
      <div class="session-name">${s.name}</div>
      <div class="session-time">${s.time || "TBC"}<small>${i===0?"NEXT":"UPCOMING"}</small></div>
    </article>`).join("");
}

function renderStandings(type="drivers"){
  activeStandings=type;
  const container=$("#standingsBody");
  if(type==="drivers"){
    container.innerHTML=appData.drivers.slice(0,10).map(d=>`
      <div class="standing-row">
        <div class="position">${String(d.position).padStart(2,"0")}</div>
        <div class="competitor">
          <span class="team-color" style="--team-color:#${d.teamColor}"></span>
          <div class="competitor-name"><strong>${d.name}</strong><small>${d.team}</small></div>
        </div>
        <div class="points">${d.points}<small>PTS</small></div>
      </div>`).join("");
  } else {
    container.innerHTML=appData.teams.map(t=>`
      <div class="standing-row">
        <div class="position">${String(t.position).padStart(2,"0")}</div>
        <div class="competitor">
          <span class="team-color" style="--team-color:#${t.teamColor}"></span>
          <div class="competitor-name"><strong>${t.team}</strong><small>Constructor</small></div>
        </div>
        <div class="points">${t.points}<small>PTS</small></div>
      </div>`).join("");
  }
}

function renderLatest(){
  const r=appData.latestRace;
  safeText("#latestRaceDate",fmtDate(r.date));
  safeText("#latestRaceName",r.name);
  $("#podium").innerHTML=r.results.slice(0,3).map(x=>`
    <div class="podium-row">
      <div class="podium-position">P${x.position}</div>
      <div class="podium-driver"><strong>${x.name}</strong><small>${x.team}</small></div>
      <div class="podium-number">#${x.driverNumber}</div>
    </div>`).join("");
}

async function loadHistory(){
  const all = window.APEX_HISTORY || [];
  const now=new Date();
  const key=`${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  window.historyStories=all.filter(x=>x.date===key);
  if(!window.historyStories.length) window.historyStories=[{
    year:"ARCHIVE",
    category:"HISTORY",
    title:"Archive expansion in progress",
    description:"This date is ready for additional curated Formula racing history."
  }];
  window.historyIndex=0;
  renderHistory();
}
function renderHistory(){
  const now=new Date(), s=window.historyStories[window.historyIndex];
  safeText("#historyDay",String(now.getDate()).padStart(2,"0"));
  safeText("#historyMonth",now.toLocaleString(undefined,{month:"short"}).toUpperCase());
  safeText("#historyYear",s.year); safeText("#historyCategory",s.category); safeText("#historyTitle",s.title); safeText("#historyDescription",s.description);
  safeText("#historyIndex",`${String(window.historyIndex+1).padStart(2,"0")} / ${String(window.historyStories.length).padStart(2,"0")}`);
}
function setup(){
  $$(".segment").forEach(b=>b.addEventListener("click",()=>{
    $$(".segment").forEach(x=>{x.classList.remove("active");x.setAttribute("aria-selected","false")});
    b.classList.add("active"); b.setAttribute("aria-selected","true"); renderStandings(b.dataset.tab);
  }));
  $("#prevHistory")?.addEventListener("click",()=>{window.historyIndex=(window.historyIndex-1+window.historyStories.length)%window.historyStories.length;renderHistory()});
  $("#nextHistory")?.addEventListener("click",()=>{window.historyIndex=(window.historyIndex+1)%window.historyStories.length;renderHistory()});
  const btn=$("#menuButton"),nav=$("#mobileNav");
  btn?.addEventListener("click",()=>{const o=nav.classList.toggle("open");btn.setAttribute("aria-expanded",o)});
}
async function init(){
  startClock(); setup(); loadHistory();
  try{
    appData=await APEX_CURRENT.load();
    renderHero(); renderWeekend(); renderStandings(); renderLatest();
  }catch(e){
    console.error(e);
    safeText("#nextRaceName","2026 season snapshot");
  }
}
init();
