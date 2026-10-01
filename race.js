const round=Number(getParam("round") || getParam("meeting"));
async function loadRace(){
  try{
    const data=await APEX_CURRENT.load();
    const r=data.races.find(x=>x.round===round);
    if(!r) throw new Error("Round not found");
    document.title=`${r.name} // APEX`;
    qs("#raceHero").innerHTML=`
      <a class="back-link" href="calendar.html">← Full calendar</a>
      <div class="race-hero-grid"><div><p class="kicker">${r.status.toUpperCase()}</p><h1>${r.name}</h1><p class="page-lead">${r.circuit} · ${r.location}, ${r.country}</p></div>
      <div class="race-date-block"><span>${new Date(r.raceDate+"T12:00:00").toLocaleString(undefined,{month:"short"}).toUpperCase()}</span><strong>${new Date(r.raceDate+"T12:00:00").getDate()}</strong></div></div>`;
    if(r.round===16){
      qs("#raceSessions").innerHTML=data.nextRace.sessions.map(s=>`<div class="race-session-item"><div><small>${s.date}</small><strong>${s.name}</strong></div><span>Time TBC</span><b>UPCOMING</b></div>`).join("");
    } else {
      qs("#raceSessions").innerHTML=`<div class="race-session-item"><div><small>${r.raceDate}</small><strong>Grand Prix</strong></div><span>${r.status==="complete"?"Completed":"Schedule TBC"}</span><b>${r.status.toUpperCase()}</b></div>`;
    }
    if(r.round===15){
      qs("#raceResult").innerHTML=data.latestRace.results.slice(0,10).map(x=>{
        const d=APEX_CURRENT.driverByNumber(data,x.driverNumber);
        return `<a class="race-finisher" href="driver.html?number=${x.driverNumber}"><span>P${x.position}</span><i style="--driver-color:#${d?.teamColor||"ff3b30"}"></i><div><strong>${x.name}</strong><small>${x.team}</small></div><b>${x.time}</b></a>`;
      }).join("");
    } else if(r.winner){
      qs("#raceResult").innerHTML=`<div class="future-result"><span>RACE WINNER</span><h3 style="font-family:var(--display);font-size:30px;margin:10px 0">${r.winner}</h3><p>${r.winnerTeam} · ${r.name}</p></div>`;
    } else {
      qs("#raceResult").innerHTML='<div class="future-result"><span>RESULT PENDING</span><p>The finishing order will appear after the event.</p></div>';
    }
  }catch(e){qs("#raceHero").innerHTML='<div class="error-message">Race data is being prepared.</div>'}
}
loadRace();