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
document.querySelectorAll(".weaponType").forEach((e,i)=>{e.value=rows[i].weapon;e.onchange=()=>{rows[i].weapon=e.value;flashInstall();calculate()}});
document.querySelectorAll(".weaponMount").forEach((e,i)=>{e.value=rows[i].mount;e.onchange=()=>{rows[i].mount=e.value;flashInstall();calculate()}});
document.querySelectorAll(".removeWeapon").forEach(e=>e.onclick=()=>{rows.splice(+e.dataset.i,1);renderWeapons();calculate()});}
function flashInstall(){const a=$("vehicleArt");a.classList.remove("installPulse");void a.offsetWidth;a.classList.add("installPulse")}
function armor(){const a={};document.querySelectorAll(".armorInput").forEach(e=>a[e.dataset.side]=Math.max(0,+e.value||0));return a}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function shade(hex,amt){let n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,(n>>16)+amt)),g=Math.max(0,Math.min(255,((n>>8)&255)+amt)),b=Math.max(0,Math.min(255,(n&255)+amt));return `#${(b|g<<8|r<<16).toString(16).padStart(6,"0")}`}
function bodyGeometry(key){
 const map={
  subcompact:{x:128,y:91,w:250,h:122,cabinX:191,cabinW:115,nose:28,roof:58}, compact:{x:110,y:82,w:290,h:140,cabinX:180,cabinW:145,nose:34,roof:65},
  midsize:{x:92,y:77,w:326,h:148,cabinX:171,cabinW:166,nose:38,roof:68}, sedan:{x:78,y:74,w:350,h:152,cabinX:167,cabinW:178,nose:43,roof:70},
  luxury:{x:58,y:72,w:390,h:156,cabinX:166,cabinW:195,nose:52,roof:72}, wagon:{x:67,y:70,w:380,h:160,cabinX:145,cabinW:245,nose:44,roof:76},
  pickup:{x:68,y:76,w:380,h:150,cabinX:258,cabinW:116,nose:38,roof:68,pickup:true}, camper:{x:64,y:55,w:390,h:180,cabinX:127,cabinW:270,nose:45,roof:100,camper:true},
  van:{x:72,y:56,w:374,h:180,cabinX:126,cabinW:278,nose:38,roof:104,van:true}}
 return map[key]||map.compact;
}
function weaponSymbol(key,x,y,angle=0,scale=1){
 const laser=["ll","ml","laser","hl"].includes(key),rocket=["hr","mr","ltr","rl"].includes(key),heavy=["ac","atg","rr","vmg"].includes(key);
 let art="";
 if(rocket) art=`<g class="weapon rocket"><rect x="-20" y="-10" width="42" height="20" rx="5"/><circle cx="-9" cy="0" r="5"/><path d="M22 -8 L38 0 L22 8Z"/><path class="weaponMark" d="M-1 -7V7M8-7V7"/></g>`;
 else if(laser) art=`<g class="weapon laser"><rect x="-22" y="-7" width="45" height="14" rx="7"/><path d="M23 -5 L41 0 L23 5Z"/><circle class="weaponGlow" cx="40" cy="0" r="5"/></g>`;
 else if(key==="ft") art=`<g class="weapon flame"><rect x="-19" y="-9" width="38" height="18" rx="5"/><path d="M19 -6L38 -3V3L19 6Z"/><path class="weaponMark" d="M-8-9V9M4-9V9"/></g>`;
 else if(["md","oj","ss"].includes(key)) art=`<g class="weapon dropper"><rect x="-19" y="-11" width="38" height="22" rx="5"/><circle cx="-8" cy="0" r="4"/><circle cx="8" cy="0" r="4"/></g>`;
 else art=`<g class="weapon gun ${heavy?'heavy':''}"><rect x="-18" y="-8" width="34" height="16" rx="5"/><rect x="12" y="-4" width="34" height="8" rx="3"/><circle cx="-8" cy="0" r="5"/><path class="weaponMark" d="M18-4V4M25-4V4"/></g>`;
 return `<g class="mountedWeapon" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${art}</g>`;
}
function mountPosition(m,g,i,total){
 const spread=(i-(total-1)/2)*26;
 if(m==="front")return [g.x+g.w-5,g.y+g.h*.5+spread,0];
 if(m==="back")return [g.x+5,g.y+g.h*.5+spread,180];
 if(m==="left")return [g.x+g.w*.55+spread,g.y-3,-90];
 if(m==="right")return [g.x+g.w*.55+spread,g.y+g.h+3,90];
 if(m==="top")return [g.x+g.w*.56+spread,g.y+g.h*.5,0];
 return [g.x+g.w*.37+spread,g.y+g.h*.72,180];
}
function tireProfile(key){return {
 standard:{key:"standard",w:27,h:36},heavy:{key:"heavy",w:32,h:40},puncture:{key:"puncture",w:35,h:44},solid:{key:"solid",w:31,h:38}
 }[key]||{key:"standard",w:27,h:36}}
