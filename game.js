"use strict";

/* =====================================================
   NEON RISE PRO ENGINE CORE
===================================================== */

/* =========================
   ENGINE CORE
========================= */

const Engine = {
  time: 0,
  delta: 0,
  paused: false,
  systems: [],
  entities: [],
  addSystem(sys){ this.systems.push(sys); },
  addEntity(e){ this.entities.push(e); }
};

window.Engine = Engine;

/* =========================
   SAFE DOM ACCESS
========================= */

function $(id){ return document.getElementById(id); }

/* =========================
   CANVAS SETUP
========================= */

const canvas = $("game");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resize);
resize();

window.ctx = ctx;
window.canvas = canvas;

/* =========================
   PLAYER ENTITY
========================= */

const player = {
  x: 0,
  y: 0,
  r: 18,
  speed: 260,
  hp: 100,
  maxHp: 100,
  dashCD: 0,
  invuln: 0,
  glow: 20
};

Engine.addEntity(player);
window.player = player;

/* =========================
   CAMERA SYSTEM
========================= */

const camera = {
  x:0,
  y:0,
  smooth:0.08
};
window.camera = camera;

/* =========================
   INPUT MANAGER
========================= */

const Input = {
  keys:{},
  joyX:0,
  joyY:0,
  shoot:false,
  dash:false
};

addEventListener("keydown",e=>{
  Input.keys[e.key]=true;
  if(e.key==="Escape") Engine.paused=!Engine.paused;
});

addEventListener("keyup",e=>{
  Input.keys[e.key]=false;
});

/* =========================
   MOBILE JOYSTICK
========================= */

const joystick = $("joystick");
const stick = $("stick");

if(joystick && stick){

  let dragging=false;

  joystick.ontouchstart=()=>dragging=true;

  addEventListener("touchend",()=>{
    dragging=false;
    Input.joyX=Input.joyY=0;
    stick.style.left="45px";
    stick.style.top="45px";
  });

  addEventListener("touchmove",e=>{
    if(!dragging) return;

    const rect=joystick.getBoundingClientRect();
    const t=e.touches[0];

    let x=t.clientX-rect.left-70;
    let y=t.clientY-rect.top-70;

    const d=Math.hypot(x,y);
    if(d>40){
      x=x/d*40;
      y=y/d*40;
    }

    Input.joyX=x/40;
    Input.joyY=y/40;

    stick.style.left=45+x+"px";
    stick.style.top=45+y+"px";
  });

}

/* =========================
   MOBILE BUTTONS
========================= */

const shootBtn=$("shootBtn");
if(shootBtn){
  shootBtn.ontouchstart=()=>Input.shoot=true;
  shootBtn.ontouchend=()=>Input.shoot=false;
}

const dashBtn=$("dashBtn");
if(dashBtn){
  dashBtn.ontouchstart=()=>Input.dash=true;
  dashBtn.ontouchend=()=>Input.dash=false;
}

/* =========================
   BULLET POOL (PERF)
========================= */

const bullets=[];
const bulletPool=[];

function getBullet(){
  return bulletPool.pop() || {x:0,y:0,vx:0,vy:0,life:0};
}

function shoot(){
  const b=getBullet();
  b.x=player.x;
  b.y=player.y;
  b.vx=520;
  b.vy=0;
  b.life=2;
  bullets.push(b);
}

/* =========================
   DASH TRAIL PARTICLES
========================= */

const trails=[];

function spawnTrail(){
  trails.push({
    x:player.x,
    y:player.y,
    life:0.25
  });
}

/* =========================
   PLAYER UPDATE
========================= */

function updatePlayer(dt){

  let dx=0,dy=0;

  if(Input.keys.w||Input.keys.ArrowUp) dy--;
  if(Input.keys.s||Input.keys.ArrowDown) dy++;
  if(Input.keys.a||Input.keys.ArrowLeft) dx--;
  if(Input.keys.d||Input.keys.ArrowRight) dx++;

  dx+=Input.joyX;
  dy+=Input.joyY;

  const len=Math.hypot(dx,dy);
  if(len){ dx/=len; dy/=len; }

  player.x+=dx*player.speed*dt;
  player.y+=dy*player.speed*dt;

  if(Input.shoot){
    shoot();
    Input.shoot=false;
  }

  if(Input.dash && player.dashCD<=0){
    player.x+=dx*160;
    player.y+=dy*160;
    player.invuln=0.25;
    player.dashCD=1;
    spawnTrail();
    Input.dash=false;
  }

  if(player.dashCD>0) player.dashCD-=dt;
  if(player.invuln>0) player.invuln-=dt;
}

/* =========================
   BULLET UPDATE
========================= */

function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.x+=b.vx*dt;
    b.y+=b.vy*dt;
    b.life-=dt;

    if(b.life<=0){
      bulletPool.push(b);
      bullets.splice(i,1);
    }
  }
}

/* =========================
   TRAIL UPDATE
========================= */

function updateTrails(dt){
  for(let i=trails.length-1;i>=0;i--){
    trails[i].life-=dt;
    if(trails[i].life<=0) trails.splice(i,1);
  }
}

/* =========================
   CAMERA UPDATE
========================= */

function updateCamera(){
  camera.x += (player.x-camera.x)*camera.smooth;
  camera.y += (player.y-camera.y)*camera.smooth;
}

/* =========================
   DRAW GRID
========================= */

function drawGrid(){
  const size=60;
  ctx.strokeStyle="#00ffaa22";

  const startX=Math.floor((camera.x-canvas.width/2)/size)*size;
  const startY=Math.floor((camera.y-canvas.height/2)/size)*size;

  for(let x=startX;x<startX+canvas.width+size;x+=size){
    ctx.beginPath();
    ctx.moveTo(x,startY);
    ctx.lineTo(x,startY+canvas.height+size);
    ctx.stroke();
  }

  for(let y=startY;y<startY+canvas.height+size;y+=size){
    ctx.beginPath();
    ctx.moveTo(startX,y);
    ctx.lineTo(startX+canvas.width+size,y);
    ctx.stroke();
  }
}

/* =========================
   DRAW PLAYER
========================= */

function drawPlayer(){

  ctx.shadowBlur=player.glow;
  ctx.shadowColor="#00ffff";
  ctx.fillStyle="#00ffff";

  ctx.beginPath();
  ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
  ctx.fill();

  ctx.shadowBlur=0;
}

/* =========================
   DRAW BULLETS
========================= */

function drawBullets(){
  ctx.fillStyle="#6cf";
  bullets.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,4,0,Math.PI*2);
    ctx.fill();
  });
}

/* =========================
   DRAW TRAILS
========================= */

function drawTrails(){
  trails.forEach(t=>{
    ctx.globalAlpha=t.life*4;
    ctx.fillStyle="#00ffff";
    ctx.beginPath();
    ctx.arc(t.x,t.y,player.r,0,Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha=1;
}

/* =========================
   MAIN DRAW
========================= */

function coreDraw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.save();
  ctx.translate(canvas.width/2-camera.x,
                canvas.height/2-camera.y);

  drawGrid();
  drawTrails();
  drawPlayer();
  drawBullets();

  ctx.restore();
}

/* =========================
   LOOP
========================= */

function loop(t){

  Engine.delta=Math.min((t-Engine.time)/1000,0.033);
  Engine.time=t;

  if(!Engine.paused){

    updatePlayer(Engine.delta);
    updateBullets(Engine.delta);
    updateTrails(Engine.delta);
    updateCamera();

    Engine.systems.forEach(s=>s.update?.(Engine.delta));

    coreDraw();

    Engine.systems.forEach(s=>s.draw?.(ctx));
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
