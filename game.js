"use strict";

/* =========================
   CORE ENGINE
========================= */

const Engine = {
  time: 0,
  delta: 0,
  running: true,
  paused: false,
  systems: []
};

/* =========================
   CANVAS
========================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resize);
resize();

/* =========================
   PLAYER
========================= */

const player = {
  x:0,
  y:0,
  r:18,
  speed:260,
  hp:100,
  maxHp:100
};

/* =========================
   CAMERA
========================= */

const camera = {
  x:0,
  y:0,
  smooth:0.08
};

/* =========================
   INPUT
========================= */

const keys = {};
addEventListener("keydown", e=>{
  keys[e.key]=true;
  if(e.key==="Escape") Engine.paused=!Engine.paused;
});
addEventListener("keyup", e=>keys[e.key]=false);

/* =========================
   JOYSTICK (SAFE MOBILE)
========================= */

let joyX=0, joyY=0;

const joystick=document.getElementById("joystick");
const stick=document.getElementById("stick");

if(joystick){

  let drag=false;

  joystick.ontouchstart=()=>drag=true;

  addEventListener("touchend",()=>{
    drag=false; joyX=joyY=0;
    stick.style.left="45px";
    stick.style.top="45px";
  });

  addEventListener("touchmove",e=>{
    if(!drag) return;

    const rect=joystick.getBoundingClientRect();
    const t=e.touches[0];

    let x=t.clientX-rect.left-70;
    let y=t.clientY-rect.top-70;

    const d=Math.hypot(x,y);
    if(d>40){ x=x/d*40; y=y/d*40; }

    joyX=x/40;
    joyY=y/40;

    stick.style.left=45+x+"px";
    stick.style.top=45+y+"px";
  });
}

/* =========================
   BULLETS
========================= */

const bullets=[];

function shoot(){
  bullets.push({
    x:player.x,
    y:player.y,
    vx:520,
    vy:0,
    life:2
  });
}

const shootBtn=document.getElementById("shootBtn");
if(shootBtn){
  shootBtn.ontouchstart=shoot;
}

/* =========================
   CORE UPDATE
========================= */

function update(dt){

  let dx=0, dy=0;

  if(keys.w||keys.ArrowUp) dy--;
  if(keys.s||keys.ArrowDown) dy++;
  if(keys.a||keys.ArrowLeft) dx--;
  if(keys.d||keys.ArrowRight) dx++;

  dx+=joyX;
  dy+=joyY;

  const len=Math.hypot(dx,dy);
  if(len){ dx/=len; dy/=len; }

  player.x+=dx*player.speed*dt;
  player.y+=dy*player.speed*dt;

  camera.x += (player.x-camera.x)*camera.smooth;
  camera.y += (player.y-camera.y)*camera.smooth;

  bullets.forEach(b=>{
    b.x+=b.vx*dt;
    b.y+=b.vy*dt;
    b.life-=dt;
  });

  for(let i=bullets.length-1;i>=0;i--){
    if(bullets[i].life<=0) bullets.splice(i,1);
  }
}

/* =========================
   DRAW PIPELINE
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.save();
  ctx.translate(canvas.width/2-camera.x,
                canvas.height/2-camera.y);

  drawGrid();

  ctx.shadowBlur=25;
  ctx.shadowColor="#00ffff";
  ctx.fillStyle="#00ffff";

  ctx.beginPath();
  ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
  ctx.fill();

  ctx.shadowBlur=0;
  ctx.fillStyle="#6cf";

  bullets.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,4,0,Math.PI*2);
    ctx.fill();
  });

  ctx.restore();
}

/* =========================
   GRID
========================= */

function drawGrid(){
  const s=60;
  ctx.strokeStyle="#00ffaa22";

  const startX=Math.floor((camera.x-canvas.width/2)/s)*s;
  const startY=Math.floor((camera.y-canvas.height/2)/s)*s;

  for(let x=startX;x<startX+canvas.width+s;x+=s){
    ctx.beginPath();
    ctx.moveTo(x,startY);
    ctx.lineTo(x,startY+canvas.height+s);
    ctx.stroke();
  }

  for(let y=startY;y<startY+canvas.height+s;y+=s){
    ctx.beginPath();
    ctx.moveTo(startX,y);
    ctx.lineTo(startX+canvas.width+s,y);
    ctx.stroke();
  }
}

/* =========================
   SYSTEM BUS
========================= */

Engine.addSystem = sys => Engine.systems.push(sys);

/* =========================
   MAIN LOOP
========================= */

function loop(t){

  Engine.delta = Math.min((t-Engine.time)/1000, 0.033);
  Engine.time = t;

  if(!Engine.paused){
    update(Engine.delta);

    Engine.systems.forEach(s=>{
      if(s.update) s.update(Engine.delta);
    });

    draw();

    Engine.systems.forEach(s=>{
      if(s.draw) s.draw(ctx);
    });
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

/* =========================
   GLOBAL EXPORT
========================= */

window.Engine = Engine;
window.player = player;
window.ctx = ctx;
window.canvas = canvas;
window.camera = camera;
