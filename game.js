/* =========================
   CANVAS & CONTEXT
========================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
window.addEventListener("resize", resize);
resize();


/* =========================
   WORLD & CAMERA
========================= */

const camera = {
  x: 0,
  y: 0
};

function updateCamera(){
  camera.x = player.x - canvas.width/2;
  camera.y = player.y - canvas.height/2;
}


/* =========================
   PLAYER
========================= */

const player = {
  x: 0,
  y: 0,
  size: 18,
  speed: 260,
  dashPower: 160,
  dashCD: 0,
  color: "#00ffff"
};


/* =========================
   INPUT SYSTEM
========================= */

const keys = {};
window.addEventListener("keydown", e=>keys[e.key]=true);
window.addEventListener("keyup", e=>keys[e.key]=false);


/* ===== MOBILE JOYSTICK ===== */

let joyX=0, joyY=0;
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
let dragging=false;

joystick.addEventListener("touchstart",()=>dragging=true);

window.addEventListener("touchend",()=>{
  dragging=false;
  joyX=joyY=0;
  stick.style.left="45px";
  stick.style.top="45px";
});

window.addEventListener("touchmove",e=>{
  if(!dragging) return;

  const rect = joystick.getBoundingClientRect();
  const touch = e.touches[0];

  let x = touch.clientX - rect.left - 70;
  let y = touch.clientY - rect.top - 70;

  const dist = Math.hypot(x,y);
  if(dist>40){
    x=x/dist*40;
    y=y/dist*40;
  }

  joyX=x/40;
  joyY=y/40;

  stick.style.left = 45 + x + "px";
  stick.style.top  = 45 + y + "px";
});


/* =========================
   ACTION BUTTONS
========================= */

let meleePressed=false;
let dashPressed=false;

document.getElementById("meleeBtn").ontouchstart=()=>meleePressed=true;
document.getElementById("meleeBtn").ontouchend=()=>meleePressed=false;

document.getElementById("dashBtn").ontouchstart=()=>dashPressed=true;
document.getElementById("dashBtn").ontouchend=()=>dashPressed=false;

window.addEventListener("keydown",e=>{
  if(e.code==="Space") meleePressed=true;
  if(e.key==="Shift") dashPressed=true;
});

window.addEventListener("keyup",e=>{
  if(e.code==="Space") meleePressed=false;
  if(e.key==="Shift") dashPressed=false;
});


/* =========================
   BIOME SYSTEM
========================= */

function getBiome(x){
  if(x > 900) return "fire";
  if(x < -900) return "ice";
  return "forest";
}


/* =========================
   PLAYER UPDATE
========================= */

function updatePlayer(dt){

  let dx=0, dy=0;

  if(keys["w"]||keys["ArrowUp"]) dy--;
  if(keys["s"]||keys["ArrowDown"]) dy++;
  if(keys["a"]||keys["ArrowLeft"]) dx--;
  if(keys["d"]||keys["ArrowRight"]) dx++;

  dx += joyX;
  dy += joyY;

  const len=Math.hypot(dx,dy);
  if(len>0){
    dx/=len;
    dy/=len;
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  /* DASH */
  if(dashPressed && player.dashCD<=0){
    player.x += dx * player.dashPower;
    player.y += dy * player.dashPower;
    player.dashCD = 1;
  }

  if(player.dashCD>0) player.dashCD -= dt;
}


/* =========================
   WORLD DRAW
========================= */

function drawWorld(){

  const biome = getBiome(player.x);

  let bg;

  if(biome==="fire"){
    bg = ctx.createRadialGradient(0,0,200,0,0,1600);
    bg.addColorStop(0,"#2a1208");
    bg.addColorStop(1,"#090201");
  }
  else if(biome==="ice"){
    bg = ctx.createRadialGradient(0,0,200,0,0,1600);
    bg.addColorStop(0,"#0b1e2f");
    bg.addColorStop(1,"#02060c");
  }
  else{
    bg = ctx.createRadialGradient(0,0,200,0,0,1600);
    bg.addColorStop(0,"#071a14");
    bg.addColorStop(1,"#010403");
  }

  ctx.fillStyle=bg;
  ctx.fillRect(camera.x-1200,camera.y-1200,2400,2400);

  /* grid */
  ctx.strokeStyle="#00ffaa22";
  const grid=60;

  for(let x=-2000;x<2000;x+=grid){
    ctx.beginPath();
    ctx.moveTo(x,-2000);
    ctx.lineTo(x,2000);
    ctx.stroke();
  }

  for(let y=-2000;y<2000;y+=grid){
    ctx.beginPath();
    ctx.moveTo(-2000,y);
    ctx.lineTo(2000,y);
    ctx.stroke();
  }
}


/* =========================
   PLAYER DRAW
========================= */

function drawPlayer(){
  ctx.shadowBlur=25;
  ctx.shadowColor=player.color;
  ctx.fillStyle=player.color;

  ctx.beginPath();
  ctx.arc(player.x,player.y,player.size,0,Math.PI*2);
  ctx.fill();
}


/* =========================
   GAME LOOP
========================= */

let last=0;

function loop(t){

  const dt=(t-last)/1000;
  last=t;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  updatePlayer(dt);
  updateCamera();

  ctx.save();
  ctx.translate(-camera.x,-camera.y);

  drawWorld();
  drawPlayer();

  ctx.restore();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

