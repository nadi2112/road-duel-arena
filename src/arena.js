
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const Rules = window.RDA_CHAPTER2;
  if (!Rules) throw new Error("Chapter 2 rules module did not load.");
  const SCALE = 36; // pixels per tabletop inch; one tabletop inch equals one car length
  const arena = {x:45,y:45,w:810,h:810};
  const roadSurface=localStorage.getItem("rdaRoadSurface")||"dry";
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
    id:isAI?"ai":"player",name,x,y,heading,color,isAI,speed:20,hc:2,handling:2,accel:5,topSpeed:90,weight:3500,damageModifier:2/3,
    armor:{front:20,right:15,left:15,back:15,top:5,under:5},
    ammo:20, weaponDP:3, alive:true, maneuver:null, maneuverD:0, changedSpeed:false,
    lastFiredTurn:0, firedThisTurn:false, internal:10, pendingCrash:null, crashState:null, firePenalty:0, burning:false,
    tireDP:{fl:9,fr:9,rl:9,rr:9}, direction:1, stoppedTurns:0, crashTrail:[], crashBannerUntil:0, crashMomentumHeading:null,
    forcedMove:null,pendingAutoDecel:0,turnStartSpeed:20,stunnedPhases:0,lastCollision:null,armorTypeKey:"plastic",phaseDamage:0
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
    car.weight = design.weight || car.weight;
    car.damageModifier = Rules.damageModifier(car.weight);
    car.armorTypeKey = design.armorTypeKey || "plastic";
    car.suspensionKey=design.suspensionKey||"improved";car.frontTireKey=design.frontTireKey||"puncture";car.rearTireKey=design.rearTireKey||"puncture";
    car.reverseTopSpeed = Math.max(5, Math.floor(car.topSpeed / 5 / 5) * 5);
    car.armor = Object.assign(car.armor, design.armor || {});
    const tireSpecs=window.RDA_DATA?.tires||{};
    const frontDP=tireSpecs[design.frontTireKey]?.dp||9,rearDP=tireSpecs[design.rearTireKey]?.dp||9;
    car.tireDP={fl:frontDP,fr:frontDP,rl:rearDP,rr:rearDP};
    const front = (design.weapons || []).find(w => w.mount === "front");
    if (front && window.RDA_DATA && RDA_DATA.weapons[front.weapon]) {
      const spec = RDA_DATA.weapons[front.weapon];
      car.ammo = spec.ammo;
      car.weaponName = spec.name;
    }
  }
  let turn=1, phase=1, started=false, selected={type:"straight",d:0,angle:0,label:"Go straight"}, pendingSpeedDelta=0, locked=false;
  let rngSeed=(Date.now()>>>0)||1, rngState=rngSeed;
  let replay={version:"0.6.0",seed:rngSeed,initial:null,frames:[],events:[]}, replayIndex=-1, replayTimer=null, replayMode=false;
  let replayReadOnly=false;
  const camera={x:0,y:0,zoom:1,follow:false,dragging:false,lastX:0,lastY:0};
  function random(){rngState=(1664525*rngState+1013904223)>>>0;return rngState/4294967296}

  const $ = id => document.getElementById(id);
  const logEl=$("log");
  function inferCategory(msg,cls){if(cls==="crash"||/crash|skid|spin|roll|vault|loss of control/i.test(msg))return "crash";if(/damage|armor|destroy|hit!/i.test(msg))return "damage";if(/control|handling|D\d/i.test(msg))return "control";if(/fire|weapon|target|ammo/i.test(msg))return "combat";if(/AI|Red Jackal/i.test(msg))return "ai";return "movement"}
  function log(msg, cls="", category){ const d=document.createElement("div"); d.className=cls;d.dataset.category=category||inferCategory(msg,cls);d.dataset.turn=turn;d.dataset.phase=phase; d.textContent=`[T${turn} P${phase}] ${msg}`; logEl.appendChild(d); replay.events.push({turn,phase,msg,cls,category:d.dataset.category});applyLogFilter();logEl.scrollTop=logEl.scrollHeight; }
  function applyLogFilter(){const f=$("logFilter")?.value||"all";logEl.querySelectorAll("div[data-category]").forEach(d=>d.style.display=(f==="all"||d.dataset.category===f)?"block":"none")}
  function toast(msg){ const t=$("toast"); t.textContent=msg;t.style.opacity=1;setTimeout(()=>t.style.opacity=0,1500); }
  function roll(n=2){let s=0;for(let i=0;i<n;i++)s+=1+Math.floor(random()*6);return s}
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
  const barriers=[
    {id:"north-rail",x:W/2-120,y:H/2-150,w:240,h:18,dp:18,maxDP:18,dm:3,destroyed:false},
    {id:"south-rail",x:W/2-120,y:H/2+132,w:240,h:18,dp:18,maxDP:18,dm:3,destroyed:false},
    {id:"center-block",x:W/2-15,y:H/2-65,w:30,h:130,dp:24,maxDP:24,dm:4,destroyed:false}
  ];
  const debris=[];
  const activeContacts=new Set();
  const impactMarks=[];
  function boxForCar(car){return{x:car.x,y:car.y,halfL:18,halfW:10,heading:car.heading}}
  function boxForRect(r){return{x:r.x+r.w/2,y:r.y+r.h/2,halfL:r.w/2,halfW:r.h/2,heading:0}}
  function boxAxes(box){const h=rad(box.heading);return[{x:Math.cos(h),y:Math.sin(h)},{x:-Math.sin(h),y:Math.cos(h)}]}
  function boxCorners(box){const [forward,side]=boxAxes(box);return[[-1,-1],[-1,1],[1,1],[1,-1]].map(([a,b])=>({x:box.x+forward.x*box.halfL*a+side.x*box.halfW*b,y:box.y+forward.y*box.halfL*a+side.y*box.halfW*b}))}
  function projected(corners,axis){const values=corners.map(p=>p.x*axis.x+p.y*axis.y);return{min:Math.min(...values),max:Math.max(...values)}}
  function boxesOverlap(a,b){const ac=boxCorners(a),bc=boxCorners(b),axes=[...boxAxes(a),...boxAxes(b)];return axes.every(axis=>{const ap=projected(ac,axis),bp=projected(bc,axis);return ap.max>=bp.min&&bp.max>=ap.min})}
  function hitBarrier(car){return barriers.find(r=>!r.destroyed&&boxesOverlap(boxForCar(car),boxForRect(r)))}
  function collisionWall(car){
    const margin=18;
    return car.x<arena.x+margin||car.x>arena.x+arena.w-margin||car.y<arena.y+margin||car.y>arena.y+arena.h-margin;
  }
  function clampInsideArena(car){
    car.x=Math.min(Math.max(car.x,arena.x+19),arena.x+arena.w-19);
    car.y=Math.min(Math.max(car.y,arena.y+19),arena.y+arena.h-19);
  }
  function movementHeading(car){return norm(car.heading+(car.direction<0?180:0))}
  function motionHeading(car){return car.crashState?.heading??car.forcedMove?.momentumHeading??movementHeading(car)}
  function collisionLabel(type){return{headOn:"Head-on",rearEnd:"Rear-end",tBone:"T-bone",sideswipe:"Sideswipe"}[type]||type}
  function contactKey(a,b){return[a.id,b.id].sort().join(":")}
  function signedDelta(target,current){let d=norm(target-current);if(d>180)d-=360;return d}
  function interpolateHeading(from,to,t){return norm(from+signedDelta(to,from)*t)}
  function sweepVehicleContact(car,other,previous){
    const final={x:car.x,y:car.y,heading:car.heading};
    const distance=Math.hypot(final.x-previous.x,final.y-previous.y),steps=Math.max(1,Math.ceil(distance/3));
    let safe={x:previous.x,y:previous.y,heading:previous.heading??car.heading};
    for(let i=1;i<=steps;i++){
      const t=i/steps;car.x=previous.x+(final.x-previous.x)*t;car.y=previous.y+(final.y-previous.y)*t;car.heading=interpolateHeading(previous.heading??final.heading,final.heading,t);
      if(boxesOverlap(boxForCar(car),boxForCar(other)))return{hit:true,safe,contact:{x:car.x,y:car.y,heading:car.heading},final};
      safe={x:car.x,y:car.y,heading:car.heading};
    }
    car.x=final.x;car.y=final.y;car.heading=final.heading;return{hit:false,final};
  }
  function addImpactMark(x,y,label){impactMarks.push({x,y,label,until:performance.now()+1800});while(impactMarks.length>8)impactMarks.shift()}
  function applyConcussion(car,speedChange){
    const threshold=Rules.concussionThreshold(speedChange);if(threshold<=0)return 0;
    const result=roll(2);if(result>=threshold){log(`${car.name} concussion check ${result} vs ${threshold}: unaffected.`,"good","control");return 0}
    const missed=threshold-result,untilTurnEnd=Math.max(1,6-phase);car.stunnedPhases=Math.max(car.stunnedPhases,missed,untilTurnEnd);
    log(`${car.name}'s driver is stunned for ${car.stunnedPhases} phase${car.stunnedPhases===1?"":"s"} (${result} vs ${threshold}).`,"bad","control");return 2;
  }
  function collisionHazardCheck(car,type,originalSpeed,finalSpeed,swipeSpeed,awayDirection,concussionChange=Math.abs(originalSpeed-finalSpeed)){
    if(!car.alive)return;let d=Rules.collisionHazard(type,originalSpeed,finalSpeed,swipeSpeed)+Rules.surfaceModifier(roadSurface);d+=applyConcussion(car,concussionChange);
    controlCheck(car,d,"hazard",{speedOverride:originalSpeed,fishtailDir:awayDirection});
  }
  function conformVehicle(vehicle,pusherHeading){
    vehicle.heading=norm(vehicle.heading+Math.max(-30,Math.min(30,signedDelta(pusherHeading,vehicle.heading))));
    vehicle.x+=Math.cos(rad(pusherHeading))*2;vehicle.y+=Math.sin(rad(pusherHeading))*2;
  }
  function resolveVehicleCollision(car,other,previous){
    const sweep=sweepVehicleContact(car,other,previous);if(!sweep.hit){activeContacts.delete(contactKey(car,other));return false}
    const key=contactKey(car,other);car.x=sweep.safe.x;car.y=sweep.safe.y;car.heading=sweep.safe.heading;
    if(activeContacts.has(key))return true;activeContacts.add(key);
    const face1=sideHit(car,other),face2=sideHit(other,car),motion1=motionHeading(car),motion2=motionHeading(other);
    const type=Rules.classifyCollision({attackerFace:face1,defenderFace:face2,attackerMotion:motion1,defenderMotion:motion2,attackerDirection:car.direction,defenderDirection:other.direction});
    const sameDirection=Rules.angleDifference(motion1,motion2)<=45;
    const original1=car.speed,original2=other.speed,speeds=Rules.collisionSpeeds(type,original1,original2,car.damageModifier,other.damageModifier,sameDirection);
    const base=Rules.rollRamDamage(speeds.collisionSpeed,()=>roll(1));
    const damageToOther=Math.floor(base*car.damageModifier),damageToCar=Math.floor(base*other.damageModifier);
    log(`${collisionLabel(type)} collision at ${speeds.collisionSpeed} mph: base ${base}; ${car.name} DM ${car.damageModifier.toFixed(2)}, ${other.name} DM ${other.damageModifier.toFixed(2)}.`,"crash","crash");
    damage(other,damageToOther,face2,`${collisionLabel(type)} ram`,{collision:true});
    damage(car,damageToCar,face1,`${collisionLabel(type)} ram`,{collision:true});
    car.speed=speeds.speed1;other.speed=speeds.speed2;
    if(type!=="sideswipe"){
      if(car.speed===0&&other.speed>0)conformVehicle(car,motion2);
      if(other.speed===0&&car.speed>0)conformVehicle(other,motion1);
    }
    const away1=Math.sin(rad(norm(Math.atan2(other.y-car.y,other.x-car.x)*180/Math.PI-motion1)))>=0?-1:1;
    const away2=-away1;
    const concussionChange=type==="tBone"?Math.abs(original1-car.speed):null;
    collisionHazardCheck(car,type,original1,car.speed,speeds.swipeSpeed||0,away1,concussionChange??Math.abs(original1-car.speed));
    collisionHazardCheck(other,type,original2,other.speed,speeds.swipeSpeed||0,away2,concussionChange??Math.abs(original2-other.speed));
    car.lastCollision={type,speed:speeds.collisionSpeed,face:face1,damage:damageToCar};other.lastCollision={type,speed:speeds.collisionSpeed,face:face2,damage:damageToOther};
    addImpactMark((car.x+other.x)/2,(car.y+other.y)/2,collisionLabel(type).toUpperCase());
    log(`Post-impact speeds: ${car.name} ${car.speed} mph; ${other.name} ${other.speed} mph.`,"warn","movement");
    return true;
  }
  function fixedObjectCollision(car,object,previous,isWall=false){
    const attempted={x:car.x,y:car.y},key=`${car.id}:${isWall?"wall":object.id}`;car.x=previous.x;car.y=previous.y;car.heading=previous.heading??car.heading;
    if(activeContacts.has(key))return;activeContacts.add(key);
    const center=isWall?{x:Math.min(Math.max(attempted.x,arena.x),arena.x+arena.w),y:Math.min(Math.max(attempted.y,arena.y),arena.y+arena.h)}:{x:object.x+object.w/2,y:object.y+object.h/2};
    const face=sideHit(car,center),sideswipe=face==="left"||face==="right",collisionSpeed=sideswipe?Rules.roundUp5(car.speed/4):car.speed,original=car.speed;
    const base=Rules.rollRamDamage(collisionSpeed,()=>roll(1)),caused=Math.floor(base*car.damageModifier),available=isWall?Infinity:object.dp,actual=Math.min(caused,available);
    if(!isWall){object.dp=Math.max(0,object.dp-caused);object.destroyed=object.dp<=0}
    damage(car,actual,face,isWall?"Arena wall":"Fixed barrier",{collision:true});
    if(!sideswipe){car.speed=(!isWall&&object.destroyed)?Rules.temporarySpeed(original,car.damageModifier,object.dm):0}
    const type=sideswipe?"sideswipe":"headOn";collisionHazardCheck(car,type,original,car.speed,sideswipe?collisionSpeed:0,random()<.5?-1:1);
    log(`${car.name} ${sideswipe?"sideswipes":"rams"} ${isWall?"the arena wall":object.id} at ${collisionSpeed} mph for ${actual} damage${!isWall&&object.destroyed?" and breaches it":""}.`,"crash","crash");
    addImpactMark(car.x,car.y,isWall?"WALL":object.destroyed?"BREACH":"BARRIER");if(car.speed===0)endCrashAtHalt(car);
  }
  function resolveDebris(car){
    debris.forEach(piece=>{if(piece.hitBy?.has(car.id)||dist(car,piece)>20)return;piece.hitBy??=new Set();piece.hitBy.add(car.id);let total=0;Object.keys(car.tireDP).forEach(k=>{const amount=Rules.debrisTireDamage(roll(1));damageTire(car,k,amount,"Road debris");total+=amount});const hazard=1+Rules.surfaceModifier(roadSurface);log(`${car.name} hits debris: ${total} total tire damage and a D${hazard} hazard.`,total?"bad":"warn","damage");controlCheck(car,hazard,"hazard")})
  }
  function resolveSolidCollisions(car,previous,uncontrolled=false){
    const barrier=hitBarrier(car);if(barrier)fixedObjectCollision(car,barrier,previous,false);
    if(collisionWall(car)){fixedObjectCollision(car,null,previous,true);clampInsideArena(car)}
    const other=car===player?ai:player;if(car.alive&&other.alive)resolveVehicleCollision(car,other,previous);
    resolveDebris(car);
  }
  function damage(target, amount, side, source,options={}){
    const incoming=Math.max(0,Math.floor(amount));let armorCost=incoming;
    if(options.collision&&target.armorTypeKey==="metal")armorCost=Math.ceil(incoming/3);
    const absorbedArmor=Math.min(target.armor[side]||0,armorCost);target.armor[side]=Math.max(0,(target.armor[side]||0)-absorbedArmor);
    const absorbed=options.collision&&target.armorTypeKey==="metal"?Math.min(incoming,absorbedArmor*3):Math.min(incoming,absorbedArmor);amount=incoming-absorbed;
    log(`${source}: ${target.name} ${side} armor absorbs ${absorbed}.`,"warn");
    target.phaseDamage+=incoming;if(amount>0){target.internal-=amount;log(`${amount} internal damage penetrates!`,"bad");}
    if(incoming>=10){debris.push({x:target.x+(random()-.5)*24,y:target.y+(random()-.5)*18,hitBy:new Set([target.id])});log(`${target.name} sheds road debris from the impact.`,"warn","damage")}
    if(target.internal<=0){target.alive=false;log(`${target.name} is destroyed!`,"bad");}
    return{incoming,absorbed,penetrated:Math.max(0,amount)};
  }
  function controlCheck(car,d,source="maneuver",options={}){
    if(d<=0)return true;car.handling=Math.max(-6,car.handling-d);const checkSpeed=options.speedOverride??car.speed,c=controlTable(checkSpeed,car.handling);
    if(c.result==="safe"){log(`${car.name}: D${d}; HS ${car.handling}; safe.`);return true}
    if(c.result==="XX"){log(`${car.name}: automatic loss of control.`,"bad");scheduleCrash(car,d,source,c.modifier,options);return false}
    const rr=roll(1);log(`${car.name}: control ${rr}, needs ${c.result}+.` ,rr>=c.result?"good":"bad");if(rr<c.result){scheduleCrash(car,d,source,c.modifier,options);return false}return true;
  }
  function scheduleCrash(car,d,source,sm,options={}){
    const extra=(options.crashExtra||0)+(roadSurface==="offroad"?-3:0),raw=roll(2),total=raw+sm+(d-3)+extra;
    log(`${car.name}: crash ${raw} ${sm>=0?"+":""}${sm} speed ${(d-3)>=0?"+":""}${d-3} difficulty${extra?` ${extra>=0?"+":""}${extra} special`:""} = ${total}.`,"bad");
    car.pendingCrash={table:source==="hazard"?2:1,result:total,heading:car.crashMomentumHeading ?? motionHeading(car),difficulty:d,fishtailDir:options.fishtailDir};
    car.crashBannerUntil=performance.now()+1200;
    log(`⚠ LOSS OF CONTROL — ${car.name}` ,"crash");
    applyCrash(car); // Crash result is established in the phase control is lost.
  }
  function damageTire(car,key,amount,source="Tire damage"){
    const before=car.tireDP[key],after=Math.max(0,before-amount);car.tireDP[key]=after;if(before>0&&after===0){car.handling=-6;car.hc=Math.max(0,car.hc-2);log(`${source}: ${car.name}'s ${key.toUpperCase()} tire is lost; HC -2 and handling drops to -6.`,"bad","damage");if(!car.resolvingCrash)controlCheck(car,6,"hazard")}
  }
  function tires(car,n){Object.keys(car.tireDP).forEach(k=>damageTire(car,k,typeof n==="function"?n():n))}
  function resolveTable1(car,r,h){
    if(r<=2){car.crashState={type:"skid",distance:.25,heading:h};car.firePenalty=Math.max(car.firePenalty,3);log("Crash Table 1: trivial skid 1/4\".","warn")}
    else if(r<=4){car.crashState={type:"skid",distance:.5,heading:h};car.speed=Math.max(0,car.speed-5);car.firePenalty=Math.max(car.firePenalty,6);log("Crash Table 1: minor skid 1/2\", speed -5.","warn")}
    else if(r<=6){tires(car,1);car.crashState={type:"skid",distance:.75,heading:h,next:.25};car.speed=Math.max(0,car.speed-10);car.firePenalty=99;log("Crash Table 1: moderate skid; tires -1; speed -10.","bad")}
    else if(r<=8){tires(car,2);car.crashState={type:"skid",distance:1,heading:h,next:.5};car.speed=Math.max(0,car.speed-20);car.firePenalty=99;log("Crash Table 1: severe skid; tires -2; speed -20.","bad")}
    else if(r<=10){tires(car,()=>roll(1));car.crashState={type:"spin",heading:h,dir:random()<.5?-1:1};car.handling=-6;car.firePenalty=99;log("Crash Table 1: spinout.","bad")}
    else if(r<=14){
      const rollDir=random()<.5?-1:1;
      const bodyHeading=norm(h+rollDir*90);
      car.heading=bodyHeading;
      car.crashState={type:"roll",heading:h,bodyHeading,rollDir,stage:0,face:"under",tstop:true};
      car.burning=r>=13&&roll(1)>=4;car.handling=-6;car.firePenalty=99;
      log(`Crash Table 1: rollover${car.burning?" and burning":""}.`,"bad");
      log(`${car.name} begins with a T-stop, turns broadside, and will roll along its original travel direction.`,"crash");
    }
    else{tires(car,()=>roll(3));car.crashState={type:"vault",heading:h,remaining:roll(1),stage:0};car.handling=-6;car.firePenalty=99;log("Crash Table 1: vault.","bad")}
    if(car.speed===0)endCrashAtHalt(car);
  }
  function resolveTable2(car,r,p){const dir=p.fishtailDir||(random()<.5?-1:1);if(r<=4){car.heading=norm(car.heading+dir*15);car.firePenalty=Math.max(car.firePenalty,3);log("Crash Table 2: minor fishtail.","warn")}else if(r<=8){car.heading=norm(car.heading+dir*30);car.firePenalty=Math.max(car.firePenalty,6);log("Crash Table 2: major fishtail.","bad")}else{car.heading=norm(car.heading+dir*(r<=10?15:r<=14?30:45));log("Crash Table 2: fishtail then Crash Table 1.","bad");const row=controlRow(car.speed),raw=roll(2);resolveTable1(car,raw+row.m+(p.difficulty-3),p.heading)}}
  function applyCrash(car){if(!car.pendingCrash)return;const p=car.pendingCrash;car.pendingCrash=null;car.resolvingCrash=true;p.table===2?resolveTable2(car,p.result,p):resolveTable1(car,p.result,p.heading);car.resolvingCrash=false}
  function angleDifference(a,b){let d=Math.abs(norm(a-b));return d>180?360-d:d}
  function endCrashAtHalt(car){
    if(!car.crashState){if(car.speed===0){car.forcedMove=null;car.pendingAutoDecel=0}return}
    if(car.crashState.type==="spin")log(`${car.name}'s spinout ends at 0 mph.`,"good");
    car.crashState=null; car.pendingCrash=null; car.direction=1;
  }
  function crashMove(car,inches){
    applyCrash(car);
    const c=car.crashState;if(!c)return false;
    const previous={x:car.x,y:car.y,heading:car.heading};
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
      const d=Math.min(1,inches);
      car.x+=Math.cos(rad(c.heading))*d*SCALE;car.y+=Math.sin(rad(c.heading))*d*SCALE;
      car.heading=c.bodyHeading;
      c.tstop=false;
      c.stage=(c.stage+1)%4;
      const sequence=c.rollDir>0?["right","top","left","under"]:["left","top","right","under"];
      c.face=sequence[c.stage];
      if(c.face==="under")tires(car,()=>roll(1));
      else damage(car,roll(1),c.face,"Rollover");
      log(`${car.name} rollover impact: ${c.face}.`,"crash");
    } else if(c.type==="vault"){
      const d=Math.min(inches,c.remaining);car.x+=Math.cos(rad(c.heading))*d*SCALE;car.y+=Math.sin(rad(c.heading))*d*SCALE;c.remaining-=d;car.heading=norm(car.heading+180);if(c.remaining<=0){damage(car,roll(Math.max(1,Math.floor(car.speed/10))),["front","right","back","left","top","under"][Math.floor(random()*6)],"Vault landing");car.crashState={type:"roll",heading:c.heading,bodyHeading:norm(c.heading+90),rollDir:1,stage:0,face:"under",tstop:false}}
    }
    car.crashTrail.push({x1:previous.x,y1:previous.y,x2:car.x,y2:car.y});
    if(car.crashTrail.length>30)car.crashTrail.shift();
    resolveSolidCollisions(car,previous,true);
    return true
  }
  function crash(car){scheduleCrash(car,3,"maneuver",controlRow(car.speed).m)}
  function bendEndpoint(car,side,angle,inches){
    // Classic bend geometry: the inside front corner before the maneuver becomes
    // the matching rear corner after it. Because the counter is exactly 1 inch
    // long, this consumes one ordinary inch; any remaining phase movement is
    // then made straight along the new heading.
    const length=36, width=20;
    const reverse=car.direction<0;
    const turnSign=(side==="left"?-1:1)*(reverse?-1:1);
    const newHeading=norm(car.heading+turnSign*angle);
    const insideY=side==="left"?-width/2:width/2;
    const startX=reverse?-length/2:length/2;
    const endX=reverse?length/2:-length/2;
    const rotate=(x,y,h)=>({x:x*Math.cos(rad(h))-y*Math.sin(rad(h)),y:x*Math.sin(rad(h))+y*Math.cos(rad(h))});
    const startCorner=rotate(startX,insideY,car.heading);
    const endCorner=rotate(endX,insideY,newHeading);
    let x=car.x+startCorner.x-endCorner.x;
    let y=car.y+startCorner.y-endCorner.y;
    const remaining=Math.max(0,inches-1);
    const travel=norm(newHeading+(reverse?180:0));
    x+=Math.cos(rad(travel))*remaining*SCALE;
    y+=Math.sin(rad(travel))*remaining*SCALE;
    return {x,y,heading:newHeading};
  }
  function maneuverRuleType(type){
    if(type==="bendL"||type==="bendR")return"bend";
    if(type==="driftL"||type==="driftR")return"drift";
    if(type==="steepDriftL"||type==="steepDriftR")return"steepDrift";
    if(type==="swerveL"||type==="swerveR")return"swerve";
    if(type==="bootleggerL"||type==="bootleggerR")return"bootlegger";
    if(type==="tstopL"||type==="tstopR")return"tstop";
    if(type==="pivotL"||type==="pivotR")return"pivot";
    return"straight";
  }
  function difficultyFor(car,mv){const type=maneuverRuleType(mv?.type),defaultAngle=(type==="bend"||type==="swerve")?15:0;return Rules.maneuverDifficulty(type,{angle:mv?.angle||defaultAngle,skidDistance:mv?.skidDistance,reverse:car.direction<0,surface:roadSurface,speed:car.speed})}
  function swerveEndpoint(car,side,angle,inches){
    const lateralSide=side==="left"?1:-1,offset=.25*SCALE*lateralSide;
    const shifted={...car,x:car.x+Math.cos(rad(car.heading+90))*offset,y:car.y+Math.sin(rad(car.heading+90))*offset};
    return bendEndpoint(shifted,side,angle,inches);
  }
  function pivotEndpoint(car,side,angle){
    const travel=movementHeading(car),advanced={...car,x:car.x+Math.cos(rad(travel))*.25*SCALE,y:car.y+Math.sin(rad(travel))*.25*SCALE};
    const sign=(side==="left"?-1:1)*(car.direction<0?-1:1),newHeading=norm(car.heading+sign*angle),rearX=car.direction<0?18:-18,rearY=side==="left"?-10:10;
    const rotate=(x,y,h)=>({x:x*Math.cos(rad(h))-y*Math.sin(rad(h)),y:x*Math.sin(rad(h))+y*Math.cos(rad(h))}),before=rotate(rearX,rearY,advanced.heading),after=rotate(rearX,rearY,newHeading);
    return{x:advanced.x+before.x-after.x,y:advanced.y+before.y-after.y,heading:newHeading};
  }
  function maneuverEndpoint(car,mv,inches){
    const type=mv?.type||"straight",angle=mv?.angle||15,travel=movementHeading(car);
    if(type==="bendL"||type==="bendR")return bendEndpoint(car,type==="bendL"?"left":"right",angle,inches);
    if(type==="swerveL"||type==="swerveR")return swerveEndpoint(car,type==="swerveL"?"left":"right",angle,inches);
    if(type==="pivotL"||type==="pivotR")return pivotEndpoint(car,type==="pivotL"?"left":"right",angle);
    let lateral=0;if(type==="driftL")lateral=-.25;if(type==="driftR")lateral=.25;if(type==="steepDriftL")lateral=-.5;if(type==="steepDriftR")lateral=.5;
    return{x:car.x+Math.cos(rad(travel))*inches*SCALE+Math.cos(rad(car.heading+90))*lateral*SCALE,y:car.y+Math.sin(rad(travel))*inches*SCALE+Math.sin(rad(car.heading+90))*lateral*SCALE,heading:car.heading};
  }
  function releaseSeparatedContacts(car){
    const other=car===player?ai:player;if(dist(car,other)>44)activeContacts.delete(contactKey(car,other));
    barriers.forEach(b=>{const dx=Math.max(b.x-car.x,0,car.x-(b.x+b.w)),dy=Math.max(b.y-car.y,0,car.y-(b.y+b.h));if(b.destroyed||Math.hypot(dx,dy)>24)activeContacts.delete(`${car.id}:${b.id}`)});
    if(!collisionWall(car))activeContacts.delete(`${car.id}:wall`);
  }
  function applyAutomaticDeceleration(car){
    if(!car.pendingAutoDecel)return;const amount=Math.min(car.speed,car.pendingAutoDecel);car.speed-=amount;car.pendingAutoDecel=0;log(`${car.name}'s controlled skid decelerates it ${amount} mph.`,"warn","movement");if(car.speed===0)car.forcedMove=null;
  }
  function forcedMove(car,inches){
    const forced=car.forcedMove;if(!forced)return false;const previous={x:car.x,y:car.y,heading:car.heading};
    if(forced.type==="controlledSkid"){
      const skid=Math.min(inches,forced.distance);car.x+=Math.cos(rad(forced.momentumHeading))*skid*SCALE;car.y+=Math.sin(rad(forced.momentumHeading))*skid*SCALE;
      const rest=Math.max(0,inches-skid);car.x+=Math.cos(rad(movementHeading(car)))*rest*SCALE;car.y+=Math.sin(rad(movementHeading(car)))*rest*SCALE;
      forced.distance-=skid;if(forced.distance<=0){if(forced.tireDamage)tires(car,forced.tireDamage);log(`${car.name} completes a controlled skid${forced.tireDamage?`; each tire takes ${forced.tireDamage}`:""}.`,"warn","movement");car.forcedMove=null}
    }else if(forced.type==="bootlegger"){
      const distance=Math.min(1,inches);car.x+=Math.cos(rad(forced.momentumHeading))*distance*SCALE;car.y+=Math.sin(rad(forced.momentumHeading))*distance*SCALE;car.heading=norm(forced.originalHeading+180);car.speed=0;car.direction=1;car.forcedMove=null;log(`${car.name} completes the bootlegger reverse and stops facing back down its original path.`,"good","movement");
    }else if(forced.type==="tstop"){
      const distance=Math.min(inches,Math.max(.25,car.speed/20));car.x+=Math.cos(rad(forced.momentumHeading))*distance*SCALE;car.y+=Math.sin(rad(forced.momentumHeading))*distance*SCALE;car.heading=forced.bodyHeading;const before=car.speed;car.speed=Math.max(0,car.speed-20*distance);const fullLoss=Math.floor((before-car.speed)/20);if(fullLoss>0)tires(car,fullLoss);if(car.speed===0){car.forcedMove=null;log(`${car.name} completes the T-stop.`,"good","movement")}
    }
    car.crashTrail.push({x1:previous.x,y1:previous.y,x2:car.x,y2:car.y});resolveSolidCollisions(car,previous,false);return true;
  }
  function beginBootlegger(car,mv,inches){
    if(car.turnStartSpeed<20||car.turnStartSpeed>35||car.changedSpeed){log(`${car.name} cannot begin a bootlegger reverse: it must start the turn at 20–35 mph without a setup speed change.`,"bad","movement");performMove(car,{type:"straight",d:0});return}
    const dir=mv.type==="bootleggerL"?-1:1,originalHeading=car.heading,momentumHeading=movementHeading(car),previous={x:car.x,y:car.y,heading:car.heading};car.crashMomentumHeading=momentumHeading;
    const ok=controlCheck(car,difficultyFor(car,mv),"maneuver");tires(car,1);const distance=Math.min(1,inches);car.x+=Math.cos(rad(momentumHeading))*distance*SCALE;car.y+=Math.sin(rad(momentumHeading))*distance*SCALE;car.heading=norm(originalHeading+dir*90);car.firePenalty=99;
    if(ok)car.forcedMove={type:"bootlegger",momentumHeading,originalHeading};resolveSolidCollisions(car,previous,false);car.crashMomentumHeading=null;
  }
  function beginTStop(car,mv,inches){
    if(car.turnStartSpeed<20||car.turnStartSpeed>35||car.changedSpeed){log(`${car.name} cannot begin a T-stop: it must start the turn at 20–35 mph without a setup speed change.`,"bad","movement");performMove(car,{type:"straight",d:0});return}
    const dir=mv.type==="tstopL"?-1:1,momentumHeading=movementHeading(car),bodyHeading=norm(car.heading+dir*90);car.forcedMove={type:"tstop",momentumHeading,bodyHeading};car.firePenalty=99;car.crashMomentumHeading=momentumHeading;
    const ok=controlCheck(car,difficultyFor(car,mv),"maneuver",{speedOverride:car.speed,crashExtra:Math.ceil(car.speed/20)});car.crashMomentumHeading=null;if(!ok){car.forcedMove=null;crashMove(car,inches);return}forcedMove(car,inches);
  }
  function performMove(car,mv){
    const inches=moveDist(car);if(inches<=0)return;releaseSeparatedContacts(car);
    if(car.speed===0){endCrashAtHalt(car);return}if(crashMove(car,inches))return;if(forcedMove(car,inches))return;
    const type=mv?.type||"straight";
    if(inches<1&&type!=="pivotL"&&type!=="pivotR"&&type!=="straight")mv={type:"straight",d:0,angle:0};
    if((type==="pivotL"||type==="pivotR")&&car.speed!==5){log(`${car.name} cannot pivot unless moving exactly 5 mph.`,"bad","movement");mv={type:"straight",d:0}}
    if(type.startsWith("bootlegger")){beginBootlegger(car,mv,inches);return}
    if(type.startsWith("tstop")){beginTStop(car,mv,inches);return}
    const originalTravel=movementHeading(car),previous={x:car.x,y:car.y,heading:car.heading},endpoint=maneuverEndpoint(car,mv,inches),d=difficultyFor(car,mv);car.crashMomentumHeading=originalTravel;car.heading=endpoint.heading;
    const ok=controlCheck(car,d,"maneuver");car.x=endpoint.x;car.y=endpoint.y;resolveSolidCollisions(car,previous,false);
    if(ok&&mv?.skidDistance){const skid=Rules.controlledSkid(mv.skidDistance);car.forcedMove={type:"controlledSkid",distance:Number(mv.skidDistance),momentumHeading:originalTravel,tireDamage:skid.tireDamage};car.pendingAutoDecel=skid.deceleration;car.firePenalty=Math.max(car.firePenalty,skid.firePenalty);log(`${car.name} sets up a ${mv.skidDistance}\" controlled skid for its next move.`,"warn","movement")}
    if(!ok){const remaining=Math.max(0,inches-1);if(remaining>0)crashMove(car,remaining)}car.crashMomentumHeading=null;
  }
  function rangeModifier(range){
    // Classic rules: point blank is less than 1 inch; long range is -1
    // for every full 4 inches. Distances from 1.00 through 3.99 have no modifier.
    if(range<1)return 4;
    return -Math.floor(range/4);
  }
  function targetSpeedModifier(speed){
    // The current arena uses the target-speed portion of the classic movement
    // modifiers. The full relative-arc movement table is a later combat milestone.
    if(speed===0)return 1;
    if(speed>=80)return -6;
    if(speed>=70)return -5;
    if(speed>=60)return -4;
    if(speed>=50)return -3;
    if(speed>=40)return -2;
    if(speed>=30)return -1;
    return 0;
  }
  function shotCalculation(shooter,target){
    const range=dist(shooter,target)/SCALE;
    const modifiers=[
      {name:"Range",value:rangeModifier(range),detail:`${range.toFixed(2)} in`},
      {name:"Target movement",value:targetSpeedModifier(target.speed),detail:`${target.speed} mph`},
      {name:"Firer stationary",value:shooter.speed===0?1:0,detail:shooter.speed===0?"yes":"no"},
      {name:"Maneuver this phase",value:-(shooter.maneuverD||0),detail:`D${shooter.maneuverD||0}`},
      {name:"Crash / skid penalty",value:-(shooter.firePenalty||0),detail:shooter.firePenalty?`-${shooter.firePenalty}`:"none"}
    ];
    const total=modifiers.reduce((sum,m)=>sum+m.value,0);
    const base=7; // Front machine gun in the current prototype.
    return {base,range,modifiers,total,targetNum:base-total};
  }
  function modifierText(value){return value>0?`+${value}`:`${value}`}
  function fire(shooter,target){
    if(!shooter.alive||shooter.ammo<=0||shooter.lastFiredTurn===turn||shooter.weaponDP<=0||shooter.stunnedPhases>0)return false;
    if(!inArc(shooter,target)){log(`${shooter.name}: target outside front firing arc.`,"bad","combat");return false}
    if(shooter.firePenalty>=99){log(`${shooter.name}: aimed fire prohibited after loss of control.`,"bad","combat");return false}
    const shot=shotCalculation(shooter,target);
    const r=roll(2); shooter.ammo--; shooter.lastFiredTurn=turn; shooter.firedThisTurn=true;
    const breakdown=shot.modifiers.filter(m=>m.value!==0).map(m=>`${m.name} ${modifierText(m.value)}`).join(", ")||"no modifiers";
    log(`${shooter.name} fires Machine Gun: roll ${r}, needs ${shot.targetNum}+ [base ${shot.base}; ${breakdown}; total ${modifierText(shot.total)}].`,r>=shot.targetNum?"good":"bad","combat");
    if(r===2||r<shot.targetNum){
      log(`${shooter.name} misses ${target.name}.`,"bad","combat");
    } else {
      const dmg=roll(1); const side=sideHit(target,shooter);
      log(`Hit! ${dmg} damage to ${target.name}'s ${side}.`,"good","damage"); damage(target,dmg,side,"Machine gun");
      controlCheck(target,(dmg>=10?3:dmg>=6?2:1)+Rules.surfaceModifier(roadSurface),"hazard");
    }
    updateInspector();
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
    const mv=ai.stunnedPhases?{type:"straight",d:0}:aiChoice(); ai.maneuverD=difficultyFor(ai,mv); performMove(ai,mv);
    if(ai.alive && player.alive && !ai.stunnedPhases && inArc(ai,player) && random()<.75)fire(ai,player);
  }
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function snapshot(label="Phase resolved"){const frame={turn,phase,label,rngState,player:clone(player),ai:clone(ai),events:replay.events.length};replay.frames.push(frame);replayIndex=replay.frames.length-1;updateReplayUI()}
  function resumeLive(){
    if(replayReadOnly){toast("Imported replays are view-only.");return false}
    stopReplay();
    replayMode=false;
    replayIndex=replay.frames.length-1;
    updateUI();draw();updateReplayUI();
    toast("Live controls restored.");
    return true;
  }
  function restoreFrame(i,{autoResume=true}={}){
    if(!replay.frames.length)return;
    replayIndex=Math.max(0,Math.min(i,replay.frames.length-1));
    const f=replay.frames[replayIndex];
    player=clone(f.player);ai=clone(f.ai);turn=f.turn;phase=f.phase;rngState=f.rngState||rngState;
    // Returning to the newest frame of the current game means returning to live play.
    replayMode=!(autoResume && !replayReadOnly && replayIndex===replay.frames.length-1);
    updateUI();draw();updateReplayUI();
  }
  function updateReplayUI(){
    if(!$("replaySlider"))return;
    $("replaySlider").max=Math.max(0,replay.frames.length-1);
    $("replaySlider").value=Math.max(0,replayIndex);
    $("replayPosition").textContent=replayMode?`Replay · ${replayIndex+1}/${replay.frames.length}`:`LIVE · ${replay.frames.length} frames`;
  }
  function exportReplay(){const payload={...replay,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`road-duel-replay-T${turn}-P${phase}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
  function importReplayFile(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.frames)||!data.frames.length)throw new Error("No replay frames");replay=data;rngSeed=data.seed||1;rngState=rngSeed;replayReadOnly=true;locked=true;restoreFrame(0,{autoResume:false});log("Imported replay loaded. Use replay controls to inspect it.","warn","movement")}catch(e){toast(`Replay import failed: ${e.message}`)}};reader.readAsText(file)}
  function stopReplay(){if(replayTimer){clearInterval(replayTimer);replayTimer=null}if($("replayPlay"))$("replayPlay").textContent="Play"}
  function toggleReplayPlay(){if(replayTimer){stopReplay();return}if(!replay.frames.length)return;if(!replayMode&&!replayReadOnly)restoreFrame(0,{autoResume:false});$("replayPlay").textContent="Pause";replayTimer=setInterval(()=>{if(replayIndex>=replay.frames.length-1){stopReplay();if(!replayReadOnly)resumeLive();return}restoreFrame(replayIndex+1)},500)}
  function canChooseManeuver(type=selected.type){
    if(player.crashState||player.forcedMove||player.stunnedPhases>0)return false;
    if(type==="pivotL"||type==="pivotR")return player.speed===5&&moveDist(player)>=.5;
    return moveDist(player)>=1;
  }
  function projectedSpeed(){
    const automatic=Math.min(player.speed,player.pendingAutoDecel||0),base=player.speed-automatic;
    if(player.changedSpeed)return base;
    const limit=player.direction<0?(player.reverseTopSpeed||Math.max(5,Math.floor(player.topSpeed/5))):player.topSpeed;
    return Math.max(0,Math.min(limit,base+pendingSpeedDelta));
  }
  function speedChangeOptions(){
    const options=[];
    const maxBrake=Math.min(45,player.speed);
    for(let delta=-maxBrake;delta<=-5;delta+=5)options.push(delta);
    options.push(0);
    const limit=player.direction<0?(player.reverseTopSpeed||Math.max(5,Math.floor(player.topSpeed/5))):player.topSpeed;
    const maxAccel=Math.min(player.accel,Math.max(0,limit-player.speed));
    for(let delta=5;delta<=maxAccel;delta+=5)options.push(delta);
    return options;
  }
  function populateSpeedChoices(){
    const select=$("speedChange");if(!select)return;
    const options=speedChangeOptions();
    if(!options.includes(pendingSpeedDelta))pendingSpeedDelta=0;
    select.innerHTML=options.map(delta=>`<option value="${delta}">${delta===0?"Hold speed":delta>0?`Accelerate +${delta} mph`:`Decelerate ${delta} mph`}</option>`).join("");
    select.value=String(pendingSpeedDelta);
  }
  function setSpeedDelta(delta){
    if(replayMode||locked||player.changedSpeed||!player.alive)return;
    const options=speedChangeOptions();
    pendingSpeedDelta=options.includes(delta)?delta:0;updateUI();draw();
  }
  function applyPendingSpeed(){
    if(player.changedSpeed||pendingSpeedDelta===0)return;
    const before=player.speed, after=projectedSpeed(),deceleration=Math.max(0,before-after);
    if(deceleration>10){
      const baseD=Rules.brakingDifficulty(deceleration),d=baseD+Rules.surfaceModifier(roadSurface);player.crashMomentumHeading=movementHeading(player);
      controlCheck(player,d,"maneuver",{speedOverride:before});
      const tireDamage=Rules.rapidBrakeTireDamage(deceleration,()=>roll(1));if(tireDamage){tires(player,tireDamage);log(`Rapid braking damages every tire by ${tireDamage}.`,"bad","damage")}
      player.crashMomentumHeading=null;
    }
    player.speed=after;player.changedSpeed=true;
    if(after===0)endCrashAtHalt(player);
    if(after>before)log(`${player.name} accelerates ${after-before} mph to ${after} mph.`);
    else if(after<before)log(`${player.name} decelerates ${before-after} mph to ${after} mph.`);
    pendingSpeedDelta=0;
  }
  function setSelected(type,d,label,angle=0,extra={}){
    if(replayMode||!canChooseManeuver(type))return;
    if((type.startsWith("bootlegger")||type.startsWith("tstop"))&&(player.turnStartSpeed<20||player.turnStartSpeed>35||pendingSpeedDelta!==0)){toast("This maneuver requires a 20–35 mph turn-start speed and no same-turn setup braking.");return}
    selected={type,label,angle,...extra};selected.d=difficultyFor(player,selected);
    document.querySelectorAll(".controls button.selected").forEach(button=>button.classList.remove("selected"));const activeId={bendL:"bendLeft",bendR:"bendRight"}[type]||type;$(activeId)?.classList.add("selected");
    const surfaceNote=Rules.surfaceModifier(roadSurface)?` including surface +D${Rules.surfaceModifier(roadSurface)}`:"";
    $("previewText").textContent=`Selected: ${label} (D${selected.d}${surfaceNote}). Resulting handling: ${Math.max(-6,player.handling-selected.d)}. Speed after commit: ${projectedSpeed()} mph.`;draw()
  }
  function updateUI(){
    $("turnNum").textContent=turn;$("phaseNum").textContent=phase;$("speed").textContent=`${player.direction<0?"R ":""}${player.speed}`;$("handling").textContent=player.handling;
    $("ammo").textContent=player.ammo;$("weaponDP").textContent=player.weaponDP;
    $("armor").innerHTML=Object.entries(player.armor).map(([k,v])=>`<div>${k}<strong>${v}</strong></div>`).join("");
    $("phasebar").innerHTML=[1,2,3,4,5].map(p=>`<div class="phase ${p===phase?'active':''}">${p}</div>`).join("");
    const controlsLocked=replayMode||locked||!player.alive;
    const speedLocked=controlsLocked||player.changedSpeed||player.forcedMove||player.stunnedPhases>0;
    populateSpeedChoices();
    if($("speedChange"))$("speedChange").disabled=speedLocked;
    if($("reverse")){$("reverse").disabled=controlsLocked||player.speed!==0||player.stoppedTurns<1;$("reverse").textContent=player.direction<0?"Select Forward Gear":"Select Reverse Gear";}
    $("fire").disabled=controlsLocked||player.lastFiredTurn===turn||player.ammo<=0||player.stunnedPhases>0||player.firePenalty>=99;
    const maneuverLocked=controlsLocked||player.crashState||player.forcedMove||player.stunnedPhases>0||moveDist(player)<1;
    ["bendLeft","bendRight","bendAngle","driftL","driftR","steepDriftL","steepDriftR","swerveL","swerveR","skidDistance","controlledSkid","tstopL","tstopR","bootleggerL","bootleggerR","straight"].forEach(id=>{if($(id))$(id).disabled=maneuverLocked});
    const pivotLocked=controlsLocked||!canChooseManeuver("pivotL");["pivotAngle","pivotL","pivotR"].forEach(id=>{if($(id))$(id).disabled=pivotLocked});
    $("controlledSkid").disabled=maneuverLocked||!["bendL","bendR","swerveL","swerveR"].includes(selected.type);
    const emergencyLocked=maneuverLocked||player.turnStartSpeed<20||player.turnStartSpeed>35||pendingSpeedDelta!==0;["tstopL","tstopR","bootleggerL","bootleggerR"].forEach(id=>{if($(id))$(id).disabled=emergencyLocked});
    $("commit").disabled=controlsLocked;
    if(!controlsLocked){
      const reason=player.stunnedPhases?`Driver stunned for ${player.stunnedPhases} more phase${player.stunnedPhases===1?"":"s"}; vehicle continues straight.`:player.forcedMove?`${player.forcedMove.type} movement is committed and will resolve automatically.`:player.crashState?`Maneuvers unavailable during ${player.crashState.type}.`:moveDist(player)<=0?`No vehicle movement is scheduled in Phase ${phase}.`:moveDist(player)<1?`Half-move: straight only${player.speed===5?", or choose a pivot":""}.`:`Choose a maneuver and speed change, then commit.`;
      if(!canChooseManeuver())$("previewText").textContent=reason;
    }
    updateInspector();updateReplayUI();
  }
  function updateInspector(){
    if(!$("inspector"))return;
    const car=$("inspectCar")?.value==="ai"?ai:player;
    const heading=norm(car.heading), travel=movementHeading(car);
    const headingBearing=norm(heading+90), travelBearing=norm(travel+90);
    const crashType=car.crashState?.type||car.forcedMove?.type||(car.stunnedPhases?"driver stunned":"normal");
    const crash=`${crashType}${car.crashState?.face?` / ${car.crashState.face}`:""}`;
    const statusClass={normal:"statusNormal",skid:"statusSkid",spin:"statusSpin",roll:"statusRoll",vault:"statusVault",controlledSkid:"forcedBadge",bootlegger:"forcedBadge",tstop:"forcedBadge","driver stunned":"collisionBadge"}[crashType]||"statusCrash";
    const frameText=replay.frames.length?`${Math.max(0,replayIndex)+1} / ${replay.frames.length}`:"0 / 0";
    $("inspector").innerHTML=`
      <div><b>Position</b>${car.x.toFixed(1)}, ${car.y.toFixed(1)}</div><div><b>Speed</b>${car.speed} mph</div>
      <div><b>Heading</b>${headingBearing.toFixed(0)}°</div><div><b>Momentum</b>${travelBearing.toFixed(0)}°</div>
      <div><b>Handling</b>${car.handling}</div><div><b>HC</b>${car.hc}</div>
      <div><b>Crash state</b><span class="statusBadge ${statusClass}">${crash}</span></div><div><b>Internal</b>${car.internal}</div>
      <div><b>Direction</b>${car.direction<0?"reverse":"forward"}</div><div><b>Replay</b>${replayMode?"REPLAY":"LIVE"} · ${frameText}</div>
      <div><b>Weight / DM</b>${car.weight} lb / ${car.damageModifier.toFixed(2)}</div><div><b>Surface</b>${roadSurface}</div>
      <div><b>Last collision</b>${car.lastCollision?`${collisionLabel(car.lastCollision.type)} · ${car.lastCollision.speed} mph · ${car.lastCollision.face}`:"none"}</div><div><b>Driver</b>${car.stunnedPhases?`stunned ${car.stunnedPhases} phase(s)`:"ready"}</div>
      <div title="The fixed starting value used to reproduce this game's random rolls."><b>Random seed</b>${rngSeed}</div><div class="advancedRng" title="The generator's current internal value after random rolls have been consumed."><b>RNG state</b>${rngState}</div>
      ${(()=>{const target=car===player?ai:player,shot=shotCalculation(car,target);return `<div class="shotInspector"><b>Current Machine-Gun Shot</b><span>Base to-hit</span><strong>${shot.base}+</strong>${shot.modifiers.map(m=>`<span>${m.name}<small>${m.detail}</small></span><strong class="${m.value>0?'modPositive':m.value<0?'modNegative':''}">${modifierText(m.value)}</strong>`).join('')}<span>Total modifier</span><strong>${modifierText(shot.total)}</strong><span>Final roll needed</span><strong>${shot.targetNum}+</strong><em>Preview only. Full relative-arc movement modifiers, computers, skill, visibility, specific targets, and sustained fire are not implemented yet.</em></div>`})()}`;
  }
  function checkEnd(){
    if(!player.alive||!ai.alive){
      locked=true;$("endOverlay").style.display="flex";
      $("endTitle").textContent=player.alive?"Victory!":"Defeat";
      $("endText").textContent=player.alive?"The rival vehicle has been destroyed. You are the last survivor.":"Your vehicle has been destroyed in the arena.";
    }
  }
  function resolveOffroadWear(car){
    if(roadSurface!=="offroad"||car.speed<=10||car.suspensionKey==="offroad")return;
    const checks=1+Math.max(0,Math.floor((car.speed-11)/20));
    for(let i=0;i<checks;i++){
      const result=roll(2);if(result<=3){damage(car,1,"under","Off-road pounding");}
      else if(result<=5){const keys=Object.keys(car.tireDP),key=keys[Math.floor(random()*keys.length)],solid=(key[0]==="f"?car.frontTireKey:car.rearTireKey)==="solid";if(!solid){damageTire(car,key,1,"Off-road terrain");log(`${car.name}'s ${key.toUpperCase()} tire takes 1 off-road damage.`,"bad","damage")}}
    }
  }
  function advance(){
    if(locked||!started)return;
    const stunnedAtStart=new Map([[player,player.stunnedPhases>0],[ai,ai.stunnedPhases>0]]);
    applyAutomaticDeceleration(player);applyAutomaticDeceleration(ai);
    applyPendingSpeed();
    player.maneuverD=canChooseManeuver(selected.type)?selected.d:0;
    const pm=moveDist(player), am=moveDist(ai);
    // Faster car moves first; equal speed gives player initiative in prototype.
    if(ai.speed>player.speed){if(am)aiAct();if(pm)performMove(player,canChooseManeuver(selected.type)?selected:{type:"straight",d:0,label:"Go straight"})}
    else {if(pm)performMove(player,canChooseManeuver(selected.type)?selected:{type:"straight",d:0,label:"Go straight"});if(am)aiAct()}
    log(`Turn ${turn}, Phase ${phase}: movement resolved.`);
    [player,ai].forEach(c=>{if(stunnedAtStart.get(c))c.stunnedPhases=Math.max(0,c.stunnedPhases-1);c.phaseDamage=0});
    checkEnd();
    if(phase===5){
      resolveOffroadWear(player);resolveOffroadWear(ai);
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
        c.turnStartSpeed=c.speed;
      });
      turn++;phase=1;player.changedSpeed=ai.changedSpeed=false;pendingSpeedDelta=0;
      player.firedThisTurn=ai.firedThisTurn=false; // legacy display state; lastFiredTurn is authoritative.
      log(`— Turn ${turn} begins. Handling recovered. —`,"warn");
    } else phase++;
    selected={type:"straight",d:0,angle:0,label:"Go straight"};
    $("previewText").textContent="Choose a maneuver and speed change, then commit.";
    snapshot("Movement resolved");updateUI();draw();checkEnd();
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
    // Destructible fixed barriers from the original arena layout.
    barriers.filter(b=>!b.destroyed).forEach(b=>{ctx.fillStyle="#6a7078";ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle="#e1b95f";ctx.font="bold 9px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText(`${b.dp} DP`,b.x+b.w/2,b.y+b.h/2+3)});
    debris.forEach(piece=>{ctx.save();ctx.translate(piece.x,piece.y);ctx.rotate(rad((piece.x+piece.y)%180));ctx.fillStyle="#9b825b";ctx.strokeStyle="#241d14";ctx.lineWidth=2;ctx.fillRect(-6,-4,12,8);ctx.strokeRect(-6,-4,12,8);ctx.restore()});
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
  function drawImpacts(){
    const now=performance.now();for(let i=impactMarks.length-1;i>=0;i--){const mark=impactMarks[i];if(mark.until<=now){impactMarks.splice(i,1);continue}const life=(mark.until-now)/1800;ctx.save();ctx.translate(mark.x,mark.y);ctx.globalAlpha=Math.min(1,life*2);ctx.strokeStyle="#ffcc69";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,18+(1-life)*30,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#fff1c2";ctx.font="bold 10px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText(mark.label,0,-24-(1-life)*10);ctx.restore()}
  }
  function drawCar(car){
    if(!car.alive)return;
    const crashing=!!car.crashState;
    const rollState=car.crashState?.type==="roll"?car.crashState:null;
    ctx.save();ctx.translate(car.x,car.y);ctx.rotate(rad(car.heading));
    ctx.shadowColor=crashing?"#ff3448":"#000";ctx.shadowBlur=crashing?18:8;
    ctx.strokeStyle=crashing?"#ff4d5f":"#e9eef5";ctx.lineWidth=crashing?4:1.5;

    if(!rollState){
      const w=36,h=20;
      ctx.fillStyle=car.color;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,5);ctx.fill();ctx.stroke();
      ctx.fillStyle="#17202a";ctx.fillRect(-4,-8,10,16);
      ctx.fillStyle="#dce6f1";ctx.fillRect(12,-5,5,10);
      ctx.fillStyle="#0d1117";ctx.fillRect(-13,-12,8,3);ctx.fillRect(6,-12,8,3);ctx.fillRect(-13,9,8,3);ctx.fillRect(6,9,8,3);
    } else {
      const face=rollState.face||"under";
      if(face==="right"||face==="left"){
        const tireY=face==="right"?8:-8;
        ctx.fillStyle=car.color;ctx.beginPath();ctx.roundRect(-18,-6,36,12,4);ctx.fill();ctx.stroke();
        ctx.fillStyle="#c7d2df";ctx.fillRect(-8,-4,16,8);
        ctx.fillStyle="#05080c";ctx.beginPath();ctx.arc(-11,tireY,5,0,Math.PI*2);ctx.arc(11,tireY,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#f6f8fb";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText(face.toUpperCase(),0,3);
      } else if(face==="top"){
        ctx.fillStyle=car.color;ctx.beginPath();ctx.roundRect(-18,-11,36,22,6);ctx.fill();ctx.stroke();
        ctx.fillStyle="#9fc0d9";ctx.beginPath();ctx.roundRect(-9,-7,18,14,4);ctx.fill();
        ctx.fillStyle="#eef4fa";ctx.fillRect(-2,-8,4,16);
        ctx.fillStyle="#f6f8fb";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText("ROOF",0,3);
      } else {
        ctx.fillStyle="#171b21";ctx.beginPath();ctx.roundRect(-18,-11,36,22,4);ctx.fill();ctx.stroke();
        ctx.strokeStyle="#8b949e";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(12,-7);ctx.moveTo(-12,7);ctx.lineTo(12,7);ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.stroke();
        ctx.fillStyle="#05080c";
        [[-13,-12],[7,-12],[-13,9],[7,9]].forEach(([x,y])=>ctx.fillRect(x,y,7,4));
        ctx.fillStyle="#d8dee7";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText("UNDER",0,3);
      }
    }
    ctx.restore();
    const showProjected=car===player&&!replayMode&&!player.changedSpeed&&pendingSpeedDelta!==0;
    ctx.fillStyle=showProjected?"#ff4d5f":"#eef3f8";ctx.font=showProjected?"bold 11px sans-serif":"11px sans-serif";ctx.textAlign="center";
    ctx.fillText(showProjected?`${car.name}  ${car.speed} → ${projectedSpeed()} mph`:`${car.name}  ${car.speed} mph`,car.x,car.y-20);
    if(crashing){
      const label=rollState?`⚠ ROLLOVER — ${(rollState.face||"under").toUpperCase()}`:`⚠ ${car.crashState.type.toUpperCase()}`;
      ctx.fillStyle="#ff4d5f";ctx.font="bold 10px sans-serif";ctx.fillText(label,car.x,car.y+30)
    }
    if(performance.now()<car.crashBannerUntil){ctx.fillStyle="#ff4d5f";ctx.font="bold 16px sans-serif";ctx.fillText("LOSS OF CONTROL",car.x,car.y-38)}
  }
  function drawPreview(){
    // A replay shows resolved historical positions, not a pending live command.
    // Hiding the preview prevents a stale selection from suggesting a future move.
    if(replayMode||!started||!player.alive||player.crashState)return;
    const inches=moveDist(player);if(!inches)return;
    let end=maneuverEndpoint(player,selected,inches),h=end.heading,x=end.x,y=end.y;
    if(selected.type?.startsWith("bootlegger")||selected.type?.startsWith("tstop")){const sign=selected.type.endsWith("L")?-1:1,travel=movementHeading(player);x=player.x+Math.cos(rad(travel))*Math.min(1,inches)*SCALE;y=player.y+Math.sin(rad(travel))*Math.min(1,inches)*SCALE;h=norm(player.heading+sign*90)}
    ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle="#f2b84b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(x,y);ctx.stroke();
    if(selected.skidDistance){const sx=x+Math.cos(rad(movementHeading(player)))*selected.skidDistance*SCALE,sy=y+Math.sin(rad(movementHeading(player)))*selected.skidDistance*SCALE;ctx.strokeStyle="#6fd7ff";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(sx,sy);ctx.stroke()}
    ctx.translate(x,y);ctx.rotate(rad(h));ctx.strokeRect(-18,-10,36,20);ctx.restore();
  }
  function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);drawArena();drawCrashTrail(player);drawCrashTrail(ai);drawArc(player);drawPreview();drawCar(player);drawCar(ai);drawImpacts();ctx.restore();if(camera.follow&&!replayMode)centerOn(player,false);if($("zoomLabel"))$("zoomLabel").textContent=`${Math.round(camera.zoom*100)}%`;updateInspector()}
  function setZoom(next,cx=W/2,cy=H/2){const old=camera.zoom;next=Math.max(.45,Math.min(2.5,next));camera.x=cx-(cx-camera.x)*(next/old);camera.y=cy-(cy-camera.y)*(next/old);camera.zoom=next;draw()}
  function centerOn(car,redraw=true){camera.x=W/2-car.x*camera.zoom;camera.y=H/2-car.y*camera.zoom;if(redraw)draw()}
  function fitArena(){camera.zoom=Math.min(W/arena.w,H/arena.h)*.92;camera.x=(W-arena.w*camera.zoom)/2-arena.x*camera.zoom;camera.y=(H-arena.h*camera.zoom)/2-arena.y*camera.zoom;draw()}
  $("startBtn").onclick=()=>{applyDesign(player,JSON.parse(localStorage.getItem("rdaSelectedPlayer")||"null"));applyDesign(ai,JSON.parse(localStorage.getItem("rdaSelectedAI")||"null"));if(roadSurface==="offroad"){[player,ai].forEach(c=>{c.hc=Math.max(0,c.hc-3);c.handling=c.hc})}[player,ai].forEach(c=>c.turnStartSpeed=c.speed);started=true;replayMode=false;locked=false;rngState=rngSeed;replay={version:"0.6.0",seed:rngSeed,initial:{player:clone(player),ai:clone(ai)},frames:[],events:[]};replayReadOnly=false;$("startOverlay").style.display="none";log(`Arena duel begins on ${roadSurface} with Chapter 2 driving rules.`,"warn");snapshot("Initial state");fitArena();updateUI();draw()}
  function chooseBend(side){
    const angle=Number($("bendAngle").value||15);
    const d=Math.ceil(angle/15);setSelected(side==="left"?"bendL":"bendR",d,`${angle}° ${side} bend`,angle);
  }
  function chooseSwerve(side){const angle=Number($("bendAngle").value||15);setSelected(side==="left"?"swerveL":"swerveR",Math.ceil(angle/15)+1,`${angle}° ${side} swerve`,angle)}
  function stepBend(direction){
    let signed=selected.type==="bendL"?-(selected.angle||15):selected.type==="bendR"?(selected.angle||15):0;
    signed=Math.max(-90,Math.min(90,signed+direction*15));
    if(signed===0){setSelected("straight",0,"go straight");return;}
    const side=signed<0?"left":"right",angle=Math.abs(signed);
    $("bendAngle").value=String(angle);
    const d=Math.ceil(angle/15);setSelected(side==="left"?"bendL":"bendR",d,`${angle}° ${side} bend`,angle);
  }
  $("bendLeft").onclick=()=>chooseBend("left");
  $("bendRight").onclick=()=>chooseBend("right");
  $("bendAngle").onchange=()=>{if(selected.type==="bendL")chooseBend("left");else if(selected.type==="bendR")chooseBend("right");else if(selected.type==="swerveL")chooseSwerve("left");else if(selected.type==="swerveR")chooseSwerve("right");else draw()};
  $("driftL").onclick=()=>setSelected("driftL",1,"left drift");
  $("driftR").onclick=()=>setSelected("driftR",1,"right drift");
  $("steepDriftL").onclick=()=>setSelected("steepDriftL",3,"left steep drift");
  $("steepDriftR").onclick=()=>setSelected("steepDriftR",3,"right steep drift");
  $("swerveL").onclick=()=>chooseSwerve("left");$("swerveR").onclick=()=>chooseSwerve("right");
  $("controlledSkid").onclick=()=>{if(!["bendL","bendR","swerveL","swerveR"].includes(selected.type)){toast("Choose a bend or swerve first.");return}const distance=Number($("skidDistance").value);setSelected(selected.type,0,`${selected.label.replace(/ \+ .* skid$/,'')} + ${distance}\" controlled skid`,selected.angle,{skidDistance:distance})};
  $("tstopL").onclick=()=>setSelected("tstopL",0,"left T-stop");$("tstopR").onclick=()=>setSelected("tstopR",0,"right T-stop");
  $("bootleggerL").onclick=()=>setSelected("bootleggerL",7,"left bootlegger reverse");$("bootleggerR").onclick=()=>setSelected("bootleggerR",7,"right bootlegger reverse");
  $("pivotL").onclick=()=>setSelected("pivotL",0,`${$("pivotAngle").value}° left pivot`,Number($("pivotAngle").value));$("pivotR").onclick=()=>setSelected("pivotR",0,`${$("pivotAngle").value}° right pivot`,Number($("pivotAngle").value));
  $("pivotAngle").onchange=()=>{if(selected.type==="pivotL")$("pivotL").click();else if(selected.type==="pivotR")$("pivotR").click()};
  $("straight").onclick=()=>setSelected("straight",0,"go straight");
  $("commit").onclick=advance;
  if($("speedChange"))$("speedChange").onchange=e=>setSpeedDelta(Number(e.target.value));
  if($("reverse"))$("reverse").onclick=()=>{
    if(player.speed!==0||player.stoppedTurns<1){log(`${player.name} must remain stopped for a full turn before changing direction.`,"bad");return}
    player.direction*=-1;player.changedSpeed=true;pendingSpeedDelta=0;
    log(`${player.name} selects ${player.direction<0?"reverse":"forward"} gear.`,"warn");updateUI();draw();
  };
  $("fire").onclick=()=>{fire(player,ai);updateUI();draw();checkEnd()};

  if($("zoomIn"))$("zoomIn").onclick=()=>setZoom(camera.zoom*1.2);
  if($("zoomOut"))$("zoomOut").onclick=()=>setZoom(camera.zoom/1.2);
  if($("fitArena"))$("fitArena").onclick=fitArena;
  if($("centerPlayer"))$("centerPlayer").onclick=()=>centerOn(player);
  if($("followPlayer"))$("followPlayer").onclick=()=>{camera.follow=!camera.follow;$("followPlayer").textContent=`Follow: ${camera.follow?"On":"Off"}`;if(camera.follow)centerOn(player)};
  canvas.addEventListener("wheel",e=>{e.preventDefault();const r=canvas.getBoundingClientRect();setZoom(camera.zoom*(e.deltaY<0?1.12:.89),(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)},{passive:false});
  canvas.addEventListener("pointerdown",e=>{camera.dragging=true;camera.lastX=e.clientX;camera.lastY=e.clientY;camera.follow=false;if($("followPlayer"))$("followPlayer").textContent="Follow: Off";canvas.classList.add("dragging");canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{if(!camera.dragging)return;const r=canvas.getBoundingClientRect();camera.x+=(e.clientX-camera.lastX)*W/r.width;camera.y+=(e.clientY-camera.lastY)*H/r.height;camera.lastX=e.clientX;camera.lastY=e.clientY;draw()});
  canvas.addEventListener("pointerup",e=>{camera.dragging=false;canvas.classList.remove("dragging");try{canvas.releasePointerCapture(e.pointerId)}catch{}});
  if($("logFilter"))$("logFilter").onchange=applyLogFilter;if($("inspectCar"))$("inspectCar").onchange=updateInspector;
  if($("replayStart"))$("replayStart").onclick=()=>{stopReplay();restoreFrame(0,{autoResume:false})};if($("replayBack"))$("replayBack").onclick=()=>{stopReplay();restoreFrame(replayIndex-1,{autoResume:false})};if($("replayForward"))$("replayForward").onclick=()=>{stopReplay();restoreFrame(replayIndex+1)};if($("replayPlay"))$("replayPlay").onclick=toggleReplayPlay;if($("replaySlider"))$("replaySlider").oninput=e=>{stopReplay();restoreFrame(Number(e.target.value))};if($("exportReplay"))$("exportReplay").onclick=exportReplay;if($("importReplay"))$("importReplay").onchange=e=>{if(e.target.files[0])importReplayFile(e.target.files[0])};
  function toggleHotkeys(show){const o=$("hotkeyOverlay");if(!o)return;o.style.display=(show===undefined?(o.style.display==="none"?"flex":"none"):(show?"flex":"none"))}
  document.addEventListener("keydown",e=>{if(!started||locked)return;const tag=(e.target.tagName||"").toLowerCase();if(["input","select","textarea"].includes(tag))return;const k=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," ","enter"].includes(k))e.preventDefault();if(k==="h"||k==="?"){toggleHotkeys();return}if(k==="escape"){toggleHotkeys(false);setSelected("straight",0,"go straight");return}if($("hotkeyOverlay")&&$("hotkeyOverlay").style.display!=="none")return;if(k==="arrowup"||k==="w"){const o=speedChangeOptions(),i=o.indexOf(pendingSpeedDelta);setSpeedDelta(o[Math.min(o.length-1,Math.max(0,i)+1)])}else if(k==="arrowdown"||k==="x"){const o=speedChangeOptions(),i=o.indexOf(pendingSpeedDelta);setSpeedDelta(o[Math.max(0,i<0?0:i-1)])}else if(k==="c")setSpeedDelta(0);else if(k==="arrowleft"||k==="q")stepBend(-1);else if(k==="arrowright"||k==="e")stepBend(1);else if(k==="a")$("driftL").click();else if(k==="d")$("driftR").click();else if(k==="s")$("straight").click();else if(k==="v"&&$("reverse"))$("reverse").click();else if(k==="f")$("fire").click();else if(k===" "||k==="enter")$("commit").click()});
  if($("closeHotkeys"))$("closeHotkeys").onclick=()=>toggleHotkeys(false);
  updateUI();fitArena();draw();
})();
