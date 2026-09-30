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
    this.enemyProjectiles = [];
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

    // Customization & Modular Pre-Game State
    this.gameMode = 'singleplayer'; // 'singleplayer' | 'multiplayer'
    this.selectedSkinId = 'spectre';
    this.selectedMapId = 'sector_09';
    this.selectedWeaponId = 'rifle';
    this.isRespawning = false;
    this.previewAngle = 0;
    this.deaths = 0;

    // Tactical Medkit System (Spawns every 5s, restores 50 HP)
    this.medkits = [];
    this.medkitTimer = 0;

    // Network Multiplayer System
    this.localPlayerId = null;
    this.network = new NetworkSystem(this);
    window.gameInstance = this;

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

  initUI() {
    this.initModeSelector();
    this.initTerminalTabs();
    this.initSkinsUI();
    this.initMapsUI();
    this.initLoadoutUI();
    this.updateTerminalSummary();
    this.startOperativePreviewLoop();
    this.initArsenalUI();
    this.updateAmmoUI();
    this.updateLiveRoster();
  }

  initModeSelector() {
    const spBtn = document.getElementById('btn-mode-singleplayer');
    const mpBtn = document.getElementById('btn-mode-multiplayer');

    const selectMode = (mode) => {
      this.gameMode = mode;
      if (spBtn) spBtn.classList.toggle('active', mode === 'singleplayer');
      if (mpBtn) mpBtn.classList.toggle('active', mode === 'multiplayer');

      const netBadge = document.getElementById('net-status-badge');
      const startBtn = document.getElementById('start-btn');
      const rosterBadge = document.getElementById('roster-mode-badge');
      const teamHub = document.getElementById('multiplayer-team-hub');

      if (teamHub) {
        teamHub.classList.toggle('hidden', mode !== 'multiplayer');
      }

      if (mode === 'singleplayer') {
        if (netBadge) {
          netBadge.textContent = 'OFFLINE // SOLO CAMPAIGN';
          netBadge.className = 'status-chip offline-chip';
        }
        if (startBtn) {
          const btnText = startBtn.querySelector('.btn-text');
          if (btnText) btnText.textContent = 'شروع بازی تک نفره // DEPLOY SOLO';
        }
        if (rosterBadge) rosterBadge.textContent = 'SOLO OPS';
      } else {
        if (netBadge) {
          netBadge.textContent = 'ONLINE // LAN READY';
          netBadge.className = 'status-chip online-chip';
        }
        if (startBtn) {
          const btnText = startBtn.querySelector('.btn-text');
          if (btnText) btnText.textContent = 'شروع بازی چند نفره // DEPLOY SQUAD';
        }
        if (rosterBadge) rosterBadge.textContent = 'LAN MULTIPLAYER';
        if (this.network && this.network.renderLobbyUI) {
          this.network.renderLobbyUI();
        }
      }
      this.updateLiveRoster();
      if (window.soundSystem && window.soundSystem.playDryFire) {
        window.soundSystem.playDryFire();
      }
    };

    if (spBtn) spBtn.addEventListener('click', () => selectMode('singleplayer'));
    if (mpBtn) mpBtn.addEventListener('click', () => selectMode('multiplayer'));
  }

  initTerminalTabs() {
    const tabBtns = document.querySelectorAll('.terminal-tab-btn');
    const tabContents = document.querySelectorAll('.terminal-tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetEl = document.getElementById(`tab-content-${targetTab}`);
        if (targetEl) targetEl.classList.add('active');
      });
    });
  }

  initSkinsUI() {
    const grid = document.getElementById('skins-grid');
    if (!grid || typeof SKIN_DEFINITIONS === 'undefined') return;
    grid.innerHTML = '';

    for (const id in SKIN_DEFINITIONS) {
      const skin = SKIN_DEFINITIONS[id];
      const card = document.createElement('div');
      card.className = `skin-card ${id === this.selectedSkinId ? 'selected' : ''}`;
      card.id = `skin-card-${id}`;
      card.style.setProperty('--card-color', skin.colors.visor);
      card.style.setProperty('--card-glow', `${skin.colors.visor}55`);

      card.innerHTML = `
        <div class="skin-card-header">
          <div class="skin-color-badge" style="background: ${skin.colors.visor}; color: ${skin.colors.visor};"></div>
          <div>
            <div class="skin-card-title">${skin.name}</div>
            <div class="skin-card-role">${skin.role}</div>
          </div>
        </div>
        <div class="skin-card-lore">${skin.desc}</div>
        <div class="skin-card-perk">
          <span class="skin-card-perk-name">⚡ ${skin.perk.name}</span>
          <span class="skin-card-perk-desc">${skin.perk.desc}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedSkinId = id;
        document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.player.setSkin(id);
        this.updateTerminalSummary();
        if (window.soundSystem && window.soundSystem.playReload) {
          window.soundSystem.playReload();
        }
      });

      grid.appendChild(card);
    }
  }

  initMapsUI() {
    const grid = document.getElementById('maps-grid');
    if (!grid || typeof MAP_DEFINITIONS === 'undefined') return;
    grid.innerHTML = '';

    const mapIcons = {
      sector_09: '🏢',
      cyber_bunker: '🛡️',
      neon_slums: '🏮',
      reactor_crucible: '☢️'
    };

    for (const id in MAP_DEFINITIONS) {
      const mapDef = MAP_DEFINITIONS[id];
      const card = document.createElement('div');
      card.className = `map-card ${id === this.selectedMapId ? 'selected' : ''}`;
      card.id = `map-card-${id}`;
      card.style.setProperty('--map-accent', mapDef.accentColor || '#00f0ff');
      card.style.setProperty('--map-glow', `${mapDef.accentColor || '#00f0ff'}55`);

      const icon = mapIcons[id] || '🗺️';
      const barrelCount = mapDef.barrels ? mapDef.barrels.length : 0;

      card.innerHTML = `
        <div class="map-card-header">
          <span class="map-icon">${icon}</span>
          <div>
            <div class="map-card-title">${mapDef.name}</div>
            <div class="map-card-sub">${mapDef.subtitle}</div>
          </div>
        </div>
        <div class="map-card-lore">${mapDef.description}</div>
        <div class="map-card-tags">
          <span class="map-tag">${mapDef.theme.toUpperCase()} THEME</span>
          <span class="map-tag">${barrelCount} BARRELS</span>
          <span class="map-tag hazard">${mapDef.hazardLevel || 'MODERATE'}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedMapId = id;
        document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.map.setMap(id);
        this.updateTerminalSummary();
        if (window.soundSystem && window.soundSystem.playReload) {
          window.soundSystem.playReload();
        }
      });

      grid.appendChild(card);
    }
  }

  initLoadoutUI() {
    const grid = document.getElementById('loadout-grid');
    if (!grid || typeof WEAPON_DEFINITIONS === 'undefined') return;
    grid.innerHTML = '';

    for (const id in WEAPON_DEFINITIONS) {
      const w = WEAPON_DEFINITIONS[id];
      const card = document.createElement('div');
      card.className = `loadout-card ${id === this.selectedWeaponId ? 'selected' : ''}`;
      card.id = `loadout-card-${id}`;
      card.style.setProperty('--weapon-color', w.color);
      card.style.setProperty('--weapon-glow', `${w.color}55`);

      card.innerHTML = `
        <div class="loadout-card-name" style="color: ${w.color}">${w.name}</div>
        <div class="loadout-card-type">${w.category} // ${w.tag}</div>
        <div class="loadout-card-desc">${w.description}</div>
        <div class="loadout-stats">
          <span>DMG: <strong>${w.damage}${w.count ? `x${w.count}` : ''}</strong></span>
          <span>MAG: <strong>${w.magSize}</strong></span>
          <span>ROF: <strong>${Math.round(1 / w.fireRate * 60)}/m</strong></span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedWeaponId = id;
        document.querySelectorAll('.loadout-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.player.equipWeapon(id);
        this.updateTerminalSummary();
        if (window.soundSystem && window.soundSystem.playReload) {
          window.soundSystem.playReload();
        }
      });

      grid.appendChild(card);
    }
  }

  updateTerminalSummary() {
    const skin = (typeof SKIN_DEFINITIONS !== 'undefined' && SKIN_DEFINITIONS[this.selectedSkinId]) || null;
    const mapDef = (typeof MAP_DEFINITIONS !== 'undefined' && MAP_DEFINITIONS[this.selectedMapId]) || null;
    const weapon = (typeof WEAPON_DEFINITIONS !== 'undefined' && WEAPON_DEFINITIONS[this.selectedWeaponId]) || null;

    if (skin) {
      const skinNameEl = document.getElementById('sum-skin-name');
      const skinRoleEl = document.getElementById('sum-skin-role');
      const perkDescEl = document.getElementById('sum-skin-perk-desc');
      if (skinNameEl) {
        skinNameEl.textContent = skin.name;
        skinNameEl.style.color = skin.colors.visor;
      }
      if (skinRoleEl) skinRoleEl.textContent = skin.role;
      if (perkDescEl) perkDescEl.textContent = `${skin.perk.name}: ${skin.perk.desc}`;
    }

    if (mapDef) {
      const mapNameEl = document.getElementById('sum-map-name');
      if (mapNameEl) {
        mapNameEl.textContent = mapDef.name;
        mapNameEl.style.color = mapDef.accentColor || '#00f0ff';
      }
    }

    if (weapon) {
      const weaponNameEl = document.getElementById('sum-weapon-name');
      if (weaponNameEl) {
        weaponNameEl.textContent = weapon.name;
        weaponNameEl.style.color = weapon.color;
      }
    }
  }

  startOperativePreviewLoop() {
    const canvas = document.getElementById('operative-preview-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (this.gameState === 'start') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.previewAngle += 0.015;

        const skin = (typeof SKIN_DEFINITIONS !== 'undefined' && SKIN_DEFINITIONS[this.selectedSkinId]) || null;
        if (window.drawOperativeModel && skin) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          window.drawOperativeModel(ctx, skin, this.selectedWeaponId || 'rifle', this.previewAngle, 1.8);
          ctx.restore();
        }
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  handlePlayerDeath(source) {
    if (this.isRespawning) return;
    this.isRespawning = true;
    this.deaths++;

    this.addScreenShake(18);
    window.particleSystem.emitExplosion(this.player.x, this.player.y, 80);
    window.particleSystem.emitBlood(this.player.x, this.player.y, 0, 30);
    window.soundSystem.playPlayerHurt();
    this.updateLiveRoster();

    const isSelf = (source === 'self' || source === 'explosive');
    const killerLabel = isSelf ? 'SELF-ORDNANCE BLAST' : 'HOSTILE FIRE';
    const killerColor = isSelf ? '#ffb703' : '#ff3366';

    if (this.gameMode === 'multiplayer' && this.network && this.network.connected) {
      this.network.reportSelfDeath(source);
      this.network.showRespawnOverlay(killerLabel, killerColor);
      this.network.startRespawnCountdown(4);
    } else {
      // Singleplayer Solo Mode: Game Over, restart from Wave 1!
      setTimeout(() => {
        this.handleGameOver();
      }, 700);
    }
  }

  respawnLocalPlayer() {
    this.isRespawning = false;
    let spawn = { x: 1200, y: 1200 };
    if (this.map && this.map.data && this.map.data.spawns && this.map.data.spawns.length > 0) {
      spawn = this.map.data.spawns[Math.floor(Math.random() * this.map.data.spawns.length)];
    }
    this.player.respawn(spawn.x, spawn.y);
    if (this.network) {
      this.network.hideRespawnOverlay();
    }
    this.updateHUD();
    this.updateAmmoUI();
    this.updateLiveRoster();
    window.soundSystem.playReload();
  }

  // --- Tactical Medkits (Health Packs) ---
  spawnLocalMedkit() {
    const map = this.map;
    let spawnX, spawnY;
    let attempts = 0;
    const pad = 140;
    do {
      spawnX = pad + Math.random() * (map.width - pad * 2);
      spawnY = pad + Math.random() * (map.height - pad * 2);
      attempts++;
    } while (attempts < 30 && map.isColliding(spawnX, spawnY, 35));

    if (typeof Medkit !== 'undefined') {
      this.medkits.push(new Medkit(spawnX, spawnY));
    }
  }

  syncMedkits(serverMedkits) {
    if (!serverMedkits || typeof Medkit === 'undefined') return;
    const serverMap = new Map();
    serverMedkits.forEach(m => serverMap.set(m.id, m));

    // Retain existing medkits
    this.medkits = this.medkits.filter(m => serverMap.has(m.id));

    // Insert new incoming medkits
    const existingIds = new Set(this.medkits.map(m => m.id));
    serverMedkits.forEach(sm => {
      if (!existingIds.has(sm.id)) {
        this.medkits.push(new Medkit(sm.x, sm.y, sm.id, sm.heal || 50));
      }
    });
  }

  onMedkitSpawned(data) {
    if (typeof Medkit === 'undefined') return;
    if (!this.medkits.some(m => m.id === data.id)) {
      this.medkits.push(new Medkit(data.x, data.y, data.id, data.heal || 50));
    }
  }

  onMedkitCollected(data) {
    const idx = this.medkits.findIndex(m => m.id === data.id);
    if (idx !== -1) {
      const m = this.medkits[idx];
      if (window.particleSystem) {
        window.particleSystem.emit(m.x, m.y, 20, { speed: 110, color: '#00ff88', life: 0.45 });
      }
      this.medkits.splice(idx, 1);
    }
    if (data.collectorId === this.localPlayerId) {
      this.player.hp = Math.min(this.player.maxHp, data.hp);
      this.updateHUD();
    }
    this.updateLiveRoster();
  }

  // --- In-Game Live Operatives Roster Strip (Left Sidebar) ---
  updateLiveRoster() {
    const rosterList = document.getElementById('roster-list');
    if (!rosterList) return;

    const list = [];
    if (this.player) {
      list.push({
        id: this.localPlayerId || 'local',
        name: this.player.name || 'YOU',
        color: this.player.color || '#00f0ff',
        score: this.score,
        kills: this.kills,
        deaths: this.deaths,
        hp: this.player.hp,
        alive: this.player.alive,
        isMe: true
      });
    }

    if (this.gameMode === 'multiplayer' && this.network) {
      for (const id in this.network.remotePlayers) {
        const rp = this.network.remotePlayers[id];
        list.push({
          id: rp.id,
          name: rp.name,
          color: rp.color,
          score: rp.score || 0,
          kills: rp.kills || 0,
          deaths: rp.deaths || 0,
          hp: rp.hp,
          alive: rp.alive,
          isMe: false
        });
      }
    }

    list.sort((a, b) => b.score - a.score);

    rosterList.innerHTML = '';
    list.forEach((p) => {
      const card = document.createElement('div');
      card.className = `roster-card ${p.isMe ? 'me' : ''}`;
      card.innerHTML = `
        <div class="roster-top">
          <span class="roster-avatar" style="background: ${p.color}; color: ${p.color};"></span>
          <span class="roster-name">${p.name} ${p.isMe ? '(YOU)' : ''}</span>
          <span class="roster-badge ${p.alive ? 'alive' : 'elim'}">${p.alive ? `${Math.round(p.hp)} HP` : 'RESPAWNING'}</span>
        </div>
        <div class="roster-stats-row">
          <div class="roster-stat">
            <span class="roster-stat-lbl">SCORE</span>
            <span class="roster-stat-val val-gold">${p.score.toLocaleString()}</span>
          </div>
          <div class="roster-stat">
            <span class="roster-stat-lbl">KILLS</span>
            <span class="roster-stat-val val-green">${p.kills}</span>
          </div>
          <div class="roster-stat">
            <span class="roster-stat-lbl">DEATHS</span>
            <span class="roster-stat-val val-red">${p.deaths}</span>
          </div>
        </div>
      `;
      rosterList.appendChild(card);
    });
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.code] = true;

      // Weapon Selection Hotkeys (1 to 5)
      if (e.code === 'Digit1') this.player.equipWeapon('rifle');
      if (e.code === 'Digit2') this.player.equipWeapon('shotgun');
      if (e.code === 'Digit3') this.player.equipWeapon('smg');
      if (e.code === 'Digit4') this.player.equipWeapon('railgun');
      if (e.code === 'Digit5') this.player.equipWeapon('cannon');

      // Quick Switch (Q)
      if (e.code === 'KeyQ') this.player.quickSwitchWeapon();

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
      } else if (e.button === 2) {
        // Right Click: Switch Weapon!
        if (this.gameState === 'playing' && this.player && this.player.alive) {
          this.player.nextWeapon();
        }
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

    // Mouse Wheel Weapon Cycle
    window.addEventListener('wheel', (e) => {
      if (this.gameState !== 'playing' || !this.player || !this.player.alive) return;
      if (e.deltaY > 0) {
        this.player.nextWeapon();
      } else if (e.deltaY < 0) {
        this.player.previousWeapon();
      }
    }, { passive: true });

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

  initArsenalUI() {
    const dock = document.getElementById('arsenal-dock');
    if (!dock) return;
    dock.innerHTML = '';

    const order = this.player.inventory.weaponOrder;
    order.forEach((id) => {
      const w = this.player.inventory.weapons[id];
      const slot = document.createElement('div');
      slot.className = `arsenal-slot ${id === this.player.currentWeaponId ? 'active' : ''}`;
      slot.id = `arsenal-slot-${id}`;
      slot.dataset.weaponId = id;
      slot.style.setProperty('--weapon-glow', w.color);

      slot.innerHTML = `
        <div class="slot-key">${w.key}</div>
        <div class="slot-body">
          <div class="slot-name">${w.shortName}</div>
          <div class="slot-ammo" id="slot-ammo-${id}">${w.ammo}/${w.magSize}</div>
        </div>
      `;

      slot.addEventListener('click', () => {
        this.player.equipWeapon(id);
      });

      dock.appendChild(slot);
    });

    this.updateWeaponUI();
  }

  startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    this.gameState = 'playing';

    // Apply selected customizations to local player
    this.player.setSkin(this.selectedSkinId);
    this.player.equipWeapon(this.selectedWeaponId);
    this.map.setMap(this.selectedMapId);

    // Position player safely at first spawn point of the chosen map
    if (this.map.data && this.map.data.spawns && this.map.data.spawns.length > 0) {
      const spawn = this.map.data.spawns[0];
      this.player.x = spawn.x;
      this.player.y = spawn.y;
    }

    this.medkits = [];
    this.medkitTimer = 0;

    if (this.gameMode === 'multiplayer') {
      if (this.network) {
        this.network.deployToBattlefield();
      }
    } else {
      // Singleplayer Solo Mode
      this.spawnLocalMedkit();
      this.startWave(1);
    }

    this.updateHUD();
    this.updateAmmoUI();
    this.updateWeaponUI();
    this.updateLiveRoster();
  }

  restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    this.isRespawning = false;

    let startX = 1200, startY = 1200;
    if (this.map.data && this.map.data.spawns && this.map.data.spawns.length > 0) {
      startX = this.map.data.spawns[0].x;
      startY = this.map.data.spawns[0].y;
    }

    this.player = new Player(startX, startY);
    this.player.setSkin(this.selectedSkinId);
    this.player.equipWeapon(this.selectedWeaponId);

    this.bullets = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.score = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.wave = 1;
    this.gameState = 'playing';

    this.initArsenalUI();
    this.updateAmmoUI();
    this.updateWeaponUI();

    if (this.gameMode === 'multiplayer' && this.network && this.network.connected) {
      this.network.deployToBattlefield();
    } else {
      this.spawnLocalMedkit();
      this.startWave(1);
    }
    this.updateHUD();
    this.updateLiveRoster();
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveState = 'intermission';
    this.waveTimer = 2.8;

    // Tactical enemy count: keeps the battlefield readable and dynamic (4 to 7 enemies)
    const baseCount = Math.min(7, 3 + waveNum);
    this.enemiesToSpawn = baseCount;
    this.totalEnemiesInWave = baseCount;
    this.spawnTimer = 0.5;

    // UI Updates
    document.getElementById('wave-display').textContent = `WAVE ${waveNum}`;
    const banner = document.getElementById('wave-banner');
    banner.textContent = `HOSTILE WAVE ${waveNum}`;
    banner.classList.remove('hidden');

    window.soundSystem.playWaveStart();

    setTimeout(() => {
      banner.classList.add('hidden');
    }, 2000);
  }

  spawnEnemy() {
    // Pick enemy archetype according to wave difficulty
    let type = 'normal';
    const roll = Math.random();

    if (this.wave === 1) {
      type = roll < 0.65 ? 'normal' : 'fast';
    } else if (this.wave === 2) {
      if (roll < 0.35) type = 'normal';
      else if (roll < 0.65) type = 'fast';
      else type = 'shielded';
    } else if (this.wave === 3) {
      if (roll < 0.3) type = 'shielded';
      else if (roll < 0.6) type = 'sniper';
      else if (roll < 0.85) type = 'bomber';
      else type = 'fast';
    } else if (this.wave === 4) {
      if (roll < 0.25) type = 'tank';
      else if (roll < 0.5) type = 'shielded';
      else if (roll < 0.75) type = 'sniper';
      else type = 'bomber';
    } else { // Wave 5+
      if (roll < 0.2) type = 'tank';
      else if (roll < 0.4) type = 'shielded';
      else if (roll < 0.6) type = 'sniper';
      else if (roll < 0.8) type = 'bomber';
      else type = 'fast';
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

  spawnAcidSpit(x, y, angle, speed = 460, damage = 16, color = '#39ff14') {
    if (!this.enemyProjectiles) this.enemyProjectiles = [];
    if (typeof AcidSpit !== 'undefined') {
      this.enemyProjectiles.push(new AcidSpit(x, y, angle, speed, damage, color));
      if (window.soundSystem && window.soundSystem.playAcidSpit) {
        window.soundSystem.playAcidSpit();
      }
    }
  }

  // --- Main Update Loop ---
  update(dt) {
    if (this.gameState !== 'playing') return;

    // 1. Update Player (only if alive)
    if (this.player.alive) {
      this.player.update(dt, this.input, this.map, this);
    }

    // 1.5. Update Medkits (Health Packs) & 5-second periodic spawning in Singleplayer
    if (this.gameMode === 'singleplayer') {
      this.medkitTimer += dt;
      if (this.medkitTimer >= 5.0) {
        this.medkitTimer = 0;
        if (this.medkits.length < 8) {
          this.spawnLocalMedkit();
        }
      }
    }

    for (let i = this.medkits.length - 1; i >= 0; i--) {
      const medkit = this.medkits[i];
      const collected = medkit.update(dt, this.player, this);
      if (collected || medkit.collected) {
        this.medkits.splice(i, 1);
        this.updateLiveRoster();
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

    // 3.5. Update Enemy Projectiles (Acid Spit)
    if (this.enemyProjectiles) {
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = this.enemyProjectiles[i];
        proj.update(dt, this.map, this.player, this);
        if (!proj.active) {
          this.enemyProjectiles.splice(i, 1);
        }
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

    // Restore partial health and refill all weapons as a wave reward
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
    this.player.refillAllAmmo();
    this.updateAmmoUI();
    this.updateWeaponUI();

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

  updateWeaponUI() {
    if (!this.player) return;
    const current = this.player.currentWeapon;
    const nameEl = document.getElementById('weapon-name');
    const catEl = document.getElementById('weapon-category');
    const tagEl = document.getElementById('weapon-tag');

    if (nameEl) {
      nameEl.textContent = current.name;
      nameEl.style.color = current.color;
    }
    if (catEl) {
      catEl.textContent = current.category;
    }
    if (tagEl) {
      tagEl.textContent = current.tag;
      tagEl.style.borderColor = current.color;
      tagEl.style.color = current.color;
    }

    // Update active highlight in arsenal dock
    const slots = document.querySelectorAll('.arsenal-slot');
    slots.forEach(slot => {
      if (slot.dataset.weaponId === current.id) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
    });

    // Update crosshair tint and dynamics
    if (this.crosshair) {
      this.crosshair.style.setProperty('--ch-color', current.color);
    }

    this.showWeaponToast(current);
  }

  showWeaponToast(weapon) {
    const toast = document.getElementById('weapon-toast');
    if (!toast) return;

    document.getElementById('toast-key').textContent = `[${weapon.key}]`;
    const toastName = document.getElementById('toast-name');
    toastName.textContent = weapon.name;
    toastName.style.color = weapon.color;
    document.getElementById('toast-desc').textContent = `${weapon.category} // ${weapon.tag}`;

    toast.classList.remove('hidden');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 1200);
  }

  updateAmmoUI() {
    if (!this.player) return;
    const current = this.player.currentWeapon;
    const currentEl = document.getElementById('ammo-current');
    const maxEl = document.getElementById('ammo-max');
    if (currentEl) currentEl.textContent = current.ammo;
    if (maxEl) maxEl.textContent = current.magSize;

    // Update slot ammo displays in arsenal dock
    for (const id in this.player.inventory.weapons) {
      const w = this.player.inventory.weapons[id];
      const slotAmmoEl = document.getElementById(`slot-ammo-${id}`);
      if (slotAmmoEl) {
        slotAmmoEl.textContent = `${w.ammo}/${w.magSize}`;
        if (w.ammo === 0) {
          slotAmmoEl.classList.add('empty');
        } else {
          slotAmmoEl.classList.remove('empty');
        }
      }
    }

    // Dynamic ammo visual pills tailored to active weapon magazine
    const pillsContainer = document.getElementById('ammo-pills');
    if (pillsContainer) {
      if (pillsContainer.children.length !== current.magSize) {
        pillsContainer.innerHTML = '';
        for (let i = 0; i < current.magSize; i++) {
          const pill = document.createElement('div');
          pill.className = 'ammo-pill';
          pill.style.setProperty('--pill-color', current.color);
          pillsContainer.appendChild(pill);
        }
      }

      const pills = pillsContainer.children;
      const lowThreshold = Math.max(2, Math.floor(current.magSize * 0.25));
      for (let idx = 0; idx < pills.length; idx++) {
        const pill = pills[idx];
        pill.style.setProperty('--pill-color', current.color);
        if (idx < current.ammo) {
          pill.classList.remove('spent');
          if (current.ammo <= lowThreshold) {
            pill.classList.add('low');
          } else {
            pill.classList.remove('low');
          }
        } else {
          pill.classList.add('spent');
          pill.classList.remove('low');
        }
      }
    }

    // Crosshair Reload Spinner Toggle
    if (this.crosshair) {
      if (current.isReloading) {
        this.crosshair.classList.add('reloading');
        const reloadInd = document.getElementById('reload-indicator');
        if (reloadInd) reloadInd.classList.remove('hidden');
      } else {
        this.crosshair.classList.remove('reloading');
        const reloadInd = document.getElementById('reload-indicator');
        if (reloadInd) reloadInd.classList.add('hidden');
      }
    }
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

    // 1.5. Draw Medkits (Health Packs)
    for (const medkit of this.medkits) {
      medkit.draw(this.ctx);
    }

    // 2. Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    // 3. Draw Bullets
    for (const bullet of this.bullets) {
      bullet.draw(this.ctx);
    }

    // 3.5. Draw Enemy Projectiles (Acid Spit)
    if (this.enemyProjectiles) {
      for (const proj of this.enemyProjectiles) {
        proj.draw(this.ctx);
      }
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
