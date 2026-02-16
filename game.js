window.addEventListener("DOMContentLoaded", () => {

/* =========================
   CANVAS
========================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* =========================
   GAME STATE
========================= */
let gameRunning = true;

/* =========================
   PLAYER
========================= */
const player = {
  x: 0,
  y: 0,
  size: 18,
  speed: 260,
  health: 100,
  maxHealth: 100
};

/* =========================
   CAMERA
========================= */
const camera = {
  x: 0,
  y: 0,
  smooth: 0.08
};

/* =========================
   KEYBOARD INPUT
========================= */
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

/* =========================
   JOYSTICK (SAFE)
========================= */
let joyX = 0, joyY = 0;

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

if (joystick && stick) {

  let dragging = false;

  joystick.addEventListener("touchstart", () => dragging = true);

  window.addEventListener("touchend", () => {
    dragging = false;
    joyX = joyY = 0;
    stick.style.left = "45px";
    stick.style.top = "45px";
  });

  window.addEventListener("touchmove", e => {
    if (!dragging) return;

    const rect = joystick.getBoundingClientRect();
    const t = e.touches[0];

    let x = t.clientX - rect.left - 70;
    let y = t.clientY - rect.top - 70;

    const d = Math.hypot(x, y);
    if (d > 40) {
      x = x / d * 40;
      y = y / d * 40;
    }

    joyX = x / 40;
    joyY = y / 40;

    stick.style.left = 45 + x + "px";
    stick.style.top = 45 + y + "px";
  });
}

/* =========================
   ATTACK INPUT
========================= */
const attackInput = { shoot:false };

/* 🔥 shootBtn SAFE */
const shootBtn = document.getElementById("shootBtn");
if (shootBtn) {
  shootBtn.ontouchstart = () => attackInput.shoot = true;
  shootBtn.ontouchend   = () => attackInput.shoot = false;
}

/* =========================
   BULLETS
========================= */
const bullets = [];

function shoot(){
  bullets.push({
    x: player.x,
    y: player.y,
    vx: 520,
    vy: 0,
    r: 4
  });
}

/* =========================
   UPDATE
========================= */
function update(dt){

  let dx = 0, dy = 0;

  if (keys["w"] || keys["ArrowUp"]) dy--;
  if (keys["s"] || keys["ArrowDown"]) dy++;
  if (keys["a"] || keys["ArrowLeft"]) dx--;
  if (keys["d"] || keys["ArrowRight"]) dx++;

  dx += joyX;
  dy += joyY;

  const len = Math.hypot(dx, dy);
  if (len) {
    dx /= len;
    dy /= len;
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  // kamera yumuşatma
  camera.x += (player.x - camera.x) * camera.smooth;
  camera.y += (player.y - camera.y) * camera.smooth;

  // ateş
  if (attackInput.shoot) {
    shoot();
    attackInput.shoot = false;
  }

  bullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  });
}

/* =========================
   DRAW GRID
========================= */
function drawGrid(){

  const size = 60;
  ctx.strokeStyle = "#00ffaa22";

  const startX = Math.floor((camera.x - canvas.width/2)/size)*size;
  const startY = Math.floor((camera.y - canvas.height/2)/size)*size;

  for(let x=startX; x<startX+canvas.width+size; x+=size){
    ctx.beginPath();
    ctx.moveTo(x,startY);
    ctx.lineTo(x,startY+canvas.height+size);
    ctx.stroke();
  }

  for(let y=startY; y<startY+canvas.height+size; y+=size){
    ctx.beginPath();
    ctx.moveTo(startX,y);
    ctx.lineTo(startX+canvas.width+size,y);
    ctx.stroke();
  }
}

/* =========================
   DRAW
========================= */
function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.save();
  ctx.translate(
    canvas.width/2 - camera.x,
    canvas.height/2 - camera.y
  );

  drawGrid();

  // oyuncu
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#00ffff";
  ctx.fillStyle = "#00ffff";

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI*2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // mermiler
  ctx.fillStyle="#6cf";
  bullets.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fill();
  });

  ctx.restore();
}

/* =========================
   GAME LOOP
========================= */
let lastTime = 0;

function gameLoop(time){
  const dt = (time-lastTime)/1000;
  lastTime = time;

  if (gameRunning){
    update(dt);
    draw();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

/* =========================
   GLOBAL EXPORT
========================= */
window.player = player;
window.update = update;
window.draw = draw;

});
