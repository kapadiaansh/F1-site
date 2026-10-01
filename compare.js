let compareData=null;
async function loadCompare(){
  compareData=await APEX_CURRENT.load();
  const options=compareData.drivers.map(d=>`<option value="${d.driverNumber}">${d.name} · ${d.team}</option>`).join("");
  qs("#driverA").innerHTML=options; qs("#driverB").innerHTML=options; qs("#driverB").selectedIndex=1;
  qs("#driverA").addEventListener("change",renderComparison); qs("#driverB").addEventListener("change",renderComparison);
  renderComparison();
}
function renderComparison(){
  const a=APEX_CURRENT.driverByNumber(compareData,Number(qs("#driverA").value));
  const b=APEX_CURRENT.driverByNumber(compareData,Number(qs("#driverB").value));
  const ar=APEX_CURRENT.latestFinish(compareData,a.driverNumber), br=APEX_CURRENT.latestFinish(compareData,b.driverNumber);
  const rows=[["Championship",`P${a.position}`,`P${b.position}`],["Points",a.points,b.points],["2026 wins",APEX_CURRENT.wins(compareData,a.name),APEX_CURRENT.wins(compareData,b.name)],["Latest finish",ar?(ar.time==="DNF"?"DNF":`P${ar.position}`):"—",br?(br.time==="DNF"?"DNF":`P${br.position}`):"—"],["Team",a.team,b.team]];
  qs("#comparison").innerHTML=`
    <div class="compare-driver left" style="--driver-color:#${a.teamColor}"><span>#${a.driverNumber}</span><div class="driver-placeholder">${a.code}</div><small>${a.team}</small><h2>${a.name}</h2></div>
    <div class="compare-metrics">${rows.map(r=>`<div class="compare-row"><strong>${r[1]}</strong><span>${r[0]}</span><strong>${r[2]}</strong></div>`).join("")}</div>
    <div class="compare-driver right" style="--driver-color:#${b.teamColor}"><span>#${b.driverNumber}</span><div class="driver-placeholder">${b.code}</div><small>${b.team}</small><h2>${b.name}</h2></div>`;
}
loadCompare();