function renderVehicle(d){
 const color=d.paintColor||"#d94b43",dark=shade(color,-52),light=shade(color,45),g=bodyGeometry(d.bodyKey),finish=d.paintFinish||"gloss";
 const frontTire=tireProfile(d.frontTireKey),rearTire=tireProfile(d.rearTireKey),armorPts=Object.values(d.armor).reduce((a,b)=>a+b,0);
 const armorColor={plastic:"#b9c5d2",fireproof:"#ef8a54",reflective:"#72dff6",lrfp:"#d19cf4",metal:"#e4e8ed"}[d.armorTypeKey]||"#b9c5d2";
 const byMount={};d.weapons.forEach(w=>(byMount[w.mount]??=[]).push(w));let weapons="";
 Object.entries(byMount).forEach(([m,arr])=>arr.forEach((w,i)=>{const [x,y,a]=mountPosition(m,g,i,arr.length);weapons+=weaponSymbol(w.weapon,x,y,a,m==="top"?1.08:.9)}));
 const wheel=(x,y,tire,axle)=>`<g class="wheel ${tire.key} axle-${axle}" transform="translate(${x} ${y})"><rect x="-${tire.w/2}" y="-${tire.h/2}" width="${tire.w}" height="${tire.h}" rx="${tire.key==="solid"?8:10}"/><path class="tread" d="M-${tire.w/2+2} -11H${tire.w/2+2}M-${tire.w/2+2} 0H${tire.w/2+2}M-${tire.w/2+2} 11H${tire.w/2+2}"/><circle class="hubCap" r="5"/><title>${axle==="front"?"Front":"Rear"} ${D.tires[axle==="front"?d.frontTireKey:d.rearTireKey].name} tire</title></g>`;
 let bodyPath=`M${g.x+g.nose} ${g.y} Q${g.x+6} ${g.y+8} ${g.x} ${g.y+g.h*.36}V${g.y+g.h*.68}Q${g.x+8} ${g.y+g.h-5} ${g.x+g.nose} ${g.y+g.h}H${g.x+g.w-30}Q${g.x+g.w} ${g.y+g.h-12} ${g.x+g.w} ${g.y+g.h*.5}Q${g.x+g.w} ${g.y+12} ${g.x+g.w-30} ${g.y}Z`;
 let cabin= g.pickup?`<rect class="truckBed" x="${g.x+23}" y="${g.y+18}" width="${g.cabinX-g.x-43}" height="${g.h-36}" rx="9"/><path class="bedRails" d="M${g.x+38} ${g.y+29}H${g.cabinX-31}V${g.y+g.h-29}H${g.x+38}Z"/><path class="cabin" d="M${g.cabinX} ${g.y+18}H${g.cabinX+g.cabinW}Q${g.cabinX+g.cabinW+18} ${g.y+g.h/2} ${g.cabinX+g.cabinW} ${g.y+g.h-18}H${g.cabinX}Q${g.cabinX-17} ${g.y+g.h/2} ${g.cabinX} ${g.y+18}Z"/><path class="hoodVent" d="M${g.cabinX+g.cabinW+31} ${g.y+45}H${g.x+g.w-28}M${g.cabinX+g.cabinW+31} ${g.y+g.h-45}H${g.x+g.w-28}"/>`:
 `<path class="cabin" d="M${g.cabinX} ${g.y+16}H${g.cabinX+g.cabinW}Q${g.cabinX+g.cabinW+20} ${g.y+g.h/2} ${g.cabinX+g.cabinW} ${g.y+g.h-16}H${g.cabinX}Q${g.cabinX-18} ${g.y+g.h/2} ${g.cabinX} ${g.y+16}Z"/>`;
 if(g.van||g.camper) cabin=`<path class="cabin vanCabin" d="M${g.cabinX} ${g.y+10}H${g.cabinX+g.cabinW-8}Q${g.cabinX+g.cabinW+10} ${g.y+g.h/2} ${g.cabinX+g.cabinW-8} ${g.y+g.h-10}H${g.cabinX}Q${g.cabinX-16} ${g.y+g.h/2} ${g.cabinX} ${g.y+10}Z"/><path class="panelLine" d="M${g.cabinX+95} ${g.y+13}V${g.y+g.h-13}"/>`;
 const stroke=v=>Math.min(16,3+Math.sqrt(Math.max(0,v))*1.8),opacity=v=>v?Math.min(.95,.48+v/90):0;
 const plate=(side,path)=>`<path class="armorPlate armor-${side}" d="${path}" style="--plate-width:${stroke(d.armor[side])};opacity:${opacity(d.armor[side])}"><title>${side} armor: ${d.armor[side]} points</title></path>`;
 const armor=`<g class="armorZones" style="--armor-color:${armorColor}">${plate("front",`M${g.x+g.w-5} ${g.y+28}V${g.y+g.h-28}`)}${plate("back",`M${g.x+5} ${g.y+31}V${g.y+g.h-31}`)}${plate("left",`M${g.x+g.nose+8} ${g.y+4}Q${g.x+g.w*.55} ${g.y-4} ${g.x+g.w-37} ${g.y+6}`)}${plate("right",`M${g.x+g.nose+8} ${g.y+g.h-4}Q${g.x+g.w*.55} ${g.y+g.h+4} ${g.x+g.w-37} ${g.y+g.h-6}`)}</g>`;
 const topArmor=d.armor.top?`<path class="topArmor" style="--armor-color:${armorColor};opacity:${opacity(d.armor.top)}" d="M${g.cabinX+32} ${g.y+35}H${g.cabinX+Math.max(48,g.cabinW-38)}Q${g.cabinX+Math.max(62,g.cabinW-20)} ${g.y+g.h/2} ${g.cabinX+Math.max(48,g.cabinW-38)} ${g.y+g.h-35}H${g.cabinX+32}Q${g.cabinX+18} ${g.y+g.h/2} ${g.cabinX+32} ${g.y+35}Z"><title>Top armor: ${d.armor.top} points</title></path>`:"";
 const underArmor=d.armor.under?`<path class="underArmor" style="--armor-color:${armorColor};opacity:${opacity(d.armor.under)}" d="M${g.x+76} ${g.y+g.h/2}H${g.x+g.w-70}"><title>Underbody armor: ${d.armor.under} points</title></path>`:"";
 const svg=`<svg viewBox="0 0 400 500" role="img" aria-label="Top-down ${esc(d.bodyName)}, front facing up, with ${d.weapons.length} mounted weapons and ${armorPts} armor points"><defs><linearGradient id="paint" x1="0" x2="1"><stop stop-color="${light}"/><stop offset=".46" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></linearGradient><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bde9ff" stop-opacity=".82"/><stop offset=".45" stop-color="#263c50"/><stop offset="1" stop-color="#0b121a"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3"/></filter></defs>
 <g class="carStage" transform="translate(25 510) rotate(-90) scale(1.05 1.15)"><g class="carModel finish-${finish}">
 ${wheel(g.x+72,g.y-4,rearTire,"rear")}${wheel(g.x+72,g.y+g.h+4,rearTire,"rear")}${wheel(g.x+g.w-75,g.y-4,frontTire,"front")}${wheel(g.x+g.w-75,g.y+g.h+4,frontTire,"front")}
 ${underArmor}<path class="bodyShell" d="${bodyPath}"/>${armor}${cabin}
 <path class="windshield" d="M${g.cabinX+g.cabinW-12} ${g.y+21}Q${g.cabinX+g.cabinW+6} ${g.y+g.h/2} ${g.cabinX+g.cabinW-12} ${g.y+g.h-21}L${g.cabinX+g.cabinW-47} ${g.y+g.h-28}Q${g.cabinX+g.cabinW-35} ${g.y+g.h/2} ${g.cabinX+g.cabinW-47} ${g.y+28}Z"/>
 <path class="rearGlass" d="M${g.cabinX+12} ${g.y+25}Q${g.cabinX-3} ${g.y+g.h/2} ${g.cabinX+12} ${g.y+g.h-25}L${g.cabinX+42} ${g.y+g.h-30}Q${g.cabinX+31} ${g.y+g.h/2} ${g.cabinX+42} ${g.y+30}Z"/>
 ${topArmor}
 <path class="highlight" d="M${g.x+36} ${g.y+15}Q${g.x+g.w*.55} ${g.y-2} ${g.x+g.w-38} ${g.y+17}"/>
 <g class="bumper"><path d="M${g.x+g.w-3} ${g.y+25}V${g.y+g.h-25}"/><path d="M${g.x+3} ${g.y+30}V${g.y+g.h-30}"/></g>
 ${weapons}<g class="details"><circle cx="${g.x+g.w-8}" cy="${g.y+34}" r="7"/><circle cx="${g.x+g.w-8}" cy="${g.y+g.h-34}" r="7"/><path d="M${g.x+g.w-20} ${g.y+g.h/2-18}V${g.y+g.h/2+18}"/></g>
 </g></g></svg>`;
 $("vehicleArt").innerHTML=svg;$("showcaseName").textContent=d.name;$("visualBodyLabel").textContent=d.bodyName.toUpperCase();$("visualArmorTotal").textContent=`${armorPts} pts`;$("visualArmorType").textContent=D.armorTypes[d.armorTypeKey].name;$("visualLoadout").textContent=d.weapons.length;$("frontTireVisual").textContent=D.tires[d.frontTireKey].name;$("rearTireVisual").textContent=D.tires[d.rearTireKey].name;Object.entries({front:"armorFrontValue",back:"armorRearValue",left:"armorLeftValue",right:"armorRightValue",top:"armorTopValue",under:"armorUnderValue"}).forEach(([side,id])=>$(id).textContent=d.armor[side]);$("paintHex").textContent=color.toUpperCase();document.documentElement.style.setProperty("--carPaint",color);document.documentElement.style.setProperty("--armorColor",armorColor);
}
function calculate(){
const body=D.bodies[$("bodyType").value],ch=D.chassis[$("chassisType").value],su=D.suspensions[$("suspensionType").value],p=D.plants[$("plantType").value],ft=D.tires[$("frontTires").value],rt=D.tires[$("rearTires").value],at=D.armorTypes[$("armorType").value],a=armor();
const crew={drivers:1,gunners:+$("gunners").value||0,passengers:+$("passengers").value||0},crewW=(1+crew.gunners+crew.passengers)*150,crewS=(1+crew.gunners)*2+crew.passengers;
const ws=rows.map(r=>({...r,...D.weapons[r.weapon]})),weaponW=ws.reduce((s,w)=>s+w.weight,0),weaponC=ws.reduce((s,w)=>s+w.cost,0),weaponS=ws.reduce((s,w)=>s+w.spaces,0);
const pts=Object.values(a).reduce((s,n)=>s+n,0),armorW=pts*body.armorWeight*at.weightMod,armorC=pts*body.armorCost*at.costMod,tireW=2*ft.weight+2*rt.weight,tireC=2*ft.cost+2*rt.cost;
const maxLoad=Math.round(body.maxLoad*(1+ch.loadMod)),weight=Math.round(body.weight+p.weight+tireW+crewW+weaponW+armorW),spaces=p.spaces+crewS+weaponS,cost=Math.round(body.cost+body.cost*ch.costMod+body.cost*su.costMod+p.cost+tireC+weaponC+armorC),budget=+$("budget").value||0;
let acceleration=0;if(p.power>=weight)acceleration=15;else if(p.power>=weight/2)acceleration=10;else if(p.power>=weight/3)acceleration=5;
const topSpeed=Math.floor((360*p.power/(p.power+weight))/2.5)*2.5;let hc=su.hc;if(body.kind==="van"||(body.kind==="pickup"&&weight>5500))hc=su.vanHC;if(body.kind==="sub")hc=su.subHC;
const dirs={};ws.forEach(w=>dirs[w.mount]=(dirs[w.mount]||0)+w.spaces);const limit=Math.floor(body.spaces/3),errors=[];
if(weight>maxLoad)errors.push(`Over maximum load by ${weight-maxLoad} lb.`);if(spaces>body.spaces)errors.push(`Uses ${(spaces-body.spaces).toFixed(1)} too many component spaces.`);if(!acceleration)errors.push("Underpowered: power factors are below one-third of vehicle weight.");Object.entries(dirs).forEach(([m,s])=>{if(s>limit)errors.push(`${m} weapons use ${s} spaces; maximum is ${limit}.`)});if(cost>budget)errors.push(`Over budget by ${money(cost-budget)}.`);if($("chassisType").value==="extraHeavy"&&(body.kind==="pickup"||body.kind==="van"))errors.push("Extra-Heavy pickups and vans require six wheels, planned for a later builder update.");
const d={id:currentId||("v-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)),name:$("vehicleName").value.trim()||"Unnamed Vehicle",budget,bodyKey:$("bodyType").value,bodyName:body.name,chassisKey:$("chassisType").value,suspensionKey:$("suspensionType").value,plantKey:$("plantType").value,plantName:p.name,frontTireKey:$("frontTires").value,rearTireKey:$("rearTires").value,armorTypeKey:$("armorType").value,paintColor:$("paintColor").value,paintFinish:$("paintFinish").value,armor:a,crew,weapons:rows.map(x=>({...x})),weight,maxLoad,spaces,maxSpaces:body.spaces,cost,acceleration,topSpeed,hc,power:p.power,valid:!errors.length};
showSummary(d,errors);renderVehicle(d);window.RDA_CURRENT_DESIGN=d;return d;}
function meter(id,r){const e=$(id);e.style.width=Math.min(100,r*100)+"%";e.classList.toggle("over",r>1)}
function showSummary(d,errors){$("weightText").textContent=`${d.weight.toLocaleString()} / ${d.maxLoad.toLocaleString()} lb`;$("spaceText").textContent=`${d.spaces.toFixed(1)} / ${d.maxSpaces}`;$("costText").textContent=`${money(d.cost)} / ${money(d.budget)}`;meter("weightMeter",d.weight/d.maxLoad);meter("spaceMeter",d.spaces/d.maxSpaces);meter("costMeter",d.cost/Math.max(1,d.budget));$("acceleration").textContent=d.acceleration?d.acceleration+" mph":"None";$("topSpeed").textContent=d.topSpeed+" mph";$("handlingClass").textContent=d.hc;$("powerFactors").textContent=d.power.toLocaleString();$("validBadge").textContent=d.valid?"VALID DESIGN":"DESIGN NEEDS WORK";$("validBadge").className="badge "+(d.valid?"valid":"invalid");$("validation").innerHTML=d.valid?'<li class="ok">All current construction checks pass.</li>':errors.map(x=>`<li class="error">${x}</li>`).join("")}
function getSaved(){return JSON.parse(localStorage.getItem("rdaVehicles")||"[]")}function write(a){localStorage.setItem("rdaVehicles",JSON.stringify(a))}
function save(){const d=calculate();if(!d.valid&&!confirm("This design has errors. Save it anyway?"))return;const a=getSaved(),i=a.findIndex(x=>x.id===d.id);if(i>=0)a[i]=d;else a.push(d);write(a);currentId=d.id;refreshSaved();RDA_APP.refreshArenaLists();alert(d.name+" saved.")}
function refreshSaved(){const a=getSaved();$("savedVehicles").innerHTML=a.length?a.map(v=>`<div class="savedItem"><div><b>${v.name}</b><small>${v.bodyName} · ${v.weight} lb · ${money(v.cost)}</small></div><button data-load="${v.id}">Load</button><button class="danger" data-delete="${v.id}">×</button></div>`).join(""):'<p class="hint">No saved vehicles yet.</p>';document.querySelectorAll("[data-load]").forEach(e=>e.onclick=()=>load(e.dataset.load));document.querySelectorAll("[data-delete]").forEach(e=>e.onclick=()=>{write(getSaved().filter(v=>v.id!==e.dataset.delete));refreshSaved();RDA_APP.refreshArenaLists()})}
function load(id){const d=getSaved().find(x=>x.id===id);if(!d)return;currentId=d.id;$("vehicleName").value=d.name;$("budget").value=d.budget;$("bodyType").value=d.bodyKey;$("chassisType").value=d.chassisKey;$("suspensionType").value=d.suspensionKey;$("plantType").value=d.plantKey;$("frontTires").value=d.frontTireKey;$("rearTires").value=d.rearTireKey;$("armorType").value=d.armorTypeKey;$("paintColor").value=d.paintColor||"#d94b43";$("paintFinish").value=d.paintFinish||"gloss";$("gunners").value=d.crew.gunners;$("passengers").value=d.crew.passengers;document.querySelectorAll(".armorInput").forEach(e=>e.value=d.armor[e.dataset.side]||0);rows=d.weapons.map(x=>({...x}));renderWeapons();calculate()}
function newVehicle(){currentId=null;rows=[{weapon:"mg",mount:"front"}];$("vehicleName").value="New Duelist";$("paintColor").value="#d94b43";renderWeapons();calculate()}
return{init,calculate,getSaved,load};})();
