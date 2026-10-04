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
    this.acidPools = [];
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

    // Customization & Modular Pre-Game State (Loaded from persistent localStorage)
    this.loadProfile();
    this.player.setModel(this.selectedModelType || 'commando');
    this.player.setColor(this.selectedSkinColor || '#00f0ff');
    this.player.name = this.savedCallsign || 'GHOST-01';
    this.player.equipWeapon(this.selectedWeaponId || 'rifle');
    this.map.setMap(this.selectedMapId || 'sector_09');

    this.isRespawning = false;
    this.previewAngle = 0;
    this.deaths = 0;

    // Tactical Medkit System (Spawns every 5s, restores 50 HP)
    this.medkits = [];
    this.medkitTimer = 0;

    // Tactical Weapon Drop System (Ground Scavenger Mode)
    this.weaponDrops = [];
    this.weaponDropTimer = 0;
    this.weaponMode = 'standard'; // 'standard' | 'ground'
    this.pvpOnly = false;

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
    const callsignInput = document.getElementById('operative-callsign-input');
    if (callsignInput && this.savedCallsign) {
      callsignInput.value = this.savedCallsign;
      this.player.name = this.savedCallsign;
    }

    this.initModeSelector();
    this.initTerminalTabs();
    this.initSkinsUI();
    this.initMapsUI();
    this.initLoadoutUI();
    this.updateTerminalSummary();
    this.renderLobbyHighScores();
    this.startOperativePreviewLoop();
    this.initArsenalUI();
    this.updateAmmoUI();
    this.updateLiveRoster();
    this.updateCustomizationSections();
    this.initLightingUI();
    this.initWeaponModeUI();
    this.initPvPModeUI();
  }

  initModeSelector() {
    const spBtn = document.getElementById('btn-mode-singleplayer');
    const mpBtn = document.getElementById('btn-mode-multiplayer');

    const selectMode = (mode) => {
      this.gameMode = mode;
      this.saveProfile({ gameMode: mode });
      if (spBtn) spBtn.classList.toggle('active', mode === 'singleplayer');
      if (mpBtn) mpBtn.classList.toggle('active', mode === 'multiplayer');

      const netBadge = document.getElementById('net-status-badge');
      const startBtn = document.getElementById('start-btn');
      const rosterBadge = document.getElementById('roster-mode-badge');
      const teamHub = document.getElementById('multiplayer-team-hub');
      const threatCol = document.getElementById('protocol-col-threat');

      if (teamHub) {
        teamHub.classList.toggle('hidden', mode !== 'multiplayer');
      }
      if (threatCol) {
        threatCol.classList.toggle('hidden', mode !== 'multiplayer');
      }

      if (mode === 'singleplayer') {
        const soloRecordsPanel = document.getElementById('solo-records-panel');
        if (soloRecordsPanel) {
          soloRecordsPanel.classList.remove('hidden');
          soloRecordsPanel.style.display = 'block';
        }
        if (netBadge) {
          netBadge.textContent = 'OFFLINE // SOLO';
          netBadge.className = 'status-chip offline-chip';
        }
        if (startBtn) {
          const btnText = startBtn.querySelector('.btn-text');
          if (btnText) btnText.textContent = 'START';
        }
        if (rosterBadge) rosterBadge.textContent = 'SOLO';
      } else {
        const soloRecordsPanel = document.getElementById('solo-records-panel');
        if (soloRecordsPanel) {
          soloRecordsPanel.classList.add('hidden');
          soloRecordsPanel.style.display = 'none';
        }
        if (netBadge) {
          netBadge.textContent = 'ONLINE // LAN';
          netBadge.className = 'status-chip online-chip';
        }
        if (startBtn) {
          const btnText = startBtn.querySelector('.btn-text');
          if (btnText) {
            btnText.textContent = (this.network && this.network.isReady) ? 'READY ✓' : 'READY';
          }
        }
        if (rosterBadge) rosterBadge.textContent = 'MULTIPLAYER';
        if (this.network && this.network.renderLobbyUI) {
          this.network.renderLobbyUI();
        }
      }
      this.updateLiveRoster();
      this.updateCustomizationSections();
      this.updateMapSelectionUI();
      if (window.soundSystem && window.soundSystem.playDryFire) {
        window.soundSystem.playDryFire();
      }
    };

    if (spBtn) spBtn.addEventListener('click', () => selectMode('singleplayer'));
    if (mpBtn) mpBtn.addEventListener('click', () => selectMode('multiplayer'));

    // Apply saved mode on startup
    selectMode(this.gameMode || 'singleplayer');
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
    this.initModelsUI();
    this.initColorsUI();
  }

  initModelsUI() {
    const grid = document.getElementById('models-grid');
    if (!grid || typeof OPERATIVE_MODELS === 'undefined') return;
    grid.innerHTML = '';

    for (const id in OPERATIVE_MODELS) {
      const model = OPERATIVE_MODELS[id];
      const card = document.createElement('div');
      card.className = `model-card ${id === (this.selectedModelType || 'commando') ? 'selected' : ''}`;
      card.id = `model-card-${id}`;

      card.innerHTML = `
        <div class="model-card-header">
          <span class="model-card-icon">${model.icon}</span>
          <div>
            <div class="model-card-title">${model.name}</div>
            <div class="model-card-role">${model.role}</div>
          </div>
        </div>
        <div class="model-card-desc">${model.desc}</div>
      `;

      card.addEventListener('click', () => {
        this.selectedModelType = id;
        this.saveProfile({ modelType: id });
        document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        this.player.setModel(id);
        if (this.network && this.network.socket && this.network.connected) {
          this.network.socket.emit('lobby_update_model', { modelType: id });
        }
        if (window.soundSystem && window.soundSystem.playReload) {
          window.soundSystem.playReload();
        }
      });

      grid.appendChild(card);
    }
  }

  initColorsUI() {
    const grid = document.getElementById('colors-palette-grid');
    if (!grid || typeof OPERATIVE_COLORS === 'undefined') return;
    grid.innerHTML = '';

    OPERATIVE_COLORS.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `palette-swatch-btn ${item.hex === (this.selectedSkinColor || '#00f0ff') ? 'selected' : ''}`;
      btn.id = `swatch-${item.id}`;
      btn.style.setProperty('--swatch-color', item.hex);

      btn.innerHTML = `
        <div class="swatch-circle" style="background: ${item.hex};"></div>
        <span class="swatch-label">${item.name}</span>
      `;

      btn.addEventListener('click', () => {
        this.selectedSkinColor = item.hex;
        this.saveProfile({ color: item.hex });
        document.querySelectorAll('.palette-swatch-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        this.player.setColor(item.hex);
        if (this.network && this.network.socket && this.network.connected) {
          this.network.color = item.hex;
          this.network.socket.emit('lobby_select_color', { color: item.hex });
        }
        if (window.soundSystem && window.soundSystem.playDryFire) {
          window.soundSystem.playDryFire();
        }
      });

      grid.appendChild(btn);
    });
  }

  initMapsUI() {
    const grid = document.getElementById('maps-grid');
    if (!grid || typeof MAP_DEFINITIONS === 'undefined') return;
    grid.innerHTML = '';

    const mapIcons = {
      sector_09: '🏢',
      cyber_bunker: '🛡️',
      neon_slums: '🏮',
      reactor_crucible: '☢️',
      orbital_station: '🛰️'
    };

    for (const id in MAP_DEFINITIONS) {
      const mapDef = MAP_DEFINITIONS[id];
      const card = document.createElement('div');
      card.className = `map-card ${id === this.selectedMapId ? 'selected' : ''}`;
      card.id = `map-card-${id}`;
      card.setAttribute('data-map', id);
      card.dataset.map = id;
      card.style.setProperty('--map-accent', mapDef.accentColor || '#00f0ff');
      card.style.setProperty('--map-glow', `${mapDef.accentColor || '#00f0ff'}55`);

      const icon = mapIcons[id] || '🗺️';
      const isSelected = (id === this.selectedMapId);

      card.innerHTML = `
        <div class="map-card-header">
          <span class="map-icon">${icon}</span>
          <div class="map-card-info">
            <div class="map-card-title">${mapDef.shortName || mapDef.name}</div>
            <div class="map-card-sub">${mapDef.badge || mapDef.hazardLevel || 'TACTICAL ZONE'}</div>
          </div>
        </div>
        <div class="map-card-badge ${isSelected ? 'active' : ''}">${isSelected ? '● ACTIVE' : 'SELECT'}</div>
      `;

      card.addEventListener('click', () => {
        // If in multiplayer and connected, only the leader can change the map
        if (this.gameMode === 'multiplayer' && this.network && this.network.connected && !this.network.isHost) {
          const statusText = document.getElementById('match-status-text');
          if (statusText) {
            const old = statusText.textContent;
            statusText.textContent = 'MAP IS CONTROLLED BY ROOM LEADER';
            statusText.style.color = '#ffb703';
            setTimeout(() => {
              statusText.textContent = old;
              statusText.style.color = 'var(--accent-cyan)';
            }, 2000);
          }
          return;
        }

        this.selectedMapId = id;
        this.saveProfile({ mapId: id });
        this.map.setMap(id);
        this.updateMapSelectionUI();

        if (this.network && this.network.socket && this.network.connected && this.network.isHost) {
          this.network.socket.emit('lobby_set_map', { mapId: id });
        }

        if (window.soundSystem && window.soundSystem.playReload) {
          window.soundSystem.playReload();
        }
      });

      grid.appendChild(card);
    }

    // Active map banner click shortcut to immediately open MAPS tab
    const banner = document.getElementById('active-map-banner');
    if (banner && !banner._hasMapJumpListener) {
      banner._hasMapJumpListener = true;
      banner.addEventListener('click', () => {
        const mapsTabBtn = document.querySelector('.terminal-tab-btn[data-tab="maps"]');
        if (mapsTabBtn) mapsTabBtn.click();
      });
    }

    this.updateMapSelectionUI();
  }

  updateMapSelectionUI() {
    const currentId = this.selectedMapId || 'sector_09';
    const mapIcons = {
      sector_09: '🏢',
      cyber_bunker: '🛡️',
      neon_slums: '🏮',
      reactor_crucible: '☢️',
      orbital_station: '🛰️'
    };

    document.querySelectorAll('.map-card').forEach(c => {
      const cardMapId = c.getAttribute('data-map') || c.id.replace('map-card-', '');
      const isSel = (cardMapId === currentId);
      c.classList.toggle('selected', isSel);
      const badge = c.querySelector('.map-card-badge');
      if (badge) {
        badge.textContent = isSel ? '● ACTIVE' : 'SELECT';
        badge.classList.toggle('active', isSel);
      }
    });

    const mapDef = (typeof MAP_DEFINITIONS !== 'undefined' && MAP_DEFINITIONS[currentId]) || null;
    const icon = mapIcons[currentId] || '🗺️';
    const shortTitle = mapDef ? (mapDef.shortName || mapDef.name) : 'SECTOR-09';
    const accentCol = mapDef ? (mapDef.accentColor || '#00f0ff') : '#00f0ff';

    // 1. Tab Navigation Mini Badge
    const navSub = document.getElementById('nav-active-map-name');
    if (navSub) {
      navSub.textContent = shortTitle;
      navSub.style.color = accentCol;
      navSub.style.borderColor = `${accentCol}55`;
    }

    // 2. Active Map Banner under Callsign (Left Column)
    const bannerVal = document.getElementById('active-map-banner-val');
    if (bannerVal) {
      bannerVal.textContent = `${icon} ${shortTitle}`;
      bannerVal.style.color = accentCol;
    }

    // 3. Header Status in Maps Tab
    const lobbyActiveBadge = document.getElementById('lobby-active-map-badge');
    if (lobbyActiveBadge) {
      lobbyActiveBadge.textContent = `CURRENT: ${shortTitle}`;
      lobbyActiveBadge.style.color = accentCol;
      lobbyActiveBadge.style.borderColor = `${accentCol}66`;
    }

    this.updateTerminalSummary();
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
        <div class="loadout-card-type">${w.category}</div>
      `;

      card.addEventListener('click', () => {
        this.selectedWeaponId = id;
        this.saveProfile({ weaponId: id });
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
        if (window.drawOperativeModel) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);

          let previewColor = this.selectedSkinColor || '#00f0ff';
          if (this.gameMode === 'multiplayer' && this.network && this.network.lobbyMode === 'teams') {
            previewColor = (this.network.myTeam === 'beta') ? this.network.betaColor : this.network.alphaColor;
          }

          window.drawOperativeModel(ctx, skin, this.selectedWeaponId || 'rifle', this.previewAngle, 1.8, {
            modelType: this.selectedModelType || 'commando',
            color: previewColor
          });
          ctx.restore();
        }
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  updateCustomizationSections() {
    const isTeamMode = (this.gameMode === 'multiplayer' && (!this.network || this.network.lobbyMode === 'teams'));
    const colorsContainer = document.getElementById('section-colors-container');
    if (colorsContainer) {
      colorsContainer.classList.toggle('hidden', isTeamMode);
    }
  }

  setLightingMode(mode, userInitiated = true) {
    if (mode !== 'tactical' && mode !== 'full') return;
    this.lightingMode = mode;
    localStorage.setItem('syberstrike_lighting', mode);

    const btnTactical = document.getElementById('btn-lighting-tactical');
    const btnFull = document.getElementById('btn-lighting-full');
    if (btnTactical) btnTactical.classList.toggle('active', this.lightingMode === 'tactical');
    if (btnFull) btnFull.classList.toggle('active', this.lightingMode === 'full');

    if (userInitiated && this.network && this.network.socket && this.network.connected) {
      if (this.network.isHost || !this.network.isInMultiplayerSquad()) {
        this.network.socket.emit('lobby_set_lighting', { lightingMode: mode });
      }
    }
  }

  updateLightingUIState() {
    const btnTactical = document.getElementById('btn-lighting-tactical');
    const btnFull = document.getElementById('btn-lighting-full');
    const hostTag = document.getElementById('lighting-host-tag');

    const inSquad = this.network && this.network.connected && this.network.isInMultiplayerSquad();
    const isHost = this.network && this.network.isHost;

    if (btnTactical) btnTactical.classList.toggle('active', this.lightingMode === 'tactical');
    if (btnFull) btnFull.classList.toggle('active', this.lightingMode === 'full');

    if (inSquad) {
      if (hostTag) {
        hostTag.classList.remove('hidden');
        hostTag.textContent = isHost ? 'SQUAD LEADER (YOU)' : 'SQUAD LEADER ONLY';
        hostTag.style.color = isHost ? '#00ff88' : 'rgba(255, 255, 255, 0.4)';
      }
      if (btnTactical) {
        btnTactical.style.opacity = isHost ? '1' : '0.6';
        btnTactical.style.cursor = isHost ? 'pointer' : 'not-allowed';
        btnTactical.title = isHost ? 'Set squad visibility protocol' : 'Controlled by squad leader';
      }
      if (btnFull) {
        btnFull.style.opacity = isHost ? '1' : '0.6';
        btnFull.style.cursor = isHost ? 'pointer' : 'not-allowed';
        btnFull.title = isHost ? 'Set squad visibility protocol' : 'Controlled by squad leader';
      }
    } else {
      if (hostTag) hostTag.classList.add('hidden');
      if (btnTactical) {
        btnTactical.style.opacity = '1';
        btnTactical.style.cursor = 'pointer';
        btnTactical.title = '';
      }
      if (btnFull) {
        btnFull.style.opacity = '1';
        btnFull.style.cursor = 'pointer';
        btnFull.title = '';
      }
    }
  }

  initLightingUI() {
    const btnTactical = document.getElementById('btn-lighting-tactical');
    const btnFull = document.getElementById('btn-lighting-full');
    this.lightingMode = localStorage.getItem('syberstrike_lighting') || 'tactical';

    this.updateLightingUIState();

    if (btnTactical) {
      btnTactical.addEventListener('click', () => {
        if (this.network && this.network.connected && this.network.isInMultiplayerSquad() && !this.network.isHost) {
          return; // Non-host member cannot change lighting
        }
        this.setLightingMode('tactical', true);
      });
    }
    if (btnFull) {
      btnFull.addEventListener('click', () => {
        if (this.network && this.network.connected && this.network.isInMultiplayerSquad() && !this.network.isHost) {
          return; // Non-host member cannot change lighting
        }
        this.setLightingMode('full', true);
      });
    }
  }

  // --- Weapon Mode UI & Protocol (Standard vs Ground Scavenger) ---
  setWeaponMode(mode, userInitiated = true) {
    if (mode !== 'standard' && mode !== 'ground') return;
    this.weaponMode = mode;
    localStorage.setItem('syberstrike_weapon_mode', mode);

    const btnStandard = document.getElementById('btn-weapon-standard');
    const btnGround = document.getElementById('btn-weapon-ground');
    if (btnStandard) btnStandard.classList.toggle('active', this.weaponMode === 'standard');
    if (btnGround) btnGround.classList.toggle('active', this.weaponMode === 'ground');

    if (userInitiated && this.network && this.network.socket && this.network.connected) {
      if (this.network.isHost || !this.network.isInMultiplayerSquad()) {
        this.network.socket.emit('lobby_set_weapon_mode', { weaponMode: mode });
      }
    }
  }

  updateWeaponModeUIState() {
    const btnStandard = document.getElementById('btn-weapon-standard');
    const btnGround = document.getElementById('btn-weapon-ground');
    const hostTag = document.getElementById('weapon-mode-host-tag');

    const inSquad = this.network && this.network.connected && this.network.isInMultiplayerSquad();
    const isHost = this.network && this.network.isHost;

    if (btnStandard) btnStandard.classList.toggle('active', this.weaponMode === 'standard');
    if (btnGround) btnGround.classList.toggle('active', this.weaponMode === 'ground');

    if (inSquad) {
      if (hostTag) {
        hostTag.classList.remove('hidden');
        hostTag.textContent = isHost ? 'SQUAD LEADER (YOU)' : 'SQUAD LEADER ONLY';
        hostTag.style.color = isHost ? '#00ff88' : 'rgba(255, 255, 255, 0.4)';
      }
      if (btnStandard) {
        btnStandard.style.opacity = isHost ? '1' : '0.6';
        btnStandard.style.cursor = isHost ? 'pointer' : 'not-allowed';
      }
      if (btnGround) {
        btnGround.style.opacity = isHost ? '1' : '0.6';
        btnGround.style.cursor = isHost ? 'pointer' : 'not-allowed';
      }
    } else {
      if (hostTag) hostTag.classList.add('hidden');
      if (btnStandard) {
        btnStandard.style.opacity = '1';
        btnStandard.style.cursor = 'pointer';
      }
      if (btnGround) {
        btnGround.style.opacity = '1';
        btnGround.style.cursor = 'pointer';
      }
    }
  }

  initWeaponModeUI() {
    const btnStandard = document.getElementById('btn-weapon-standard');
    const btnGround = document.getElementById('btn-weapon-ground');
    this.weaponMode = localStorage.getItem('syberstrike_weapon_mode') || 'standard';

    this.updateWeaponModeUIState();

    if (btnStandard) {
      btnStandard.addEventListener('click', () => {
        if (this.network && this.network.connected && this.network.isInMultiplayerSquad() && !this.network.isHost) {
          return;
        }
        this.setWeaponMode('standard', true);
      });
    }
    if (btnGround) {
      btnGround.addEventListener('click', () => {
        if (this.network && this.network.connected && this.network.isInMultiplayerSquad() && !this.network.isHost) {
          return;
        }
        this.setWeaponMode('ground', true);
      });
    }
  }

  // --- Threat Protocol / PvP Only UI ---
  setPvPMode(mode, userInitiated = true) {
    this.pvpOnly = (mode === 'pvp_only');
    const btnEnemies = document.getElementById('btn-pvp-with-enemies');
    const btnPvPOnly = document.getElementById('btn-pvp-only');
    if (btnEnemies) btnEnemies.classList.toggle('active', !this.pvpOnly);
    if (btnPvPOnly) btnPvPOnly.classList.toggle('active', this.pvpOnly);

    if (userInitiated && this.network && this.network.socket && this.network.connected) {
      if (this.network.isHost || !this.network.isInMultiplayerSquad()) {
        this.network.socket.emit('lobby_set_pvp_only', { pvpOnly: this.pvpOnly });
      }
    }
  }

  updatePvPModeUIState() {
    const threatCol = document.getElementById('protocol-col-threat');
    if (threatCol) {
      threatCol.classList.toggle('hidden', this.gameMode !== 'multiplayer');
    }

    const btnEnemies = document.getElementById('btn-pvp-with-enemies');
    const btnPvPOnly = document.getElementById('btn-pvp-only');
    const hostTag = document.getElementById('pvp-host-tag');

    const inSquad = this.network && this.network.connected && this.network.isInMultiplayerSquad();
    const isHost = this.network && this.network.isHost;

    if (btnEnemies) btnEnemies.classList.toggle('active', !this.pvpOnly);
    if (btnPvPOnly) btnPvPOnly.classList.toggle('active', this.pvpOnly);

    if (inSquad) {
      if (hostTag) {
        hostTag.classList.remove('hidden');
        hostTag.textContent = isHost ? 'SQUAD LEADER (YOU)' : 'SQUAD LEADER ONLY';
        hostTag.style.color = isHost ? '#00ff88' : 'rgba(255, 255, 255, 0.4)';
      }
      if (btnEnemies) {
        btnEnemies.style.opacity = isHost ? '1' : '0.6';
        btnEnemies.style.cursor = isHost ? 'pointer' : 'not-allowed';
      }
      if (btnPvPOnly) {
        btnPvPOnly.style.opacity = isHost ? '1' : '0.6';
        btnPvPOnly.style.cursor = isHost ? 'pointer' : 'not-allowed';
      }
    } else {
      if (hostTag) hostTag.classList.add('hidden');
      if (btnEnemies) {
        btnEnemies.style.opacity = '1';
        btnEnemies.style.cursor = 'pointer';
      }
      if (btnPvPOnly) {
        btnPvPOnly.style.opacity = '1';
        btnPvPOnly.style.cursor = 'pointer';
      }
    }
  }

  initPvPModeUI() {
    const btnEnemies = document.getElementById('btn-pvp-with-enemies');
    const btnPvPOnly = document.getElementById('btn-pvp-only');
    this.pvpOnly = false;

    this.updatePvPModeUIState();

    if (btnEnemies) {
      btnEnemies.addEventListener('click', () => {
        if (this.network && this.network.connected && this.network.isInMultiplayerSquad() && !this.network.isHost) {
          return;
        }
        this.setPvPMode('enemies', true);
      });
    }
    if (btnPvPOnly) {
      btnPvPOnly.addEventListener('click', () => {
        if (this.network && this.network.connected && this.network.isInMultiplayerSquad() && !this.network.isHost) {
          return;
        }
        this.setPvPMode('pvp_only', true);
      });
    }
  }

  // --- Persistent Operative Profile Management ---
  loadProfile() {
    try {
      this.savedCallsign = localStorage.getItem('syberstrike_callsign') || 'GHOST-01';
      this.selectedModelType = localStorage.getItem('syberstrike_model') || 'commando';
      this.selectedSkinColor = localStorage.getItem('syberstrike_color') || '#00f0ff';
      this.selectedWeaponId = localStorage.getItem('syberstrike_weapon') || 'rifle';
      this.selectedMapId = localStorage.getItem('syberstrike_map') || 'sector_09';
      this.gameMode = localStorage.getItem('syberstrike_mode') || 'singleplayer';
      this.lightingMode = localStorage.getItem('syberstrike_lighting') || 'tactical';
      this.selectedSkinId = 'spectre';
    } catch (e) {
      console.warn('[STORAGE] Error loading profile from localStorage:', e);
      this.savedCallsign = 'GHOST-01';
      this.selectedModelType = 'commando';
      this.selectedSkinColor = '#00f0ff';
      this.selectedWeaponId = 'rifle';
      this.selectedMapId = 'sector_09';
      this.gameMode = 'singleplayer';
      this.lightingMode = 'tactical';
      this.selectedSkinId = 'spectre';
    }
  }

  saveProfile(updates) {
    if (!updates || typeof updates !== 'object') return;
    try {
      if (updates.callsign) {
        this.savedCallsign = updates.callsign;
        localStorage.setItem('syberstrike_callsign', updates.callsign);
      }
      if (updates.modelType) {
        this.selectedModelType = updates.modelType;
        localStorage.setItem('syberstrike_model', updates.modelType);
      }
      if (updates.color) {
        this.selectedSkinColor = updates.color;
        localStorage.setItem('syberstrike_color', updates.color);
      }
      if (updates.weaponId) {
        this.selectedWeaponId = updates.weaponId;
        localStorage.setItem('syberstrike_weapon', updates.weaponId);
      }
      if (updates.mapId) {
        this.selectedMapId = updates.mapId;
        localStorage.setItem('syberstrike_map', updates.mapId);
      }
      if (updates.gameMode) {
        this.gameMode = updates.gameMode;
        localStorage.setItem('syberstrike_mode', updates.gameMode);
      }
      if (updates.lightingMode) {
        this.lightingMode = updates.lightingMode;
        localStorage.setItem('syberstrike_lighting', updates.lightingMode);
      }
    } catch (e) {
      console.warn('[STORAGE] Error saving profile to localStorage:', e);
    }
  }

  // --- Singleplayer Top 3 High Scores System ---
  getSoloHighScores() {
    try {
      const raw = localStorage.getItem('syberstrike_solo_highscores');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => b.score - a.score).slice(0, 3);
        }
      }
    } catch (e) {
      console.warn('[STORAGE] Error loading solo high scores:', e);
    }
    return [];
  }

  saveSinglePlayerScore(score, wave, kills) {
    if (!score || score <= 0) return false;
    try {
      const list = this.getSoloHighScores();
      const currentEntry = {
        score: Math.round(score),
        wave: wave || 1,
        kills: kills || 0,
        date: new Date().toLocaleDateString()
      };

      const isTop3 = list.length < 3 || currentEntry.score > list[list.length - 1].score;

      list.push(currentEntry);
      list.sort((a, b) => b.score - a.score);
      const top3 = list.slice(0, 3);

      localStorage.setItem('syberstrike_solo_highscores', JSON.stringify(top3));
      this.renderLobbyHighScores();
      return isTop3;
    } catch (e) {
      console.warn('[STORAGE] Error saving solo score:', e);
      return false;
    }
  }

  renderLobbyHighScores() {
    const listEl = document.getElementById('solo-records-list');
    if (!listEl) return;
    const scores = this.getSoloHighScores();
    listEl.innerHTML = '';

    const medals = ['🥇', '🥈', '🥉'];
    const rankLabels = ['1ST', '2ND', '3RD'];

    for (let i = 0; i < 3; i++) {
      const item = scores[i];
      const row = document.createElement('div');
      row.className = `solo-record-row rank-${i + 1} ${item ? 'has-record' : 'empty-record'}`;

      if (item) {
        row.innerHTML = `
          <div class="record-rank-col">
            <span class="record-medal">${medals[i]}</span>
            <span class="record-rank-label">${rankLabels[i]}</span>
          </div>
          <div class="record-main-col">
            <div class="record-score">${item.score.toLocaleString()} <span class="record-pts">PTS</span></div>
            <div class="record-details">PHASE ${item.wave} &bull; ${item.kills} KILLS</div>
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="record-rank-col">
            <span class="record-medal empty-medal">${medals[i]}</span>
            <span class="record-rank-label">${rankLabels[i]}</span>
          </div>
          <div class="record-main-col empty-main">
            <div class="record-score empty-score">------</div>
            <div class="record-details empty-sub">NO RECORD</div>
          </div>
        `;
      }
      listEl.appendChild(row);
    }
  }

  showScreen(screenId) {
    const screens = ['start-screen', 'game-over-screen', 'team-match-over-screen'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === screenId) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    if (screenId === 'start-screen') {
      this.gameState = 'start';
      this.renderLobbyHighScores();
      this.updateTerminalSummary();
      this.updateMapSelectionUI();
      if (this.network && this.network.renderLobbyUI) {
        this.network.renderLobbyUI();
      }
    }
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

  // --- Tactical Weapon Drops (Ground Scavenger Mode) ---
  spawnLocalWeaponDrop(specificType = null) {
    const map = this.map;
    let spawnX, spawnY;
    let attempts = 0;
    const pad = 140;
    do {
      spawnX = pad + Math.random() * (map.width - pad * 2);
      spawnY = pad + Math.random() * (map.height - pad * 2);
      attempts++;
    } while (attempts < 30 && map.isColliding(spawnX, spawnY, 35));

    const weaponTypes = ['rifle', 'shotgun', 'smg', 'railgun', 'cannon'];
    const chosenType = specificType || weaponTypes[Math.floor(Math.random() * weaponTypes.length)];

    if (typeof WeaponDrop !== 'undefined') {
      this.weaponDrops.push(new WeaponDrop(spawnX, spawnY, chosenType));
    }
  }

  syncWeaponDrops(serverDrops) {
    if (!serverDrops || typeof WeaponDrop === 'undefined') return;
    const serverMap = new Map();
    serverDrops.forEach(d => serverMap.set(d.id, d));

    // Retain existing drops matching server list
    this.weaponDrops = this.weaponDrops.filter(d => serverMap.has(d.id));

    // Add new drops from server
    const existingIds = new Set(this.weaponDrops.map(d => d.id));
    serverDrops.forEach(sd => {
      if (!existingIds.has(sd.id)) {
        this.weaponDrops.push(new WeaponDrop(sd.x, sd.y, sd.weaponType, sd.id));
      }
    });
  }

  onWeaponDropSpawned(data) {
    if (typeof WeaponDrop === 'undefined') return;
    if (!this.weaponDrops.some(d => d.id === data.id)) {
      this.weaponDrops.push(new WeaponDrop(data.x, data.y, data.weaponType, data.id));
    }
  }

  onWeaponDropCollected(data) {
    const idx = this.weaponDrops.findIndex(d => d.id === data.id);
    if (idx !== -1) {
      const drop = this.weaponDrops[idx];
      if (window.particleSystem) {
        const color = (drop.def && drop.def.color) || '#00f0ff';
        window.particleSystem.emit(drop.x, drop.y, 25, { speed: 130, color: color, life: 0.5 });
      }
      this.weaponDrops.splice(idx, 1);
    }
    if (data.collectorId === this.localPlayerId && this.player) {
      this.player.equipWeapon(data.weaponType);
      this.player.ammo = this.player.magSize;
      this.updateHUD();
      if (this.showWeaponToast) {
        const def = window.WEAPON_DEFINITIONS ? window.WEAPON_DEFINITIONS[data.weaponType] : null;
        if (def) this.showWeaponToast(def);
      }
    }
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

      // Weapon Selection Hotkeys (1 to 5) - only allowed in Standard Arsenal mode!
      if (this.weaponMode !== 'ground') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') this.player.equipWeapon('rifle');
        if (e.code === 'Digit2' || e.code === 'Numpad2') this.player.equipWeapon('shotgun');
        if (e.code === 'Digit3' || e.code === 'Numpad3') this.player.equipWeapon('smg');
        if (e.code === 'Digit4' || e.code === 'Numpad4') this.player.equipWeapon('railgun');
        if (e.code === 'Digit5' || e.code === 'Numpad5') this.player.equipWeapon('cannon');
        if (e.code === 'KeyQ') this.player.quickSwitchWeapon();
      }

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

    // Mouse Down / Up (Right click weapon cycle removed as requested)
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

    // Mouse Wheel Weapon Cycle (Only in standard mode)
    window.addEventListener('wheel', (e) => {
      if (this.gameState !== 'playing' || !this.player || !this.player.alive) return;
      if (this.weaponMode === 'ground') return; // Cannot cycle weapons in ground drop mode
      if (e.deltaY > 0) {
        this.player.nextWeapon();
      } else if (e.deltaY < 0) {
        this.player.previousWeapon();
      }
    }, { passive: true });

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', () => {
      window.soundSystem.init();
      const inMultiplayerParty = (this.gameMode === 'multiplayer') ||
        (this.network && this.network.connected && this.network.lobbyPlayers && this.network.lobbyPlayers.length > 1) ||
        (this.network && this.network.connected && !this.network.isHost);

      if (inMultiplayerParty && this.network && this.network.connected) {
        if (this.network.gameStarted) {
          // Mid-game join -> deploy straight into the ongoing match
          this.network.deployToBattlefield();
          this.startGame();
        } else {
          // In multiplayer lobby -> toggle READY state
          this.network.toggleReady();
        }
      } else {
        this.startGame();
      }
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.restartGame();
    });

    const gameOverLobbyBtn = document.getElementById('game-over-lobby-btn');
    if (gameOverLobbyBtn) {
      gameOverLobbyBtn.addEventListener('click', () => {
        this.showScreen('start-screen');
      });
    }

    const savedMuted = localStorage.getItem('syberstrike_muted') === 'true';
    if (savedMuted && window.soundSystem) {
      window.soundSystem.muted = true;
      const icon = document.getElementById('sound-icon');
      if (icon) icon.textContent = '🔇';
    }

    document.getElementById('sound-toggle-btn').addEventListener('click', () => {
      const isMuted = window.soundSystem.toggleMute();
      document.getElementById('sound-icon').textContent = isMuted ? '🔇' : '🔊';
      localStorage.setItem('syberstrike_muted', isMuted);
    });

    const callsignInput = document.getElementById('operative-callsign-input');
    if (callsignInput) {
      callsignInput.addEventListener('input', () => {
        const val = callsignInput.value.trim().toUpperCase();
        if (val.length > 0) {
          this.savedCallsign = val;
          this.player.name = val;
          this.saveProfile({ callsign: val });
          if (this.network && this.network.socket && this.network.connected) {
            this.network.callsign = val;
            this.network.socket.emit('lobby_update_name', { name: val });
          }
        }
      });
    }
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

    // Auto-detect and ensure multiplayer mode if in party or connected with other players
    if (this.network && this.network.connected && ((this.network.lobbyPlayers && this.network.lobbyPlayers.length > 1) || !this.network.isHost || this.network.roomId || Object.keys(this.network.remotePlayers).length > 0)) {
      this.gameMode = 'multiplayer';
    }

    // Apply selected customizations to local player
    this.player.setSkin(this.selectedSkinId);
    this.player.setModel(this.selectedModelType || 'commando');

    let activeColor = this.selectedSkinColor || '#00f0ff';
    if (this.gameMode === 'multiplayer' && this.network && this.network.lobbyMode === 'teams') {
      activeColor = (this.network.myTeam === 'beta') ? this.network.betaColor : this.network.alphaColor;
      this.network.color = activeColor;
    }
    this.player.setColor(activeColor);
    this.player.color = activeColor;
    this.player.equipWeapon(this.selectedWeaponId);
    this.map.setMap(this.selectedMapId);

    // Position player safely at first spawn point of the chosen map
    const spawn = (this.map.spawns && this.map.spawns.length > 0) ? this.map.spawns[0] : (this.map.spawnPoint || { x: 1200, y: 1200 });
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.lastSafeX = spawn.x;
    this.player.lastSafeY = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.map.resolveCircleCollision(this.player);

    this.medkits = [];
    this.medkitTimer = 0;
    this.weaponDrops = [];
    this.weaponDropTimer = 0;
    this.acidPools = [];

    // Clear persistent blood decals and old particles on start
    if (this.map && this.map.clearDecals) {
      this.map.clearDecals();
    }
    if (window.particleSystem) {
      window.particleSystem.particles = [];
      window.particleSystem.damageNumbers = [];
    }

    if (this.gameMode === 'multiplayer') {
      this.enemies = [];
      this.enemyProjectiles = [];
      this.acidPools = [];
      this.bullets = [];
      if (this.network) {
        this.network.deployToBattlefield();
      }
    } else {
      // Singleplayer Solo Mode
      this.spawnLocalMedkit();
      if (this.weaponMode === 'ground') {
        const types = ['rifle', 'shotgun', 'smg', 'railgun', 'cannon'];
        types.forEach(t => this.spawnLocalWeaponDrop(t));
      }
      this.startWave(1);
    }

    // Team Battle Scoreboard HUD visibility
    const teamHud = document.getElementById('team-scoreboard-hud');
    if (teamHud) {
      if (this.gameMode === 'multiplayer' && this.network && this.network.lobbyMode === 'teams') {
        teamHud.classList.remove('hidden');
      } else {
        teamHud.classList.add('hidden');
      }
    }

    this.updateHUD();
    this.updateAmmoUI();
    this.updateWeaponUI();
    this.updateLiveRoster();
  }

  restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    this.isRespawning = false;

    const spawn = (this.map.spawns && this.map.spawns.length > 0) ? this.map.spawns[0] : (this.map.spawnPoint || { x: 1200, y: 1200 });
    const startX = spawn.x;
    const startY = spawn.y;

    this.player = new Player(startX, startY);
    this.player.name = this.savedCallsign || 'GHOST-01';
    this.player.maxHp = 100;
    this.player.hp = 100;
    this.player.lastSafeX = startX;
    this.player.lastSafeY = startY;
    this.map.resolveCircleCollision(this.player);
    this.player.setSkin(this.selectedSkinId);
    this.player.setModel(this.selectedModelType || 'commando');
    this.player.setColor(this.selectedSkinColor || '#00f0ff');
    this.player.equipWeapon(this.selectedWeaponId);

    this.bullets = [];
    this.enemyProjectiles = [];
    this.acidPools = [];
    this.enemies = [];
    this.score = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.wave = 1;
    this.gameState = 'playing';

    // Clear persistent blood decals and particles on Try Again / Restart
    if (this.map && this.map.clearDecals) {
      this.map.clearDecals();
    }
    if (window.particleSystem) {
      window.particleSystem.particles = [];
      window.particleSystem.damageNumbers = [];
    }

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

    // Total enemies: Wave 1 starts with exactly 20 hostiles, scaling exponentially per wave
    const totalCount = 20 + (waveNum - 1) * 8 + Math.floor((waveNum - 1) * (waveNum - 1) * 1.5);
    this.enemiesToSpawn = totalCount;
    this.totalEnemiesInWave = totalCount;
    this.spawnTimer = 0.1; // Initial spawn batch right when wave activates

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
    // Pick enemy archetype: Blue enemies (fast, shielded) completely removed!
    // Archetype selection with agile speed enemies, explosive bombers, snipers, and tanks
    let type = 'normal';
    const roll = Math.random();

    if (this.wave === 1) {
      if (roll < 0.35) type = 'normal';
      else if (roll < 0.55) type = 'fast';
      else if (roll < 0.75) type = 'splitter';
      else if (roll < 0.88) type = 'toxic'; // Bio-Slimer toxic spitter
      else type = 'bomber';
    } else if (this.wave === 2) {
      if (roll < 0.25) type = 'normal';
      else if (roll < 0.42) type = 'fast';
      else if (roll < 0.60) type = 'splitter';
      else if (roll < 0.74) type = 'toxic'; // Bio-Slimer toxic spitter
      else if (roll < 0.87) type = 'bomber';
      else type = 'sniper';
    } else if (this.wave === 3) {
      if (roll < 0.18) type = 'normal';
      else if (roll < 0.34) type = 'fast';
      else if (roll < 0.48) type = 'splitter';
      else if (roll < 0.62) type = 'toxic'; // Bio-Slimer toxic spitter
      else if (roll < 0.75) type = 'bomber';
      else if (roll < 0.88) type = 'sniper';
      else type = 'tank';
    } else { // Wave 4+
      if (roll < 0.14) type = 'normal';
      else if (roll < 0.28) type = 'fast';
      else if (roll < 0.42) type = 'splitter';
      else if (roll < 0.56) type = 'toxic'; // Bio-Slimer toxic spitter
      else if (roll < 0.70) type = 'bomber';
      else if (roll < 0.84) type = 'sniper';
      else type = 'tank';
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

  spawnAcidSpit(x, y, angle, speed = 460, damage = 16, color = '#39ff14', ignoreWalls = false, leavesPool = false) {
    if (!this.enemyProjectiles) this.enemyProjectiles = [];
    if (typeof AcidSpit !== 'undefined') {
      this.enemyProjectiles.push(new AcidSpit(x, y, angle, speed, damage, color, ignoreWalls || color === '#b026ff', leavesPool));
      if (window.soundSystem && window.soundSystem.playAcidSpit) {
        window.soundSystem.playAcidSpit();
      }
    }
  }

  spawnAcidPool(x, y, radius = 24, duration = 3.0, dps = 6, color = '#39ff14') {
    if (!this.acidPools) this.acidPools = [];
    if (typeof AcidPool !== 'undefined') {
      if (this.acidPools.length > 30) {
        this.acidPools.shift();
      }
      this.acidPools.push(new AcidPool(x, y, radius, duration, dps, color));
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

    // 1.6. Update Weapon Drops (Ground Scavenger Mode)
    if (this.gameMode === 'singleplayer' && this.weaponMode === 'ground') {
      this.weaponDropTimer += dt;
      if (this.weaponDropTimer >= 5.0) {
        this.weaponDropTimer = 0;
        if (this.weaponDrops.length < 10) {
          this.spawnLocalWeaponDrop();
        }
      }
    }

    for (let i = this.weaponDrops.length - 1; i >= 0; i--) {
      const drop = this.weaponDrops[i];
      const collected = drop.update(dt, this.player, this);
      if (collected || drop.collected) {
        this.weaponDrops.splice(i, 1);
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

    // 3.6. Update Acid Pools (Ground Toxic Hazards)
    if (this.acidPools) {
      for (let i = this.acidPools.length - 1; i >= 0; i--) {
        const pool = this.acidPools[i];
        pool.update(dt, this.player, this);
        if (!pool.active) {
          this.acidPools.splice(i, 1);
        }
      }
    }

    // 4. Update Enemies & Combat
    // In singleplayer mode, run local enemy AI and waves
    if (this.gameMode === 'singleplayer') {
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
        // Spawn pending wave enemies in staggered batches over time
        if (this.enemiesToSpawn > 0) {
          this.spawnTimer -= dt;
          // If all active enemies are dead, immediately flush next batch without waiting!
          if (this.enemies.length === 0) {
            this.spawnTimer = 0;
          }
          if (this.spawnTimer <= 0) {
            const batchSize = Math.min(this.enemiesToSpawn, Math.max(3, Math.floor(3 + this.wave * 0.7)));
            for (let b = 0; b < batchSize; b++) {
              this.spawnEnemy();
              this.enemiesToSpawn--;
            }
            const interval = Math.max(2.0, 4.2 - this.wave * 0.35);
            this.spawnTimer = interval;
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

    // Moderate, steady HP progression (+10 at wave 1, +16 at wave 2, +22 at wave 3...)
    const maxHpBonus = Math.round(10 + (this.wave - 1) * 6);
    this.player.maxHp = (this.player.maxHp || 100) + maxHpBonus;
    this.player.hp = this.player.maxHp; // Full heal to 100% of new upgraded baseline vitality!
    const healAmount = maxHpBonus;
    this.player.refillAllAmmo();
    this.updateAmmoUI();
    this.updateWeaponUI();
    this.updateHUD();

    // Floating combat text & visual heal particles
    if (window.particleSystem) {
      if (window.particleSystem.addHealNumber) {
        window.particleSystem.addHealNumber(this.player.x, this.player.y, healAmount);
      } else {
        window.particleSystem.addDamageNumber(this.player.x, this.player.y, healAmount);
      }
      window.particleSystem.emit(this.player.x, this.player.y, 25, {
        speed: 110,
        color: '#00ff88',
        life: 0.6,
        size: 4
      });
    }

    window.soundSystem.playWaveClear();

    // Show Wave Clear Banner with exponential max HP information
    const clearBanner = document.getElementById('wave-clear-banner');
    document.getElementById('cleared-wave-title').textContent = `WAVE ${this.wave} COMPLETE`;
    const bonusEl = clearBanner ? clearBanner.querySelector('.clear-bonus') : null;
    if (bonusEl) {
      bonusEl.textContent = `+1,000 COMBAT BONUS • MAX VITALITY UPGRADE +${maxHpBonus} (MAX HP: ${this.player.maxHp})`;
    }
    clearBanner.classList.remove('hidden');

    setTimeout(() => {
      clearBanner.classList.add('hidden');
      this.startWave(this.wave + 1);
    }, 3000);
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

    const recordBadge = document.getElementById('game-over-highscore-badge');
    if (this.gameMode === 'singleplayer') {
      const isTop3 = this.saveSinglePlayerScore(this.score, this.wave, this.kills);
      if (recordBadge) {
        recordBadge.classList.toggle('hidden', !isTop3);
      }
    } else {
      if (recordBadge) recordBadge.classList.add('hidden');
    }

    setTimeout(() => {
      document.getElementById('game-over-screen').classList.remove('hidden');
    }, 600);
  }

  updateHUD() {
    // Health Bar
    const hpPct = Math.max(0, this.player.hp / this.player.maxHp) * 100;
    document.getElementById('hp-bar').style.width = `${hpPct}%`;
    document.getElementById('hp-loss-bar').style.width = `${hpPct}%`;
    document.getElementById('hp-text').textContent = `${Math.round(this.player.hp)} / ${Math.round(this.player.maxHp)}`;

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

    // Full Brightness Mode: Leave entire map illuminated (no dark fog of war)
    if (this.lightingMode === 'full') {
      return;
    }

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

    // Enemies (Tactical Blips)
    for (const e of this.enemies) {
      ctx.fillStyle = e.color || (e.type === 'tank' ? '#ff3366' : e.type === 'fast' ? '#00f0ff' : '#00ff88');
      ctx.beginPath();
      const dotR = e.type === 'tank' ? 3.5 : (e.type === 'splitter' ? Math.max(1.8, e.radius * 0.12) : 2.5);
      ctx.arc(e.x * scale, e.y * scale, dotR, 0, Math.PI * 2);
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

    // 1.6. Draw Weapon Drops (Ground Scavenger Mode)
    for (const drop of this.weaponDrops) {
      drop.draw(this.ctx);
    }

    // 1.7. Draw Acid Pools (Ground Toxic Hazards)
    if (this.acidPools) {
      for (const pool of this.acidPools) {
        pool.draw(this.ctx);
      }
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
