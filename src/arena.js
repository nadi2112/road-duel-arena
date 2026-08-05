
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const Rules = window.RDA_CHAPTER2;
  const Combat = window.RDA_CHAPTER3;
  const Data = window.RDA_DATA;
  if (!Rules) throw new Error("Chapter 2 rules module did not load.");
  if (!Combat || !Data) throw new Error("Chapter 3 combat data did not load.");
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
    ammo:20, weaponDP:3, weapons:[], alive:true, maneuver:null, maneuverD:0, changedSpeed:false,
    lastFiredTurn:0, firedThisTurn:false, firingActionsUsed:0, firingActionsTurn:0, internal:10, pendingCrash:null, crashState:null, firePenalty:0, burning:false, fireExposures:[],componentFireChance:0,
    tireDP:{fl:9,fr:9,rl:9,rr:9}, direction:1, stoppedTurns:0, crashTrail:[], crashBannerUntil:0, crashMomentumHeading:null,
    forcedMove:null,pendingAutoDecel:0,turnStartSpeed:20,stunnedPhases:0,lastCollision:null,armorTypeKey:"plastic",phaseDamage:0,
    bodyKey:"compact",crew:[],cargo:{name:"Cargo",dp:5,maxDP:5},powerPlant:{key:"large",name:"Large",dp:10,maxDP:10,powerUnits:250,maxPowerUnits:250},paintedUntil:0,oilContact:false,substituteProgress:0
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
    car.bodyKey = design.bodyKey || "compact";
    car.damageModifier = Rules.damageModifier(car.weight);
    car.armorTypeKey = design.armorTypeKey || "plastic";
    car.suspensionKey=design.suspensionKey||"improved";car.frontTireKey=design.frontTireKey||"puncture";car.rearTireKey=design.rearTireKey||"puncture";
    car.reverseTopSpeed = Math.max(5, Math.floor(car.topSpeed / 5 / 5) * 5);
    car.armor = Object.assign(car.armor, design.armor || {});
    const tireSpecs=window.RDA_DATA?.tires||{};
    const frontDP=tireSpecs[design.frontTireKey]?.dp||9,rearDP=tireSpecs[design.rearTireKey]?.dp||9;
    car.tireDP={fl:frontDP,fr:frontDP,rl:rearDP,rr:rearDP};
    const plant=Data.plants[design.plantKey]||Data.plants.large;
    car.powerPlant={key:design.plantKey||"large",name:plant.name,dp:plant.dp,maxDP:plant.dp,powerUnits:plant.spaces*50,maxPowerUnits:plant.spaces*50};
    car.cargo={name:"Cargo",dp:Math.max(1,Math.min(10,Math.round((design.maxSpaces-design.spaces)||5))),maxDP:Math.max(1,Math.min(10,Math.round((design.maxSpaces-design.spaces)||5)))};
    const crewDesign=design.crew||{drivers:1,gunners:0,passengers:0};
    car.crew=[{id:"driver",name:"Driver",role:"driver",dp:3,maxDP:3}];
    for(let i=0;i<(crewDesign.gunners||0);i++)car.crew.push({id:`gunner${i+1}`,name:`Gunner ${i+1}`,role:"gunner",dp:3,maxDP:3});
    for(let i=0;i<(crewDesign.passengers||0);i++)car.crew.push({id:`passenger${i+1}`,name:`Passenger ${i+1}`,role:"passenger",dp:3,maxDP:3});
    car.weapons=(design.weapons||[{weapon:"mg",mount:"front"}]).map((installed,index)=>{const spec=Data.weapons[installed.weapon]||Data.weapons.mg;return{id:`w${index}`,key:installed.weapon,mount:installed.mount||"front",link:installed.link||"",grenadeType:installed.grenadeType||"explosive",name:spec.name,dp:spec.dp,maxDP:spec.dp,ammo:spec.ammo,lastFiredTurn:0,lastTargetId:null,sustainedTurns:0,automatic:false}});
    const first=car.weapons[0];car.ammo=first?.ammo??0;car.weaponDP=first?.dp??0;car.weaponName=first?.name||"No weapon";
    car.firingActionsUsed=0;car.firingActionsTurn=0;car.fireExposures=[];car.componentFireChance=0;car.burning=false;car.paintedUntil=0;car.oilContact=false;car.substituteProgress=0;
    car.internal=car.powerPlant.dp+car.crew.reduce((sum,member)=>sum+member.dp,0)+car.cargo.dp;
  }
  let turn=1, phase=1, started=false, selected={type:"straight",d:0,angle:0,label:"Go straight"}, pendingSpeedDelta=0, locked=false;
  let rngSeed=(Date.now()>>>0)||1, rngState=rngSeed;
  let replay={version:"0.7.0",seed:rngSeed,initial:null,frames:[],events:[]}, replayIndex=-1, replayTimer=null, replayMode=false;
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
  const barriers=[
    {id:"north-rail",x:W/2-120,y:H/2-150,w:240,h:18,dp:18,maxDP:18,dm:3,destroyed:false},
    {id:"south-rail",x:W/2-120,y:H/2+132,w:240,h:18,dp:18,maxDP:18,dm:3,destroyed:false},
    {id:"center-block",x:W/2-15,y:H/2-65,w:30,h:130,dp:24,maxDP:24,dm:4,destroyed:false}
  ];
  const debris=[];
  const combatHazards=[];
  const pendingGrenades=[];
  const pendingFireIntents=[];
  let hazardId=0;
  const activeContacts=new Set();
  const movementConsumed=new Set();
  const impactMarks=[];
  const CONTACT_GAP=4;
  function boxForCar(car){return{x:car.x,y:car.y,halfL:18,halfW:10,heading:car.heading}}
  function boxForRect(r){return{x:r.x+r.w/2,y:r.y+r.h/2,halfL:r.w/2,halfW:r.h/2,heading:0}}
  function boxAxes(box){const h=rad(box.heading);return[{x:Math.cos(h),y:Math.sin(h)},{x:-Math.sin(h),y:Math.cos(h)}]}
  function boxCorners(box){const [forward,side]=boxAxes(box);return[[-1,-1],[-1,1],[1,1],[1,-1]].map(([a,b])=>({x:box.x+forward.x*box.halfL*a+side.x*box.halfW*b,y:box.y+forward.y*box.halfL*a+side.y*box.halfW*b}))}
  function projected(corners,axis){const values=corners.map(p=>p.x*axis.x+p.y*axis.y);return{min:Math.min(...values),max:Math.max(...values)}}
  function boxesOverlap(a,b){const ac=boxCorners(a),bc=boxCorners(b),axes=[...boxAxes(a),...boxAxes(b)];return axes.every(axis=>{const ap=projected(ac,axis),bp=projected(bc,axis);return ap.max>=bp.min&&bp.max>=ap.min})}
  function boxesWithinGap(a,b,gap=CONTACT_GAP){const ac=boxCorners(a),bc=boxCorners(b),axes=[...boxAxes(a),...boxAxes(b)];return axes.every(axis=>{const ap=projected(ac,axis),bp=projected(bc,axis);return ap.max+gap>=bp.min&&bp.max+gap>=ap.min})}
  function hitBarrier(car){return barriers.find(r=>!r.destroyed&&boxesOverlap(boxForCar(car),boxForRect(r)))}
  function collisionWall(car){
    return boxCorners(boxForCar(car)).some(point=>point.x<arena.x||point.x>arena.x+arena.w||point.y<arena.y||point.y>arena.y+arena.h);
  }
  function nearArenaWall(car,gap=CONTACT_GAP){
    const corners=boxCorners(boxForCar(car)),xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
    return Math.min(...xs)<=arena.x+gap||Math.max(...xs)>=arena.x+arena.w-gap||Math.min(...ys)<=arena.y+gap||Math.max(...ys)>=arena.y+arena.h-gap;
  }
  function clampInsideArena(car){
    const corners=boxCorners(boxForCar(car)),xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    if(minX<arena.x)car.x+=arena.x-minX;if(maxX>arena.x+arena.w)car.x-=maxX-(arena.x+arena.w);
    if(minY<arena.y)car.y+=arena.y-minY;if(maxY>arena.y+arena.h)car.y-=maxY-(arena.y+arena.h);
  }
  function movementHeading(car){return norm(car.heading+(car.direction<0?180:0))}
  function motionHeading(car){return car.crashState?.heading??car.forcedMove?.momentumHeading??movementHeading(car)}
  function collisionLabel(type){return{headOn:"Head-on",rearEnd:"Rear-end",tBone:"T-bone",sideswipe:"Sideswipe"}[type]||type}
  function contactKey(a,b){return[a.id,b.id].sort().join(":")}
  function signedDelta(target,current){let d=norm(target-current);if(d>180)d-=360;return d}
  function interpolateHeading(from,to,t){return norm(from+signedDelta(to,from)*t)}
  function setPose(car,from,to,t){car.x=from.x+(to.x-from.x)*t;car.y=from.y+(to.y-from.y)*t;car.heading=interpolateHeading(from.heading??to.heading,to.heading,t)}
  function fixedContactAt(car){const object=hitBarrier(car);if(object)return{object,isWall:false};return collisionWall(car)?{object:null,isWall:true}:null}
  function sweepFixedContact(car,previous){
    const final={x:car.x,y:car.y,heading:car.heading},from={x:previous.x,y:previous.y,heading:previous.heading??car.heading};
    const startCar={...car,...from},finalCar={...car,...final},startBlock=fixedContactAt(startCar),finalBlock=fixedContactAt(finalCar);
    if(startBlock&&!finalBlock){setPose(car,from,final,1);return{hit:false,final}}
    const distance=Math.hypot(final.x-from.x,final.y-from.y),turn=Math.abs(signedDelta(final.heading,from.heading));
    const steps=Math.max(1,Math.ceil(distance/2),Math.ceil(turn/3));
    const result=Rules.sweepToContact(t=>{setPose(car,from,final,t);return Boolean(fixedContactAt(car))},steps);
    if(!result.hit){setPose(car,from,final,1);return{hit:false,final}}
    setPose(car,from,final,result.contactT);const block=fixedContactAt(car);
    const contact={x:car.x,y:car.y,heading:car.heading};setPose(car,from,final,result.safeT);
    const safe={x:car.x,y:car.y,heading:car.heading};
    return{hit:true,object:block?.object??finalBlock?.object??null,isWall:block?.isWall??finalBlock?.isWall??false,safe,contact,final};
  }
  function sweepVehicleContact(car,other,previous){
    const final={x:car.x,y:car.y,heading:car.heading};
    const previousCar={...car,x:previous.x,y:previous.y,heading:previous.heading??car.heading};
    const movingAway=(final.x-previous.x)*(previous.x-other.x)+(final.y-previous.y)*(previous.y-other.y)>0;
    if(boxesOverlap(boxForCar(previousCar),boxForCar(other))&&movingAway&&!boxesOverlap(boxForCar(final),boxForCar(other))){
      car.x=final.x;car.y=final.y;car.heading=final.heading;return{hit:false,final};
    }
    const distance=Math.hypot(final.x-previous.x,final.y-previous.y),steps=Math.max(1,Math.ceil(distance/3));
    let safe={x:previous.x,y:previous.y,heading:previous.heading??car.heading};
    for(let i=1;i<=steps;i++){
      const t=i/steps;car.x=previous.x+(final.x-previous.x)*t;car.y=previous.y+(final.y-previous.y)*t;car.heading=interpolateHeading(previous.heading??final.heading,final.heading,t);
      if(boxesOverlap(boxForCar(car),boxForCar(other)))return{hit:true,safe,contact:{x:car.x,y:car.y,heading:car.heading},final};
      safe={x:car.x,y:car.y,heading:car.heading};
    }
    car.x=final.x;car.y=final.y;car.heading=final.heading;return{hit:false,final};
  }
  function fixedPathBlock(vehicle,dx,dy){
    const previous={x:vehicle.x,y:vehicle.y,heading:vehicle.heading},probe={...vehicle,x:vehicle.x+dx,y:vehicle.y+dy};
    const sweep=sweepFixedContact(probe,previous);return sweep.hit?sweep:null;
  }
  function fixedContactKey(vehicle,block){return`${vehicle.id}:${block.isWall?"wall":block.object.id}`}
  function haltBlockedPair(car,other,block,sweep){
    const moving1=car.speed>0,moving2=other.speed>0,key=fixedContactKey(other,block);
    const otherPrevious={x:other.x,y:other.y,heading:other.heading},pushX=block.safe.x-other.x,pushY=block.safe.y-other.y;
    car.x=sweep.safe.x+pushX;car.y=sweep.safe.y+pushY;car.heading=sweep.safe.heading;
    if(!activeContacts.has(key)){
      other.x=block.contact.x;other.y=block.contact.y;
      fixedObjectCollision(other,block.object,otherPrevious,block.isWall,block);
    }else{other.x=block.safe.x;other.y=block.safe.y;other.heading=block.safe.heading}
    car.speed=0;other.speed=0;endCrashAtHalt(car);endCrashAtHalt(other);
    if(moving1||moving2)log(`${car.name} cannot push ${other.name} through ${block.isWall?"the arena wall":block.object.id}; both vehicles stop.`,"warn","movement");
  }
  function pushContactPair(car,other,sweep){
    const dx=sweep.final.x-sweep.safe.x,dy=sweep.final.y-sweep.safe.y;
    const block=fixedPathBlock(other,dx,dy);
    if(block){haltBlockedPair(car,other,block,sweep);return"halt"}
    car.x=sweep.final.x;car.y=sweep.final.y;car.heading=sweep.final.heading;
    other.x+=dx;other.y+=dy;movementConsumed.add(other.id);
    return"push";
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
    const sweep=sweepVehicleContact(car,other,previous),key=contactKey(car,other);
    if(!sweep.hit){if(!boxesWithinGap(boxForCar(car),boxForCar(other)))activeContacts.delete(key);return false}
    const wasActive=activeContacts.has(key);car.x=sweep.safe.x;car.y=sweep.safe.y;car.heading=sweep.safe.heading;
    const face1=sideHit(car,other),face2=sideHit(other,car),motion1=motionHeading(car),motion2=motionHeading(other);
    const type=Rules.classifyCollision({attackerFace:face1,defenderFace:face2,attackerMotion:motion1,defenderMotion:motion2,attackerDirection:car.direction,defenderDirection:other.direction});
    const sameDirection=Rules.angleDifference(motion1,motion2)<=45;
    const original1=car.speed,original2=other.speed,speeds=Rules.collisionSpeeds(type,original1,original2,car.damageModifier,other.damageModifier,sameDirection);
    const dx=sweep.final.x-previous.x,dy=sweep.final.y-previous.y,toOtherX=other.x-previous.x,toOtherY=other.y-previous.y;
    const movingToward=!wasActive||dx*toOtherX+dy*toOtherY>0;
    const block=(wasActive||speeds.collisionSpeed<=0)&&movingToward?fixedPathBlock(other,sweep.final.x-sweep.safe.x,sweep.final.y-sweep.safe.y):null;
    const action=Rules.contactAction({activeContact:wasActive,collisionSpeed:speeds.collisionSpeed,movingToward,pushedBlocked:Boolean(block)});
    if(action!=="impact"){
      activeContacts.add(key);
      if(action==="halt")haltBlockedPair(car,other,block,sweep);
      else if(action==="push")pushContactPair(car,other,sweep);
      return true;
    }
    activeContacts.add(key);
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
  function fixedObjectCollision(car,object,previous,isWall=false,sweep=null){
    const attempted=sweep?.contact||{x:car.x,y:car.y,heading:car.heading},safe=sweep?.safe||{x:previous.x,y:previous.y,heading:previous.heading??car.heading},key=`${car.id}:${isWall?"wall":object.id}`;
    car.x=safe.x;car.y=safe.y;car.heading=safe.heading;
    const wallDistances=[{distance:Math.abs(attempted.x-arena.x),point:{x:arena.x,y:attempted.y}},{distance:Math.abs(attempted.x-(arena.x+arena.w)),point:{x:arena.x+arena.w,y:attempted.y}},{distance:Math.abs(attempted.y-arena.y),point:{x:attempted.x,y:arena.y}},{distance:Math.abs(attempted.y-(arena.y+arena.h)),point:{x:attempted.x,y:arena.y+arena.h}}];
    const center=isWall?wallDistances.sort((a,b)=>a.distance-b.distance)[0].point:{x:object.x+object.w/2,y:object.y+object.h/2};
    const face=sideHit(car,center),sideswipe=face==="left"||face==="right",collisionSpeed=sideswipe?Rules.roundUp5(car.speed/4):car.speed,original=car.speed;
    if(activeContacts.has(key)){
      if(!sideswipe&&car.speed>0){car.speed=0;endCrashAtHalt(car);log(`${car.name} remains blocked by ${isWall?"the arena wall":object.id} and stops.`,"warn","movement")}
      return;
    }
    activeContacts.add(key);
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
  function hazardProximity(car,hazard){const angle=rad(-(hazard.heading||0)),dx=car.x-hazard.x,dy=car.y-hazard.y,x=dx*Math.cos(angle)-dy*Math.sin(angle),y=dx*Math.sin(angle)+dy*Math.cos(angle),halfL=hazard.length*SCALE/2,halfW=hazard.width*SCALE/2,direct=Math.abs(x)<=halfL+10&&Math.abs(y)<=halfW+8,adjacent=Math.abs(x)<=halfL+SCALE/2+10&&Math.abs(y)<=halfW+SCALE/2+8;return{direct,adjacent}}
  function expireCombatHazards(){
    for(let i=combatHazards.length-1;i>=0;i--){const hazard=combatHazards[i];if(hazard.expiresSerial>phaseSerial())continue;if(hazard.type==="flamingOil"){hazard.type="smoke";hazard.cloud=true;hazard.expiresSerial=phaseSerial()+300;log("A flaming-oil slick burns out and leaves smoke.","warn","combat")}else combatHazards.splice(i,1)}
  }
  function triggerMine(car,hazard,spear=false){
    const under=Combat.rollDamage(spear?"2d+3":"2d",()=>roll(1));damage(car,under.total,"under",spear?"Spear 1000 mine":"Mine",{weaponSpec:spear?Data.weapons.smd:Data.weapons.md,damageRolls:under.rolls});Object.keys(car.tireDP).forEach(key=>{const tire=Combat.rollDamage(spear?"1d-3":"1d",()=>roll(1));damageTire(car,key,tire.total,spear?"Spear 1000 mine":"Mine")});hazard.active=false;log(`${car.name} detonates ${spear?"a Spear 1000 mine":"a mine"}: ${under.total} underbody damage.`,"bad","damage");weaponDamageHazard(car,under.total)
  }
  function resolveCombatHazards(car){
    expireCombatHazards();car.oilContact=false;
    combatHazards.forEach(hazard=>{if(hazard.active===false||hazard.armedSerial>phaseSerial())return;const proximity=hazardProximity(car,hazard);if(!proximity.adjacent)return;
      if(hazard.type==="oil"||hazard.type==="flamingOil")car.oilContact=proximity.direct;
      if(hazard.checkedBy.includes(car.id))return;hazard.checkedBy.push(car.id);if(hazard.type==="paint"&&proximity.direct){car.paintedUntil=Math.max(car.paintedUntil,turn+3);log(`${car.name}'s windshield is coated with paint through turn ${car.paintedUntil}.`,"bad","combat")}const trigger=roll(1),needed=proximity.direct?4:2;
      if(hazard.type==="mine"&&trigger<=needed)triggerMine(car,hazard,false);
      else if(hazard.type==="spearMine"&&trigger<=needed)triggerMine(car,hazard,true);
      else if(hazard.type==="spikes"&&trigger<=needed){Object.keys(car.tireDP).forEach(key=>{let amount=roll(1);const tireType=key[0]==="f"?car.frontTireKey:car.rearTireKey;if(tireType==="solid")amount=Math.ceil(amount/2);damageTire(car,key,amount,"Road spikes")});log(`${car.name} crosses a spike field.`,"bad","damage")}
      else if(hazard.type==="flamingOil"&&proximity.direct){const under=Combat.rollDamage("1d-2",()=>roll(1));const result=damage(car,under.total,"under","Flaming oil",{weaponSpec:Data.weapons.foj,damageRolls:under.rolls});Object.keys(car.tireDP).forEach(key=>damageTire(car,key,Combat.rollDamage("1d-2",()=>roll(1)).total,"Flaming oil"));addFireExposure(car,Data.weapons.foj,result);controlCheck(car,3+Rules.surfaceModifier(roadSurface),"hazard")}
    });
    for(let i=combatHazards.length-1;i>=0;i--)if(combatHazards[i].active===false)combatHazards.splice(i,1)
  }
  function resolveSolidCollisions(car,previous,uncontrolled=false){
    const fixedSweep=sweepFixedContact(car,previous);if(fixedSweep.hit){fixedObjectCollision(car,fixedSweep.object,previous,fixedSweep.isWall,fixedSweep);clampInsideArena(car)}
    const other=car===player?ai:player;if(car.alive&&other.alive)resolveVehicleCollision(car,other,previous);
    resolveDebris(car);resolveCombatHazards(car);
  }
  function recomputeInternal(target){target.internal=Math.max(0,(target.powerPlant?.dp||0)+(target.cargo?.dp||0)+(target.crew||[]).reduce((sum,member)=>sum+Math.max(0,member.dp),0))}
  function componentHit(target,component,amount,source){
    if(!component||amount<=0)return amount;
    const before=component.dp||0,taken=Math.min(before,amount);component.dp=Math.max(0,before-taken);const overflow=Math.max(0,amount-taken);
    log(`${source}: ${component.name} takes ${taken} DP${overflow?`; ${overflow} passes inward`:""}.`,taken?"bad":"warn","damage");
    if(component.role){
      if(component.role==="driver"&&before===3&&component.dp<3){log(`${target.name}'s driver is wounded: D2 hazard and -2 skill.`,"bad","control");controlCheck(target,2+Rules.surfaceModifier(roadSurface),"hazard")}
      if(component.dp===1&&before>1)log(`${component.name} is unconscious.`,"bad","damage");
      if(component.dp===0&&before>0)log(`${component.name} is killed.`,"bad","damage");
    }
    if(component===target.powerPlant&&component.dp===0&&before>0){target.accel=0;target.powerPlant.powerUnits=0;log(`${target.name}'s power plant is destroyed; acceleration and laser fire are lost.`,"bad","damage")}
    if(component.id?.startsWith("w")&&component.dp===0&&before>0){component.automatic=false;log(`${target.name}'s ${component.name} is destroyed.`,"bad","damage")}
    const volatileComponent=component===target.powerPlant||["ft","foj"].includes(component.key);if(taken&&volatileComponent&&!/ram|wall|barrier|rollover|vault|vehicle fire/i.test(source)){const incendiary=/laser|flamethrower|flaming oil/i.test(source);target.componentFireChance=Math.max(target.componentFireChance||0,incendiary?4:2)}
    return overflow;
  }
  function hitWeaponLayer(target,mount,amount,source){const candidates=target.weapons.filter(weapon=>weapon.mount===mount&&weapon.dp>0);if(!candidates.length)return amount;return componentHit(target,candidates[Math.floor(random()*candidates.length)],amount,source)}
  function hitCrewLayer(target,amount,source){const candidates=target.crew.filter(member=>member.dp>0);if(!candidates.length)return amount;return componentHit(target,candidates[Math.floor(random()*candidates.length)],amount,source)}
  function hitRandomInternal(target,amount,source){const choices=[target.powerPlant,target.cargo,...target.crew].filter(component=>component&&component.dp>0);if(!choices.length)return amount;return componentHit(target,choices[Math.floor(random()*choices.length)],amount,source)}
  function routeWeaponDamage(target,amount,side,source){
    if(amount<=0)return 0;let remaining=amount;
    if(side==="front"){remaining=hitWeaponLayer(target,"front",remaining,source);remaining=componentHit(target,target.powerPlant,remaining,source);remaining=hitCrewLayer(target,remaining,source);remaining=componentHit(target,target.cargo,remaining,source);remaining=hitWeaponLayer(target,"back",remaining,source)}
    else if(side==="back"){remaining=hitWeaponLayer(target,"back",remaining,source);remaining=componentHit(target,target.cargo,remaining,source);remaining=hitCrewLayer(target,remaining,source);remaining=componentHit(target,target.powerPlant,remaining,source);remaining=hitWeaponLayer(target,"front",remaining,source)}
    else if(side==="right"){remaining=hitWeaponLayer(target,"right",remaining,source);remaining=hitRandomInternal(target,remaining,source);remaining=hitWeaponLayer(target,"left",remaining,source)}
    else if(side==="left"){remaining=hitWeaponLayer(target,"left",remaining,source);remaining=hitRandomInternal(target,remaining,source);remaining=hitWeaponLayer(target,"right",remaining,source)}
    else if(side==="top"){remaining=hitWeaponLayer(target,"top",remaining,source);remaining=hitRandomInternal(target,remaining,source);remaining=hitWeaponLayer(target,"under",remaining,source)}
    else {remaining=hitWeaponLayer(target,"under",remaining,source);remaining=hitRandomInternal(target,remaining,source);remaining=hitWeaponLayer(target,"top",remaining,source)}
    recomputeInternal(target);if(remaining>0)log(`${remaining} damage passes completely through ${target.name}.`,"warn","damage");
    if(!target.crew.some(member=>member.dp>0)){target.alive=false;log(`${target.name} has no surviving crew and is out of the duel!`,"bad","damage")}
    return amount-remaining;
  }
  function damage(target, amount, side, source,options={}){
    let incoming=Math.max(0,Math.floor(amount));const originalIncoming=incoming,armorBefore=target.armor[side]||0,spec=options.weaponSpec||null;
    if(spec?.laser&&["reflective","lrfp"].includes(target.armorTypeKey)&&armorBefore>0)incoming=Math.floor(incoming/2);
    let absorbedArmor=0,absorbed=0,penetrated=0;
    if(target.armorTypeKey==="metal"){
      if(options.collision){const metal=Combat.metalCollisionArmor(incoming,armorBefore);absorbed=metal.absorbed;absorbedArmor=metal.loss;target.armor[side]=Math.max(0,armorBefore-absorbedArmor);penetrated=metal.penetrated}
      else if(spec){absorbed=Math.min(incoming,armorBefore);penetrated=Math.max(0,incoming-armorBefore);const loss=(options.damageRolls||[]).filter(value=>spec.burst?value>=5:value===6).length;target.armor[side]=Math.max(0,armorBefore-loss);absorbedArmor=loss}
      else {absorbed=Math.min(incoming,armorBefore);penetrated=incoming-absorbed}
    }else{absorbedArmor=Math.min(armorBefore,incoming);target.armor[side]=Math.max(0,armorBefore-absorbedArmor);absorbed=absorbedArmor;penetrated=incoming-absorbed}
    log(`${source}: ${target.name} ${side} armor absorbs ${absorbed}${incoming!==originalIncoming?` after reflective armor halves the laser hit`:""}.`,"warn","damage");
    target.phaseDamage+=incoming;
    if(penetrated>0){log(`${penetrated} internal damage penetrates!`,"bad","damage");if(options.turret){const passed=hitWeaponLayer(target,"top",penetrated,source);recomputeInternal(target);if(passed)log(`${passed} damage passes above the vehicle after crossing the turret.`,"warn","damage")}else routeWeaponDamage(target,penetrated,side,source)}
    if(incoming>=10){debris.push({x:target.x+(random()-.5)*24,y:target.y+(random()-.5)*18,hitBy:new Set([target.id])});log(`${target.name} sheds road debris from the impact.`,"warn","damage")}
    if(target.internal<=0){target.alive=false;log(`${target.name} is destroyed!`,"bad","damage")}
    return{incoming,absorbed,penetrated,armorBreached:target.armor[side]<=0};
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
  function difficultyFor(car,mv){const type=maneuverRuleType(mv?.type),defaultAngle=(type==="bend"||type==="swerve")?15:0,base=Rules.maneuverDifficulty(type,{angle:mv?.angle||defaultAngle,skidDistance:mv?.skidDistance,reverse:car.direction<0,surface:roadSurface,speed:car.speed});return base+(base>0&&car.oilContact?2:0)}
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
    const other=car===player?ai:player;if(!boxesWithinGap(boxForCar(car),boxForCar(other)))activeContacts.delete(contactKey(car,other));
    barriers.forEach(b=>{if(b.destroyed||!boxesWithinGap(boxForCar(car),boxForRect(b)))activeContacts.delete(`${car.id}:${b.id}`)});
    if(!nearArenaWall(car))activeContacts.delete(`${car.id}:wall`);
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
    if(movementConsumed.delete(car.id)){releaseSeparatedContacts(car);return}
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
  const phaseSerial=()=>((turn-1)*5+phase);
  const modifierText=value=>value>0?`+${value}`:`${value}`;
  const weaponSpec=weapon=>Data.weapons[weapon?.key]||Data.weapons.mg;
  const ammoText=weapon=>weapon?.ammo===null?"∞":Math.max(0,weapon?.ammo||0);
  function firingCrew(car){const driver=car.crew.find(member=>member.role==="driver"&&member.dp>1),gunners=car.crew.filter(member=>member.role==="gunner"&&member.dp>1);return[...(driver?[driver]:[]),...gunners]}
  function driverOperational(car){return Boolean(car.crew.find(member=>member.role==="driver"&&member.dp>1))}
  function firingActionLimit(car){return firingCrew(car).length}
  function firingActionsLeft(car){if(car.firingActionsTurn!==turn){car.firingActionsTurn=turn;car.firingActionsUsed=0}return Math.max(0,firingActionLimit(car)-car.firingActionsUsed)}
  function selectedWeapons(car,value){
    const selection=value||((car===player&&$("weaponSelect"))?$("weaponSelect").value:car.weapons[0]?.id);
    if(String(selection).startsWith("link:")){const link=String(selection).slice(5);return car.weapons.filter(weapon=>weapon.link===link)}
    const id=String(selection).replace(/^weapon:/,"");return car.weapons.filter(weapon=>weapon.id===id);
  }
  function segmentIntersectsRect(a,b,rect){
    const steps=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));
    for(let i=1;i<steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(x>=rect.x&&x<=rect.x+rect.w&&y>=rect.y&&y<=rect.y+rect.h)return true}return false;
  }
  function segmentIntersectsHazard(a,b,hazard){const steps=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5)),angle=rad(-(hazard.heading||0)),halfL=hazard.length*SCALE/2,halfW=hazard.width*SCALE/2;for(let i=1;i<steps;i++){const t=i/steps,dx=a.x+(b.x-a.x)*t-hazard.x,dy=a.y+(b.y-a.y)*t-hazard.y,x=dx*Math.cos(angle)-dy*Math.sin(angle),y=dx*Math.sin(angle)+dy*Math.cos(angle);if(Math.abs(x)<=halfL&&Math.abs(y)<=halfW)return true}return false}
  function mountOrigin(car,mount){const h=rad(car.heading),f={x:Math.cos(h),y:Math.sin(h)},s={x:-Math.sin(h),y:Math.cos(h)},offset={front:[18,0],back:[-18,0],left:[0,-10],right:[0,10],top:[0,0],under:[0,0]}[mount]||[0,0];return{x:car.x+f.x*offset[0]+s.x*offset[1],y:car.y+f.y*offset[0]+s.y*offset[1]}}
  function cloudInterference(origin,target,spec){
    let halfInches=0,blocked=false;
    combatHazards.filter(hazard=>hazard.cloud&&hazard.active!==false).forEach(hazard=>{if(segmentIntersectsHazard(origin,target,hazard)){halfInches+=Math.max(1,Math.ceil(hazard.width/.5));if(spec.laser&&!spec.infrared)blocked=true}});
    return{modifier:spec.infrared?0:-halfInches,damagePenalty:spec.infrared?halfInches:0,blocked};
  }
  function lineOfFire(shooter,target,weapon){
    const spec=weaponSpec(weapon),origin=mountOrigin(shooter,weapon.mount);
    const barrier=barriers.find(item=>!item.destroyed&&segmentIntersectsRect(origin,target,item));
    if(barrier)return{clear:false,reason:`${barrier.id} blocks line of fire`,visibility:0,damagePenalty:0};
    const clouds=cloudInterference(origin,target,spec);if(clouds.blocked)return{clear:false,reason:"smoke or paint blocks laser fire",visibility:clouds.modifier};
    return{clear:true,visibility:clouds.modifier,damagePenalty:clouds.damagePenalty};
  }
  function movingTowardEachOther(a,b){const va={x:Math.cos(rad(movementHeading(a)))*(a.speed||0),y:Math.sin(rad(movementHeading(a)))*(a.speed||0)},vb={x:Math.cos(rad(movementHeading(b)))*(b.speed||0),y:Math.sin(rad(movementHeading(b)))*(b.speed||0)},delta={x:b.x-a.x,y:b.y-a.y};return (vb.x-va.x)*delta.x+(vb.y-va.y)*delta.y<0}
  function targetRequest(car){return car===player?($("targetLocation")?.value||"auto"):"auto"}
  function shotCalculation(shooter,target,weapon,request="auto",options={}){
    weapon=weapon||shooter.weapons[0];const spec=weaponSpec(weapon),range=dist(shooter,target)/SCALE,movement=Combat.relativeMovementSpeed(shooter,target,movingTowardEachOther(shooter,target)),targetFace=sideHit(target,shooter),requestedSide=request.includes(":")||request==="turret"?"auto":request,sidePenalty=Combat.targetedSidePenalty(target,shooter,requestedSide),lof=lineOfFire(shooter,target,weapon);
    const visibility={lightRain:-2,heavyRain:-3}[roadSurface]||0,specific=request.startsWith("tire:")?-3:request==="turret"?-2:0,surface=["oil","gravel"].includes(roadSurface)?-1:0,sustained=options.automatic?0:Combat.sustainedFireBonus(weapon,target.id,turn);
    const modifiers=[
      {name:"Range",value:Combat.rangeModifier(range),detail:`${range.toFixed(2)} in`},
      {name:"Relative movement",value:Combat.speedModifier(movement.speed),detail:`${Math.abs(movement.speed).toFixed(1)} mph · ${movement.firerInTarget}/${movement.targetInFirer}`},
      {name:"Target stationary",value:target.speed===0?1:0,detail:target.speed===0?"yes":"no"},
      {name:"Firer stationary",value:shooter.speed===0?1:0,detail:shooter.speed===0?"yes":"no"},
      {name:"Vehicle profile",value:Combat.vehicleTargetModifier(target.bodyKey,targetFace),detail:`${target.bodyKey} · ${targetFace}`},
      {name:"Specific target",value:specific,detail:request},
      {name:"Target-side angle",value:sidePenalty??-99,detail:sidePenalty===null?"not visible":requestedSide},
      {name:"Visibility",value:visibility+lof.visibility,detail:lof.damagePenalty?`IR damage -${lof.damagePenalty} per die`:lof.visibility?"cloud in line of fire":roadSurface},
      {name:"Road surface",value:surface,detail:roadSurface},
      {name:"Painted windshield",value:shooter.paintedUntil>=turn?-2:0,detail:shooter.paintedUntil>=turn?`through turn ${shooter.paintedUntil}`:"clear"},
      {name:"Sustained fire",value:sustained,detail:sustained?`+${sustained}`:"none"},
      {name:"Wounded firer",value:options.crewPenalty||0,detail:options.crewPenalty?"skill -2":"none"},
      {name:"Maneuver this phase",value:options.automatic?0:-(shooter.maneuverD||0),detail:`D${shooter.maneuverD||0}`},
      {name:"Crash / skid penalty",value:options.automatic?0:-(shooter.firePenalty||0),detail:shooter.firePenalty?`-${shooter.firePenalty}`:"none"}
    ];
    if(spec.spikeGun&&request.startsWith("tire:")){const targetEntry=modifiers.find(item=>item.name==="Specific target");targetEntry.value=-4;targetEntry.detail="direct spike-gun shot"}
    const total=modifiers.reduce((sum,item)=>sum+item.value,0),targetNum=spec.toHit===null?null:spec.toHit-total;
    return{base:spec.toHit,range,movement,modifiers,total,targetNum,targetFace,sidePenalty,lof,request,spec};
  }
  function consumeWeapon(car,weapon){const spec=weaponSpec(weapon);if(weapon.ammo!==null)weapon.ammo=Math.max(0,weapon.ammo-1);if(spec.powerDrain)car.powerPlant.powerUnits=Math.max(0,car.powerPlant.powerUnits-spec.powerDrain);weapon.lastFiredTurn=turn;car.lastFiredTurn=turn;car.firedThisTurn=true}
  function weaponReady(car,weapon,{automatic=false,resolving=false,simultaneous=false}={}){
    const spec=weaponSpec(weapon);if(!weapon||(!simultaneous&&weapon.dp<=0))return"destroyed";if(!automatic&&weapon.automatic)return"set to automatic fire";if(!resolving&&weapon.queuedTurn===turn)return"queued for this phase";if(weapon.ammo!==null&&weapon.ammo<=0)return"out of ammunition";if(weapon.lastFiredTurn===turn&&!(automatic&&spec.dropped))return"already fired this turn";if(spec.laser&&!simultaneous&&(car.powerPlant.dp<=0||car.powerPlant.powerUnits<(spec.powerDrain||0)))return"insufficient power";if(!automatic&&car.firePenalty>=99)return"aimed fire prohibited after loss of control";return"";
  }
  function addFireExposure(target,spec,result){if(!spec.fireModifier||(["reflective","lrfp"].includes(target.armorTypeKey)&&spec.laser&&!result.penetrated))return;if(["fireproof","lrfp","metal"].includes(target.armorTypeKey)&&!result.penetrated)return;target.fireExposures.push({value:spec.fireModifier,expiresTurn:turn+(spec.burnDuration||0),source:spec.name})}
  function weaponDamageHazard(target,total){if(total<=0)return;controlCheck(target,(total>=10?3:total>=6?2:1)+Rules.surfaceModifier(roadSurface)+(target.oilContact?2:0),"hazard")}
  function applyDirectHit(shooter,target,weapon,shot){
    const spec=shot.spec,request=shot.request,damageRoll=Combat.rollDamage(spec.damage,()=>roll(1));let amount=damageRoll.total;if(spec.infrared&&shot.lof.damagePenalty){const parsed=Combat.parseDamage(spec.damage);amount=Math.max(0,damageRoll.rolls.reduce((sum,value)=>sum+Math.max(0,value-shot.lof.damagePenalty),0)+parsed.modifier);log(`${spec.name} loses ${shot.lof.damagePenalty} point per damage die while crossing smoke or paint.`,"warn","combat")}
    if(request.startsWith("tire:")){const key=request.slice(5);damageTire(target,key,amount,spec.name);log(`Hit! ${spec.name} does ${amount} to ${target.name}'s ${key.toUpperCase()} tire.`,"good","damage");return amount}
    if(spec.spikeGun){log(`${spec.name} can damage vehicles only through a direct tire shot.`,"warn","combat");return 0}
    const side=request==="turret"?"top":request!=="auto"&&["front","right","back","left"].includes(request)?request:shot.targetFace;
    log(`Hit! ${spec.name} does ${amount} damage to ${target.name}'s ${request==="turret"?"turret":side}.`,"good","damage");const result=damage(target,amount,side,spec.name,{weaponSpec:spec,damageRolls:damageRoll.rolls,turret:request==="turret"});addFireExposure(target,spec,result);
    if(spec.createsSmoke)createCloud("smoke",(shooter.x+target.x)/2,(shooter.y+target.y)/2,Math.atan2(target.y-shooter.y,target.x-shooter.x)*180/Math.PI,60*5);
    return amount;
  }
  function createCloud(type,x,y,heading=0,lifetimePhases=300){const dimensions=type==="whitePhosphorus"?{length:1,width:1}:Combat.hazardDimensions(type);combatHazards.push({id:`h${++hazardId}`,type,cloud:type==="smoke"||type==="paint"||type==="whitePhosphorus",x,y,heading,length:dimensions.length,width:dimensions.width,createdSerial:phaseSerial(),armedSerial:type==="flamingOil"?phaseSerial()+1:phaseSerial(),expiresSerial:phaseSerial()+lifetimePhases,checkedBy:[],active:true});return combatHazards.at(-1)}
  function dropPoint(car,mount){let effective=mount;if(car.direction<0){if(mount==="front")effective="back";else if(mount==="back")effective="front"}const center={front:0,right:90,back:180,left:-90}[effective];if(center===undefined)return{x:car.x,y:car.y,heading:car.heading};const heading=Combat.norm(car.heading+center),distance=(effective==="front"||effective==="back")?24:20;return{x:car.x+Math.cos(rad(heading))*distance,y:car.y+Math.sin(rad(heading))*distance,heading}}
  function deployWeapon(car,weapon,options={}){
    const spec=weaponSpec(weapon),point=dropPoint(car,weapon.mount),type=spec.cloud||spec.hazard;if(!type)return false;const dimensions=Combat.hazardDimensions(type),hazard={id:`h${++hazardId}`,type,cloud:Boolean(spec.cloud),x:point.x,y:point.y,heading:point.heading,length:dimensions.length,width:dimensions.width,createdSerial:phaseSerial(),armedSerial:type==="flamingOil"?phaseSerial()+1:phaseSerial(),expiresSerial:type==="paint"?(turn+1)*5:type==="flamingOil"?phaseSerial()+26:Infinity,checkedBy:[],ownerId:car.id,active:true};combatHazards.push(hazard);Combat.updateSustainedFire(weapon,null,turn,true);consumeWeapon(car,weapon);log(`${car.name} deploys ${spec.name} from its ${weapon.mount} mount${options.automatic?" on automatic":""}.`,"good","combat");return true
  }
  function launchGrenade(shooter,target,weapon,shot){Combat.updateSustainedFire(weapon,target.id,turn,false);consumeWeapon(shooter,weapon);pendingGrenades.push({id:`g${++hazardId}`,ownerId:shooter.id,weaponId:weapon.id,grenadeType:weapon.grenadeType||"explosive",x:target.x,y:target.y,shot,dueSerial:phaseSerial()+5});log(`${shooter.name} launches a ${Data.grenades[weapon.grenadeType||"explosive"].name} grenade; impact is due one second later.`,"good","combat")}
  function resolveGrenade(grenade){
    const shooter=grenade.ownerId==="player"?player:ai,spec=Data.grenades[grenade.grenadeType],r=roll(2);let x=grenade.x,y=grenade.y;
    if(r!==12){const missedBy=Math.max(0,grenade.shot.targetNum-r),scatter=Combat.grenadeScatter(missedBy,()=>roll(1))*SCALE,angle=random()*Math.PI*2;x+=Math.cos(angle)*scatter;y+=Math.sin(angle)*scatter}
    log(`${spec.name} grenade lands${r===12?" exactly on target":` at ${x.toFixed(0)}, ${y.toFixed(0)} (roll ${r})`}.`,r>=grenade.shot.targetNum?"good":"warn","combat");
    if(spec.effect==="flamingOil")createCloud("flamingOil",x,y,0,26);else if(["paint","smoke"].includes(spec.effect))createCloud(spec.effect,x,y,0,spec.effect==="paint"?10:300);else if(spec.effect==="whitePhosphorus"){createCloud("whitePhosphorus",x,y,0,300);[player,ai].filter(car=>car.alive&&Math.hypot(car.x-x,car.y-y)<=.5*SCALE).forEach(car=>{const result=Combat.rollDamage("1d",()=>roll(1)),amount=Math.ceil(result.total/2);const hit=damage(car,amount,sideHit(car,{x,y}),"White Phosphorus",{weaponSpec:spec,damageRolls:result.rolls});addFireExposure(car,spec,hit)})}
    else if(spec.effect==="foam"){[player,ai].filter(car=>Math.hypot(car.x-x,car.y-y)<=.5*SCALE).forEach(car=>{if(car.burning&&roll(1)===1){car.burning=false;log(`${car.name}'s fire is extinguished by foam.`,"good","combat")}car.paintedUntil=Math.max(car.paintedUntil,turn+3)})}
    else if(spec.damage){[player,ai].filter(car=>car.alive&&Math.hypot(car.x-x,car.y-y)<=.5*SCALE).forEach(car=>{const result=Combat.rollDamage(spec.damage,()=>roll(1)),amount=spec.vehicleHalf?Math.ceil(result.total/2):result.total;const hit=damage(car,amount,sideHit(car,{x,y}),`${spec.name} grenade`,{weaponSpec:spec,damageRolls:result.rolls});addFireExposure(car,spec,hit);weaponDamageHazard(car,amount)})}
    else if(spec.effect==="crewStun"){[player,ai].filter(car=>Math.hypot(car.x-x,car.y-y)<=2*SCALE&&(car.armor[sideHit(car,{x,y})]||0)<=0).forEach(car=>{car.stunnedPhases=Math.max(car.stunnedPhases,5);log(`${car.name}'s exposed crew is stunned by concussion.`,"bad","control")})}
  }
  function resolvePendingGrenades(){for(let i=pendingGrenades.length-1;i>=0;i--)if(pendingGrenades[i].dueSerial<=phaseSerial()){const grenade=pendingGrenades.splice(i,1)[0];resolveGrenade(grenade)}}
  function resolveShot(shooter,target,weapon,request,options={}){
    const ready=weaponReady(shooter,weapon,options);if(ready){log(`${shooter.name}'s ${weapon.name}: ${ready}.`,"bad","combat");return{fired:false,damage:0}}
    const spec=weaponSpec(weapon);if(spec.dropped)return{fired:deployWeapon(shooter,weapon,options),damage:0};
    if(options.automatic){const center=Combat.mountArcCenter(shooter,weapon.mount),bearing=Combat.norm(Math.atan2(target.y-shooter.y,target.x-shooter.x)*180/Math.PI);if(center===null||Combat.angleDifference(center,bearing)>4){Combat.updateSustainedFire(weapon,null,turn,true);consumeWeapon(shooter,weapon);log(`${shooter.name}'s automatic ${weapon.name} fires straight from the ${weapon.mount} mount without crossing a target.`,"warn","combat");return{fired:true,damage:0}}}
    if(request==="turret"&&!target.weapons.some(item=>item.mount==="top"&&item.dp>0)){log(`${target.name} has no operational turret to target.`,"bad","combat");return{fired:false,damage:0}}
    if(!Combat.inMountArc(shooter,target,weapon.mount)){log(`${shooter.name}'s ${weapon.name}: target outside ${weapon.mount} firing arc.`,"bad","combat");return{fired:false,damage:0}}
    const shot=shotCalculation(shooter,target,weapon,request,options);if(!shot.lof.clear){log(`${shooter.name}'s ${weapon.name}: ${shot.lof.reason}.`,"bad","combat");return{fired:false,damage:0}}
    if(shot.sidePenalty===null){log(`${shooter.name}: requested target side is not exposed.`,"bad","combat");return{fired:false,damage:0}}
    if(spec.maxRange&&shot.range>spec.maxRange){log(`${weapon.name} maximum range is ${spec.maxRange} inches.`,"bad","combat");return{fired:false,damage:0}}
    if(spec.grenadeLauncher){launchGrenade(shooter,target,weapon,shot);return{fired:true,damage:0}}
    if(spec.spikeGun&&!request.startsWith("tire:")){Combat.updateSustainedFire(weapon,target.id,turn,Boolean(options.automatic));consumeWeapon(shooter,weapon);const r=roll(2),missed=Math.max(0,shot.targetNum-r),scatter=Combat.grenadeScatter(missed,()=>roll(1))*SCALE,angle=random()*Math.PI*2,x=target.x+Math.cos(angle)*scatter,y=target.y+Math.sin(angle)*scatter,dimensions=Combat.hazardDimensions("spikes");combatHazards.push({id:`h${++hazardId}`,type:"spikes",x,y,heading:0,length:dimensions.length,width:dimensions.width,createdSerial:phaseSerial(),armedSerial:phaseSerial(),expiresSerial:Infinity,checkedBy:[],ownerId:shooter.id,active:true});log(`${shooter.name} fires ${weapon.name} into the arena; spike field lands near the target.`,"good","combat");return{fired:true,damage:0}}
    const projectiles=spec.projectiles||1;Combat.updateSustainedFire(weapon,target.id,turn,Boolean(options.automatic));consumeWeapon(shooter,weapon);let totalDamage=0;
    for(let i=0;i<projectiles;i++){const r=roll(2),hit=r!==2&&shot.targetNum<=12&&r>=shot.targetNum,breakdown=shot.modifiers.filter(item=>item.value).map(item=>`${item.name} ${modifierText(item.value)}`).join(", ")||"no modifiers";log(`${shooter.name} fires ${weapon.name}${projectiles>1?` rocket ${i+1}/${projectiles}`:""}: roll ${r}, needs ${shot.targetNum}+ [${breakdown}].`,hit?"good":"bad","combat");if(hit)totalDamage+=applyDirectHit(shooter,target,weapon,shot);else log(`${shooter.name} misses ${target.name}.`,"bad","combat")}
    return{fired:true,damage:totalDamage};
  }
  function resolveFireGroup(shooter,target,group,request,options={}){const sameAim=group.every(weapon=>weapon.key===group[0].key&&weapon.mount===group[0].mount);let fired=false,total=0;group.forEach((weapon,index)=>{const result=resolveShot(shooter,target,weapon,request,{...options,resolving:true,automatic:options.automatic||(!sameAim&&index>0)});weapon.queuedTurn=0;fired=fired||result.fired;total+=result.damage});if(total)weaponDamageHazard(target,total);return fired}
  function resolveFireIntents(){const intents=pendingFireIntents.splice(0,pendingFireIntents.length),prepared=intents.map(intent=>{const shooter=intent.shooterId==="player"?player:ai,target=intent.targetId==="player"?player:ai,group=intent.weaponIds.map(id=>shooter.weapons.find(weapon=>weapon.id===id)).filter(weapon=>weapon&&weaponReady(shooter,weapon,{resolving:true})==="");return{shooter,target,group,request:intent.request,crewPenalty:intent.crewPenalty}});prepared.forEach(item=>resolveFireGroup(item.shooter,item.target,item.group,item.request,{simultaneous:true,crewPenalty:item.crewPenalty}));if(intents.length)log(`All declared fire for the phase resolves simultaneously.`,"warn","combat")}
  function fire(shooter,target,selection,options={}){
    if(!shooter.alive||shooter.stunnedPhases>0)return false;const group=selectedWeapons(shooter,selection);if(!group.length)return false;
    if(options.automatic)return resolveFireGroup(shooter,target,group,"auto",options);
    if(firingActionsLeft(shooter)<=0){log(`${shooter.name} has no firing actions left this turn.`,"bad","combat");return false}const ready=group.filter(weapon=>weaponReady(shooter,weapon)==="");if(!ready.length){log(`${shooter.name}'s selected weapon${group.length>1?"s are":" is"} not ready.`,"bad","combat");return false}
    const request=targetRequest(shooter),operator=firingCrew(shooter)[shooter.firingActionsUsed];ready.forEach(weapon=>weapon.queuedTurn=turn);pendingFireIntents.push({shooterId:shooter.id,targetId:target.id,weaponIds:ready.map(weapon=>weapon.id),request,crewPenalty:operator?.dp<3?-2:0,declaredTurn:turn,declaredPhase:phase});shooter.firingActionsUsed++;shooter.firingActionsTurn=turn;log(`${operator?.name||"Crew"} in ${shooter.name} declares ${ready.length>1?`linked fire (${ready.length} weapons)`:ready[0].name}; it will resolve after phase movement.`,"good","combat");updateUI();return true;
  }
  function toggleAutomatic(car){const weapon=selectedWeapons(car)[0];if(!weapon)return;if(firingActionsLeft(car)<=0){log(`${car.name} has no firing action available to change automatic fire.`,"bad","combat");return}const spec=weaponSpec(weapon);if(weapon.mount==="top"&&!spec.dropped){log("Turret weapons cannot be placed on automatic.","bad","combat");return}weapon.automatic=!weapon.automatic;weapon.sustainedTurns=0;car.firingActionsUsed++;car.firingActionsTurn=turn;log(`${car.name} switches ${weapon.name} automatic fire ${weapon.automatic?"on":"off"}.`,"warn","combat");updateUI()}
  function resolveAutomaticDropped(car,moved){if(!moved)return;car.weapons.filter(weapon=>weapon.automatic&&weaponSpec(weapon).dropped).forEach(weapon=>{if(weaponReady(car,weapon,{automatic:true})==="")deployWeapon(car,weapon,{automatic:true})})}
  function resolveAutomaticFire(car,target){car.weapons.filter(weapon=>weapon.automatic&&!weaponSpec(weapon).dropped).forEach(weapon=>{if(weaponReady(car,weapon,{automatic:true})==="")resolveShot(car,target,weapon,"auto",{automatic:true})})}
  function fireDamagesVehicle(car){
    Object.keys(car.armor).forEach(side=>car.armor[side]=Math.max(0,car.armor[side]-1));
    car.weapons.forEach(weapon=>{if(weapon.dp>0)weapon.dp--});if(car.powerPlant.dp>0)car.powerPlant.dp--;if(car.cargo.dp>0)car.cargo.dp--;car.crew.forEach(member=>{if(member.dp>0)member.dp--});Object.keys(car.tireDP).forEach(key=>damageTire(car,key,1,"Vehicle fire"));recomputeInternal(car);
    if(car.powerPlant.dp<=0){car.accel=0;car.powerPlant.powerUnits=0}if(!car.crew.some(member=>member.dp>0))car.alive=false;
    log(`Vehicle fire deals 1 point to every armor face, component, occupant, and tire on ${car.name}.`,"bad","damage")
  }
  function explosiveLoad(car){return car.weapons.some(weapon=>weaponSpec(weapon).volatile)}
  function explodeVehicle(car){car.alive=false;car.crew.forEach(member=>member.dp=0);log(`${car.name} explodes!`,"bad","damage");addImpactMark(car.x,car.y,"EXPLOSION");const other=car===player?ai:player;if(other.alive&&dist(car,other)<=2*SCALE){const amount=roll(1),side=sideHit(other,car);damage(other,amount,side,"Vehicle explosion");log(`${other.name} takes ${amount} blast damage.`,"bad","damage")}}
  function resolveEndTurnFire(car){
    car.fireExposures=car.fireExposures.filter(exposure=>exposure.expiresTurn>=turn);const modifier=car.fireExposures.reduce((sum,exposure)=>sum+exposure.value,0);
    if(!car.burning&&car.componentFireChance){const componentRoll=roll(1);log(`${car.name} damaged-component fire check: ${componentRoll}, fire starts on ${car.componentFireChance} or less.`,componentRoll<=car.componentFireChance?"bad":"good","combat");if(componentRoll<=car.componentFireChance)car.burning=true}car.componentFireChance=0;
    if(!car.burning&&modifier>0){const result=roll(2);log(`${car.name} fire check: ${result}, fire starts on ${modifier} or less.`,result<=modifier?"bad":"good","combat");if(result<=modifier)car.burning=true}
    if(car.burning){fireDamagesVehicle(car);if(explosiveLoad(car)&&roll(1)===1)explodeVehicle(car)}
    car.fireExposures=car.fireExposures.filter(exposure=>exposure.expiresTurn>turn);
    if((car.powerPlant.dp<=0||!driverOperational(car))&&car.speed>0){car.speed=Math.max(0,car.speed-5);log(`${car.name} decelerates 5 mph because ${car.powerPlant.dp<=0?"its power plant is destroyed":"its driver is incapacitated"}.`,"warn","movement")}
    if(!driverOperational(car)&&car.speed===0){const substitute=car.crew.find(member=>member.role==="gunner"&&member.dp>1);if(substitute){car.substituteProgress=(car.substituteProgress||0)+1;if(car.substituteProgress>=5){substitute.role="driver";substitute.name="Substitute Driver";car.substituteProgress=0;log(`${car.name}'s gunner takes the controls as substitute driver.`,"good","control")}else log(`${car.name} substitute-driver changeover: ${car.substituteProgress}/5 turns.`,"warn","control")}}else car.substituteProgress=0;
  }
  function aiChoice(){
    if(!ai.alive||!driverOperational(ai))return {type:"straight",d:0};
    const desired=norm(Math.atan2(player.y-ai.y,player.x-ai.x)*180/Math.PI);
    let delta=norm(desired-ai.heading); if(delta>180)delta-=360;
    if(Math.abs(delta)>10)return delta<0?{type:"bendL",d:1}:{type:"bendR",d:1};
    return {type:"straight",d:0};
  }
  function aiAct(){
    const mv=ai.stunnedPhases?{type:"straight",d:0}:aiChoice(); ai.maneuverD=difficultyFor(ai,mv); performMove(ai,mv);
  }
  function aiFireDecision(){if(!ai.alive||!player.alive||ai.stunnedPhases||random()>=.75)return;const candidates=ai.weapons.filter(weapon=>weaponReady(ai,weapon)===""&&(weaponSpec(weapon).dropped||Combat.inMountArc(ai,player,weapon.mount)));candidates.sort((a,b)=>Combat.parseDamage(weaponSpec(b).damage).dice-Combat.parseDamage(weaponSpec(a).damage).dice);if(candidates[0])fire(ai,player,`weapon:${candidates[0].id}`)}
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function snapshot(label="Phase resolved"){const frame={turn,phase,label,rngState,player:clone(player),ai:clone(ai),combatHazards:clone(combatHazards),pendingGrenades:clone(pendingGrenades),pendingFireIntents:clone(pendingFireIntents),events:replay.events.length};replay.frames.push(frame);replayIndex=replay.frames.length-1;updateReplayUI()}
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
    player=clone(f.player);ai=clone(f.ai);turn=f.turn;phase=f.phase;rngState=f.rngState||rngState;combatHazards.splice(0,combatHazards.length,...clone(f.combatHazards||[]));pendingGrenades.splice(0,pendingGrenades.length,...clone(f.pendingGrenades||[]));pendingFireIntents.splice(0,pendingFireIntents.length,...clone(f.pendingFireIntents||[]));
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
    if(player.crashState||player.forcedMove||player.stunnedPhases>0||!driverOperational(player))return false;
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
    if(player.changedSpeed||pendingSpeedDelta===0||!driverOperational(player))return;
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
    $("previewText").textContent=`Selected: ${label} (D${selected.d}${surfaceNote}). Resulting handling: ${Math.max(-6,player.handling-selected.d)}. Speed after commit: ${projectedSpeed()} mph.`;
    // Maneuver-dependent controls (especially Add Skid) must refresh as soon
    // as a bend or swerve becomes the current selection.
    updateUI();draw()
  }
  function populateWeaponChoices(){
    const select=$("weaponSelect");if(!select)return;const previous=select.value,options=[];
    player.weapons.forEach((weapon,index)=>{const spec=weaponSpec(weapon),status=weapon.dp<=0?"DESTROYED":weapon.ammo===0?"EMPTY":`${ammoText(weapon)} ammo`;options.push({value:`weapon:${weapon.id}`,label:`${index+1}. ${weapon.name} · ${weapon.mount.toUpperCase()} · ${status}`})});
    const links=[...new Set(player.weapons.map(weapon=>weapon.link).filter(Boolean))];links.forEach(link=>{const count=player.weapons.filter(weapon=>weapon.link===link).length;if(count>1)options.push({value:`link:${link}`,label:`LINK ${link} · ${count} weapons`})});
    select.innerHTML=options.map(option=>`<option value="${option.value}">${option.label}</option>`).join("");if(options.some(option=>option.value===previous))select.value=previous;
  }
  function updateUI(){
    $("turnNum").textContent=turn;$("phaseNum").textContent=phase;$("speed").textContent=`${player.direction<0?"R ":""}${player.speed}`;$("handling").textContent=player.handling;
    populateWeaponChoices();const combatSelection=selectedWeapons(player),activeWeapon=combatSelection[0],activeSpec=weaponSpec(activeWeapon);player.ammo=activeWeapon?.ammo??0;player.weaponDP=activeWeapon?.dp??0;player.weaponName=activeWeapon?.name||"No weapon";
    $("ammo").textContent=ammoText(activeWeapon);$("weaponDP").textContent=activeWeapon?.dp??0;if($("powerUnits"))$("powerUnits").textContent=player.powerPlant?.powerUnits??0;if($("fireActions"))$("fireActions").textContent=firingActionsLeft(player);
    $("armor").innerHTML=Object.entries(player.armor).map(([k,v])=>`<div>${k}<strong>${v}</strong></div>`).join("");
    $("phasebar").innerHTML=[1,2,3,4,5].map(p=>`<div class="phase ${p===phase?'active':''}">${p}</div>`).join("");
    const controlsLocked=replayMode||locked||!player.alive;
    const speedLocked=controlsLocked||player.changedSpeed||player.forcedMove||player.stunnedPhases>0||!driverOperational(player);
    populateSpeedChoices();
    if($("speedChange"))$("speedChange").disabled=speedLocked;
    if($("reverse")){$("reverse").disabled=controlsLocked||player.speed!==0||player.stoppedTurns<1||!driverOperational(player);$("reverse").textContent=player.direction<0?"Select Forward Gear":"Select Reverse Gear";}
    const selectedReady=combatSelection.some(weapon=>weaponReady(player,weapon)===""),isLink=$("weaponSelect")?.value.startsWith("link:");
    $("fire").disabled=controlsLocked||!activeWeapon||!selectedReady||player.stunnedPhases>0||firingActionsLeft(player)<=0||(!activeSpec.dropped&&player.firePenalty>=99);$("fire").textContent=activeSpec.dropped?"Deploy Selected":activeSpec.grenadeLauncher?"Launch Grenade":"Fire Selected";
    if($("toggleAuto")){$("toggleAuto").disabled=controlsLocked||!activeWeapon||isLink||activeWeapon.dp<=0||firingActionsLeft(player)<=0;$("toggleAuto").textContent=`Automatic: ${activeWeapon?.automatic?"On":"Off"}`;$("toggleAuto").classList.toggle("selected",Boolean(activeWeapon?.automatic))}
    if($("weaponHelp")&&activeWeapon){const effect=activeSpec.dropped?`Deploys ${activeSpec.cloud||activeSpec.hazard}; no to-hit roll.`:`To hit ${activeSpec.toHit}+ · ${activeSpec.damage} damage${activeSpec.maxRange?` · max ${activeSpec.maxRange} in`:""}.`;$("weaponHelp").textContent=`${activeWeapon.name} · ${activeWeapon.mount.toUpperCase()} mount · ${effect}${activeWeapon.link?` Link ${activeWeapon.link}.`:""}`}
    const maneuverLocked=controlsLocked||player.crashState||player.forcedMove||player.stunnedPhases>0||moveDist(player)<1;
    ["bendLeft","bendRight","bendAngle","driftL","driftR","steepDriftL","steepDriftR","swerveL","swerveR","skidDistance","controlledSkid","tstopL","tstopR","bootleggerL","bootleggerR","straight"].forEach(id=>{if($(id))$(id).disabled=maneuverLocked});
    const pivotLocked=controlsLocked||!canChooseManeuver("pivotL");["pivotAngle","pivotL","pivotR"].forEach(id=>{if($(id))$(id).disabled=pivotLocked});
    $("controlledSkid").disabled=maneuverLocked||!["bendL","bendR","swerveL","swerveR"].includes(selected.type);
    const emergencyLocked=maneuverLocked||player.turnStartSpeed<20||player.turnStartSpeed>35||pendingSpeedDelta!==0;["tstopL","tstopR","bootleggerL","bootleggerR"].forEach(id=>{if($(id))$(id).disabled=emergencyLocked});
    $("commit").disabled=controlsLocked;
    if(!controlsLocked){
      const reason=!driverOperational(player)?`Driver incapacitated: the vehicle continues straight and decelerates 5 mph per turn.`:player.stunnedPhases?`Driver stunned for ${player.stunnedPhases} more phase${player.stunnedPhases===1?"":"s"}; vehicle continues straight.`:player.forcedMove?`${player.forcedMove.type} movement is committed and will resolve automatically.`:player.crashState?`Maneuvers unavailable during ${player.crashState.type}.`:moveDist(player)<=0?`No vehicle movement is scheduled in Phase ${phase}.`:moveDist(player)<1?`Half-move: straight only${player.speed===5?", or choose a pivot":""}.`:`Choose a maneuver and speed change, then commit.`;
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
      <div><b>Crash state</b><span class="statusBadge ${statusClass}">${crash}</span></div><div><b>Internal DP</b>${car.internal}</div>
      <div><b>Direction</b>${car.direction<0?"reverse":"forward"}</div><div><b>Replay</b>${replayMode?"REPLAY":"LIVE"} · ${frameText}</div>
      <div><b>Weight / DM</b>${car.weight} lb / ${car.damageModifier.toFixed(2)}</div><div><b>Surface</b>${roadSurface}</div>
      <div><b>Last collision</b>${car.lastCollision?`${collisionLabel(car.lastCollision.type)} · ${car.lastCollision.speed} mph · ${car.lastCollision.face}`:"none"}</div><div><b>Driver</b>${car.crew?.find(member=>member.role==="driver")?.dp??3} DP${car.stunnedPhases?` · stunned ${car.stunnedPhases} phase(s)`:""}</div>
      <div><b>Power plant</b>${car.powerPlant?.dp??0}/${car.powerPlant?.maxDP??0} DP · ${car.powerPlant?.powerUnits??0} PU</div><div><b>Combat status</b>${car.burning?'<span class="statusBadge burningBadge">burning</span>':car.paintedUntil>=turn?'<span class="statusBadge paintBadge">painted</span>':"ready"}</div>
      <div title="The fixed starting value used to reproduce this game's random rolls."><b>Random seed</b>${rngSeed}</div><div class="advancedRng" title="The generator's current internal value after random rolls have been consumed."><b>RNG state</b>${rngState}</div>
      ${(()=>{const target=car===player?ai:player,weapon=car===player?selectedWeapons(car)[0]:car.weapons.find(item=>item.dp>0),request=car===player?targetRequest(car):"auto";if(!weapon)return"";const spec=weaponSpec(weapon);if(spec.dropped)return`<div class="shotInspector"><b>${weapon.name} · ${weapon.mount.toUpperCase()}</b><em>Dropped weapon: placement and contact effects are automatic.</em></div>`;const shot=shotCalculation(car,target,weapon,request);return `<div class="shotInspector"><b>${weapon.name} · ${weapon.mount.toUpperCase()} shot</b><span>Base to-hit</span><strong>${shot.base}+</strong>${shot.modifiers.map(m=>`<span>${m.name}<small>${m.detail}</small></span><strong class="${m.value>0?'modPositive':m.value<0?'modNegative':''}">${modifierText(m.value)}</strong>`).join('')}<span>Total modifier</span><strong>${modifierText(shot.total)}</strong><span>Final roll needed</span><strong>${shot.targetNum}+</strong><em>${shot.lof.clear?"Line of fire is clear.":shot.lof.reason} ${Combat.inMountArc(car,target,weapon.mount)?"Target is in arc.":"Target is outside this mount's arc."}</em></div>`})()}`;
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
    movementConsumed.clear();
    const stunnedAtStart=new Map([[player,player.stunnedPhases>0],[ai,ai.stunnedPhases>0]]);
    applyAutomaticDeceleration(player);applyAutomaticDeceleration(ai);
    applyPendingSpeed();
    player.maneuverD=canChooseManeuver(selected.type)?selected.d:0;
    const pm=moveDist(player), am=moveDist(ai);
    // Faster car moves first; equal speed gives player initiative in prototype.
    if(ai.speed>player.speed){if(am)aiAct();if(pm)performMove(player,canChooseManeuver(selected.type)?selected:{type:"straight",d:0,label:"Go straight"})}
    else {if(pm)performMove(player,canChooseManeuver(selected.type)?selected:{type:"straight",d:0,label:"Go straight"});if(am)aiAct()}
    resolveAutomaticDropped(player,pm);resolveAutomaticDropped(ai,am);resolvePendingGrenades();aiFireDecision();resolveFireIntents();
    log(`Turn ${turn}, Phase ${phase}: movement resolved.`);
    [player,ai].forEach(c=>{if(stunnedAtStart.get(c))c.stunnedPhases=Math.max(0,c.stunnedPhases-1);c.phaseDamage=0});
    checkEnd();
    if(phase===5){
      resolveAutomaticFire(player,ai);resolveAutomaticFire(ai,player);resolveEndTurnFire(player);resolveEndTurnFire(ai);
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
    combatHazards.filter(hazard=>hazard.active!==false).forEach(hazard=>{ctx.save();ctx.translate(hazard.x,hazard.y);ctx.rotate(rad(hazard.heading||0));const colors={mine:"#9b3037",spearMine:"#d44731",spikes:"#aab2bd",oil:"#08090a",flamingOil:"#f06b2d",smoke:"#79828d",paint:"#37b7d6",whitePhosphorus:"#e8edf5"};ctx.fillStyle=colors[hazard.type]||"#c89f49";ctx.globalAlpha=hazard.cloud?.45:.82;const w=hazard.length*SCALE,h=hazard.width*SCALE;if(hazard.cloud){ctx.beginPath();ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);ctx.fill()}else{ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeStyle="#f4d98a";ctx.lineWidth=1.5;ctx.strokeRect(-w/2,-h/2,w,h)}ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.font="bold 8px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText(hazard.type.toUpperCase(),0,3);ctx.restore()});
    pendingGrenades.forEach(grenade=>{ctx.save();ctx.translate(grenade.x,grenade.y);ctx.strokeStyle="#ffd276";ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#ffd276";ctx.font="bold 8px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText(`G ${Math.max(0,grenade.dueSerial-phaseSerial())}`,0,-15);ctx.restore()});
    ctx.fillStyle="#b7bdc4";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText("ARENA 01",W/2,70);
  }
  function drawArc(car){
    if(car!==player||!car.alive)return;
    const weapon=selectedWeapons(car)[0];if(!weapon)return;const spec=weaponSpec(weapon);ctx.save();ctx.translate(car.x,car.y);ctx.fillStyle=spec.dropped?"#6fd7ff20":"#f3c76322";ctx.strokeStyle=spec.dropped?"#6fd7ff66":"#f3c76355";
    if(spec.dropped){const point=dropPoint(car,weapon.mount);ctx.beginPath();ctx.arc(point.x-car.x,point.y-car.y,15,0,Math.PI*2);ctx.fill();ctx.stroke()}
    else if(weapon.mount==="top"){ctx.beginPath();ctx.arc(0,0,220,0,Math.PI*2);ctx.fill()}
    else{const center=Combat.mountArcCenter(car,weapon.mount);if(center!==null){ctx.rotate(rad(center));ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,220,-Math.PI/4,Math.PI/4);ctx.closePath();ctx.fill()}}ctx.restore();
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
  $("startBtn").onclick=()=>{applyDesign(player,JSON.parse(localStorage.getItem("rdaSelectedPlayer")||"null"));applyDesign(ai,JSON.parse(localStorage.getItem("rdaSelectedAI")||"null"));combatHazards.length=0;pendingGrenades.length=0;pendingFireIntents.length=0;if(roadSurface==="offroad"){[player,ai].forEach(c=>{c.hc=Math.max(0,c.hc-3);c.handling=c.hc})}[player,ai].forEach(c=>c.turnStartSpeed=c.speed);started=true;replayMode=false;locked=false;rngState=rngSeed;replay={version:"0.7.0",seed:rngSeed,initial:{player:clone(player),ai:clone(ai)},frames:[],events:[]};replayReadOnly=false;$("startOverlay").style.display="none";log(`Arena duel begins on ${roadSurface} with Chapter 2 driving, Chapter 3 combat, and the Chapter 6 arsenal.`,"warn");snapshot("Initial state");fitArena();updateUI();draw()}
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
  $("fire").onclick=()=>{fire(player,ai,$("weaponSelect")?.value);updateUI();draw();checkEnd()};
  if($("toggleAuto"))$("toggleAuto").onclick=()=>{toggleAutomatic(player);draw()};
  if($("weaponSelect"))$("weaponSelect").onchange=()=>{updateUI();draw()};
  if($("targetLocation"))$("targetLocation").onchange=()=>{updateInspector();draw()};

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
