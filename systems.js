/* =========================
   BIOME SYSTEM
========================= */
function getBiome(x){
  if(x > 900) return "fire";
  if(x < -900) return "ice";
  return "forest";
}

/* =========================
   ENEMY TYPES
========================= */
const ENEMY_TYPES = {
  MELEE:"melee",
  RANGED:"ranged",
  FIRE:"fire",
  ICE:"ice"
};

const enemies=[];

/* =========================
   SPAWN ENEMIES
========================= */
let spawnTimer=0;

function spawnEnemy(){

  const biome=getBiome(player.x);
  let type;

  if(biome==="fire") type=ENEMY_TYPES.FIRE;
  else if(biome==="ice") type=ENEMY_TYPES.ICE;
  else type=Math.random()<0.5?ENEMY_TYPES.MELEE:ENEMY_TYPES.RANGED;

  const angle=Math.random()*Math.PI*2;
  const dist=500+Math.random()*200;

  enemies.push({
    type,
    x:player.x+Math.cos(angle)*dist,
    y:player.y+Math.sin(angle)*dist,
    size:16,
    speed:120,
    hp: type===ENEMY_TYPES.MELEE?40:30,
    cooldown:0
  });
}

/* =========================
   PARTICLES
========================= */
const particles=[];

function spawnParticles(x,y,color,count=8){
  for(let i=0;i<count;i++){
    particles.push({
      x,y,
      vx:(Math.random()-0.5)*200,
      vy:(Math.random()-0.5)*200,
      life:0.5+Math.random()*0.4,
      size:2+Math.random()*2,
      color
    });
  }
}

/* =========================
   SCREEN SHAKE
========================= */
const screenShake={
  time:0,
  power:6
};

/* =========================
   ENEMY UPDATE
========================= */
function updateEnemies(dt){

  spawnTimer-=dt;
  if(spawnTimer<=0){
    spawnEnemy();
    spawnTimer=1.4;
  }

  enemies.forEach(e=>{

    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const dist=Math.hypot(dx,dy)||1;

    // melee takip
    if(e.type===ENEMY_TYPES.MELEE){
      e.x += (dx/dist)*e.speed*dt;
      e.y += (dy/dist)*e.speed*dt;
    }

    // ranged mesafe korur
    if(e.type===ENEMY_TYPES.RANGED){
      if(dist>220){
        e.x += (dx/dist)*e.speed*dt;
        e.y += (dy/dist)*e.speed*dt;
      }
    }

    // FIRE ENEMY
    if(e.type===ENEMY_TYPES.FIRE){
      e.cooldown-=dt;
      if(e.cooldown<=0){
        spawnParticles(e.x,e.y,"#ff5500",6);
        player.health-=3;
        e.cooldown=2;
      }
    }

    // ICE ENEMY
    if(e.type===ENEMY_TYPES.ICE){
      if(dist<120){
        player.speed=140;
        spawnParticles(player.x,player.y,"#66ccff",2);
      }
    }

  });

}

/* =========================
   COLLISION
========================= */
function hitCheck(ax,ay,ar,bx,by,br){
  const dx=ax-bx;
  const dy=ay-by;
  return Math.hypot(dx,dy)<ar+br;
}

/* =========================
   DAMAGE & XP
========================= */
function damageEnemies(dt){

  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];

    if(hitCheck(player.x,player.y,34,e.x,e.y,e.size)){
      e.hp-=30*dt;

      if(e.hp<=0){

        spawnParticles(e.x,e.y,"#0ff",12);
        screenShake.time=0.15;

        player.xp+=20;
        enemies.splice(i,1);

        if(player.xp>=player.xpToNext){
          levelUp();
        }
      }
    }
  }
}

/* =========================
   LEVEL SYSTEM
========================= */
function levelUp(){
  player.level++;
  player.xp=0;
  player.xpToNext=Math.floor(player.xpToNext*1.3);
  player.maxHealth+=10;
  player.health=player.maxHealth;
  player.speed+=10;
  spawnParticles(player.x,player.y,"#6cf",18);
}

/* =========================
   PARTICLE UPDATE
========================= */
function updateParticles(dt){

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];

    p.life-=dt;
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.vx*=0.95;
    p.vy*=0.95;

    if(p.life<=0) particles.splice(i,1);
  }

}

/* =========================
   DRAW ENEMIES
========================= */
function drawEnemies(ctx){

  enemies.forEach(e=>{
    ctx.shadowBlur=20;

    if(e.type===ENEMY_TYPES.FIRE){
      ctx.fillStyle="#ff5500";
      ctx.shadowColor="#ff5500";
    }
    else if(e.type===ENEMY_TYPES.ICE){
      ctx.fillStyle="#66ccff";
      ctx.shadowColor="#66ccff";
    }
    else{
      ctx.fillStyle="#ff3355";
      ctx.shadowColor="#ff3355";
    }

    ctx.beginPath();
    ctx.arc(e.x,e.y,e.size,0,Math.PI*2);
    ctx.fill();
  });

}

/* =========================
   DRAW PARTICLES
========================= */
function drawParticles(ctx){

  particles.forEach(p=>{
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
  });

  ctx.globalAlpha=1;
}

/* =========================
   SCREEN SHAKE APPLY
========================= */
function applyScreenShake(ctx){

  if(screenShake.time>0){
    screenShake.time-=0.016;
    const x=(Math.random()-0.5)*screenShake.power;
    const y=(Math.random()-0.5)*screenShake.power;
    ctx.translate(x,y);
  }
}

/* =========================
   BIOME BACKGROUND COLOR
========================= */
function drawBiomeBackground(ctx){

  const biome=getBiome(player.x);

  let gradient;

  if(biome==="fire"){
    gradient=ctx.createRadialGradient(0,0,200,0,0,1600);
    gradient.addColorStop(0,"#2a1208");
    gradient.addColorStop(1,"#090201");
  }
  else if(biome==="ice"){
    gradient=ctx.createRadialGradient(0,0,200,0,0,1600);
    gradient.addColorStop(0,"#0b1e2f");
    gradient.addColorStop(1,"#02060c");
  }
  else{
    gradient=ctx.createRadialGradient(0,0,200,0,0,1600);
    gradient.addColorStop(0,"#071a14");
    gradient.addColorStop(1,"#010403");
  }

  ctx.fillStyle=gradient;
  ctx.fillRect(player.x-1200,player.y-1200,2400,2400);
}

/* =========================
   SYSTEM UPDATE HOOK
========================= */
const oldUpdate = update;
update = function(dt){
  oldUpdate(dt);
  updateEnemies(dt);
  damageEnemies(dt);
  updateParticles(dt);
};

/* =========================
   SYSTEM DRAW HOOK
========================= */
const oldDraw = draw;
draw = function(){

  ctx.save();
  applyScreenShake(ctx);
  oldDraw();

  ctx.translate(canvas.width/2-camera.x,
                canvas.height/2-camera.y);

  drawBiomeBackground(ctx);
  drawEnemies(ctx);
  drawParticles(ctx);

  ctx.restore();
};
