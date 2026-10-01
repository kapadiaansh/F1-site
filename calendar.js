async function loadCalendarPage(){
  try{
    const data=await APEX_CURRENT.load();
    qs("#calendarYear").textContent=data.season;
    const complete=data.races.filter(r=>r.status==="complete").length;
    qs("#seasonProgress").textContent=`${complete} / ${data.races.length} rounds complete`;
    qs("#calendarGrid").innerHTML=data.races.map(r=>{
      const status=r.status==="complete"?"COMPLETE":"UPCOMING";
      const d=new Date(r.raceDate+"T12:00:00");
      return `<a class="round-card ${r.status}" href="race.html?round=${r.round}">
        <div class="round-card-top"><span class="round-no">R${String(r.round).padStart(2,"0")}</span><span class="round-status">${status}</span></div>
        <div class="round-date"><strong>${d.getDate()}</strong><span>${d.toLocaleString(undefined,{month:"short"}).toUpperCase()}</span></div>
        <div class="round-copy"><small>${r.country}</small><h2>${r.name}</h2><p>${r.circuit} · ${r.location}</p></div>
        <div class="round-arrow">↗</div></a>`;
    }).join("");
  }catch(e){qs("#calendarGrid").innerHTML='<div class="error-message">Local calendar snapshot is being prepared.</div>'}
}
loadCalendarPage();