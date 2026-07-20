
window.RDA_GARAGE=(()=>{
const D=RDA_DATA,$=id=>document.getElementById(id);let rows=[{weapon:"mg",mount:"front"}],currentId=null;
const options=m=>Object.entries(m).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join("");
const money=n=>"$"+Math.round(n).toLocaleString();
function init(){
$("bodyType").innerHTML=options(D.bodies);$("bodyType").value="compact";
$("chassisType").innerHTML=options(D.chassis);$("chassisType").value="heavy";
$("suspensionType").innerHTML=options(D.suspensions);$("suspensionType").value="improved";
$("plantType").innerHTML=options(D.plants);$("plantType").value="large";
$("frontTires").innerHTML=options(D.tires);$("frontTires").value="puncture";
$("rearTires").innerHTML=options(D.tires);$("rearTires").value="puncture";
$("armorType").innerHTML=options(D.armorTypes);
document.querySelectorAll("#garage input,#garage select").forEach(e=>e.addEventListener("input",calculate));
$("addWeapon").onclick=()=>{rows.push({weapon:"mg",mount:"front"});renderWeapons();calculate()};
$("saveVehicle").onclick=save;$("newVehicle").onclick=newVehicle;renderWeapons();calculate();refreshSaved();}
function renderWeapons(){
$("weaponRows").innerHTML=rows.map((r,i)=>`<div class="weaponRow"><select class="weaponType" data-i="${i}">${options(D.weapons)}</select><select class="weaponMount" data-i="${i}">${D.mounts.map(m=>`<option>${m}</option>`).join("")}</select><button class="danger removeWeapon" data-i="${i}">Remove</button></div>`).join("");
document.querySelectorAll(".weaponType").forEach((e,i)=>{e.value=rows[i].weapon;e.onchange=()=>{rows[i].weapon=e.value;calculate()}});
document.querySelectorAll(".weaponMount").forEach((e,i)=>{e.value=rows[i].mount;e.onchange=()=>{rows[i].mount=e.value;calculate()}});
document.querySelectorAll(".removeWeapon").forEach(e=>e.onclick=()=>{rows.splice(+e.dataset.i,1);renderWeapons();calculate()});}
function armor(){const a={};document.querySelectorAll(".armorInput").forEach(e=>a[e.dataset.side]=Math.max(0,+e.value||0));return a}
function calculate(){
const body=D.bodies[$("bodyType").value],ch=D.chassis[$("chassisType").value],su=D.suspensions[$("suspensionType").value],p=D.plants[$("plantType").value],ft=D.tires[$("frontTires").value],rt=D.tires[$("rearTires").value],at=D.armorTypes[$("armorType").value],a=armor();
const crew={drivers:1,gunners:+$("gunners").value||0,passengers:+$("passengers").value||0},crewW=(1+crew.gunners+crew.passengers)*150,crewS=(1+crew.gunners)*2+crew.passengers;
const ws=rows.map(r=>({...r,...D.weapons[r.weapon]})),weaponW=ws.reduce((s,w)=>s+w.weight,0),weaponC=ws.reduce((s,w)=>s+w.cost,0),weaponS=ws.reduce((s,w)=>s+w.spaces,0);
const pts=Object.values(a).reduce((s,n)=>s+n,0),armorW=pts*body.armorWeight*at.weightMod,armorC=pts*body.armorCost*at.costMod,tireW=2*ft.weight+2*rt.weight,tireC=2*ft.cost+2*rt.cost;
const maxLoad=Math.round(body.maxLoad*(1+ch.loadMod)),weight=Math.round(body.weight+p.weight+tireW+crewW+weaponW+armorW),spaces=p.spaces+crewS+weaponS,cost=Math.round(body.cost+body.cost*ch.costMod+body.cost*su.costMod+p.cost+tireC+weaponC+armorC),budget=+$("budget").value||0;
let acceleration=0;if(p.power>=weight)acceleration=15;else if(p.power>=weight/2)acceleration=10;else if(p.power>=weight/3)acceleration=5;
const topSpeed=Math.floor((360*p.power/(p.power+weight))/2.5)*2.5;let hc=su.hc;if(body.kind==="van"||(body.kind==="pickup"&&weight>5500))hc=su.vanHC;if(body.kind==="sub")hc=su.subHC;
const dirs={};ws.forEach(w=>dirs[w.mount]=(dirs[w.mount]||0)+w.spaces);const limit=Math.floor(body.spaces/3),errors=[];
if(weight>maxLoad)errors.push(`Over maximum load by ${weight-maxLoad} lb.`);
if(spaces>body.spaces)errors.push(`Uses ${(spaces-body.spaces).toFixed(1)} too many component spaces.`);
if(!acceleration)errors.push("Underpowered: power factors are below one-third of vehicle weight.");
Object.entries(dirs).forEach(([m,s])=>{if(s>limit)errors.push(`${m} weapons use ${s} spaces; maximum is ${limit}.`)});
if(cost>budget)errors.push(`Over budget by ${money(cost-budget)}.`);
if($("chassisType").value==="extraHeavy"&&(body.kind==="pickup"||body.kind==="van"))errors.push("Extra-Heavy pickups and vans require six wheels, planned for a later builder update.");
const d={id:currentId||("v-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)),name:$("vehicleName").value.trim()||"Unnamed Vehicle",budget,bodyKey:$("bodyType").value,bodyName:body.name,chassisKey:$("chassisType").value,suspensionKey:$("suspensionType").value,plantKey:$("plantType").value,plantName:p.name,frontTireKey:$("frontTires").value,rearTireKey:$("rearTires").value,armorTypeKey:$("armorType").value,armor:a,crew,weapons:rows.map(x=>({...x})),weight,maxLoad,spaces,maxSpaces:body.spaces,cost,acceleration,topSpeed,hc,power:p.power,valid:!errors.length};
showSummary(d,errors);window.RDA_CURRENT_DESIGN=d;return d;}
function meter(id,r){const e=$(id);e.style.width=Math.min(100,r*100)+"%";e.classList.toggle("over",r>1)}
function showSummary(d,errors){
$("weightText").textContent=`${d.weight.toLocaleString()} / ${d.maxLoad.toLocaleString()} lb`;$("spaceText").textContent=`${d.spaces.toFixed(1)} / ${d.maxSpaces}`;$("costText").textContent=`${money(d.cost)} / ${money(d.budget)}`;
meter("weightMeter",d.weight/d.maxLoad);meter("spaceMeter",d.spaces/d.maxSpaces);meter("costMeter",d.cost/Math.max(1,d.budget));
$("acceleration").textContent=d.acceleration?d.acceleration+" mph":"None";$("topSpeed").textContent=d.topSpeed+" mph";$("handlingClass").textContent=d.hc;$("powerFactors").textContent=d.power.toLocaleString();
$("validBadge").textContent=d.valid?"VALID DESIGN":"DESIGN NEEDS WORK";$("validBadge").className="badge "+(d.valid?"valid":"invalid");
$("validation").innerHTML=d.valid?'<li class="ok">All current construction checks pass.</li>':errors.map(x=>`<li class="error">${x}</li>`).join("");}
function getSaved(){return JSON.parse(localStorage.getItem("rdaVehicles")||"[]")}
function write(a){localStorage.setItem("rdaVehicles",JSON.stringify(a))}
function save(){const d=calculate();if(!d.valid&&!confirm("This design has errors. Save it anyway?"))return;const a=getSaved(),i=a.findIndex(x=>x.id===d.id);if(i>=0)a[i]=d;else a.push(d);write(a);currentId=d.id;refreshSaved();RDA_APP.refreshArenaLists();alert(d.name+" saved.");}
function refreshSaved(){const a=getSaved();$("savedVehicles").innerHTML=a.length?a.map(v=>`<div class="savedItem"><div><b>${v.name}</b><small>${v.bodyName} · ${v.weight} lb · ${money(v.cost)}</small></div><button data-load="${v.id}">Load</button><button class="danger" data-delete="${v.id}">×</button></div>`).join(""):'<p class="hint">No saved vehicles yet.</p>';document.querySelectorAll("[data-load]").forEach(e=>e.onclick=()=>load(e.dataset.load));document.querySelectorAll("[data-delete]").forEach(e=>e.onclick=()=>{write(getSaved().filter(v=>v.id!==e.dataset.delete));refreshSaved();RDA_APP.refreshArenaLists()});}
function load(id){const d=getSaved().find(x=>x.id===id);if(!d)return;currentId=d.id;$("vehicleName").value=d.name;$("budget").value=d.budget;$("bodyType").value=d.bodyKey;$("chassisType").value=d.chassisKey;$("suspensionType").value=d.suspensionKey;$("plantType").value=d.plantKey;$("frontTires").value=d.frontTireKey;$("rearTires").value=d.rearTireKey;$("armorType").value=d.armorTypeKey;$("gunners").value=d.crew.gunners;$("passengers").value=d.crew.passengers;document.querySelectorAll(".armorInput").forEach(e=>e.value=d.armor[e.dataset.side]||0);rows=d.weapons.map(x=>({...x}));renderWeapons();calculate();}
function newVehicle(){currentId=null;rows=[{weapon:"mg",mount:"front"}];$("vehicleName").value="New Duelist";renderWeapons();calculate()}
return{init,calculate,getSaved,load};})();
