
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const SCALE = 18; // pixels per tabletop inch (visual approximation)
  const arena = {x:55,y:45,w:940,h:610};
  // Exact movement schedule from the classic Movement Chart for 0-100 mph.
  // Values are total inches moved in each of the five phases.
  // At odd speeds above 50 mph, the half-move is ADDITIONAL to the phase's
  // ordinary movement (for example, 55 mph uses 1.5 inches in Phase 2).
  const phaseMoves = {
    0:  [0,   0,   0,   0,   0],
    5:  [0,   0,   0,   0,   0.5],
    10: [0,   0,   1,   0,   0],
    15: [0,   0,   1,   0,   0.5],
    20: [0,   1,   0,   1,   0],
    25: [0,   1,   0,   1,   0.5],
    30: [1,   0,   1,   0,   1],
    35: [1,   0.5, 1,   0,   1],
    40: [1,   1,   0,   1,   1],
    45: [1,   1,   1,   0.5, 1],
    50: [1,   1,   1,   1,   1],
    55: [1,   1.5, 1,   1,   1],
    60: [2,   1,   1,   1,   1],
    65: [2,   1,   1,   1.5, 1],
    70: [2,   1,   2,   1,   1],
    75: [2,   1,   2,   1,   1.5],
    80: [2,   1,   2,   1,   2],
    85: [2,   1,   2.5, 1,   2],
    90: [2,   2,   2,   1,   2],
    95: [2,   2,   2,   1.5, 2],
    100:[2,   2,   2,   2,   2]
  };

  // Guard against future transcription errors: each row must total speed / 10 inches.
  Object.entries(phaseMoves).forEach(([speed, phases]) => {
    const actual = phases.reduce((sum, value) => sum + value, 0);
    const expected = Number(speed) / 10;
    if (Math.abs(actual - expected) > 1e-9) {
      throw new Error(`Movement chart error at ${speed} mph: ${actual}" total, expected ${expected}"`);
    }
  });
  const CONTROL_STATUSES=[7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6];
  const CONTROL_ROWS=[
    {min:5,max:10,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe",2],m:-3},
    {min:15,max:20,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe",2,3],m:-2},
    {min:25,max:30,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe",2,4],m:-1},
    {min:35,max:40,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe","safe","safe",2,3,4],m:0},
    {min:45,max:50,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe","safe",2,3,4,5],m:1},
    {min:55,max:60,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe",2,3,4,4,5],m:1},
    {min:65,max:70,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe",2,3,4,5,6],m:2},
    {min:75,max:80,v:["safe","safe","safe","safe","safe","safe","safe","safe","safe",3,4,5,5,6],m:2},
    {min:85,max:90,v:["safe","safe","safe","safe","safe","safe","safe","safe",2,3,5,5,6,"XX"],m:2},
    {min:95,max:100,v:["safe","safe","safe","safe","safe","safe","safe","safe",2,4,5,6,6,"XX"],m:3}
  ];
  function controlRow(speed){if(speed<=0)return{v:Array(14).fill("safe"),m:-3};return CONTROL_ROWS.find(r=>speed>=r.min&&speed<=r.max)||CONTROL_ROWS.at(-1)}
  function controlTable(speed,hs){const r=controlRow(speed),h=Math.max(-6,Math.min(7,hs));return{result:r.v[CONTROL_STATUSES.indexOf(h)],modifier:r.m}}
  const makeCar = (name,x,y,heading,color,isAI=false) => ({
    name,x,y,heading,color,isAI,speed:20,hc:2,handling:2,accel:5,topSpeed:90,
    armor:{front:20,right:15,left:15,back:15,top:5,under:5},
    ammo:20, weaponDP:3, alive:true, maneuver:null, maneuverD:0, changedSpeed:false,
    firedThisPhase:false, internal:10, pendingCrash:null, crashState:null, firePenalty:0, burning:false,
    tireDP:{fl:9,fr:9,rl:9,rr:9}, direction:1, stoppedTurns:0, crashTrail:[], crashBannerUntil:0, crashMomentumHeading:null
  });
  let player = makeCar("Blue Comet",110,H/2,0,"#4da3ff");
  let ai = makeCar("Red Jackal",W-110,H/2,180,"#ef6262",true);
  function applyDesign(car, design) {
    if (!design) return;
    car.name = design.name;
    car.speed = Number(localStorage.getItem("rdaStartSpeed") || 20);
    car.hc = design.hc || 2;
    car.handling = car.hc;
    car.accel = design.acceleration || 5;
    car.topSpeed = Math.min(100, design.topSpeed || 100);
    car.reverseTopSpeed = Math.max(5, Math.floor(car.topSpeed / 5 / 5) * 5);
    car.armor = Object.assign(car.armor, design.armor || {});
    const front = (design.weapons || []).find(w => w.mount === "front");
    if (front && window.RDA_DATA && RDA_DATA.weapons[front.weapon]) {
      const spec = RDA_DATA.weapons[front.weapon];
      car.ammo = spec.ammo;
      car.weaponName = spec.name;
    }
  }
  let turn=1, phase=1, started=false, selected={type:"straight",d:0,label:"Go straight"}, locked=false;

  const $ = id => document.getElementById(id);
  const logEl=$("log");
  function log(msg, cls=""){ const d=document.createElement("div"); d.className=cls; d.textContent=msg; logEl.appendChild(d); logEl.scrollTop=logEl.scrollHeight; }
  function toast(msg){ const t=$("toast"); t.textContent=msg;t.style.opacity=1;setTimeout(()=>t.style.opacity=0,1500); }
  function roll(n=2){let s=0;for(let i=0;i<n;i++)s+=1+Math.floor(Math.random()*6);return s}
  function norm(a){return (a%360+360)%360}
  function rad(a){return a*Math.PI/180}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function moveDist(car){ const row=phaseMoves[Math.round(car.speed/5)*5] || phaseMoves[100]; return row[phase-1] || 0; }
  function sideHit(target, attacker){
    const dx=attacker.x-target.x, dy=attacker.y-target.y;
    const angle=norm(Math.atan2(dy,dx)*180/Math.PI-target.heading);
    if(angle<45||angle>=315)return "front";
    if(angle<135)return "right";
    if(angle<225)return "back";
    return "left";
  }
  function inArc(shooter,target){
    const aim=norm(Math.atan2(target.y-shooter.y,target.x-shooter.x)*180/Math.PI);
    let diff=Math.abs(norm(aim-shooter.heading)); if(diff>180)diff=360-diff;
    return diff<=45;
  }
  const barriers=[{x:W/2-120,y:H/2-150,w:240,h:18},{x:W/2-120,y:H/2+132,w:240,h:18},{x:W/2-15,y:H/2-65,w:30,h:130}];
  function hitBarrier(car){return barriers.some(r=>car.x+18>r.x&&car.x-18<r.x+r.w&&car.y+11>r.y&&car.y-11<r.y+r.h)}
  function collisionWall(car){
    const margin=18;
    return car.x<arena.x+margin||car.x>arena.x+arena.w-margin||car.y<arena.y+margin||car.y>arena.y+arena.h-margin;
  }
  function clampInsideArena(car){
    car.x=Math.min(Math.max(car.x,arena.x+19),arena.x+arena.w-19);
    car.y=Math.min(Math.max(car.y,arena.y+19),arena.y+arena.h-19);
  }
  function movementHeading(car){return norm(car.heading+(car.direction<0?180:0))}
  function resolveSolidCollisions(car,previous,uncontrolled=false){
    if(hitBarrier(car)){
      car.x=previous.x; car.y=previous.y;
      log(`${car.name} strikes a barrier${uncontrolled?" while out of control":""}.`,"bad");
      damage(car,roll(1),"front","Barrier");
      if(!uncontrolled)controlCheck(car,3,"hazard");
      else car.speed=Math.max(0,car.speed-10);
    }
    if(collisionWall(car)){
      clampInsideArena(car);
      const ram=Math.max(1,Math.floor(car.speed/10));
      damage(car,roll(Math.min(6,ram)),"front","Wall collision");
      car.speed=Math.max(0,car.speed-20);
      car.handling=-6;
      log(`${car.name} is stopped by the arena wall${uncontrolled?" during forced movement":""}.`,"bad");
      if(car.speed===0)endCrashAtHalt(car);
    }
  }
  function damage(target, amount, side, source){
    const absorbed=Math.min(target.armor[side],amount); target.armor[side]-=absorbed; amount-=absorbed;
    log(`${source}: ${target.name} ${side} armor absorbs ${absorbed}.`,"warn");
    if(amount>0){target.internal-=amount;log(`${amount} internal damage penetrates!`,"bad");}
    if(target.internal<=0){target.alive=false;log(`${target.name} is destroyed!`,"bad");}
  }
  function controlCheck(car,d,source="maneuver"){
    if(d<=0)return true;car.handling=Math.max(-6,car.handling-d);const c=controlTable(car.speed,car.handling);
    if(c.result==="safe"){log(`${car.name}: D${d}; HS ${car.handling}; safe.`);return true}
    if(c.result==="XX"){log(`${car.name}: automatic loss of control.`,"bad");scheduleCrash(car,d,source,c.modifier);return false}
    const rr=roll(1);log(`${car.name}: control ${rr}, needs ${c.result}+.` ,rr>=c.result?"good":"bad");if(rr<c.result){scheduleCrash(car,d,source,c.modifier);return false}return true;
  }
  function scheduleCrash(car,d,source,sm){
    const raw=roll(2),total=raw+sm+(d-3);
    log(`${car.name}: crash ${raw} ${sm>=0?"+":""}${sm} speed ${(d-3)>=0?"+":""}${d-3} difficulty = ${total}.`,"bad");
    car.pendingCrash={table:source==="hazard"?2:1,result:total,heading:car.crashMomentumHeading ?? movementHeading(car),difficulty:d};
    car.crashBannerUntil=performance.now()+1200;
    log(`⚠ LOSS OF CONTROL — ${car.name}` ,"crash");
    applyCrash(car); // Crash result is established in the phase control is lost.
  }
  function tires(car,n){Object.keys(car.tireDP).forEach(k=>car.tireDP[k]=Math.max(0,car.tireDP[k]-(typeof n==="function"?n():n)))}
  function resolveTable1(car,r,h){
    if(r<=2){car.crashState={type:"skid",distance:.25,heading:h};car.firePenalty=Math.max(car.firePenalty,3);log("Crash Table 1: trivial skid 1/4\".","warn")}
    else if(r<=4){car.crashState={type:"skid",distance:.5,heading:h};car.speed=Math.max(0,car.speed-5);car.firePenalty=Math.max(car.firePenalty,6);log("Crash Table 1: minor skid 1/2\", speed -5.","warn")}
    else if(r<=6){tires(car,1);car.crashState={type:"skid",distance:.75,heading:h,next:.25};car.speed=Math.max(0,car.speed-10);car.firePenalty=99;log("Crash Table 1: moderate skid; tires -1; speed -10.","bad")}
    else if(r<=8){tires(car,2);car.crashState={type:"skid",distance:1,heading:h,next:.5};car.speed=Math.max(0,car.speed-20);car.firePenalty=99;log("Crash Table 1: severe skid; tires -2; speed -20.","bad")}
    else if(r<=10){tires(car,()=>roll(1));car.crashState={type:"spin",heading:h,dir:Math.random()<.5?-1:1};car.handling=-6;car.firePenalty=99;log("Crash Table 1: spinout.","bad")}
    else if(r<=14){car.crashState={type:"roll",heading:h,stage:0};car.burning=r>=13&&roll(1)>=4;car.handling=-6;car.firePenalty=99;log(`Crash Table 1: rollover${car.burning?" and burning":""}.`,"bad")}
    else{tires(car,()=>roll(3));car.crashState={type:"vault",heading:h,remaining:roll(1),stage:0};car.handling=-6;car.firePenalty=99;log("Crash Table 1: vault.","bad")}
    if(car.speed===0)endCrashAtHalt(car);
  }
  function resolveTable2(car,r,p){const dir=Math.random()<.5?-1:1;if(r<=4){car.heading=norm(car.heading+dir*15);car.firePenalty=Math.max(car.firePenalty,3);log("Crash Table 2: minor fishtail.","warn")}else if(r<=8){car.heading=norm(car.heading+dir*30);car.firePenalty=Math.max(car.firePenalty,6);log("Crash Table 2: major fishtail.","bad")}else{car.heading=norm(car.heading+dir*(r<=10?15:r<=14?30:45));log("Crash Table 2: fishtail then Crash Table 1.","bad");const row=controlRow(car.speed),raw=roll(2);resolveTable1(car,raw+row.m+(p.difficulty-3),p.heading)}}
  function applyCrash(car){if(!car.pendingCrash)return;const p=car.pendingCrash;car.pendingCrash=null;p.table===2?resolveTable2(car,p.result,p):resolveTable1(car,p.result,p.heading)}
  function angleDifference(a,b){let d=Math.abs(norm(a-b));return d>180?360-d:d}
  function endCrashAtHalt(car){
    if(!car.crashState)return;
    if(car.crashState.type==="spin")log(`${car.name}'s spinout ends at 0 mph.`,"good");
    car.crashState=null; car.pendingCrash=null; car.direction=1;
  }
  function crashMove(car,inches){
    applyCrash(car);
    const c=car.crashState;if(!c)return false;
    const previous={x:car.x,y:car.y};
    if(c.type==="skid"){
      const d=Math.min(inches,c.distance);car.x+=Math.cos(rad(c.heading))*d*SCALE;car.y+=Math.sin(rad(c.heading))*d*SCALE;
      const rest=Math.max(0,inches-d);car.x+=Math.cos(rad(movementHeading(car)))*rest*SCALE;car.y+=Math.sin(rad(movementHeading(car)))*rest*SCALE;
      c.distance-=d;if(c.distance<=0)car.crashState=c.next?{type:"skid",distance:c.next,heading:c.heading}:null
    } else if(c.type==="spin"){
      car.x+=Math.cos(rad(c.heading))*inches*SCALE;car.y+=Math.sin(rad(c.heading))*inches*SCALE;car.heading=norm(car.heading+90*c.dir)
    } else if(c.type==="tstop"){
      const d=Math.min(1,inches);car.x+=Math.cos(rad(c.heading))*d*SCALE;car.y+=Math.sin(rad(c.heading))*d*SCALE;
      car.speed=Math.max(0,car.speed-20*d);if(car.speed===0)endCrashAtHalt(car)
    } else if(c.type==="roll"){
      car.x+=Math.cos(rad(c.heading))*Math.min(1,inches)*SCALE;car.y+=Math.sin(rad(c.heading))*Math.min(1,inches)*SCALE;
      const side=["right","top","left","under"][c.stage%4];side==="under"?tires(car,()=>roll(1)):damage(car,roll(1),side,"Rollover");c.stage++
    } else if(c.type==="vault"){
      const d=Math.min(inches,c.remaining);car.x+=Math.cos(rad(c.heading))*d*SCALE;car.y+=Math.sin(rad(c.heading))*d*SCALE;c.remaining-=d;car.heading=norm(car.heading+180);if(c.remaining<=0){damage(car,roll(Math.max(1,Math.floor(car.speed/10))),["front","right","back","left","top","under"][Math.floor(Math.random()*6)],"Vault landing");car.crashState={type:"roll",heading:c.heading,stage:0}}
    }
    car.crashTrail.push({x1:previous.x,y1:previous.y,x2:car.x,y2:car.y});
    if(car.crashTrail.length>30)car.crashTrail.shift();
    resolveSolidCollisions(car,previous,true);
    return true
  }
  function crash(car){scheduleCrash(car,3,"maneuver",controlRow(car.speed).m)}
  function performMove(car,mv){
    const inches=moveDist(car);
    if(inches<=0)return;
    if(car.speed===0){endCrashAtHalt(car);return}
    if(crashMove(car,inches))return;
    let d=(mv?.d||0)+(car.direction<0&&mv?.d?1:0);
    const originalTravel=movementHeading(car);
    if(mv?.type==="bendL")car.heading=norm(car.heading-(car.direction<0?-15:15));
    if(mv?.type==="bendR")car.heading=norm(car.heading+(car.direction<0?-15:15));
    car.crashMomentumHeading=originalTravel;
    if(!controlCheck(car,d,"maneuver")){
      // Steering changes the body heading, while the crash skid preserves pre-bend momentum.
      crashMove(car,inches);
      car.crashMomentumHeading=null;
      return;
    }
    car.crashMomentumHeading=null;
    let lateral=0;
    if(mv?.type==="driftL")lateral=-0.25*SCALE;
    if(mv?.type==="driftR")lateral=0.25*SCALE;
    const travel=movementHeading(car),previous={x:car.x,y:car.y};
    car.x += Math.cos(rad(travel))*inches*SCALE + Math.cos(rad(car.heading+90))*lateral;
    car.y += Math.sin(rad(travel))*inches*SCALE + Math.sin(rad(car.heading+90))*lateral;
    resolveSolidCollisions(car,previous,false);
    if(dist(player,ai)<38 && player.alive && ai.alive){
      const rel=Math.abs(player.speed-ai.speed) || Math.max(player.speed,ai.speed);
      const hit=Math.max(1,Math.floor(rel/15));
      damage(player,roll(Math.min(6,hit)),sideHit(player,ai),"Vehicle collision");
      damage(ai,roll(Math.min(6,hit)),sideHit(ai,player),"Vehicle collision");
      player.speed=Math.max(0,player.speed-10);ai.speed=Math.max(0,ai.speed-10);
    }
  }
  function fire(shooter,target){
    if(!shooter.alive||shooter.ammo<=0||shooter.firedThisPhase||shooter.weaponDP<=0)return false;
    if(!inArc(shooter,target)){log(`${shooter.name}: target outside front firing arc.`,"bad");return false}
    const range=dist(shooter,target)/SCALE;
    const rangeMod=range<=4?1:range<=12?0:range<=20?-1:-3;
    const moveMod=target.speed>=50?-2:target.speed>=20?-1:0;
    const maneuverMod=-(shooter.maneuverD||0);if(shooter.firePenalty>=99){log(`${shooter.name}: aimed fire prohibited after loss of control.`,"bad");return false}const crashMod=-(shooter.firePenalty||0);
    const targetNum=Math.max(3,7-rangeMod-moveMod-maneuverMod-crashMod);
    const r=roll(2); shooter.ammo--; shooter.firedThisPhase=true;
    log(`${shooter.name} fires: roll ${r}, needs ${targetNum}+ (range ${range.toFixed(1)}").`,r>=targetNum?"good":"bad");
    if(r>=targetNum){
      const dmg=roll(1); const side=sideHit(target,shooter);
      log(`Hit! ${dmg} damage to ${target.name}'s ${side}.`,"good"); damage(target,dmg,side,"Machine gun");
      controlCheck(target,dmg>=10?3:dmg>=6?2:1,"hazard");
    }
    return true;
  }
  function aiChoice(){
    if(!ai.alive)return {type:"straight",d:0};
    const desired=norm(Math.atan2(player.y-ai.y,player.x-ai.x)*180/Math.PI);
    let delta=norm(desired-ai.heading); if(delta>180)delta-=360;
    if(Math.abs(delta)>10)return delta<0?{type:"bendL",d:1}:{type:"bendR",d:1};
    return {type:"straight",d:0};
  }
  function aiAct(){
    const mv=aiChoice(); ai.maneuverD=mv.d; performMove(ai,mv);
    if(ai.alive && player.alive && inArc(ai,player) && Math.random()<.75)fire(ai,player);
  }
  function setSelected(type,d,label){selected={type,d,label};$("previewText").textContent=`Selected: ${label} (D${d}). Resulting handling: ${Math.max(-6,player.handling-d)}.`;draw()}
  function updateUI(){
    $("turnNum").textContent=turn;$("phaseNum").textContent=phase;$("speed").textContent=`${player.direction<0?"R ":""}${player.speed}`;$("handling").textContent=player.handling;
    $("ammo").textContent=player.ammo;$("weaponDP").textContent=player.weaponDP;
    $("armor").innerHTML=Object.entries(player.armor).map(([k,v])=>`<div>${k}<strong>${v}</strong></div>`).join("");
    $("phasebar").innerHTML=[1,2,3,4,5].map(p=>`<div class="phase ${p===phase?'active':''}">${p}</div>`).join("");
    $("accel").disabled=player.changedSpeed||player.speed>=player.topSpeed;
    $("brake").disabled=player.changedSpeed||player.speed<=0;
    if($("reverse")){$("reverse").disabled=player.speed!==0||player.stoppedTurns<1;$("reverse").textContent=player.direction<0?"Select Forward Gear":"Select Reverse Gear";}
    $("fire").disabled=player.firedThisPhase||player.ammo<=0||!player.alive;
  }
  function checkEnd(){
    if(!player.alive||!ai.alive){
      locked=true;$("endOverlay").style.display="flex";
      $("endTitle").textContent=player.alive?"Victory!":"Defeat";
      $("endText").textContent=player.alive?"The rival vehicle has been destroyed. You are the last survivor.":"Your vehicle has been destroyed in the arena.";
    }
  }
  function advance(){
    if(locked||!started)return;
    player.maneuverD=selected.d;
    const pm=moveDist(player), am=moveDist(ai);
    // Faster car moves first; equal speed gives player initiative in prototype.
    if(ai.speed>player.speed){if(am)aiAct();if(pm)performMove(player,selected)}
    else {if(pm)performMove(player,selected);if(am)aiAct()}
    log(`Turn ${turn}, Phase ${phase}: movement resolved.`);
    checkEnd();
    if(phase===5){
      player.handling=Math.min(player.hc,player.handling+Math.max(1,player.hc));
      ai.handling=Math.min(ai.hc,ai.handling+Math.max(1,ai.hc));
      [player,ai].forEach(c=>{
        if(c.crashState&&["spin","roll"].includes(c.crashState.type)){
          c.speed=Math.max(0,c.speed-20);
          if(c.speed===0)endCrashAtHalt(c);
        }
        if(c.direction<0 && c.speed>(c.reverseTopSpeed||Math.max(5,Math.floor(c.topSpeed/5))))c.speed=Math.max(c.reverseTopSpeed||5,c.speed-5);
        c.stoppedTurns=c.speed===0?c.stoppedTurns+1:0;
        c.firePenalty=0;
      });
      turn++;phase=1;player.changedSpeed=ai.changedSpeed=false;
      log(`— Turn ${turn} begins. Handling recovered. —`,"warn");
    } else phase++;
    player.firedThisPhase=ai.firedThisPhase=false;
    selected={type:"straight",d:0,label:"Go straight"};
    $("previewText").textContent="Choose a maneuver, then commit it.";
    updateUI();draw();checkEnd();
  }
  function drawArena(){
    ctx.fillStyle="#11161c";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#262c32";ctx.fillRect(arena.x,arena.y,arena.w,arena.h);
    // grid
    ctx.strokeStyle="#313840";ctx.lineWidth=1;
    for(let x=arena.x;x<=arena.x+arena.w;x+=SCALE/2){ctx.beginPath();ctx.moveTo(x,arena.y);ctx.lineTo(x,arena.y+arena.h);ctx.stroke()}
    for(let y=arena.y;y<=arena.y+arena.h;y+=SCALE/2){ctx.beginPath();ctx.moveTo(arena.x,y);ctx.lineTo(arena.x+arena.w,y);ctx.stroke()}
    ctx.strokeStyle="#8a929b";ctx.lineWidth=10;ctx.strokeRect(arena.x,arena.y,arena.w,arena.h);
    // gates
    ctx.strokeStyle="#20262d";ctx.lineWidth=14;
    ctx.beginPath();ctx.moveTo(arena.x, H/2-35);ctx.lineTo(arena.x,H/2+35);ctx.stroke();
    ctx.beginPath();ctx.moveTo(arena.x+arena.w, H/2-35);ctx.lineTo(arena.x+arena.w,H/2+35);ctx.stroke();
    // low obstacles, original layout
    ctx.fillStyle="#6a7078";
    [[W/2-120,H/2-150,240,18],[W/2-120,H/2+132,240,18],[W/2-15,H/2-65,30,130]].forEach(r=>ctx.fillRect(...r));
    ctx.fillStyle="#b7bdc4";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText("ARENA 01",W/2,70);
  }
  function drawArc(car){
    if(car!==player||!car.alive)return;
    ctx.save();ctx.translate(car.x,car.y);ctx.rotate(rad(car.heading));
    ctx.fillStyle="#f3c76322";ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,220,-Math.PI/4,Math.PI/4);ctx.closePath();ctx.fill();ctx.restore();
  }
  function drawCrashTrail(car){
    if(!car.crashTrail?.length)return;
    ctx.save();ctx.strokeStyle="#ff4d5f";ctx.lineWidth=3;ctx.setLineDash([9,6]);ctx.globalAlpha=.75;
    car.crashTrail.forEach(t=>{ctx.beginPath();ctx.moveTo(t.x1,t.y1);ctx.lineTo(t.x2,t.y2);ctx.stroke()});ctx.restore();
  }
  function drawCar(car){
    if(!car.alive)return;
    const crashing=!!car.crashState, rollStage=car.crashState?.type==="roll"?(car.crashState.stage%4):null;
    ctx.save();ctx.translate(car.x,car.y);ctx.rotate(rad(car.heading));
    ctx.shadowColor=crashing?"#ff3448":"#000";ctx.shadowBlur=crashing?18:8;
    let w=36,h=20;
    if(rollStage===0||rollStage===2)h=8;
    ctx.fillStyle=rollStage===1?"#343b46":rollStage===3?"#11151b":car.color;
    ctx.strokeStyle=crashing?"#ff4d5f":"#e9eef5";ctx.lineWidth=crashing?4:1.5;
    ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,Math.min(5,h/2));ctx.fill();ctx.stroke();
    if(rollStage===null){
      ctx.fillStyle="#17202a";ctx.fillRect(-4,-8,10,16);
      ctx.fillStyle="#dce6f1";ctx.fillRect(12,-5,5,10);
      ctx.fillStyle="#0d1117";ctx.fillRect(-13,-12,8,3);ctx.fillRect(6,-12,8,3);ctx.fillRect(-13,9,8,3);ctx.fillRect(6,9,8,3);
    } else {
      ctx.fillStyle="#dce6f1";ctx.fillRect(-9,-Math.max(2,h/2-2),18,Math.max(3,h-4));
    }
    ctx.restore();
    ctx.fillStyle="#eef3f8";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText(`${car.name}  ${car.speed} mph`,car.x,car.y-20);
    if(crashing){ctx.fillStyle="#ff4d5f";ctx.font="bold 10px sans-serif";ctx.fillText(`⚠ ${car.crashState.type.toUpperCase()}`,car.x,car.y+28)}
    if(performance.now()<car.crashBannerUntil){ctx.fillStyle="#ff4d5f";ctx.font="bold 16px sans-serif";ctx.fillText("LOSS OF CONTROL",car.x,car.y-38)}
  }
  function drawPreview(){
    if(!started||!player.alive)return;
    const inches=moveDist(player);if(!inches)return;
    let h=player.heading;if(selected.type==="bendL")h-=15;if(selected.type==="bendR")h+=15;
    let x=player.x+Math.cos(rad(h))*inches*SCALE,y=player.y+Math.sin(rad(h))*inches*SCALE;
    if(selected.type==="driftL"){x+=Math.cos(rad(h+90))*(-.25*SCALE);y+=Math.sin(rad(h+90))*(-.25*SCALE)}
    if(selected.type==="driftR"){x+=Math.cos(rad(h+90))*(.25*SCALE);y+=Math.sin(rad(h+90))*(.25*SCALE)}
    ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle="#f2b84b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(x,y);ctx.stroke();
    ctx.translate(x,y);ctx.rotate(rad(h));ctx.strokeRect(-18,-10,36,20);ctx.restore();
  }
  function draw(){drawArena();drawCrashTrail(player);drawCrashTrail(ai);drawArc(player);drawPreview();drawCar(player);drawCar(ai)}
  $("startBtn").onclick=()=>{applyDesign(player,JSON.parse(localStorage.getItem("rdaSelectedPlayer")||"null"));applyDesign(ai,JSON.parse(localStorage.getItem("rdaSelectedAI")||"null"));started=true;$("startOverlay").style.display="none";log("Arena duel begins with garage-selected vehicles.","warn");updateUI();draw()}
  $("left15").onclick=()=>setSelected("bendL",1,"15° left bend");
  $("right15").onclick=()=>setSelected("bendR",1,"15° right bend");
  $("driftL").onclick=()=>setSelected("driftL",1,"left drift");
  $("driftR").onclick=()=>setSelected("driftR",1,"right drift");
  $("straight").onclick=()=>setSelected("straight",0,"go straight");
  $("commit").onclick=advance;
  $("accel").onclick=()=>{if(!player.changedSpeed){player.speed=Math.min(player.direction<0?(player.reverseTopSpeed||Math.max(5,Math.floor(player.topSpeed/5))):player.topSpeed,player.speed+player.accel);player.changedSpeed=true;log(`${player.name} accelerates to ${player.speed} mph.`);updateUI();draw()}};
  $("brake").onclick=()=>{if(!player.changedSpeed){player.speed=Math.max(0,player.speed-5);player.changedSpeed=true;if(player.speed===0)endCrashAtHalt(player);log(`${player.name} decelerates to ${player.speed} mph.`);updateUI();draw()}};
  if($("reverse"))$("reverse").onclick=()=>{
    if(player.speed!==0||player.stoppedTurns<1){log(`${player.name} must remain stopped for a full turn before changing direction.`,"bad");return}
    player.direction*=-1;player.changedSpeed=true;
    log(`${player.name} selects ${player.direction<0?"reverse":"forward"} gear.`,"warn");updateUI();draw();
  };
  $("fire").onclick=()=>{fire(player,ai);updateUI();draw();checkEnd()};

  function toggleHotkeys(show){const o=$("hotkeyOverlay");if(!o)return;o.style.display=(show===undefined?(o.style.display==="none"?"flex":"none"):(show?"flex":"none"))}
  document.addEventListener("keydown",e=>{if(!started||locked)return;const tag=(e.target.tagName||"").toLowerCase();if(["input","select","textarea"].includes(tag))return;const k=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," ","enter"].includes(k))e.preventDefault();if(k==="h"||k==="?"){toggleHotkeys();return}if(k==="escape"){toggleHotkeys(false);setSelected("straight",0,"go straight");return}if($("hotkeyOverlay")&&$("hotkeyOverlay").style.display!=="none")return;if(k==="arrowup"||k==="w")$("accel").click();else if(k==="arrowdown"||k==="x")$("brake").click();else if(k==="arrowleft"||k==="q")$("left15").click();else if(k==="arrowright"||k==="e")$("right15").click();else if(k==="a")$("driftL").click();else if(k==="d")$("driftR").click();else if(k==="s")$("straight").click();else if(k==="v"&&$("reverse"))$("reverse").click();else if(k==="f")$("fire").click();else if(k===" "||k==="enter")$("commit").click()});
  if($("closeHotkeys"))$("closeHotkeys").onclick=()=>toggleHotkeys(false);
  updateUI();draw();
})();
