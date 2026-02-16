"use strict";

/* =========================================================
   NEON RISE - SYSTEMS.JS (PRO MODULAR SYSTEMS, 300+ LINES)
   - No update()/draw() override
   - Uses Engine.addSystem()
   - Crash-proof waiting for core
========================================================= */

(function () {
  // ---------- Core Waiter ----------
  function waitCore(cb) {
    if (window.Engine && window.player && window.canvas && window.camera && window.ctx) cb();
    else requestAnimationFrame(() => waitCore(cb));
  }

  waitCore(() => {
    /* =========================
       SAFE DOM HELPERS
    ========================= */
    const $ = (id) => document.getElementById(id);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);
    const hypot = Math.hypot;

    /* =========================
       GLOBAL GAME STATE
    ========================= */
    const State = {
      coins: 0,
      level: 1,
      xp: 0,
      xpToNext: 100,
      auraRadius: 34,
      auraDps: 28,
      time: 0,
      lastToast: 0,
      biome: "forest",
      difficulty: 1,
    };

    // Attach to window for debugging
    window.NRState = State;

    /* =========================
       TOAST (SAFE)
    ========================= */
    const toastEl = $("toast");
    function toast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.style.opacity = "1";
      toastEl.style.transform = "translateY(0px)";
      clearTimeout(toastEl.__t);
      toastEl.__t = setTimeout(() => {
        toastEl.style.opacity = "0";
        toastEl.style.transform = "translateY(6px)";
      }, 1200);
    }

    /* =========================
       BIOME SYSTEM
    ========================= */
    function getBiome(x) {
      if (x > 900) return "fire";
      if (x < -900) return "ice";
      return "forest";
    }

    function biomeGradient(ctx, biome) {
      let g;
      if (biome === "fire") {
        g = ctx.createRadialGradient(0, 0, 220, 0, 0, 1600);
        g.addColorStop(0, "#2a1208");
        g.addColorStop(1, "#090201");
        return g;
      }
      if (biome === "ice") {
        g = ctx.createRadialGradient(0, 0, 220, 0, 0, 1600);
        g.addColorStop(0, "#0b1e2f");
        g.addColorStop(1, "#02060c");
        return g;
      }
      g = ctx.createRadialGradient(0, 0, 220, 0, 0, 1600);
      g.addColorStop(0, "#071a14");
      g.addColorStop(1, "#010403");
      return g;
    }

    /* =========================
       SCREEN SHAKE (LOCAL)
       (Not touching base draw; applied to system draws)
    ========================= */
    const Shake = { t: 0, p: 6, x: 0, y: 0 };
    function kickShake(time = 0.12, power = 6) {
      Shake.t = Math.max(Shake.t, time);
      Shake.p = Math.max(Shake.p, power);
    }
    function updateShake(dt) {
      if (Shake.t > 0) {
        Shake.t -= dt;
        Shake.x = (Math.random() - 0.5) * Shake.p;
        Shake.y = (Math.random() - 0.5) * Shake.p;
      } else {
        Shake.x = Shake.y = 0;
      }
    }

    /* =========================
       PARTICLES
    ========================= */
    const particles = [];
    function spawnParticles(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y,
          vx: rand(-220, 220),
          vy: rand(-220, 220),
          life: rand(0.35, 0.75),
          r: rand(1.5, 3.2),
          color
        });
      }
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }

    function drawParticles(ctx) {
      ctx.save();
      ctx.translate(canvas.width / 2 - camera.x + Shake.x, canvas.height / 2 - camera.y + Shake.y);
      for (const p of particles) {
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* =========================
       ENEMY SYSTEM
    ========================= */
    const ENEMY_TYPES = {
      MELEE: "melee",
      RANGED: "ranged",
      FIRE: "fire",
      ICE: "ice",
      MINI_BOSS: "mini_boss"
    };

    const enemies = [];
    let spawnTimer = 0;

    function enemyBaseHp(type) {
      if (type === ENEMY_TYPES.MINI_BOSS) return 500;
      if (type === ENEMY_TYPES.MELEE) return 48;
      if (type === ENEMY_TYPES.RANGED) return 38;
      if (type === ENEMY_TYPES.FIRE) return 44;
      if (type === ENEMY_TYPES.ICE) return 44;
      return 40;
    }

    function enemyColor(type) {
      if (type === ENEMY_TYPES.FIRE) return "#ff5500";
      if (type === ENEMY_TYPES.ICE) return "#66ccff";
      if (type === ENEMY_TYPES.RANGED) return "#ffaa00";
      if (type === ENEMY_TYPES.MINI_BOSS) return "#ff6cf0";
      return "#ff3355";
    }

    function spawnEnemy() {
      const biome = State.biome;
      let type;

      // difficulty scales with level
      const chanceBoss = State.level >= 10 && State.level % 10 === 0 && Math.random() < 0.12;

      if (chanceBoss && enemies.filter(e => e.type === ENEMY_TYPES.MINI_BOSS).length === 0) {
        type = ENEMY_TYPES.MINI_BOSS;
      } else if (biome === "fire") {
        type = Math.random() < 0.65 ? ENEMY_TYPES.FIRE : ENEMY_TYPES.MELEE;
      } else if (biome === "ice") {
        type = Math.random() < 0.65 ? ENEMY_TYPES.ICE : ENEMY_TYPES.RANGED;
      } else {
        type = Math.random() < 0.55 ? ENEMY_TYPES.MELEE : ENEMY_TYPES.RANGED;
      }

      const angle = Math.random() * Math.PI * 2;
      const dist = rand(520, 780);

      const hp = enemyBaseHp(type) + Math.floor(State.level * 2.5);

      enemies.push({
        type,
        x: player.x + Math.cos(angle) * dist,
        y: player.y + Math.sin(angle) * dist,
        r: type === ENEMY_TYPES.MINI_BOSS ? 42 : 16,
        speed: type === ENEMY_TYPES.MINI_BOSS ? 70 : 120,
        hp,
        maxHp: hp,
        cooldown: 0,
        flash: 0
      });
    }

    function circleHit(ax, ay, ar, bx, by, br) {
      return hypot(ax - bx, ay - by) < ar + br;
    }

    function updateEnemies(dt) {
      spawnTimer -= dt;

      // spawn rate scales slightly with level
      const spawnRate = clamp(1.35 - State.level * 0.01, 0.55, 1.35);

      if (spawnTimer <= 0) {
        spawnEnemy();
        spawnTimer = spawnRate;
      }

      for (const e of enemies) {
        if (e.flash > 0) e.flash -= dt;

        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = hypot(dx, dy) || 1;

        // Basic AI
        if (e.type === ENEMY_TYPES.MELEE || e.type === ENEMY_TYPES.MINI_BOSS) {
          e.x += (dx / dist) * e.speed * dt;
          e.y += (dy / dist) * e.speed * dt;
        } else if (e.type === ENEMY_TYPES.RANGED) {
          if (dist > 240) {
            e.x += (dx / dist) * e.speed * dt;
            e.y += (dy / dist) * e.speed * dt;
          } else if (dist < 180) {
            // back off a bit
            e.x -= (dx / dist) * e.speed * dt * 0.65;
            e.y -= (dy / dist) * e.speed * dt * 0.65;
          }
        } else if (e.type === ENEMY_TYPES.FIRE) {
          // fire: prefers mid range
          if (dist > 220) {
            e.x += (dx / dist) * e.speed * dt;
            e.y += (dy / dist) * e.speed * dt;
          }
          e.cooldown -= dt;
          if (e.cooldown <= 0 && dist < 300) {
            // burn tick
            player.hp = clamp(player.hp - 3, 0, player.maxHp);
            spawnParticles(e.x, e.y, "#ff5500", 7);
            kickShake(0.08, 5);
            e.cooldown = 1.85;
          }
        } else if (e.type === ENEMY_TYPES.ICE) {
          // ice: slows if near
          if (dist > 220) {
            e.x += (dx / dist) * e.speed * dt;
            e.y += (dy / dist) * e.speed * dt;
          }
          if (dist < 140) {
            // slow effect via temporary speed lerp (doesn't touch base speed permanently)
            player.speed = lerp(player.speed, 140, 0.12);
            spawnParticles(player.x, player.y, "#66ccff", 2);
          }
        }

        // Collision damage (touch)
        if (circleHit(player.x, player.y, player.r, e.x, e.y, e.r)) {
          // small continuous damage
          const dmg = e.type === ENEMY_TYPES.MINI_BOSS ? 14 : 6;
          player.hp = clamp(player.hp - dmg * dt, 0, player.maxHp);
          if (Math.random() < 0.02) kickShake(0.06, 5);
        }
      }

      // Cleanup if too many enemies
      if (enemies.length > 70) enemies.splice(0, enemies.length - 70);
    }

    /* =========================
       BULLET COLLISION (SAFE)
       - Works with bullets array from game.js (if exists)
    ========================= */
    function updateBulletsHit(dt) {
      const bullets = window.bullets; // optional
      if (!bullets || !bullets.length) return;

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (circleHit(b.x, b.y, 4, e.x, e.y, e.r)) {
            e.hp -= 18 + Math.floor(State.level * 0.6);
            e.flash = 0.08;
            spawnParticles(b.x, b.y, "#6cf", 8);
            kickShake(0.06, 4);

            bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    /* =========================
       AURA DAMAGE + XP/LEVEL
    ========================= */
    function updateAura(dt) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const d = hypot(player.x - e.x, player.y - e.y);

        if (d < State.auraRadius) {
          const dps = State.auraDps * (e.type === ENEMY_TYPES.MINI_BOSS ? 0.55 : 1);
          e.hp -= dps * dt;

          if (Math.random() < 0.03) {
            spawnParticles(e.x, e.y, "#00ffff", 2);
          }
        }

        if (e.hp <= 0) {
          const xpGain =
            e.type === ENEMY_TYPES.MINI_BOSS ? 140 :
            e.type === ENEMY_TYPES.MELEE ? 22 :
            e.type === ENEMY_TYPES.RANGED ? 18 :
            20;

          const coinGain =
            e.type === ENEMY_TYPES.MINI_BOSS ? 45 :
            6;

          State.xp += xpGain;
          State.coins += coinGain;

          spawnParticles(e.x, e.y, enemyColor(e.type), 18);
          kickShake(e.type === ENEMY_TYPES.MINI_BOSS ? 0.18 : 0.10, e.type === ENEMY_TYPES.MINI_BOSS ? 10 : 6);

          enemies.splice(i, 1);

          if (State.xp >= State.xpToNext) levelUp();
        }
      }
    }

    function levelUp() {
      State.level++;
      State.xp = 0;
      State.xpToNext = Math.floor(State.xpToNext * 1.28);

      // player scaling
      player.maxHp += 10;
      player.hp = player.maxHp;
      player.r = clamp(player.r + 0.5, 18, 30);

      State.auraRadius = clamp(State.auraRadius + 2, 34, 70);
      State.auraDps += 3;

      toast("LEVEL UP! LV " + State.level);
      spawnParticles(player.x, player.y, "#6cf", 22);
      kickShake(0.18, 9);
    }

    /* =========================
       QUEST SYSTEM (LIGHT)
    ========================= */
    const questListEl = $("questList");
    const Quests = {
      list: [
        { id: "q1", title: "Kill 10 enemies", need: 10, progress: 0, reward: 80, done: false },
        { id: "q2", title: "Reach LV 5", need: 5, progress: 1, reward: 120, done: false },
        { id: "q3", title: "Collect 200 coins", need: 200, progress: 0, reward: 200, done: false },
      ],
      kills: 0
    };

    function renderQuests() {
      if (!questListEl) return;
      questListEl.innerHTML = "";
      for (const q of Quests.list) {
        const li = document.createElement("li");
        const pct = Math.floor((q.progress / q.need) * 100);
        li.textContent = (q.done ? "✅ " : "• ") + q.title + " (" + q.progress + "/" + q.need + ")";
        li.style.opacity = q.done ? "0.65" : "1";
        if (!q.done && pct >= 100) li.style.color = "#6cf";
        questListEl.appendChild(li);
      }
    }

    function questTick() {
      for (const q of Quests.list) {
        if (q.done) continue;

        if (q.id === "q1") q.progress = Quests.kills;
        if (q.id === "q2") q.progress = State.level;
        if (q.id === "q3") q.progress = State.coins;

        if (q.progress >= q.need) {
          q.done = true;
          State.coins += q.reward;
          toast("QUEST COMPLETE +" + q.reward + " COINS");
          spawnParticles(player.x, player.y, "#00ff99", 18);
          kickShake(0.12, 7);
        }
      }
      renderQuests();
    }

    /* =========================
       SHOP SYSTEM (UI SAFE)
    ========================= */
    const shopBtn = $("shopBtn");
    const shopPanel = $("shopPanel");
    const shopItemsEl = $("shopItems");
    const closeShopBtn = shopPanel ? shopPanel.querySelector(".closeBtn") : null;

    const Shop = {
      items: [
        { id: "aura1", name: "Aura +5", price: 120, apply: () => (State.auraRadius = clamp(State.auraRadius + 5, 34, 90)) },
        { id: "dps1", name: "Aura DPS +6", price: 160, apply: () => (State.auraDps += 6) },
        { id: "hp1", name: "Max HP +20", price: 200, apply: () => (player.maxHp += 20, player.hp = player.maxHp) },
        { id: "spd1", name: "Speed +25", price: 180, apply: () => (player.speed += 25) },
      ]
    };

    function openShop() {
      if (!shopPanel) return;
      shopPanel.classList.remove("hidden");
      renderShop();
    }

    function closeShop() {
      if (!shopPanel) return;
      shopPanel.classList.add("hidden");
    }

    function renderShop() {
      if (!shopItemsEl) return;
      shopItemsEl.innerHTML = "";
      for (const it of Shop.items) {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.margin = "8px 0";

        const left = document.createElement("div");
        left.textContent = it.name + " — " + it.price;

        const btn = document.createElement("button");
        btn.textContent = "BUY";
        btn.onclick = () => {
          if (State.coins < it.price) {
            toast("Not enough coins");
            return;
          }
          State.coins -= it.price;
          it.apply();
          toast("Purchased: " + it.name);
          renderShop();
        };

        row.appendChild(left);
        row.appendChild(btn);
        shopItemsEl.appendChild(row);
      }
    }

    if (shopBtn) shopBtn.addEventListener("click", openShop);
    if (closeShopBtn) closeShopBtn.addEventListener("click", closeShop);

    /* =========================
       HUD SYNC (SAFE)
    ========================= */
    const hpSpan = document.querySelector("#healthBar span");
    const xpSpan = document.querySelector("#xpBar span");
    const levelText = $("levelText");

    function updateHUD() {
      if (hpSpan) {
        const ratio = clamp(player.hp / player.maxHp, 0, 1);
        hpSpan.style.width = (ratio * 100).toFixed(1) + "%";
      }
      if (xpSpan) {
        const ratio = clamp(State.xp / State.xpToNext, 0, 1);
        xpSpan.style.width = (ratio * 100).toFixed(1) + "%";
      }
      if (levelText) levelText.textContent = "LV " + State.level;
    }

    /* =========================
       DRAW: BIOME BACKGROUND (BEHIND)
       - Uses destination-over so it appears behind base draw
    ========================= */
    function drawBiomeBehind(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.translate(canvas.width / 2 - camera.x + Shake.x, canvas.height / 2 - camera.y + Shake.y);

      const biome = State.biome;
      const g = biomeGradient(ctx, biome);
      ctx.fillStyle = g;

      // Big tile around player
      ctx.fillRect(player.x - 1400, player.y - 1400, 2800, 2800);
      ctx.restore();
    }

    /* =========================
       DRAW: ENEMIES + HEALTHBARS
    ========================= */
    function drawEnemies(ctx) {
      ctx.save();
      ctx.translate(canvas.width / 2 - camera.x + Shake.x, canvas.height / 2 - camera.y + Shake.y);

      for (const e of enemies) {
        const c = enemyColor(e.type);

        ctx.shadowBlur = e.type === ENEMY_TYPES.MINI_BOSS ? 28 : 18;
        ctx.shadowColor = c;

        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        // flash hit overlay
        if (e.flash > 0) {
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // HP bar
        const ratio = clamp(e.hp / e.maxHp, 0, 1);
        const w = e.type === ENEMY_TYPES.MINI_BOSS ? 92 : 46;
        const h = 6;

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w, h);

        ctx.fillStyle = c;
        ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w * ratio, h);
      }

      ctx.restore();
    }

    /* =========================
       DRAW: AURA RING (CENTERED)
    ========================= */
    function drawAura(ctx) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, State.auraRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* =========================
       MINIMAP FEED (SAFE)
       - Only updates if minimap exists
    ========================= */
    const miniCanvas = $("minimapCanvas");
    const miniCtx = miniCanvas ? miniCanvas.getContext("2d") : null;

    function updateMinimap() {
      if (!miniCanvas || !miniCtx) return;

      miniCanvas.width = 120;
      miniCanvas.height = 120;

      miniCtx.fillStyle = "#000";
      miniCtx.fillRect(0, 0, 120, 120);

      // player in center
      miniCtx.fillStyle = "#0ff";
      miniCtx.fillRect(58, 58, 4, 4);

      // enemies relative
      miniCtx.fillStyle = "#f35";
      for (const e of enemies) {
        const rx = clamp((e.x - player.x) / 12, -55, 55);
        const ry = clamp((e.y - player.y) / 12, -55, 55);
        miniCtx.fillRect(60 + rx, 60 + ry, 2, 2);
      }
    }

    /* =========================
       MAIN MENU BUTTONS SAFE
       (If you use them in HTML)
    ========================= */
    const playBtn = $("playBtn");
    const mainMenu = $("mainMenu");
    const settingsBtn = $("settingsBtn");
    const settingsMenu = $("settingsMenu");
    const backBtn = $("backBtn");

    if (playBtn && mainMenu) {
      playBtn.addEventListener("click", () => {
        mainMenu.classList.add("hidden");
        Engine.running = true;
        toast("Welcome back.");
      });
    }

    if (settingsBtn && settingsMenu) {
      settingsBtn.addEventListener("click", () => {
        settingsMenu.classList.remove("hidden");
      });
    }

    if (backBtn && settingsMenu) {
      backBtn.addEventListener("click", () => {
        settingsMenu.classList.add("hidden");
      });
    }

    /* =========================
       CORE SYSTEM REGISTRATION
    ========================= */
    Engine.addSystem({
      update(dt) {
        State.time += dt;

        // biome follow player
        const b = getBiome(player.x);
        State.biome = b;

        // difficulty scales smoothly
        State.difficulty = 1 + State.level * 0.06;

        // gentle speed restore if ice slowed it
        player.speed = lerp(player.speed, 260 + State.level * 1.2, 0.03);

        updateShake(dt);
        updateEnemies(dt);
        updateBulletsHit(dt);
        updateAura(dt);
        updateParticles(dt);

        // quests tick every ~0.6s
        if (State.time - (Quests.__t || 0) > 0.6) {
          Quests.__t = State.time;
          questTick();
        }

        // HUD & minimap
        updateHUD();
        updateMinimap();

        // death -> respawn
        if (player.hp <= 0) {
          player.hp = player.maxHp;
          player.x = 0;
          player.y = 0;
          enemies.length = 0;
          toast("Respawned");
          spawnParticles(0, 0, "#00ffff", 28);
          kickShake(0.25, 12);
        }
      },

      draw(ctx) {
        // background behind base draw
        drawBiomeBehind(ctx);

        // aura
        drawAura(ctx);

        // enemies, particles (on top)
        drawEnemies(ctx);
        drawParticles(ctx);
      }
    });

    /* =========================
       ENEMY KILL TRACKING
       - We count kills by comparing length changes
    ========================= */
    let lastEnemyCount = enemies.length;
    Engine.addSystem({
      update() {
        if (enemies.length < lastEnemyCount) {
          // approximate: count difference as kills
          const diff = lastEnemyCount - enemies.length;
          Quests.kills += diff;
        }
        lastEnemyCount = enemies.length;
      }
    });

    /* =========================
       FIRST RENDER SETUP
    ========================= */
    renderQuests();
    toast("Systems loaded ✅");
  });
})();
