/* =========================
   WAIT FOR CORE
========================= */
function waitForCore(callback){
  const check = () => {
    if(window.update && window.draw && window.player){
      callback();
    } else {
      requestAnimationFrame(check);
    }
  };
  check();
}

waitForCore(()=>{

/* =========================
   SAFE HOOK SYSTEM
========================= */
const baseUpdate = window.update;
const baseDraw = window.draw;

/* =========================
   ENEMY SYSTEM
========================= */
const enemies=[];
let spawnTimer=0;

function spawnEnemy(){
  enemies.push({
    x:player.x + (Math.random()-0.5)*600,
    y:player.y + (Math.random()-0.5)*600,
    size:16,
    hp:30
  });
}

function updateEnemies(dt){
  spawnTimer-=dt;
  if(spawnTimer<=0){
    spawnEnemy();
    spawnTimer=1.5;
  }

  enemies.forEach(e=>{
    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const d=Math.hypot(dx,dy)||1;
    e.x+=dx/d*80*dt;
    e.y+=dy/d*80*dt;
  });
}

function drawEnemies(){
  enemies.forEach(e=>{
    ctx.fillStyle="#ff3355";
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.size,0,Math.PI*2);
    ctx.fill();
  });
}

/* =========================
   OVERRIDE UPDATE
========================= */
window.update = function(dt){
  baseUpdate(dt);
  updateEnemies(dt);
};

/* =========================
   OVERRIDE DRAW
========================= */
window.draw = function(){
  baseDraw();
  ctx.save();
  ctx.translate(canvas.width/2-camera.x,
                canvas.height/2-camera.y);
  drawEnemies();
  ctx.restore();
};

});
