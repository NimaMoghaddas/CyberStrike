/**
 * CYBER STRIKE // MAIN GAME ENGINE
 * Coordinates Game Loop, Camera Lerping, Dynamic Flashlight & Vignette,
 * Wave Spawning, Minimap Radar, HUD, and Input.
 */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.lightingCanvas = document.getElementById('lightingCanvas');
    this.lightingCtx = this.lightingCanvas.getContext('2d');

    this.radarCanvas = document.getElementById('radarCanvas');
    this.radarCtx = this.radarCanvas.getContext('2d');

    this.crosshair = document.getElementById('crosshair');

    // Viewport Size
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      targetX: 0,
      targetY: 0,
      lerpSpeed: 0.12
    };

    // Screen Shake
    this.screenShake = 0;

    // Game Objects
    this.map = new GameMap(2400, 2400);
    this.player = new Player(1200, 1200); // Start in center courtyard
    this.bullets = [];
    this.enemies = [];

    // Wave Progression State
    this.wave = 1;
    this.waveState = 'intermission'; // 'intermission' | 'active' | 'cleared'
    this.waveTimer = 3.0; // Countdown between waves
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.totalEnemiesInWave = 0;

    // Game Stats
    this.score = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.gameState = 'start'; // 'start' | 'playing' | 'gameover'

    // Input State
    this.input = {
      keys: {},
      mouse: { x: this.width / 2, y: this.height / 2, down: false }
    };

    // Timing
    this.lastTime = performance.now();

    // Network Multiplayer System
    this.localPlayerId = null;
    this.network = new NetworkSystem(this);

    this.initEvents();
    this.resize();
    this.initUI();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.lightingCanvas.width = this.width;
    this.lightingCanvas.height = this.height;
    this.camera.width = this.width;
    this.camera.height = this.height;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.code] = true;

      // Audio Mute Quick Toggle (M)
      if (e.code === 'KeyM') {
        const isMuted = window.soundSystem.toggleMute();
        document.getElementById('sound-icon').textContent = isMuted ? '🔇' : '🔊';
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Mouse Movement
    window.addEventListener('mousemove', (e) => {
      this.input.mouse.x = e.clientX;
      this.input.mouse.y = e.clientY;

      // Move custom crosshair
      this.crosshair.style.left = `${e.clientX}px`;
      this.crosshair.style.top = `${e.clientY}px`;
    });

    // Mouse Down / Up
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.input.mouse.down = true;
        this.crosshair.classList.add('firing');
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.input.mouse.down = false;
        this.crosshair.classList.remove('firing');
      }
    });

    // Prevent default context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', () => {
      window.soundSystem.init();
      this.startGame();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('sound-toggle-btn').addEventListener('click', () => {
      const isMuted = window.soundSystem.toggleMute();
      document.getElementById('sound-icon').textContent = isMuted ? '🔇' : '🔊';
    });
  }

  initUI() {
    // Populate ammo visual pills (30 pills)
    const pillsContainer = document.getElementById('ammo-pills');
    pillsContainer.innerHTML = '';
    for (let i = 0; i < 30; i++) {
      const pill = document.createElement('div');
      pill.className = 'ammo-pill';
      pillsContainer.appendChild(pill);
    }
  }

  startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    this.gameState = 'playing';

    if (this.network) {
      this.network.deployToBattlefield();
    }

    if (!this.network || !this.network.connected) {
      this.startWave(1);
    }
  }

  restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    this.player = new Player(1200, 1200);
    this.bullets = [];
    this.enemies = [];
    this.score = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.wave = 1;
    this.gameState = 'playing';

    if (this.network) {
      this.network.deployToBattlefield();
    }

    if (!this.network || !this.network.connected) {
      this.startWave(1);
    }
    this.updateHUD();
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveState = 'intermission';
    this.waveTimer = 2.8;

    // Calculate composition for this wave
    const baseCount = 5 + waveNum * 3;
    this.enemiesToSpawn = baseCount;
    this.totalEnemiesInWave = baseCount;
    this.spawnTimer = 0.5;

    // UI Updates
    document.getElementById('wave-display').textContent = `WAVE ${waveNum}`;
    const banner = document.getElementById('wave-banner');
    banner.textContent = `HOSTILE WAVE ${waveNum} DETECTED`;
    banner.classList.remove('hidden');

    window.soundSystem.playWaveStart();

    setTimeout(() => {
      banner.classList.add('hidden');
    }, 2400);
  }

  spawnEnemy() {
    // Pick enemy archetype according to wave difficulty
    let type = 'normal';
    const roll = Math.random();

    if (this.wave >= 3 && roll < 0.22) {
      type = 'tank';
    } else if (this.wave >= 2 && roll < 0.55) {
      type = 'fast';
    }

    // Find safe spawn location: minimum 550px from player, walkable floor
    let spawnX, spawnY;
    let attempts = 0;
    const minDistance = 550;
    const maxDistance = 1100;

    do {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDistance + Math.random() * (maxDistance - minDistance);
      spawnX = this.player.x + Math.cos(angle) * dist;
      spawnY = this.player.y + Math.sin(angle) * dist;
      attempts++;
    } while (
      attempts < 30 &&
      (spawnX < 100 || spawnX > this.map.width - 100 ||
       spawnY < 100 || spawnY > this.map.height - 100 ||
       this.map.isColliding(spawnX, spawnY, 35))
    );

    if (attempts < 30) {
      const enemy = new Enemy(spawnX, spawnY, type);
      this.enemies.push(enemy);
      this.enemiesToSpawn--;

      // Spawn Portal FX
      window.particleSystem.emit(spawnX, spawnY, 15, {
        speed: 130,
        color: enemy.color,
        life: 0.35
      });
    }
  }

  recordHit() {
    this.shotsHit++;
  }

  addScreenShake(intensity) {
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  // --- Main Update Loop ---
  update(dt) {
    if (this.gameState !== 'playing') return;

    // 1. Update Player
    this.player.update(dt, this.input, this.map, this);

    // Check Player Death
    if (!this.player.alive) {
      if (!this.network || !this.network.connected) {
        this.handleGameOver();
        return;
      }
    }

    // 2. Camera Lerping towards Player
    const targetCamX = this.player.x - this.width / 2;
    const targetCamY = this.player.y - this.height / 2;

    this.camera.x += (targetCamX - this.camera.x) * (this.camera.lerpSpeed * (dt * 60));
    this.camera.y += (targetCamY - this.camera.y) * (this.camera.lerpSpeed * (dt * 60));

    // Clamp camera within map bounds
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.map.width - this.width));
    this.camera.y = Math.max(0, Math.min(this.camera.y, this.map.height - this.height));

    // Screen Shake Decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // 3. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(dt, this.map, this.enemies, this.map.barrels, this);
      if (!bullet.active) {
        this.bullets.splice(i, 1);
      }
    }

    // 4. Update Enemies & Combat
    // If running single-player standalone, run local enemy AI and waves
    if (!this.network || !this.network.connected) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.update(dt, this.player, this.map, this.enemies, this);

        if (!enemy.alive) {
          this.score += enemy.scoreValue;
          this.kills++;
          this.enemies.splice(i, 1);
          this.addScreenShake(3);
        }
      }

      // 5. Update Wave State & Spawning
      if (this.waveState === 'intermission') {
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) {
          this.waveState = 'active';
        }
      } else if (this.waveState === 'active') {
        // Spawn pending wave enemies
        if (this.enemiesToSpawn > 0) {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            this.spawnEnemy();
            this.spawnTimer = 0.45 + Math.random() * 0.4;
          }
        } else if (this.enemies.length === 0) {
          // Wave Cleared!
          this.handleWaveClear();
        }
      }
    }

    // 6. Update Particle & FX Systems
    window.particleSystem.update(dt, this.map.decalCtx);

    // 7. Update Network System
    if (this.network) {
      this.network.update(dt);
    }

    // 8. Update HUD UI
    this.updateHUD();
  }

  handleWaveClear() {
    this.waveState = 'cleared';
    this.score += 1000;
    
    // Restore partial health and refill ammo as a wave reward
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
    this.player.ammo = this.player.magSize;
    this.player.isReloading = false;
    this.updateAmmoUI();

    window.soundSystem.playWaveClear();

    // Show Wave Clear Banner
    const clearBanner = document.getElementById('wave-clear-banner');
    document.getElementById('cleared-wave-title').textContent = `WAVE ${this.wave} COMPLETE`;
    clearBanner.classList.remove('hidden');

    setTimeout(() => {
      clearBanner.classList.add('hidden');
      this.startWave(this.wave + 1);
    }, 2800);
  }

  handleGameOver() {
    this.gameState = 'gameover';
    this.addScreenShake(18);
    window.particleSystem.emitExplosion(this.player.x, this.player.y, 80);

    // Calculate final stats
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    document.getElementById('final-score').textContent = this.score.toLocaleString();
    document.getElementById('final-wave').textContent = this.wave;
    document.getElementById('final-kills').textContent = this.kills;
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;

    setTimeout(() => {
      document.getElementById('game-over-screen').classList.remove('hidden');
    }, 600);
  }

  updateHUD() {
    // Health Bar
    const hpPct = Math.max(0, this.player.hp / this.player.maxHp) * 100;
    document.getElementById('hp-bar').style.width = `${hpPct}%`;
    document.getElementById('hp-loss-bar').style.width = `${hpPct}%`;
    document.getElementById('hp-text').textContent = `${Math.round(this.player.hp)} / 100`;

    // Dash Bar
    const dashCooldownRemaining = Math.max(0, this.player.dashCooldownTimer);
    const dashPct = ((this.player.dashCooldown - dashCooldownRemaining) / this.player.dashCooldown) * 100;
    document.getElementById('dash-bar').style.width = `${dashPct}%`;
    document.getElementById('dash-text').textContent = dashCooldownRemaining <= 0 ? 'READY' : `${dashCooldownRemaining.toFixed(1)}s`;

    // Stats
    document.getElementById('score-display').textContent = this.score.toString().padStart(5, '0');
    document.getElementById('kills-display').textContent = this.kills;
    document.getElementById('enemies-left').textContent = this.enemies.length + this.enemiesToSpawn;

    // Crosshair Reload Spinner Toggle
    if (this.player.isReloading) {
      this.crosshair.classList.add('reloading');
      document.getElementById('reload-indicator').classList.remove('hidden');
    } else {
      this.crosshair.classList.remove('reloading');
      document.getElementById('reload-indicator').classList.add('hidden');
    }
  }

  updateAmmoUI() {
    document.getElementById('ammo-current').textContent = this.player.ammo;
    document.getElementById('ammo-max').textContent = this.player.magSize;

    // Update ammo pill bars
    const pills = document.querySelectorAll('.ammo-pill');
    pills.forEach((pill, idx) => {
      if (idx < this.player.ammo) {
        pill.classList.remove('spent');
        if (this.player.ammo <= 8) {
          pill.classList.add('low');
        } else {
          pill.classList.remove('low');
        }
      } else {
        pill.classList.add('spent');
        pill.classList.remove('low');
      }
    });
  }

  // --- Render Tactical Flashlight & Atmosphere ---
  renderLighting() {
    const ctx = this.lightingCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Dark ambient gloom overlay
    ctx.fillStyle = 'rgba(6, 9, 15, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Use destination-out to carve volumetric light areas
    ctx.globalCompositeOperation = 'destination-out';

    const screenPX = this.player.x - this.camera.x;
    const screenPY = this.player.y - this.camera.y;

    // 2. Personal Body Ambient Radial Glow
    const ambientRad = 150;
    const ambGradient = ctx.createRadialGradient(screenPX, screenPY, 20, screenPX, screenPY, ambientRad);
    ambGradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    ambGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)');
    ambGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambGradient;
    ctx.beginPath();
    ctx.arc(screenPX, screenPY, ambientRad, 0, Math.PI * 2);
    ctx.fill();

    // 3. Volumetric Weapon Tactical Flashlight Cone
    const coneAngle = 0.52; // ~30 degrees cone
    const coneDist = 580;
    const aimAngle = this.player.angle;

    const flashGrad = ctx.createRadialGradient(screenPX, screenPY, 30, screenPX, screenPY, coneDist);
    flashGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    flashGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
    flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.moveTo(screenPX, screenPY);
    ctx.arc(screenPX, screenPY, coneDist, aimAngle - coneAngle / 2, aimAngle + coneAngle / 2);
    ctx.closePath();
    ctx.fill();

    // 4. Lights on Explosive Barrels & Reactor Pillars
    for (const barrel of this.map.barrels) {
      if (barrel.exploded) continue;
      const bx = barrel.x - this.camera.x;
      const by = barrel.y - this.camera.y;
      if (bx > -60 && bx < this.width + 60 && by > -60 && by < this.height + 60) {
        const bGrad = ctx.createRadialGradient(bx, by, 6, bx, by, 45);
        bGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, 45, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Operative Flashlights (All squad members illuminate darkness together)
    if (this.network) {
      this.network.renderOperativeLights(ctx, this.camera);
    }

    // Restore composite operation
    ctx.globalCompositeOperation = 'source-over';
  }

  // --- Render Tactical Scanner Radar Minimap ---
  renderRadar() {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const scale = w / this.map.width;

    ctx.clearRect(0, 0, w, h);

    // Map Walls on radar
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    for (const wall of this.map.walls) {
      ctx.fillRect(wall.x * scale, wall.y * scale, wall.w * scale, wall.h * scale);
    }

    // Pillars
    for (const pillar of this.map.pillars) {
      ctx.beginPath();
      ctx.arc(pillar.x * scale, pillar.y * scale, pillar.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Barrels (yellow dots)
    ctx.fillStyle = '#ffb703';
    for (const b of this.map.barrels) {
      if (!b.exploded) {
        ctx.beginPath();
        ctx.arc(b.x * scale, b.y * scale, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Enemies (Red / Cyan / Green blips)
    for (const e of this.enemies) {
      ctx.fillStyle = e.type === 'tank' ? '#ff3366' : e.type === 'fast' ? '#00f0ff' : '#00ff88';
      ctx.beginPath();
      ctx.arc(e.x * scale, e.y * scale, e.type === 'tank' ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Remote Operatives on Tactical Radar
    if (this.network) {
      this.network.renderOperativesOnRadar(ctx, scale);
    }

    // Player (Blue dot + direction arrow)
    const px = this.player.x * scale;
    const py = this.player.y * scale;

    ctx.fillStyle = this.player.color || '#00f0ff';
    ctx.shadowColor = this.player.color || '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // View Direction indicator
    ctx.strokeStyle = this.player.color || '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(this.player.angle) * 8, py + Math.sin(this.player.angle) * 8);
    ctx.stroke();
  }

  // --- Master Draw Frame ---
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Apply Camera & Screen Shake
    this.ctx.save();
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }
    this.ctx.translate(-Math.round(this.camera.x) + shakeX, -Math.round(this.camera.y) + shakeY);

    // 1. Draw Map & Environment
    this.map.draw(this.ctx, this.camera);

    // 2. Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    // 3. Draw Bullets
    for (const bullet of this.bullets) {
      bullet.draw(this.ctx);
    }

    // 4. Draw Player & Remote Operatives
    this.player.draw(this.ctx);
    if (this.network) {
      this.network.drawRemotePlayers(this.ctx);
    }

    // 5. Draw Dynamic Particle FX & Damage Numbers
    window.particleSystem.draw(this.ctx);

    this.ctx.restore();

    // 6. Draw Lighting & Atmospheric Vignette
    this.renderLighting();

    // 7. Draw Radar Minimap
    this.renderRadar();
  }

  // --- Game Loop ---
  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05); // cap delta-time
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate and start game engine on page load
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new GameEngine();
  window.gameEngine.start();
});
