"use strict";

function waitCore(cb){
  if(window.Engine && window.player){
    cb();
  } else {
    requestAnimationFrame(()=>waitCore(cb));
  }
}

waitCore(()=>{

/* =========================
   ENEMY SYSTEM
========================= */

const enemies=[];
let spawnTimer=0;

Engine.addSystem({

  update(dt){

    spawnTimer-=dt;
    if(spawnTimer<=0){
      spawnTimer=1.5;
      enemies.push({
        x:player.x+(Math.random()-0.5)*700,
        y:player.y+(Math.random()-0.5)*700,
        r:16,
        hp:40
      });
    }

    enemies.forEach(e=>{
      const dx=player.x-e.x;
      const dy=player.y-e.y;
      const d=Math.hypot(dx,dy)||1;

      e.x+=dx/d*90*dt;
      e.y+=dy/d*90*dt;
    });
  },

  draw(ctx){

    ctx.save();
    ctx.translate(canvas.width/2-camera.x,
                  canvas.height/2-camera.y);

    ctx.shadowBlur=20;
    ctx.shadowColor="#ff3355";

    enemies.forEach(e=>{
      ctx.fillStyle="#ff3355";
      ctx.beginPath();
      ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
      ctx.fill();
    });

    ctx.restore();
  }

});

});
