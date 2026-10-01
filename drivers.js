let driverCards=[];
async function loadDrivers(){
  try{
    const data=await APEX_CURRENT.load();
    driverCards=data.drivers;
    renderDrivers(driverCards);
    qs("#driverCount").textContent=`${driverCards.length} drivers`;
    qs("#driverSearch").addEventListener("input",e=>{
      const q=e.target.value.toLowerCase();
      const f=driverCards.filter(d=>d.name.toLowerCase().includes(q)||d.team.toLowerCase().includes(q)||String(d.driverNumber).includes(q));
      renderDrivers(f); qs("#driverCount").textContent=`${f.length} drivers`;
    });
  }catch(e){qs("#driverGrid").innerHTML='<div class="error-message">Driver snapshot is being prepared.</div>'}
}
function renderDrivers(ds){
  qs("#driverGrid").innerHTML=ds.map(d=>`
    <a class="driver-card" href="driver.html?number=${d.driverNumber}" style="--driver-color:#${d.teamColor}">
      <div class="driver-card-head"><span class="driver-position">P${d.position}</span><span class="driver-number">#${d.driverNumber}</span></div>
      <div class="driver-photo-wrap"><div class="driver-placeholder">${d.code}</div></div>
      <div class="driver-card-copy"><small>${d.team}</small><h2>${d.name}</h2><div class="driver-card-stats"><span><b>${d.points}</b> PTS</span><span>${d.nationality}</span></div></div>
    </a>`).join("");
}
loadDrivers();