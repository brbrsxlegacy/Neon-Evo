/* =========================
   ENEMY SYSTEM
========================= */

const enemies = [];

const ENEMY_TYPES = {
  MELEE:"melee",
  RANGED:"ranged",
  FIRE:"fire",
  ICE:"ice",
  BOSS:"boss"
};

function spawnEnemy(){

  const biome = getBiome(player.x);
  let type;

  if(biome==="fire") type=ENEMY_TYPES.FIRE;
  else if(biome==="ice") type=ENEMY_TYPES.ICE;
  else type = Math.random()<0.5 ? ENEMY_TYPES.MELEE : ENEMY_TYPES.RANGED;

  const angle = Math.random()*Math.PI*2;
  const dist = 600 + Math.random()*300;

  enemies.push({
    type,
    x: player.x + Math.cos(angle)*dist,
    y: player.y + Math.sin(angle)*dist,
    size: 16,
    speed: 120,
    health: 40,
    cooldown:0
  });
}

let spawnTimer=0;


/* =========================
   PROJECTILES
========================= */

const bullets=[];

function shoot(){

  let tx=1, ty=0, best=9999;

  enemies.forEach(e=>{
    const dx=e.x-player.x;
    const dy=e.y-player.y;
    const d=Math.hypot(dx,dy);
    if(d<best){
      best=d;
      tx=dx/d;
      ty=dy/d;
    }
  });

  bullets.push({
    x:player.x,
    y:player.y,
    vx:tx*520,
    vy:ty*520,
    r:4
  });
}


/* =========================
   PARTICLES
========================= */

const particles=[];

function spawnParticles(x,y,color="#00ffff",count=10){
  for(let i=0;i<count;i++){
    particles.push({
      x,y,
      vx:(Math.random()-0.5)*300,
      vy:(Math.random()-0.5)*300,
      life:0.5,
      r:2+Math.random()*2,
      color
    });
  }
}


/* =========================
   PLAYER COMBAT
========================= */

player.health = 100;
player.maxHealth = 100;

player.level = 1;
player.xp = 0;
player.xpNext = 100;

player.auraRadius = 34;
player.auraDps = 25;


/* =========================
   COLLISION
========================= */

function circleHit(ax,ay,ar,bx,by,br){
  return Math.hypot(ax-bx, ay-by) < ar+br;
}


/* =========================
   SCREEN SHAKE
========================= */

const shake = {time:0,strength:6};


/* =========================
   UPDATE SYSTEMS
========================= */

function updateSystems(dt){

  /* enemy spawn */
  spawnTimer -= dt;
  if(spawnTimer<=0){
    spawnEnemy();
    spawnTimer=1.5;
  }

  /* enemies */
  enemies.forEach(e=>{
    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const dist=Math.hypot(dx,dy)||1;

    if(e.type===ENEMY_TYPES.MELEE){
      e.x += dx/dist * e.speed * dt;
      e.y += dy/dist * e.speed * dt;
    }
    else if(e.type===ENEMY_TYPES.FIRE){
      e.cooldown-=dt;
      if(e.cooldown<=0){
        player.health-=3;
        spawnParticles(player.x,player.y,"#ff5500",6);
        e.cooldown=2;
      }
    }
    else if(e.type===ENEMY_TYPES.ICE){
      if(dist<120){
        player.speed=140;
      }else player.speed=260;
    }

    /* collision */
    if(circleHit(player.x,player.y,player.size,e.x,e.y,e.size)){
      player.health-=10*dt;
    }

    /* aura damage */
    if(dist < player.auraRadius){
      e.health -= player.auraDps * dt;
    }
  });

  /* remove dead */
  for(let i=enemies.length-1;i>=0;i--){
    if(enemies[i].health<=0){
      player.xp += 15;
      spawnParticles(enemies[i].x,enemies[i].y,"#ff3355",12);
      enemies.splice(i,1);
      shake.time=0.15;
    }
  }

  /* level up */
  if(player.xp>=player.xpNext){
    player.level++;
    player.xp=0;
    player.xpNext*=1.35;
    player.maxHealth+=10;
    player.health=player.maxHealth;
    player.auraRadius+=3;
    spawnParticles(player.x,player.y,"#6cf",20);
  }

  /* bullets */
  bullets.forEach(b=>{
    b.x += b.vx*dt;
    b.y += b.vy*dt;
  });

  /* bullet collision */
  bullets.forEach((b,bi)=>{
    enemies.forEach((e,ei)=>{
      if(circleHit(b.x,b.y,b.r,e.x,e.y,e.size)){
        e.health-=20;
        bullets.splice(bi,1);
        spawnParticles(e.x,e.y,"#ffaa00",6);
      }
    });
  });

  /* particles */
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.life-=dt;
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.vx*=0.96;
    p.vy*=0.96;
    if(p.life<=0) particles.splice(i,1);
  }

  if(shake.time>0) shake.time-=dt;
}


/* =========================
   DRAW SYSTEMS
========================= */

function drawSystems(){

  ctx.save();

  /* screen shake */
  if(shake.time>0){
    ctx.translate(
      (Math.random()-0.5)*shake.strength,
      (Math.random()-0.5)*shake.strength
    );
  }

  /* enemies */
  enemies.forEach(e=>{
    ctx.shadowBlur=20;
    ctx.fillStyle =
      e.type==="fire" ? "#ff5500" :
      e.type==="ice" ? "#66ccff" :
      "#ff3355";

    ctx.beginPath();
    ctx.arc(e.x,e.y,e.size,0,Math.PI*2);
    ctx.fill();
  });

  /* bullets */
  ctx.fillStyle="#6cf";
  bullets.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fill();
  });

  /* particles */
  particles.forEach(p=>{
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  });

  ctx.restore();

  /* HUD */
  ctx.fillStyle="#fff";
  ctx.fillText("HP: "+Math.floor(player.health),20,30);
  ctx.fillText("LV: "+player.level,20,50);
}


/* =========================
   MINI BOSS
========================= */

function spawnBoss(){
  enemies.push({
    type:ENEMY_TYPES.BOSS,
    x:player.x+200,
    y:player.y,
    size:40,
    speed:60,
    health:400
  });
}

setInterval(()=>{
  if(player.level>0 && player.level%10===0){
    spawnBoss();
  }
},15000);

