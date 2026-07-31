
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const SCALE = 36; // pixels per tabletop inch; one tabletop inch equals one car length
  const arena = {x:45,y:45,w:810,h:810};
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
    lastFiredTurn:0, firedThisTurn:false, internal:10, pendingCrash:null, crashState:null, firePenalty:0, burning:false,
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
  let turn=1, phase=1, started=false, selected={type:"straight",d:0,angle:0,label:"Go straight"}, pendingSpeedDelta=0, locked=false;
  let rngSeed=(Date.now()>>>0)||1, rngState=rngSeed;
  let replay={version:"0.5.0",seed:rngSeed,initial:null,frames:[],events:[]}, replayIndex=-1, replayTimer=null, replayMode=false;
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
  function resolveTable2(car,r,p){const dir=random()<.5?-1:1;if(r<=4){car.heading=norm(car.heading+dir*15);car.firePenalty=Math.max(car.firePenalty,3);log("Crash Table 2: minor fishtail.","warn")}else if(r<=8){car.heading=norm(car.heading+dir*30);car.firePenalty=Math.max(car.firePenalty,6);log("Crash Table 2: major fishtail.","bad")}else{car.heading=norm(car.heading+dir*(r<=10?15:r<=14?30:45));log("Crash Table 2: fishtail then Crash Table 1.","bad");const row=controlRow(car.speed),raw=roll(2);resolveTable1(car,raw+row.m+(p.difficulty-3),p.heading)}}
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
  function performMove(car,mv){
    const inches=moveDist(car);
    if(inches<=0)return;
    if(car.speed===0){endCrashAtHalt(car);return}
    if(crashMove(car,inches))return;
    // A standalone half-move must be straight and cannot contain a maneuver.
    if(inches<1 && mv?.d){mv={type:"straight",d:0,angle:0};}
    const isBend=mv?.type==="bendL"||mv?.type==="bendR";
    let d=(mv?.d||0)+(car.direction<0&&mv?.d?1:0);
    const originalTravel=movementHeading(car);
    const bendAngle=mv?.angle||15;
    // Keep the one-inch maneuver endpoint separate from any extra straight
    // movement in a 2+ inch phase. A loss-of-control skid starts only after
    // the normal maneuver has been completed.
    const bendUnit=isBend?bendEndpoint(car,mv.type==="bendL"?"left":"right",bendAngle,1):null;
    if(bendUnit)car.heading=bendUnit.heading;
    car.crashMomentumHeading=originalTravel;
    if(!controlCheck(car,d,"maneuver")){
      const previous={x:car.x,y:car.y};
      let maneuverUsed=Math.min(1,inches);
      if(bendUnit){
        // Complete the exact same corner-aligned bend as a successful move.
        car.x=bendUnit.x;car.y=bendUnit.y;
      } else {
        // Drifts also complete their ordinary one-inch maneuver before a skid.
        let lateral=0;
        if(mv?.type==="driftL")lateral=-0.25*SCALE;
        if(mv?.type==="driftR")lateral=0.25*SCALE;
        const travel=movementHeading(car);
        car.x+=Math.cos(rad(travel))*maneuverUsed*SCALE+Math.cos(rad(car.heading+90))*lateral;
        car.y+=Math.sin(rad(travel))*maneuverUsed*SCALE+Math.sin(rad(car.heading+90))*lateral;
      }
      resolveSolidCollisions(car,previous,false);
      const remaining=Math.max(0,inches-maneuverUsed);
      if(remaining>0)crashMove(car,remaining);
      car.crashMomentumHeading=null;
      return;
    }
    car.crashMomentumHeading=null;
    let lateral=0;
    if(mv?.type==="driftL")lateral=-0.25*SCALE;
    if(mv?.type==="driftR")lateral=0.25*SCALE;
    const travel=movementHeading(car),previous={x:car.x,y:car.y};
    if(isBend){
      // bendUnit was calculated from the original pre-maneuver heading. Reuse it
      // rather than recalculating after car.heading has already been rotated.
      // Recalculation here used to rotate the endpoint translation a second time,
      // causing the committed car to miss the correctly drawn preview outline.
      car.x=bendUnit.x;car.y=bendUnit.y;
      const remaining=Math.max(0,inches-1);
      if(remaining>0){
        const postBendTravel=movementHeading(car);
        car.x+=Math.cos(rad(postBendTravel))*remaining*SCALE;
        car.y+=Math.sin(rad(postBendTravel))*remaining*SCALE;
      }
    }
    else {
      car.x += Math.cos(rad(travel))*inches*SCALE + Math.cos(rad(car.heading+90))*lateral;
      car.y += Math.sin(rad(travel))*inches*SCALE + Math.sin(rad(car.heading+90))*lateral;
    }
    resolveSolidCollisions(car,previous,false);
    if(dist(player,ai)<38 && player.alive && ai.alive){
      const rel=Math.abs(player.speed-ai.speed) || Math.max(player.speed,ai.speed);
      const hit=Math.max(1,Math.floor(rel/15));
      damage(player,roll(Math.min(6,hit)),sideHit(player,ai),"Vehicle collision");
      damage(ai,roll(Math.min(6,hit)),sideHit(ai,player),"Vehicle collision");
      player.speed=Math.max(0,player.speed-10);ai.speed=Math.max(0,ai.speed-10);
    }
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
    if(!shooter.alive||shooter.ammo<=0||shooter.lastFiredTurn===turn||shooter.weaponDP<=0)return false;
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
      controlCheck(target,dmg>=10?3:dmg>=6?2:1,"hazard");
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
    const mv=aiChoice(); ai.maneuverD=mv.d; performMove(ai,mv);
    if(ai.alive && player.alive && inArc(ai,player) && random()<.75)fire(ai,player);
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
  function canChooseManeuver(){return moveDist(player)>=1 && !player.crashState;}
  function projectedSpeed(){
    if(player.changedSpeed)return player.speed;
    const limit=player.direction<0?(player.reverseTopSpeed||Math.max(5,Math.floor(player.topSpeed/5))):player.topSpeed;
    return Math.max(0,Math.min(limit,player.speed+pendingSpeedDelta));
  }
  function speedChangeOptions(){
    const options=[];
    const maxBrake=Math.min(10,player.speed);
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
    const before=player.speed, after=projectedSpeed();
    player.speed=after;player.changedSpeed=true;
    if(after===0)endCrashAtHalt(player);
    if(after>before)log(`${player.name} accelerates ${after-before} mph to ${after} mph.`);
    else if(after<before)log(`${player.name} decelerates ${before-after} mph to ${after} mph.`);
    pendingSpeedDelta=0;
  }
  function setSelected(type,d,label,angle=0){if(replayMode||!canChooseManeuver())return;selected={type,d,label,angle};$("previewText").textContent=`Selected: ${label} (D${d}). Resulting handling: ${Math.max(-6,player.handling-d)}. Speed after commit: ${projectedSpeed()} mph.`;draw()}
  function updateUI(){
    $("turnNum").textContent=turn;$("phaseNum").textContent=phase;$("speed").textContent=`${player.direction<0?"R ":""}${player.speed}`;$("handling").textContent=player.handling;
    $("ammo").textContent=player.ammo;$("weaponDP").textContent=player.weaponDP;
    $("armor").innerHTML=Object.entries(player.armor).map(([k,v])=>`<div>${k}<strong>${v}</strong></div>`).join("");
    $("phasebar").innerHTML=[1,2,3,4,5].map(p=>`<div class="phase ${p===phase?'active':''}">${p}</div>`).join("");
    const controlsLocked=replayMode||locked||!player.alive;
    const speedLocked=controlsLocked||player.changedSpeed;
    populateSpeedChoices();
    if($("speedChange"))$("speedChange").disabled=speedLocked;
    if($("reverse")){$("reverse").disabled=controlsLocked||player.speed!==0||player.stoppedTurns<1;$("reverse").textContent=player.direction<0?"Select Forward Gear":"Select Reverse Gear";}
    $("fire").disabled=controlsLocked||player.lastFiredTurn===turn||player.ammo<=0;
    const maneuverLocked=controlsLocked||!canChooseManeuver();
    ["bendLeft","bendRight","bendAngle","driftL","driftR","straight"].forEach(id=>{if($(id))$(id).disabled=maneuverLocked});
    $("commit").disabled=controlsLocked;
    if(!controlsLocked){
      const reason=player.crashState?`Maneuvers unavailable during ${player.crashState.type}.`:moveDist(player)<=0?`No vehicle movement is scheduled in Phase ${phase}.`:`Choose a maneuver and speed change, then commit.`;
      if(!canChooseManeuver())$("previewText").textContent=reason;
    }
    updateInspector();updateReplayUI();
  }
  function updateInspector(){
    if(!$("inspector"))return;
    const car=$("inspectCar")?.value==="ai"?ai:player;
    const heading=norm(car.heading), travel=movementHeading(car);
    const headingBearing=norm(heading+90), travelBearing=norm(travel+90);
    const crashType=car.crashState?.type||"normal";
    const crash=`${crashType}${car.crashState?.face?` / ${car.crashState.face}`:""}`;
    const statusClass={normal:"statusNormal",skid:"statusSkid",spin:"statusSpin",roll:"statusRoll",vault:"statusVault"}[crashType]||"statusCrash";
    const frameText=replay.frames.length?`${Math.max(0,replayIndex)+1} / ${replay.frames.length}`:"0 / 0";
    $("inspector").innerHTML=`
      <div><b>Position</b>${car.x.toFixed(1)}, ${car.y.toFixed(1)}</div><div><b>Speed</b>${car.speed} mph</div>
      <div><b>Heading</b>${headingBearing.toFixed(0)}°</div><div><b>Momentum</b>${travelBearing.toFixed(0)}°</div>
      <div><b>Handling</b>${car.handling}</div><div><b>HC</b>${car.hc}</div>
      <div><b>Crash state</b><span class="statusBadge ${statusClass}">${crash}</span></div><div><b>Internal</b>${car.internal}</div>
      <div><b>Direction</b>${car.direction<0?"reverse":"forward"}</div><div><b>Replay</b>${replayMode?"REPLAY":"LIVE"} · ${frameText}</div>
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
  function advance(){
    if(locked||!started)return;
    applyPendingSpeed();
    player.maneuverD=canChooseManeuver()?selected.d:0;
    const pm=moveDist(player), am=moveDist(ai);
    // Faster car moves first; equal speed gives player initiative in prototype.
    if(ai.speed>player.speed){if(am)aiAct();if(pm)performMove(player,canChooseManeuver()?selected:{type:"straight",d:0,label:"Go straight"})}
    else {if(pm)performMove(player,canChooseManeuver()?selected:{type:"straight",d:0,label:"Go straight"});if(am)aiAct()}
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
    let h=player.heading,x,y;
    const previewAngle=selected.angle||15;
    const isBend=selected.type==="bendL"||selected.type==="bendR";
    if(isBend && inches>=1){
      const end=bendEndpoint(player,selected.type==="bendL"?"left":"right",previewAngle,inches);
      x=end.x;y=end.y;h=end.heading;
    } else {
      const travel=movementHeading(player);
      x=player.x+Math.cos(rad(travel))*inches*SCALE;y=player.y+Math.sin(rad(travel))*inches*SCALE;
      if(selected.type==="driftL"){x+=Math.cos(rad(h+90))*(-.25*SCALE);y+=Math.sin(rad(h+90))*(-.25*SCALE)}
      if(selected.type==="driftR"){x+=Math.cos(rad(h+90))*(.25*SCALE);y+=Math.sin(rad(h+90))*(.25*SCALE)}
    }
    ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle="#f2b84b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(x,y);ctx.stroke();
    ctx.translate(x,y);ctx.rotate(rad(h));ctx.strokeRect(-18,-10,36,20);ctx.restore();
  }
  function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);drawArena();drawCrashTrail(player);drawCrashTrail(ai);drawArc(player);drawPreview();drawCar(player);drawCar(ai);ctx.restore();if(camera.follow&&!replayMode)centerOn(player,false);if($("zoomLabel"))$("zoomLabel").textContent=`${Math.round(camera.zoom*100)}%`;updateInspector()}
  function setZoom(next,cx=W/2,cy=H/2){const old=camera.zoom;next=Math.max(.45,Math.min(2.5,next));camera.x=cx-(cx-camera.x)*(next/old);camera.y=cy-(cy-camera.y)*(next/old);camera.zoom=next;draw()}
  function centerOn(car,redraw=true){camera.x=W/2-car.x*camera.zoom;camera.y=H/2-car.y*camera.zoom;if(redraw)draw()}
  function fitArena(){camera.zoom=Math.min(W/arena.w,H/arena.h)*.92;camera.x=(W-arena.w*camera.zoom)/2-arena.x*camera.zoom;camera.y=(H-arena.h*camera.zoom)/2-arena.y*camera.zoom;draw()}
  $("startBtn").onclick=()=>{applyDesign(player,JSON.parse(localStorage.getItem("rdaSelectedPlayer")||"null"));applyDesign(ai,JSON.parse(localStorage.getItem("rdaSelectedAI")||"null"));started=true;replayMode=false;locked=false;rngState=rngSeed;replay={version:"0.4.9",seed:rngSeed,initial:{player:clone(player),ai:clone(ai)},frames:[],events:[]};replayReadOnly=false;$("startOverlay").style.display="none";log("Arena duel begins with garage-selected vehicles.","warn");snapshot("Initial state");fitArena();updateUI();draw()}
  function chooseBend(side){
    const angle=Number($("bendAngle").value||15);
    const d=Math.ceil(angle/15);setSelected(side==="left"?"bendL":"bendR",d,`${angle}° ${side} bend`,angle);
  }
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
  $("bendAngle").onchange=()=>{if(selected.type==="bendL")chooseBend("left");else if(selected.type==="bendR")chooseBend("right");else draw()};
  $("driftL").onclick=()=>setSelected("driftL",1,"left drift");
  $("driftR").onclick=()=>setSelected("driftR",1,"right drift");
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
