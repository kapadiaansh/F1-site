const driverNumber=Number(getParam("number"));
async function loadDriverProfile(){
  try{
    const data=await APEX_CURRENT.load();
    const d=APEX_CURRENT.driverByNumber(data,driverNumber);
    if(!d) throw new Error("Driver not found");
    const latest=APEX_CURRENT.latestFinish(data,driverNumber);
    const wins=APEX_CURRENT.wins(data,d.name);
    document.title=`${d.name} // APEX`;
    qs("#driverProfile").innerHTML=`
      <div class="profile-accent" style="--driver-color:#${d.teamColor}"></div>
      <div class="profile-copy">
        <a class="back-link" href="drivers.html">← All drivers</a>
        <p class="kicker">${d.team}</p>
        <h1>${d.firstName}<br><strong>${d.lastName}</strong></h1>
        <div class="profile-number">#${d.driverNumber}</div>
        <div class="profile-stat-row">
          <div><small>CHAMPIONSHIP</small><strong>P${d.position}</strong></div>
          <div><small>POINTS</small><strong>${d.points}</strong></div>
          <div><small>WINS IN 2026</small><strong>${wins}</strong></div>
          <div><small>TEAM</small><strong>${d.team}</strong></div>
        </div>
      </div>
      <div class="profile-photo" style="--driver-color:#${d.teamColor}"><span>${d.code}</span></div>`;
    qs("#recentResults").innerHTML=`
      <a class="recent-result-row" href="race.html?round=15">
        <span>SEP 26</span><strong>Azerbaijan Grand Prix</strong><b>${latest ? (latest.time==="DNF"?"DNF":"P"+latest.position) : "—"}</b><i>↗</i>
      </a>
      <div class="recent-result-row"><span>SEASON</span><strong>Current championship standing</strong><b>P${d.position}</b><i>${d.points} pts</i></div>
      <div class="recent-result-row"><span>2026</span><strong>Grand Prix victories</strong><b>${wins}</b><i>wins</i></div>`;
  }catch(e){
    qs("#driverProfile").innerHTML='<div class="error-message">Driver profile is being prepared.</div>';
    qs("#recentResults").innerHTML="";
  }
}
loadDriverProfile();