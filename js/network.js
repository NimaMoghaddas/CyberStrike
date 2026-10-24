/**
 * CYBER STRIKE // NETWORK CLIENT SYSTEM
 * High-performance Socket.io synchronization for LAN & Online PvPvE
 * Features:
 * - Real-time Player state sync & interpolation
 * - PvP combat (Friendly Fire / Player vs Player damage)
 * - PvE co-op synchronized enemies and waves
 * - Tactical Kill Feed, TAB Scoreboard, and LAN Invite Link
 * - Respawn Protocol with force field shield
 * - In-Game Tactical Chat (Enter key)
 */

class NetworkSystem {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.myId = null;
    this.serverIp = '127.0.0.1';
    this.serverPort = 3000;
    this.ping = 0;

    // Remote Entities
    this.remotePlayers = {}; // { [socketId]: Player }
    this.syncEnemies = {};   // { [enemyId]: { x, y, targetX, targetY, angle, hp, maxHp, type, color, radius } }

    // Selected Operative Profile
    this.callsign = 'GHOST';
    this.color = '#00f0ff';

    // Multiplayer Lobby & Team Battle State
    this.lobbyMode = 'teams';
    this.myTeam = 'alpha';
    this.isHost = false;
    this.hostId = null;
    this.alphaColor = '#00f0ff';
    this.betaColor = '#ff3366';
    this.lockedColors = [];
    this.lobbyPlayers = [];
    this.myUserCode = '----';
    this.isReady = false;

    // Chat State
    this.chatOpen = false;

    // Network stats
    this.lastStateEmit = 0;
    this.emitRate = 1000 / 30; // 30Hz client updates

    this.init();
  }

  init() {
    this.initSocket();
    this.initLobbyUI();
    this.initChatAndScoreboardUI();
  }

  initSocket() {
    // Check if Socket.io client script is available
    if (typeof io === 'undefined') {
      console.warn('[NETWORK] Socket.io not found. Running in standalone local mode.');
      return;
    }

    try {
      this.socket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.myId = this.socket.id;
        console.log(`[NETWORK] Connected to server as ${this.myId}`);
        this.updateNetworkBadge(true);
        this.startPingLoop();
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        console.log('[NETWORK] Disconnected from server');
        this.updateNetworkBadge(false);
      });

      // 1. Initial State from Server
      this.socket.on('init_data', (data) => {
        this.myId = data.yourId;
        this.myUserCode = data.userCode || (this.myId ? this.myId.substring(0, 4) : '----');
        this.serverIp = data.serverIp;
        this.serverPort = data.port;
        this.updateServerIpDisplay(data.serverIp, data.port, data.allIps);

        const myIdEl = document.getElementById('my-operative-id');
        if (myIdEl) myIdEl.textContent = this.myUserCode;

        if (data.mapId && this.game && this.game.map) {
          this.game.map.setMap(data.mapId);
        }

        if (data.medkits && this.game && this.game.syncMedkits) {
          this.game.syncMedkits(data.medkits);
        }

        if (data.lobby) {
          this.handleLobbySync(data.lobby);
        }

        // Pre-populate any existing remote players
        if (data.players) {
          data.players.forEach(p => {
            if (p.id !== this.myId) {
              this.addRemotePlayer(p);
            }
          });
          this.updateLobbyCount();
        }

        // Synchronize locally saved persistent operative profile to server
        const nameInput = document.getElementById('operative-callsign-input');
        const savedName = (this.game && this.game.savedCallsign) || (nameInput && nameInput.value.trim().length > 0 ? nameInput.value.trim() : null);
        if (savedName) {
          this.callsign = savedName.toUpperCase();
          this.socket.emit('lobby_update_name', { name: this.callsign });
        }
        if (this.game && this.game.selectedModelType) {
          this.socket.emit('lobby_update_model', { modelType: this.game.selectedModelType });
        }
        if (this.game && this.game.selectedSkinColor && this.lobbyMode !== 'teams') {
          this.socket.emit('lobby_select_color', { color: this.game.selectedSkinColor });
        }
        if (this.game && this.game.selectedMapId) {
          this.socket.emit('lobby_set_map', { mapId: this.game.selectedMapId });
        }
      });

      // 1.1. Lobby Errors & Notifications
      this.socket.on('lobby_error', (data) => {
        if (data && data.message) {
          alert(data.message);
        }
      });

      this.socket.on('lobby_joined_room', (data) => {
        console.log(`[NETWORK] Joined squad of leader [${data.roomCode}]`);
        if (data.mapId && this.game && this.game.map) {
          this.game.selectedMapId = data.mapId;
          this.game.map.setMap(data.mapId);
          this.game.updateMapSelectionUI();
        }
        if (this.game) {
          this.game.gameMode = 'multiplayer';
        }
        const spBtn = document.getElementById('btn-mode-singleplayer');
        const mpBtn = document.getElementById('btn-mode-multiplayer');
        if (spBtn) spBtn.classList.remove('active');
        if (mpBtn) mpBtn.classList.add('active');
        const teamHub = document.getElementById('multiplayer-team-hub');
        if (teamHub) teamHub.classList.remove('hidden');
        const threatCol = document.getElementById('protocol-col-threat');
        if (threatCol) threatCol.classList.remove('hidden');

        this.renderLobbyUI();

        // Smoothly scroll the terminal modal down so the operative and READY button are immediately visible
        const modal = document.querySelector('.terminal-modal');
        if (modal) {
          setTimeout(() => {
            modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
          }, 150);
        }
      });

      // 1.2. Synchronized Multiplayer Lobby State
      this.socket.on('lobby_sync', (data) => {
        this.handleLobbySync(data);
      });

      // 1.3. Leader Game Start Signal (or Late Join deploy)
      this.socket.on('game_start_signal', (data) => {
        this.gameStarted = true;
        if (data && data.mapId && this.game && this.game.map) {
          this.game.selectedMapId = data.mapId;
          this.game.map.setMap(data.mapId);
        }
        if (data && data.lightingMode && this.game && this.game.setLightingMode) {
          this.game.setLightingMode(data.lightingMode, false);
        }
        if (data && data.weaponMode && this.game && this.game.setWeaponMode) {
          this.game.setWeaponMode(data.weaponMode, false);
        }
        if (data && data.pvpOnly !== undefined && this.game && this.game.setPvPMode) {
          this.game.setPvPMode(data.pvpOnly ? 'pvp_only' : 'enemies', false);
        }
        if (data && data.pvpOnly && this.game && this.game.player) {
          this.game.player.maxHp = 200;
          this.game.player.hp = 200;
        }
        const teamHud = document.getElementById('team-scoreboard-hud');
        if (teamHud) {
          if (data && data.mode === 'teams') {
            teamHud.classList.remove('hidden');
          } else {
            teamHud.classList.add('hidden');
          }
        }
        const teamOverModal = document.getElementById('team-match-over-screen');
        if (teamOverModal) teamOverModal.classList.add('hidden');
        const mpLeaveModal = document.getElementById('multiplayer-leave-modal');
        if (mpLeaveModal) mpLeaveModal.classList.add('hidden');

        // Thoroughly clear ground decals, old medkits, dropped weapons, and particles
        if (this.game && this.game.clearGroundAndEntities) {
          this.game.clearGroundAndEntities();
        }

        // Complete stats reset for all local and remote operatives
        if (this.game) {
          this.game.score = 0;
          this.game.kills = 0;
          this.game.deaths = 0;
          this.game.shotsFired = 0;
          this.game.shotsHit = 0;
          this.game.wave = 1;
        }
        for (const id in this.remotePlayers) {
          if (this.remotePlayers[id]) {
            this.remotePlayers[id].score = 0;
            this.remotePlayers[id].kills = 0;
            this.remotePlayers[id].deaths = 0;
          }
        }
        this.updateTeamScoreboardHUD({
          alpha: { kills: 0, score: 0 },
          beta: { kills: 0, score: 0 },
          targetKills: 10
        });
        this.updateScoreboard();

        if (this.game) {
          this.game.startGame();
        }
      });

      // 1.32. Synchronized Match Reset Event
      this.socket.on('match_reset', (data) => {
        if (this.game) {
          this.game.score = 0;
          this.game.kills = 0;
          this.game.deaths = 0;
          this.game.shotsFired = 0;
          this.game.shotsHit = 0;
          this.game.wave = 1;
          if (this.game.clearGroundAndEntities) {
            this.game.clearGroundAndEntities();
          }
          if (this.game.updateHUD) {
            this.game.updateHUD();
          }
          if (this.game.updateLiveRoster) {
            this.game.updateLiveRoster();
          }
        }
        for (const id in this.remotePlayers) {
          if (this.remotePlayers[id]) {
            this.remotePlayers[id].score = 0;
            this.remotePlayers[id].kills = 0;
            this.remotePlayers[id].deaths = 0;
          }
        }
        if (data && data.teamStats) {
          this.updateTeamScoreboardHUD(data.teamStats);
        } else {
          this.updateTeamScoreboardHUD({
            alpha: { kills: 0, score: 0 },
            beta: { kills: 0, score: 0 },
            targetKills: 10
          });
        }
        this.updateScoreboard();
      });

      // 1.35. Squad Visibility / Lighting Sync
      this.socket.on('lighting_sync', (data) => {
        if (data && data.lightingMode && this.game && this.game.setLightingMode) {
          this.game.setLightingMode(data.lightingMode, false);
        }
      });

      // 1.36. Weapon Mode Sync
      this.socket.on('weapon_mode_sync', (data) => {
        if (data && data.weaponMode && this.game && this.game.setWeaponMode) {
          this.game.setWeaponMode(data.weaponMode, false);
        }
      });

      // 1.37. Hostile Threat Protocol / PvP Only Sync
      this.socket.on('pvp_only_sync', (data) => {
        if (data && this.game && this.game.setPvPMode) {
          this.game.setPvPMode(data.pvpOnly ? 'pvp_only' : 'enemies', false);
        }
      });

      // 1.4. Team Battle Scoreboard & Target Kills Sync
      this.socket.on('team_stats_update', (data) => {
        if (data && data.teamStats) {
          this.updateTeamScoreboardHUD(data.teamStats);
        }
      });

      // 1.45. Team Battle Conclusion (Target 20 kills reached, Highest Score Wins)
      this.socket.on('team_match_finished', (data) => {
        if (data && data.teamStats) {
          this.showTeamMatchOverScreen(data.teamStats, data.winner, data.competitors);
        }
      });

      // 1.5. Synchronized Map Switch from Server
      this.socket.on('map_sync', (data) => {
        if (data.mapId && this.game && this.game.map) {
          this.game.selectedMapId = data.mapId;
          this.game.map.setMap(data.mapId);
          this.game.updateMapSelectionUI();
        }
      });

      // 2. Acknowledge Join
      this.socket.on('joined_successfully', (data) => {
        const p = data.player;
        this.game.player.x = p.x;
        this.game.player.y = p.y;
        this.game.player.color = p.color;
        this.game.player.name = p.name;
        this.game.player.invulnerableTime = p.invulnerableTimer || 2.5;
        this.game.player.alive = true;
        this.game.player.maxHp = p.maxHp || (this.game.pvpOnly ? 200 : 100);
        this.game.player.hp = p.hp;
        this.game.localPlayerId = this.myId;
        // Reset local combat stats on match entry
        this.game.score = p.score || 0;
        this.game.kills = p.kills || 0;
        this.game.deaths = p.deaths || 0;
        this.game.shotsFired = 0;
        this.game.shotsHit = 0;
        this.game.wave = 1;
        if (p.skinId && this.game.player.setSkin) {
          this.game.player.setSkin(p.skinId);
        }
        if (data.mapId && this.game.map) {
          this.game.map.setMap(data.mapId);
        }
        if (this.game.updateHUD) {
          this.game.updateHUD();
        }
      });

      // 3. Another Player Joined
      this.socket.on('player_joined', (data) => {
        if (data.player.id !== this.myId) {
          this.addRemotePlayer(data.player);
          this.updateLobbyCount();
          this.updateScoreboard();
        }
      });

      // 4. Player Left
      this.socket.on('player_left', (data) => {
        delete this.remotePlayers[data.id];
        this.updateLobbyCount();
        this.updateScoreboard();
      });

      // 5. Master Game State Snapshot from Server (25-30Hz)
      this.socket.on('game_snapshot', (snapshot) => {
        this.handleGameSnapshot(snapshot);
      });

      // 6. Remote Player Shoot
      this.socket.on('remote_shoot', (data) => {
        this.handleRemoteShoot(data);
      });

      // 7. Enemy Damaged / Dead
      this.socket.on('enemy_damaged', (data) => {
        const enemy = this.game.enemies.find(e => e.id === data.enemyId);
        if (enemy) {
          enemy.hp = data.hp;
          enemy.hitFlashTimer = 0.12;
          if (data.x && data.y) {
            window.particleSystem.emitBlood(data.x, data.y, 0, 8);
            window.particleSystem.emitDamageNumber(data.x, data.y, data.damage, data.isCritical);
          }
        }
      });

      this.socket.on('enemy_killed', (data) => {
        const idx = this.game.enemies.findIndex(e => e.id === data.enemyId);
        if (idx !== -1) {
          const e = this.game.enemies[idx];
          window.particleSystem.emitBlood(e.x, e.y, 0, 24);
          window.particleSystem.emitExplosion(e.x, e.y, e.radius * 2);
          this.game.enemies.splice(idx, 1);
        }
        if (data.killerId === this.myId) {
          this.game.score += data.score;
          this.game.kills++;
          this.game.addScreenShake(3);
          window.soundSystem.playKill();
        }
      });

      // 8. PvE Wave Events (Bypassed entirely in PvP mode)
      this.socket.on('wave_start', (data) => {
        if (this.game && this.game.pvpOnly) return;
        this.game.wave = data.wave;
        const banner = document.getElementById('wave-banner');
        if (banner) {
          banner.textContent = data.message;
          banner.classList.remove('hidden');
          setTimeout(() => banner.classList.add('hidden'), 2500);
        }
        document.getElementById('wave-display').textContent = `WAVE ${data.wave}`;
        window.soundSystem.playWaveStart();
      });

      this.socket.on('wave_cleared', (data) => {
        if (this.game && this.game.pvpOnly) return;
        const clearBanner = document.getElementById('wave-clear-banner');
        // Reduced steady HP scaling
        const maxHpBonus = data.maxHpBonus || Math.round(10 + (((data.wave || 1) - 1) * 6));
        this.game.player.maxHp = (this.game.player.maxHp || 100) + maxHpBonus;
        this.game.player.hp = this.game.player.maxHp; // Full heal to 100% of new upgraded max vitality baseline!
        this.game.player.ammo = this.game.player.magSize;
        this.game.score += data.bonus || 1000;
        this.game.updateAmmoUI();
        this.game.updateWeaponUI();
        this.game.updateHUD();

        if (clearBanner) {
          document.getElementById('cleared-wave-title').textContent = `WAVE ${data.wave} COMPLETE`;
          const bonusEl = clearBanner.querySelector('.clear-bonus');
          if (bonusEl) {
            bonusEl.textContent = `+1,000 BONUS • MAX VITALITY UPGRADE +${maxHpBonus} (MAX HP: ${this.game.player.maxHp})`;
          }
          clearBanner.classList.remove('hidden');
          setTimeout(() => clearBanner.classList.add('hidden'), 3200);
        }

        if (window.particleSystem) {
          if (window.particleSystem.addHealNumber) {
            window.particleSystem.addHealNumber(this.game.player.x, this.game.player.y, healAmount);
          } else {
            window.particleSystem.addDamageNumber(this.game.player.x, this.game.player.y, healAmount);
          }
          window.particleSystem.emit(this.game.player.x, this.game.player.y, 25, {
            speed: 110,
            color: '#00ff88',
            life: 0.6,
            size: 4
          });
        }
        window.soundSystem.playWaveClear();
      });

      // 8.5. Enemy Ranged Attack: Acid Spit
      this.socket.on('enemy_spit', (data) => {
        if (this.game && this.game.spawnAcidSpit) {
          this.game.spawnAcidSpit(data.x, data.y, data.angle, data.speed, data.damage, data.color || '#39ff14', data.ignoreWalls || data.color === '#b026ff', !!data.leavesPool);
        }
      });

      this.socket.on('enemy_windup', (data) => {
        if (this.game && this.game.enemies) {
          const enemy = this.game.enemies.find(e => e.id === data.enemyId);
          if (enemy) {
            enemy.spitWindupTimer = data.duration;
          }
        }
      });

      // 9. PvP: Damage Taken
      this.socket.on('player_damaged', (data) => {
        this.game.player.hp = data.hp;
        this.game.player.hurtTimer = 0.3;
        this.game.addScreenShake(6);
        window.soundSystem.playPlayerHurt();
        this.showHurtVignette();
        this.game.updateHUD();
      });

      this.socket.on('player_hit_fx', (data) => {
        if (data.x && data.y) {
          window.particleSystem.emitBlood(data.x, data.y, 0, 14);
          window.particleSystem.emitDamageNumber(data.x, data.y, data.damage, data.isCritical);
        }
      });

      // 10. PvP: Elimination & Respawn
      this.socket.on('player_eliminated', (data) => {
        if (data.killerId === this.myId && data.victimId !== this.myId) {
          // You eliminated a player!
          this.game.kills++;
          this.game.score += 500;
          this.showKillConfirmedNotice(data.victimName, data.victimColor);
          window.soundSystem.playKill();
        }

        if (data.victimId === this.myId) {
          // You were eliminated!
          this.game.player.alive = false;
          this.game.player.hp = 0;
          this.showRespawnOverlay(data.killerName, data.killerColor);
          window.particleSystem.emitExplosion(this.game.player.x, this.game.player.y, 60);
          this.game.addScreenShake(12);
        } else if (this.remotePlayers[data.victimId]) {
          this.remotePlayers[data.victimId].alive = false;
          window.particleSystem.emitExplosion(this.remotePlayers[data.victimId].x, this.remotePlayers[data.victimId].y, 50);
        }

        this.updateScoreboard();
      });

      this.socket.on('respawn_countdown', (data) => {
        this.startRespawnCountdown(data.seconds);
      });

      this.socket.on('player_respawned', (data) => {
        if (data.id === this.myId) {
          this.game.isRespawning = false;
          if (this.game.pvpOnly) {
            this.game.player.maxHp = 200;
          }
          this.game.player.respawn(data.x, data.y);
          if (this.game.pvpOnly) {
            this.game.player.hp = 200;
          }
          this.hideRespawnOverlay();
          this.game.updateHUD();
          this.game.updateAmmoUI();
          window.soundSystem.playReload();
        } else if (this.remotePlayers[data.id]) {
          const rp = this.remotePlayers[data.id];
          rp.x = data.x;
          rp.y = data.y;
          rp.hp = data.hp || (this.game.pvpOnly ? 200 : 100);
          rp.maxHp = this.game.pvpOnly ? 200 : (rp.maxHp || 100);
          rp.alive = true;
          rp.invulnerableTimer = data.invulnerableTimer || 2.5;
        }
        this.updateScoreboard();
      });

      // 11. Barrels
      this.socket.on('barrel_exploded', (data) => {
        const barrel = this.game.map.barrels.find(b => b.id === data.id);
        if (barrel) {
          barrel.exploded = true;
          barrel.hp = 0;
        }
        window.soundSystem.playExplosion();
        window.particleSystem.emitExplosion(data.x, data.y, data.blastRadius || 170);
        this.game.addScreenShake(10);
      });

      // 11.5. Tactical Medkits (+50 HP)
      this.socket.on('medkit_spawned', (medkit) => {
        if (this.game && this.game.onMedkitSpawned) {
          this.game.onMedkitSpawned(medkit);
        }
      });

      this.socket.on('medkit_collected', (data) => {
        if (this.game && this.game.onMedkitCollected) {
          this.game.onMedkitCollected(data);
        }
      });

      // 11.6. Tactical Weapon Drops (Ground Scavenger Mode)
      this.socket.on('weapon_drop_spawned', (drop) => {
        if (this.game && this.game.onWeaponDropSpawned) {
          this.game.onWeaponDropSpawned(drop);
        }
      });

      this.socket.on('weapon_drop_collected', (data) => {
        if (this.game && this.game.onWeaponDropCollected) {
          this.game.onWeaponDropCollected(data);
        }
      });

      // 12. Tactical Kill Feed Messages
      this.socket.on('kill_feed_msg', (data) => {
        this.addKillFeedEntry(data);
      });

      // 13. Tactical In-Game Chat Messages
      this.socket.on('chat_message', (data) => {
        this.addChatMessage(data);
      });

      // 14. Pong Latency Reply
      this.socket.on('pong_reply', (sendTime) => {
        this.ping = Math.max(1, Math.round(Date.now() - sendTime));
        const pingEl = document.getElementById('net-ping-display');
        if (pingEl) pingEl.textContent = `${this.ping} ms`;
      });

    } catch (err) {
      console.error('[NETWORK] Error initializing socket:', err);
    }
  }

  // --- Network Loop & Ping ---
  startPingLoop() {
    setInterval(() => {
      if (this.socket && this.connected) {
        this.socket.emit('ping_check', Date.now());
      }
    }, 2500);
  }

  // --- Send Local Player State to Server ---
  update(dt) {
    if (!this.connected || !this.socket || !this.game.player.alive) return;
    if (this.game && this.game.gameMode !== 'multiplayer') return;

    const now = performance.now();
    if (now - this.lastStateEmit >= this.emitRate) {
      this.lastStateEmit = now;

      const p = this.game.player;
      this.socket.emit('player_update', {
        x: Math.round(p.x),
        y: Math.round(p.y),
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        angle: Number(p.angle.toFixed(3)),
        isDashing: p.isDashing,
        isReloading: p.isReloading,
        isMoving: p.isMoving,
        walkCycle: Number(p.walkCycle.toFixed(2)),
        recoilOffset: Number(p.recoilOffset.toFixed(1)),
        weapon: p.currentWeaponId,
        hasChrono: !!(p.hasPowerup && p.hasPowerup('chrono') && !this.game.pvpOnly)
      });
    }

    // Interpolate remote players smoothly
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      if (rp.targetX !== undefined) {
        rp.x += (rp.targetX - rp.x) * 0.35;
        rp.y += (rp.targetY - rp.y) * 0.35;
      }
      if (rp.invulnerableTimer > 0) {
        rp.invulnerableTimer -= dt;
      }
      if (rp.muzzleFlashTimer > 0) {
        rp.muzzleFlashTimer -= dt;
        if (rp.muzzleFlashTimer < 0) rp.muzzleFlashTimer = 0;
      }
      if (rp.recoilOffset > 0) {
        rp.recoilOffset = Math.max(0, rp.recoilOffset - dt * 60);
      }
    }
  }

  // Helper: check if operative is active in a multiplayer squad / party
  isInMultiplayerSquad() {
    return (this.game && this.game.gameMode === 'multiplayer') ||
           (!this.isHost) ||
           (this.lobbyPlayers && this.lobbyPlayers.length > 1) ||
           (this.roomId && Object.keys(this.remotePlayers).length > 0);
  }

  // --- Broadcast Shoot Event ---
  emitShoot(x, y, angle, isCritical, damage, color, weaponType, speed, range, radius, penetrating, explosive, splashDamage, blastRadius) {
    if (!this.connected || !this.socket) return;
    const inMulti = (this.game && this.game.gameMode === 'multiplayer') ||
                    (this.lobbyPlayers && this.lobbyPlayers.length > 1) ||
                    (Object.keys(this.remotePlayers).length > 0) ||
                    (!this.isHost) ||
                    (this.roomId);
    if (!inMulti) return;
    // In multiplayer, bullets are colored with the player's operative color
    const bulletColor = (this.game && this.game.player) ? (this.game.player.color || '#00f0ff') : (color || '#00f0ff');
    const bulletTeam = (this.game && this.game.player && this.game.player.team) ? this.game.player.team : this.myTeam;
    this.socket.emit('player_shoot', {
      x: Math.round(x),
      y: Math.round(y),
      angle: Number(angle.toFixed(3)),
      isCritical: !!isCritical,
      damage,
      color: bulletColor,
      team: bulletTeam,
      weaponType: weaponType || (this.game.player ? this.game.player.currentWeaponId : 'rifle'),
      speed,
      range,
      radius,
      penetrating: !!penetrating,
      explosive: !!explosive,
      splashDamage,
      blastRadius
    });
  }

  // --- Report Hit on Enemy (PvE) ---
  reportEnemyHit(enemyId, damage, isCritical, x, y) {
    if (!this.connected || !this.socket) return;
    const inMulti = (this.game && this.game.gameMode === 'multiplayer') ||
                    (this.lobbyPlayers && this.lobbyPlayers.length > 1) ||
                    (!this.isHost);
    if (!inMulti) return;
    this.socket.emit('hit_enemy', {
      enemyId,
      damage,
      isCritical: !!isCritical,
      x: Math.round(x),
      y: Math.round(y)
    });
  }

  // --- Report Hit on Player (PvP / Friendly Fire) ---
  reportPlayerHit(targetId, damage, isCritical, x, y) {
    if (!this.connected || !this.socket) return;
    const inMulti = (this.game && this.game.gameMode === 'multiplayer') ||
                    (this.lobbyPlayers && this.lobbyPlayers.length > 1) ||
                    (!this.isHost);
    if (!inMulti) return;
    this.socket.emit('hit_player', {
      targetId,
      damage,
      isCritical: !!isCritical,
      x: Math.round(x),
      y: Math.round(y)
    });
  }

  // --- Report Barrel Hit ---
  reportBarrelHit(barrelId, damage) {
    if (!this.connected || !this.socket) return;
    this.socket.emit('hit_barrel', { barrelId, damage });
  }

  // --- Remote Shoot Handler ---
  handleRemoteShoot(data) {
    if (!data || data.shooterId === this.myId) return;
    console.log('[REMOTE SHOOT RECEIVED] shooterId:', data.shooterId, 'myId:', this.myId);
    const rp = this.remotePlayers[data.shooterId];
    const weaponType = data.weaponType || 'rifle';
    if (rp) {
      rp.weapon = weaponType;
      rp.recoilOffset = weaponType === 'railgun' ? 16 : (weaponType === 'shotgun' ? 14 : 6);
      rp.muzzleFlashTimer = 0.06;
    }

    const bulletColor = data.color || (rp ? rp.color : '#00f0ff');

    // Spawn matching projectile with custom physics
    const bullet = new Bullet(data.x, data.y, data.angle, {
      speed: data.speed || 1100,
      damage: data.damage,
      range: data.range || 1400,
      radius: data.radius || 4,
      color: bulletColor,
      glowColor: bulletColor,
      weaponType: weaponType,
      penetrating: !!data.penetrating,
      explosive: !!data.explosive,
      splashDamage: data.splashDamage,
      blastRadius: data.blastRadius,
      shooterId: data.shooterId
    });
    bullet.isCritical = data.isCritical;
    bullet.shooterId = data.shooterId;
    bullet.shooterTeam = data.team || (rp ? rp.team : null);
    bullet.color = bulletColor;
    this.game.bullets.push(bullet);

    // Audio & Effects tailored to weapon
    window.soundSystem.playWeaponShoot(weaponType);
    window.particleSystem.emitMuzzleFlash(data.x, data.y, data.angle, bulletColor);
    window.particleSystem.ejectShell(data.x, data.y, data.angle);
  }

  // --- Handle Master Game Snapshot ---
  handleGameSnapshot(snapshot) {
    if (!this.game || this.game.gameMode !== 'multiplayer') return;
    // 1. Update Remote Players
    if (snapshot.players) {
      snapshot.players.forEach(pData => {
        if (pData.id === this.myId) {
          // Authoritative score, kills, deaths directly synchronized from server
          this.game.score = (typeof pData.score === 'number') ? pData.score : 0;
          this.game.kills = (typeof pData.kills === 'number') ? pData.kills : 0;
          this.game.deaths = (typeof pData.deaths === 'number') ? pData.deaths : 0;
          return;
        }

        let rp = this.remotePlayers[pData.id];
        if (!rp) {
          rp = this.addRemotePlayer(pData);
        }

        // Interpolation targets
        rp.targetX = pData.x;
        rp.targetY = pData.y;
        rp.vx = pData.vx;
        rp.vy = pData.vy;
        rp.angle = pData.angle;
        rp.hp = pData.hp;
        rp.maxHp = pData.maxHp;
        rp.alive = pData.alive;
        if (pData.team) rp.team = pData.team;
        if (pData.color) rp.color = pData.color;
        if (pData.modelType && rp.modelType !== pData.modelType) {
          rp.modelType = pData.modelType;
          if (rp.setModel) rp.setModel(pData.modelType);
        }
        rp.invulnerableTimer = pData.invulnerableTimer;
        rp.isDashing = pData.isDashing;
        rp.isReloading = pData.isReloading;
        rp.isMoving = pData.isMoving;
        rp.walkCycle = pData.walkCycle;
        rp.recoilOffset = pData.recoilOffset;
        if (pData.weapon) rp.weapon = pData.weapon;
        rp.score = pData.score;
        rp.kills = pData.kills;
        rp.deaths = pData.deaths;
      });
    }

    // 2. Synchronize Enemies (PvE)
    if (snapshot.enemies) {
      const activeIds = new Set();

      snapshot.enemies.forEach(eData => {
        activeIds.add(eData.id);
        let enemy = this.game.enemies.find(e => e.id === eData.id);

        if (!enemy) {
          // Spawn new synced enemy locally
          enemy = new Enemy(eData.x, eData.y, eData.type, eData.id, eData.generation || 0);
          enemy.id = eData.id;
          enemy.color = eData.color;
          enemy.radius = eData.radius;
          enemy.generation = eData.generation || 0;
          this.game.enemies.push(enemy);

          window.particleSystem.emit(eData.x, eData.y, 14, {
            speed: 120,
            color: eData.color,
            life: 0.3
          });
        }

        // Smooth positional lerp
        enemy.x += (eData.x - enemy.x) * 0.45;
        enemy.y += (eData.y - enemy.y) * 0.45;
        enemy.angle = eData.angle;
        enemy.hp = eData.hp;
        enemy.maxHp = eData.maxHp;
        if (eData.hp > 0) {
          enemy.alive = true;
        }

        // Prevent synced enemy from clipping inside local player's body
        if (this.game.player && this.game.player.alive) {
          const pDist = Math.hypot(enemy.x - this.game.player.x, enemy.y - this.game.player.y);
          const minP = enemy.radius + this.game.player.radius;
          if (pDist < minP && pDist > 0.0001) {
            const push = minP - pDist;
            enemy.x += ((enemy.x - this.game.player.x) / pDist) * push;
            enemy.y += ((enemy.y - this.game.player.y) / pDist) * push;
          }
        }
      });

      // Remove enemies not in server list
      for (let i = this.game.enemies.length - 1; i >= 0; i--) {
        if (!activeIds.has(this.game.enemies[i].id)) {
          this.game.enemies.splice(i, 1);
        }
      }
    }

    // 3. Update Wave Info HUD
    if (snapshot.wave) {
      document.getElementById('wave-display').textContent = `WAVE ${snapshot.wave.wave}`;
      document.getElementById('enemies-left').textContent = snapshot.wave.enemiesLeft;
    }

    // 4. Synchronize Medkits from snapshot
    if (snapshot.medkits && this.game && this.game.syncMedkits) {
      this.game.syncMedkits(snapshot.medkits);
    }

    // 4.5. Synchronize Weapon Drops from snapshot
    if (snapshot.weaponDrops && this.game && this.game.syncWeaponDrops) {
      this.game.syncWeaponDrops(snapshot.weaponDrops);
    }
    if (snapshot.weaponMode && this.game && this.game.weaponMode !== snapshot.weaponMode && this.game.setWeaponMode) {
      this.game.setWeaponMode(snapshot.weaponMode, false);
    }
    if (snapshot.pvpOnly !== undefined && this.game && this.game.setPvPMode) {
      this.game.setPvPMode(snapshot.pvpOnly ? 'pvp_only' : 'enemies', false);
    }

    this.updateScoreboard();
    if (this.game && this.game.updateLiveRoster) {
      this.game.updateLiveRoster();
    }
  }

  // --- Add Remote Player Instance ---
  addRemotePlayer(pData) {
    const rp = new Player(pData.x, pData.y);
    rp.id = pData.id;
    rp.name = pData.name;
    rp.team = pData.team || 'solo';
    rp.color = pData.color;
    rp.skinId = pData.skinId || 'spectre';
    rp.modelType = pData.modelType || 'commando';
    if (rp.setModel) rp.setModel(rp.modelType);
    if (rp.setColor) rp.setColor(pData.color || '#00f0ff');
    rp.weapon = pData.weapon || 'rifle';
    rp.hp = pData.hp;
    rp.maxHp = pData.maxHp || 100;
    rp.score = pData.score || 0;
    rp.kills = pData.kills || 0;
    rp.deaths = pData.deaths || 0;
    rp.alive = pData.alive !== false;
    rp.isRemote = true;
    rp.targetX = pData.x;
    rp.targetY = pData.y;
    rp.muzzleFlashTimer = 0;
    rp.recoilOffset = 0;
    this.remotePlayers[pData.id] = rp;
    return rp;
  }

  // --- Draw All Remote Operatives ---
  drawRemotePlayers(ctx) {
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      if (!rp.alive) continue;

      // 1. Draw Player Character
      this.drawOperative(ctx, rp);

      // 2. Tactical Head Tag (Callsign + Mini Health Bar)
      this.drawHeadTag(ctx, rp);
    }
  }

  // --- Render Custom Stylized Operative ---
  drawOperative(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    const skin = (window.OPERATIVE_SKINS && window.OPERATIVE_SKINS[p.skinId]) || (window.SKIN_DEFINITIONS && window.SKIN_DEFINITIONS[p.skinId]) || (window.OPERATIVE_SKINS && window.OPERATIVE_SKINS.spectre);
    if (window.drawOperativeModel && skin) {
      window.drawOperativeModel(ctx, skin, p.weapon || 'rifle', 0, 1.0, {
        animTimer: performance.now() * 0.001,
        walkCycle: p.walkCycle || 0,
        isMoving: (p.vx && (Math.hypot(p.vx, p.vy) > 10)) || false,
        recoilOffset: p.recoilOffset || 0,
        isShooting: p.muzzleFlashTimer > 0,
        modelType: p.modelType || 'commando',
        color: p.color
      });
    } else {
      // Fallback Operative Rendering
      if (window.drawTacticalWeapon) {
        window.drawTacticalWeapon(ctx, p.weapon || 'rifle', p.color, false);
      } else {
        ctx.fillStyle = '#111824';
        ctx.fillRect(4, 5, 28, 6);
      }

      ctx.fillStyle = '#1d2836';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(3, 0, 5, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.lineTo(2, 0);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Laser Sight Beam
    ctx.save();
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(38, 8);
    ctx.lineTo(350, 8);
    ctx.stroke();
    ctx.restore();

    // Muzzle flash flare if firing (only active during instantaneous shot)
    if (p.muzzleFlashTimer > 0) {
      ctx.save();
      const flashX = p.weapon === 'railgun' ? 52 : (p.weapon === 'smg' ? 34 : 40);
      ctx.translate(flashX, 8);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, p.weapon === 'shotgun' ? 12 : 8, 0, Math.PI * 2);
      ctx.fill();

      // Starburst rays matching weapon color
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();


  }

  // --- Draw Holographic Force Shield ---
  drawForceShield(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
    const shieldRad = 32 * pulse;

    ctx.strokeStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';

    ctx.beginPath();
    ctx.arc(0, 0, shieldRad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();

    // Hex shield perimeter nodes
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + performance.now() * 0.001;
      const nx = Math.cos(a) * shieldRad;
      const ny = Math.sin(a) * shieldRad;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Draw Floating Head Tag for Remote Operative ---
  drawHeadTag(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y - 36);

    // 1. Operative Callsign Badge
    ctx.font = '600 11px Orbitron, sans-serif';
    ctx.textAlign = 'center';

    const teamTag = (p.team && p.team !== 'solo') ? ` [${p.team.toUpperCase()}]` : '';
    const label = `${p.name}${teamTag}`;

    // Callsign text shadow & fill
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.fillText(label, 0, -4);
    ctx.shadowBlur = 0;

    // 2. Health Bar Track
    const barW = 38;
    const barH = 4;
    ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.fillRect(-barW / 2, 0, barW, barH);
    ctx.strokeRect(-barW / 2, 0, barW, barH);

    // Health Fill (Color changes with HP)
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    const fillW = Math.round(barW * hpRatio);
    let fillCol = '#00ff88';
    if (hpRatio < 0.35) fillCol = '#ff3366';
    else if (hpRatio < 0.65) fillCol = '#ffb703';

    ctx.fillStyle = fillCol;
    ctx.fillRect(-barW / 2, 0, fillW, barH);

    ctx.restore();
  }

  // --- Volumetric Flashlight Cones for All Operatives ---
  renderOperativeLights(lightingCtx, camera) {
    const allPlayers = [this.game.player, ...Object.values(this.remotePlayers)];

    for (const p of allPlayers) {
      if (!p.alive) continue;

      const spX = p.x - camera.x;
      const spY = p.y - camera.y;

      // Skip if off-screen
      if (spX < -300 || spX > this.game.width + 300 || spY < -300 || spY > this.game.height + 300) {
        continue;
      }

      // 1. Personal Ambient Radial Glow
      const ambRad = 150;
      const ambGrad = lightingCtx.createRadialGradient(spX, spY, 20, spX, spY, ambRad);
      ambGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      ambGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)');
      ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lightingCtx.fillStyle = ambGrad;
      lightingCtx.beginPath();
      lightingCtx.arc(spX, spY, ambRad, 0, Math.PI * 2);
      lightingCtx.fill();

      // 2. Weapon Tactical Flashlight Cone
      const coneDist = 580;
      const coneAngle = 0.52;
      const aimAngle = p.angle;

      const flashGrad = lightingCtx.createRadialGradient(spX, spY, 30, spX, spY, coneDist);
      flashGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      flashGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      lightingCtx.fillStyle = flashGrad;
      lightingCtx.beginPath();
      lightingCtx.moveTo(spX, spY);
      lightingCtx.arc(spX, spY, coneDist, aimAngle - coneAngle / 2, aimAngle + coneAngle / 2);
      lightingCtx.closePath();
      lightingCtx.fill();
    }
  }

  // --- Render All Operatives on Tactical Radar Minimap ---
  renderOperativesOnRadar(ctx, scale) {
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      if (!rp.alive) continue;

      const rx = rp.x * scale;
      const ry = rp.y * scale;

      ctx.fillStyle = rp.color;
      ctx.shadowColor = rp.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Remote direction pointer
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(rp.angle) * 7, ry + Math.sin(rp.angle) * 7);
      ctx.stroke();
    }
  }

  // --- Join Game Request from Start Screen ---
  deployToBattlefield() {
    if (this.game) {
      this.game.score = 0;
      this.game.kills = 0;
      this.game.deaths = 0;
      this.game.shotsFired = 0;
      this.game.shotsHit = 0;
      this.game.wave = 1;
    }

    const nameInput = document.getElementById('operative-callsign-input');
    if (nameInput && nameInput.value.trim().length > 0) {
      this.callsign = nameInput.value.trim().toUpperCase();
    }

    const skinId = this.game.selectedSkinId || 'spectre';
    const modelType = this.game.selectedModelType || 'commando';
    let color = this.game.selectedSkinColor || this.color || '#00f0ff';

    // In multiplayer team battle, strictly enforce the squad color!
    if (this.lobbyMode === 'teams') {
      color = (this.myTeam === 'beta') ? this.betaColor : this.alphaColor;
    }

    const mapId = this.game.selectedMapId || 'sector_09';
    const weapon = this.game.selectedWeaponId || 'rifle';

    this.callsign = this.callsign || 'OPERATIVE';
    this.color = color;
    this.game.player.name = this.callsign;
    this.game.player.setSkin(skinId);
    this.game.player.setModel(modelType);
    this.game.player.setColor(color);
    this.game.player.equipWeapon(weapon);
    this.game.map.setMap(mapId);
    this.game.player.team = this.myTeam;
    this.game.player.color = color;

    if (this.socket && this.connected) {
      this.socket.emit('join_game', {
        name: this.callsign,
        color: color,
        modelType: modelType,
        team: this.myTeam,
        skinId: skinId,
        mapId: mapId,
        weapon: weapon
      });
    }
  }

  // --- Leave Active Match to Lobby ---
  leaveBattlefield() {
    if (this.socket && this.connected) {
      this.socket.emit('leave_game');
      this.socket.emit('reset_match');
    }
    this.gameStarted = false;
    this.remotePlayers = {};
    if (this.game) {
      this.game.score = 0;
      this.game.kills = 0;
      this.game.deaths = 0;
      this.game.shotsFired = 0;
      this.game.shotsHit = 0;
      this.game.wave = 1;
      this.game.clearGroundAndEntities();
      this.game.showScreen('start-screen');
      this.game.updateHUD();
      this.game.updateLiveRoster();
    }
    this.updateTeamScoreboardHUD({
      alpha: { kills: 0, score: 0 },
      beta: { kills: 0, score: 0 },
      targetKills: 10
    });
    this.updateScoreboard();
  }

  // --- Report Self Death (Weapon splash or suicidal blast) ---
  reportSelfDeath(reason) {
    if (this.socket && this.connected) {
      this.socket.emit('player_died', { reason: reason || 'self_destruction' });
    }
  }

  // --- Report Medkit Pickup (+50 HP) ---
  reportMedkitPickup(id) {
    if (this.socket && this.connected) {
      this.socket.emit('pickup_medkit', { id });
    }
  }

  // --- Report Weapon Drop Pickup (Ground Mode) ---
  reportWeaponDropPickup(id, weaponType) {
    if (this.socket && this.connected) {
      this.socket.emit('pickup_weapon_drop', { id, weaponType });
    }
  }

  // --- Tactical Kill Feed System ---
  addKillFeedEntry(data) {
    const container = document.getElementById('kill-feed-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'kill-feed-row';

    if (data.type === 'pvp') {
      row.innerHTML = `
        <span class="kf-killer" style="color: ${data.killerColor}">${data.killer}</span>
        <span class="kf-icon pvp-icon">➔ 🔫</span>
        <span class="kf-victim" style="color: ${data.victimColor}">${data.victim}</span>
      `;
    } else if (data.type === 'pve') {
      row.innerHTML = `
        <span class="kf-killer" style="color: ${data.killerColor}">${data.killer}</span>
        <span class="kf-icon pve-icon">💥</span>
        <span class="kf-victim pve-label">${data.victim}</span>
        <span class="kf-score">+${data.score}</span>
      `;
    } else if (data.type === 'pve_death') {
      row.innerHTML = `
        <span class="kf-killer danger-label">${data.killer}</span>
        <span class="kf-icon danger-icon">💀</span>
        <span class="kf-victim" style="color: ${data.victimColor}">${data.victim}</span>
      `;
    } else {
      row.innerHTML = `<span class="kf-system">${data.text}</span>`;
    }

    container.appendChild(row);

    // Auto remove after 5 seconds
    setTimeout(() => {
      row.classList.add('fading');
      setTimeout(() => row.remove(), 400);
    }, 4500);

    // Limit to 5 entries max
    while (container.children.length > 5) {
      container.removeChild(container.firstChild);
    }
  }

  // --- Center Kill Confirmed Splash ---
  showKillConfirmedNotice(victimName, victimColor) {
    const splash = document.getElementById('kill-confirmed-splash');
    if (!splash) return;

    splash.innerHTML = `
      <div class="kc-title">ELIMINATED</div>
      <div class="kc-name" style="color: ${victimColor}">${victimName}</div>
      <div class="kc-pts">+500 COMBAT RATING</div>
    `;
    splash.classList.remove('hidden');

    setTimeout(() => {
      splash.classList.add('hidden');
    }, 1800);
  }

  // --- Red Damage Flash Vignette ---
  showHurtVignette() {
    const vig = document.getElementById('hurt-vignette');
    if (!vig) return;
    vig.classList.add('flash');
    setTimeout(() => vig.classList.remove('flash'), 300);
  }

  // --- Respawn Overlay & Countdown ---
  showRespawnOverlay(killerName, killerColor) {
    const ov = document.getElementById('respawn-overlay');
    if (!ov) return;

    document.getElementById('respawn-killer-name').textContent = killerName || 'HOSTILE COMBATANT';
    document.getElementById('respawn-killer-name').style.color = killerColor || '#ff3366';
    ov.classList.remove('hidden');
  }

  startRespawnCountdown(seconds) {
    if (this.respawnTimerInterval) {
      clearInterval(this.respawnTimerInterval);
      this.respawnTimerInterval = null;
    }
    let left = Math.round(seconds);
    const countEl = document.getElementById('respawn-seconds');
    if (countEl) countEl.textContent = left;

    this.respawnTimerInterval = setInterval(() => {
      left--;
      if (countEl) countEl.textContent = Math.max(0, left);
      if (left <= 0) {
        clearInterval(this.respawnTimerInterval);
        this.respawnTimerInterval = null;
      }
    }, 1000);
  }

  hideRespawnOverlay() {
    if (this.respawnTimerInterval) {
      clearInterval(this.respawnTimerInterval);
      this.respawnTimerInterval = null;
    }
    const ov = document.getElementById('respawn-overlay');
    if (ov) ov.classList.add('hidden');
  }

  // --- Scoreboard (TAB Key) ---
  initChatAndScoreboardUI() {
    // 1. Tab key for Tactical Scoreboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleScoreboard(true);
      } else if (e.code === 'Enter') {
        // Toggle tactical chat
        if (this.game.gameState === 'playing') {
          this.toggleChat();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleScoreboard(false);
      }
    });

    // Chat form submit
    const chatInput = document.getElementById('chat-input-field');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          const val = chatInput.value.trim();
          if (val.length > 0 && this.socket && this.connected) {
            this.socket.emit('send_chat', { message: val });
            chatInput.value = '';
          }
          this.toggleChat(false);
        } else if (e.key === 'Escape') {
          this.toggleChat(false);
        }
      });
    }
  }

  toggleScoreboard(show) {
    const sb = document.getElementById('tactical-scoreboard');
    if (!sb) return;
    if (show) {
      this.updateScoreboard();
      sb.classList.remove('hidden');
    } else {
      sb.classList.add('hidden');
    }
  }

  updateScoreboard() {
    const tbody = document.getElementById('scoreboard-body');
    if (!tbody) return;

    // Combine local player + remote players
    const list = [];
    if (this.game && this.game.player) {
      list.push({
        id: this.myId || 'local',
        name: this.game.player.name || this.callsign,
        color: this.game.player.color || this.color,
        score: this.game.score || 0,
        kills: this.game.kills || 0,
        deaths: 0,
        hp: this.game.player.hp,
        alive: this.game.player.alive,
        ping: this.ping,
        isMe: true
      });
    }

    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      list.push({
        id: rp.id,
        name: rp.name,
        color: rp.color,
        score: rp.score || 0,
        kills: rp.kills || 0,
        deaths: rp.deaths || 0,
        hp: rp.hp,
        alive: rp.alive,
        ping: 25,
        isMe: false
      });
    }

    // Sort by Score descending
    list.sort((a, b) => b.score - a.score);

    tbody.innerHTML = '';
    list.forEach((p, idx) => {
      const row = document.createElement('tr');
      if (p.isMe) row.classList.add('me-row');

      row.innerHTML = `
        <td class="sb-rank">#${idx + 1}</td>
        <td class="sb-operative">
          <span class="sb-color-dot" style="background: ${p.color}; box-shadow: 0 0 6px ${p.color}"></span>
          <span class="sb-name" style="color: ${p.color}">${p.name} ${p.isMe ? '(YOU)' : ''}</span>
        </td>
        <td class="sb-status">
          <span class="sb-badge ${p.alive ? 'badge-alive' : 'badge-elim'}">${p.alive ? `${Math.round(p.hp)} HP` : 'RESPAWNING'}</span>
        </td>
        <td class="sb-kills">${p.kills}</td>
        <td class="sb-score">${p.score.toLocaleString()}</td>
        <td class="sb-ping">${p.isMe ? `${this.ping}ms` : '32ms'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // --- Tactical Text Chat ---
  toggleChat(force) {
    const chatBox = document.getElementById('tactical-chat-box');
    const input = document.getElementById('chat-input-field');
    if (!chatBox || !input) return;

    this.chatOpen = force !== undefined ? force : !this.chatOpen;

    if (this.chatOpen) {
      chatBox.classList.add('active');
      input.focus();
    } else {
      chatBox.classList.remove('active');
      input.blur();
    }
  }

  addChatMessage(data) {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'chat-msg-item';
    item.innerHTML = `
      <span class="chat-sender" style="color: ${data.senderColor}">[${data.senderName}]:</span>
      <span class="chat-text">${data.text}</span>
    `;
    list.appendChild(item);

    // Keep chat box scrolled to bottom
    list.scrollTop = list.scrollHeight;

    // Flash chat container briefly so player notices new messages
    const chatContainer = document.getElementById('tactical-chat-box');
    if (chatContainer && !this.chatOpen) {
      chatContainer.classList.add('peek');
      setTimeout(() => chatContainer.classList.remove('peek'), 4000);
    }
  }

  // --- Toggle Ready Status in Multiplayer Lobby ---
  toggleReady() {
    if (!this.connected || !this.socket) return;
    this.isReady = !this.isReady;
    this.socket.emit('lobby_toggle_ready', { isReady: this.isReady });
    this.renderLobbyUI();
  }

  // --- Start Screen Lobby UI & Team Battle Handling ---
  initLobbyUI() {
    // 0. Squad ID Actions (Copy ID, Join by ID, Leave Squad)
    const btnCopyId = document.getElementById('btn-copy-my-id');
    if (btnCopyId) {
      btnCopyId.addEventListener('click', () => {
        if (!this.myUserCode || this.myUserCode === '----') return;
        navigator.clipboard.writeText(this.myUserCode).then(() => {
          btnCopyId.textContent = 'COPIED!';
          setTimeout(() => { btnCopyId.textContent = 'COPY ID'; }, 2000);
        });
      });
    }

    const btnJoinById = document.getElementById('btn-join-by-id');
    const inputJoinId = document.getElementById('join-leader-id-input');
    if (btnJoinById && inputJoinId) {
      const doJoin = () => {
        const targetId = inputJoinId.value.trim().toUpperCase();
        if (targetId.length > 0 && this.socket && this.connected) {
          const nameInput = document.getElementById('operative-callsign-input');
          const name = nameInput ? nameInput.value.trim().toUpperCase() : '';
          this.socket.emit('lobby_join_by_id', {
            targetId,
            name,
            modelType: this.game.selectedModelType || 'commando',
            skinId: this.game.selectedSkinId || 'spectre'
          });
        }
      };
      btnJoinById.addEventListener('click', doJoin);
      inputJoinId.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doJoin();
      });
    }

    const btnLeaveRoom = document.getElementById('btn-leave-room');
    if (btnLeaveRoom) {
      btnLeaveRoom.addEventListener('click', () => {
        if (this.socket && this.connected) {
          this.socket.emit('lobby_leave_room');
          this.isReady = false;
        }
      });
    }

    // 1. Submode buttons (Team Battle vs FFA)
    const btnTeams = document.getElementById('btn-submode-teams');
    const btnFfa = document.getElementById('btn-submode-ffa');
    if (btnTeams) {
      btnTeams.addEventListener('click', () => {
        if (!this.isHost) return; // Only squad leader can change mode
        this.lobbyMode = 'teams';
        this.renderLobbyUI();
        if (this.socket && this.connected) {
          this.socket.emit('lobby_set_mode', { mode: 'teams' });
        }
      });
    }
    if (btnFfa) {
      btnFfa.addEventListener('click', () => {
        if (!this.isHost) return; // Only squad leader can change mode
        this.lobbyMode = 'ffa';
        this.renderLobbyUI();
        if (this.socket && this.connected) {
          this.socket.emit('lobby_set_mode', { mode: 'ffa' });
        }
      });
    }

    // 2. Join Team Buttons
    const btnJoinAlpha = document.getElementById('btn-join-alpha');
    const btnJoinBeta = document.getElementById('btn-join-beta');
    if (btnJoinAlpha) {
      btnJoinAlpha.addEventListener('click', () => {
        if (this.socket && this.connected) {
          this.socket.emit('lobby_join_team', { team: 'alpha' });
        }
      });
    }
    if (btnJoinBeta) {
      btnJoinBeta.addEventListener('click', () => {
        if (this.socket && this.connected) {
          this.socket.emit('lobby_join_team', { team: 'beta' });
        }
      });
    }

    // 2.6. Team Match Over Return Button
    const returnBtn = document.getElementById('team-match-return-btn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        const teamMatchScreen = document.getElementById('team-match-over-screen');
        if (teamMatchScreen) teamMatchScreen.classList.add('hidden');
        if (this.game) {
          this.game.score = 0;
          this.game.kills = 0;
          this.game.deaths = 0;
          this.game.shotsFired = 0;
          this.game.shotsHit = 0;
          this.game.wave = 1;
          this.game.clearGroundAndEntities();
          this.game.showScreen('start-screen');
          this.game.updateHUD();
          this.game.updateLiveRoster();
        }
        for (const id in this.remotePlayers) {
          if (this.remotePlayers[id]) {
            this.remotePlayers[id].score = 0;
            this.remotePlayers[id].kills = 0;
            this.remotePlayers[id].deaths = 0;
          }
        }
        this.updateTeamScoreboardHUD({
          alpha: { kills: 0, score: 0 },
          beta: { kills: 0, score: 0 },
          targetKills: 10
        });
        this.updateScoreboard();
        if (this.socket && this.connected) {
          this.socket.emit('leave_game');
          this.socket.emit('reset_match');
        }
      });
    }

    // 3. Team Color Swatches (Host Only)
    const alphaSwatches = document.querySelectorAll('#alpha-color-swatches .color-swatch-btn');
    alphaSwatches.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.socket && this.connected && this.isHost) {
          const col = btn.getAttribute('data-color');
          this.socket.emit('lobby_set_team_color', { team: 'alpha', color: col });
        }
      });
    });

    const betaSwatches = document.querySelectorAll('#beta-color-swatches .color-swatch-btn');
    betaSwatches.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.socket && this.connected && this.isHost) {
          const col = btn.getAttribute('data-color');
          this.socket.emit('lobby_set_team_color', { team: 'beta', color: col });
        }
      });
    });

    // 4. Color Picker Badges (FFA color locking)
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const chosen = swatch.getAttribute('data-color');
        if (this.lockedColors.includes(chosen) && this.color !== chosen) {
          return;
        }
        colorSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.color = chosen;

        if (this.socket && this.connected) {
          this.socket.emit('lobby_select_color', { color: chosen });
        }

        const previewVisor = document.getElementById('operative-visor-preview');
        if (previewVisor) previewVisor.style.background = this.color;
      });
    });

    // 5. Random Tactical Callsign Generator Button
    const randomBtn = document.getElementById('random-callsign-btn');
    const input = document.getElementById('operative-callsign-input');
    if (randomBtn && input) {
      const callsigns = ['GHOST', 'VIPER', 'TITAN', 'REAPER', 'SPECTRE', 'VALKYRIE', 'FROST', 'HAZARD', 'SHADOW', 'NEXUS'];
      randomBtn.addEventListener('click', () => {
        const rand = callsigns[Math.floor(Math.random() * callsigns.length)];
        input.value = `${rand}-${Math.floor(10 + Math.random() * 90)}`;
        if (this.game) {
          this.game.savedCallsign = input.value;
          if (this.game.player) this.game.player.name = input.value;
          this.game.saveProfile({ callsign: input.value });
        }
        if (this.socket && this.connected) {
          this.socket.emit('lobby_update_name', { name: input.value });
        }
      });
      input.addEventListener('input', () => {
        const val = input.value.trim().toUpperCase();
        if (val.length > 0) {
          if (this.game) {
            this.game.savedCallsign = val;
            if (this.game.player) this.game.player.name = val;
            this.game.saveProfile({ callsign: val });
          }
          if (this.socket && this.connected) {
            this.socket.emit('lobby_update_name', { name: val });
          }
        }
      });
    }

    // 6. Copy LAN URL Button
    const copyBtn = document.getElementById('copy-lan-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = `http://${this.serverIp}:${this.serverPort}`;
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.textContent = 'COPIED!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'COPY LINK';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });
    }
  }

  handleLobbySync(data) {
    if (!data) return;
    this.lobbyMode = data.mode || 'teams';
    this.isHost = (this.myId && data.hostId === this.myId);
    this.hostId = data.hostId;
    this.gameStarted = !!data.gameStarted;
    this.alphaColor = data.alphaColor || '#00f0ff';
    this.betaColor = data.betaColor || '#ff3366';
    this.lockedColors = data.lockedColors || [];
    this.lobbyPlayers = data.players || [];

    if (data.mapId && this.game && this.game.map) {
      if (this.game.gameMode === 'multiplayer' && !this.isHost) {
        if (this.game.selectedMapId !== data.mapId) {
          this.game.selectedMapId = data.mapId;
          this.game.map.setMap(data.mapId);
        }
      }
      this.game.updateMapSelectionUI();
    }

    if (data.lightingMode && this.game && this.game.setLightingMode) {
      this.game.setLightingMode(data.lightingMode, false);
    }

    if (data.weaponMode && this.game && this.game.setWeaponMode) {
      this.game.setWeaponMode(data.weaponMode, false);
    }

    if (data.pvpOnly !== undefined && this.game && this.game.setPvPMode) {
      this.game.setPvPMode(data.pvpOnly ? 'pvp_only' : 'enemies', false);
    }

    const me = this.lobbyPlayers.find(p => p.id === this.myId);
    if (me) {
      this.myTeam = me.team;
      this.color = me.color;
      this.isReady = !!me.isReady;
      if (this.game && this.game.player) {
        this.game.player.team = me.team;
        this.game.player.color = me.color;
      }
    }

    // If connected to a party leader or squad, guarantee gameMode is multiplayer
    if (this.connected && (!this.isHost || this.lobbyPlayers.length > 1)) {
      if (this.game) this.game.gameMode = 'multiplayer';
      const spBtn = document.getElementById('btn-mode-singleplayer');
      const mpBtn = document.getElementById('btn-mode-multiplayer');
      if (spBtn) spBtn.classList.remove('active');
      if (mpBtn) mpBtn.classList.add('active');
      const teamHub = document.getElementById('multiplayer-team-hub');
      if (teamHub) teamHub.classList.remove('hidden');
      const threatCol = document.getElementById('protocol-col-threat');
      if (threatCol) threatCol.classList.remove('hidden');
    }

    this.renderLobbyUI();
  }

  renderLobbyUI() {
    if (this.game && this.game.updateLightingUIState) {
      this.game.updateLightingUIState();
    }
    if (this.game && this.game.updateWeaponModeUIState) {
      this.game.updateWeaponModeUIState();
    }
    if (this.game && this.game.updatePvPModeUIState) {
      this.game.updatePvPModeUIState();
    }

    // 0. Update Operative ID
    const myIdEl = document.getElementById('my-operative-id');
    if (myIdEl) myIdEl.textContent = this.myUserCode;

    // Leave Button visibility: Only show if you are in someone else's squad
    const btnLeaveRoom = document.getElementById('btn-leave-room');
    if (btnLeaveRoom) {
      btnLeaveRoom.classList.toggle('hidden', this.isHost);
    }

    // 1. Submode buttons (Leader Only)
    const btnTeams = document.getElementById('btn-submode-teams');
    const btnFfa = document.getElementById('btn-submode-ffa');
    if (btnTeams) {
      btnTeams.classList.toggle('active', this.lobbyMode === 'teams');
      btnTeams.style.opacity = this.isHost ? '1' : '0.6';
      btnTeams.style.cursor = this.isHost ? 'pointer' : 'not-allowed';
      btnTeams.title = this.isHost ? '' : 'Controlled by squad leader';
    }
    if (btnFfa) {
      btnFfa.classList.toggle('active', this.lobbyMode === 'ffa');
      btnFfa.style.opacity = this.isHost ? '1' : '0.6';
      btnFfa.style.cursor = this.isHost ? 'pointer' : 'not-allowed';
      btnFfa.title = this.isHost ? '' : 'Controlled by squad leader';
    }

    // 2. Team Battle vs FFA Grids
    const teamGrid = document.getElementById('team-battle-grid');
    const ffaGrid = document.getElementById('ffa-battle-grid');
    if (teamGrid) {
      teamGrid.style.display = this.lobbyMode === 'teams' ? 'grid' : 'none';
    }
    if (ffaGrid) {
      ffaGrid.style.display = this.lobbyMode === 'ffa' ? 'block' : 'none';
      const ffaBox = document.getElementById('ffa-members');
      if (ffaBox) {
        ffaBox.innerHTML = '';
        if (this.lobbyPlayers.length === 0) {
          ffaBox.innerHTML = '<div class="team-empty-hint">NO OPERATIVES IN ARENA</div>';
        } else {
          this.lobbyPlayers.forEach(m => {
            const item = document.createElement('div');
            item.className = 'team-member-item';
            item.innerHTML = `
              <span class="member-dot" style="background: ${m.color || '#00f0ff'}; box-shadow: 0 0 6px ${m.color || '#00f0ff'};"></span>
              <span class="member-name">${m.name} ${m.id === this.myId ? '(YOU)' : ''}</span>
              ${m.isHost ? '<span class="member-host-badge">LEADER</span>' : ''}
              <span class="member-ready-badge ${m.isReady ? 'ready' : 'waiting'}">${m.isReady ? 'READY ✓' : 'WAITING'}</span>
            `;
            ffaBox.appendChild(item);
          });
        }
      }
      const ffaCount = document.getElementById('ffa-operatives-count');
      if (ffaCount) ffaCount.textContent = this.lobbyPlayers.length;
    }

    // 3. Leader Pill & Match Status
    const leaderPill = document.getElementById('lobby-leader-pill');
    if (leaderPill) {
      const hostPlayer = this.lobbyPlayers.find(p => p.isHost || p.id === this.hostId);
      if (this.isHost) {
        leaderPill.textContent = '👑 SQUAD LEADER: YOU (HOST)';
        leaderPill.style.borderColor = 'rgba(255, 180, 0, 0.7)';
        leaderPill.style.color = '#ffb400';
      } else if (hostPlayer) {
        leaderPill.textContent = `👑 SQUAD LEADER: ${hostPlayer.name}`;
        leaderPill.style.borderColor = 'rgba(0, 240, 255, 0.5)';
        leaderPill.style.color = '#00f0ff';
      } else {
        leaderPill.textContent = '👑 SQUAD LEADER: ASSIGNING...';
      }
    }

    const matchStatusText = document.getElementById('match-status-text');
    const startBtn = document.getElementById('start-btn');
    const readyCount = this.lobbyPlayers.filter(p => p.isReady).length;
    const total = this.lobbyPlayers.length;

    if (matchStatusText) {
      if (this.gameStarted) {
        matchStatusText.textContent = 'MATCH IN PROGRESS — CHOOSE TEAM & CLICK READY TO DROP IN';
        matchStatusText.style.color = '#00ff88';
      } else if (this.isHost) {
        matchStatusText.textContent = (readyCount === total && total > 0)
          ? 'ALL OPERATIVES READY — MATCH STARTING!'
          : `SQUAD READY: ${readyCount} / ${total} — WAITING FOR OPERATIVES`;
        matchStatusText.style.color = (readyCount === total && total > 0) ? '#00ff88' : '#ffb400';
      } else {
        matchStatusText.textContent = `SQUAD READY: ${readyCount} / ${total} — CLICK READY TO ENTER COMBAT`;
        matchStatusText.style.color = this.isReady ? '#00ff88' : 'var(--accent-cyan)';
      }
    }

    if (startBtn) {
      const btnText = startBtn.querySelector('.btn-text');
      const inMultiplayer = (this.game && this.game.gameMode === 'multiplayer') || (!this.isHost) || (this.lobbyPlayers.length > 1);
      if (inMultiplayer) {
        if (btnText) {
          if (this.gameStarted) {
            btnText.textContent = 'READY (DROP IN)';
            startBtn.classList.remove('ready-active');
          } else if (this.isReady) {
            btnText.textContent = 'READY ✓';
            startBtn.classList.add('ready-active');
          } else {
            btnText.textContent = 'READY';
            startBtn.classList.remove('ready-active');
          }
        }
      } else {
        if (btnText) btnText.textContent = 'START';
        startBtn.classList.remove('ready-active');
      }
    }

    // 4. Host Tags & Permissions
    const alphaHostTag = document.getElementById('alpha-host-tag');
    const betaHostTag = document.getElementById('beta-host-tag');
    if (alphaHostTag) {
      alphaHostTag.textContent = this.isHost ? 'SQUAD LEADER (YOU)' : 'SQUAD LEADER ONLY';
      alphaHostTag.style.color = this.isHost ? '#00ff88' : 'rgba(255,255,255,0.4)';
    }
    if (betaHostTag) {
      betaHostTag.textContent = this.isHost ? 'SQUAD LEADER (YOU)' : 'SQUAD LEADER ONLY';
      betaHostTag.style.color = this.isHost ? '#00ff88' : 'rgba(255,255,255,0.4)';
    }

    // 5. Team Colors & Dots
    const alphaDot = document.getElementById('team-alpha-dot');
    if (alphaDot) {
      alphaDot.style.background = this.alphaColor;
      alphaDot.style.boxShadow = `0 0 10px ${this.alphaColor}`;
    }
    const betaDot = document.getElementById('team-beta-dot');
    if (betaDot) {
      betaDot.style.background = this.betaColor;
      betaDot.style.boxShadow = `0 0 10px ${this.betaColor}`;
    }

    // Swatches active states
    document.querySelectorAll('#alpha-color-swatches .color-swatch-btn').forEach(btn => {
      const col = btn.getAttribute('data-color');
      btn.classList.toggle('active', col === this.alphaColor);
      btn.style.opacity = this.isHost ? '1' : '0.5';
      btn.style.cursor = this.isHost ? 'pointer' : 'not-allowed';
    });
    document.querySelectorAll('#beta-color-swatches .color-swatch-btn').forEach(btn => {
      const col = btn.getAttribute('data-color');
      btn.classList.toggle('active', col === this.betaColor);
      btn.style.opacity = this.isHost ? '1' : '0.5';
      btn.style.cursor = this.isHost ? 'pointer' : 'not-allowed';
    });

    // 6. Team Members
    const alphaBox = document.getElementById('team-alpha-members');
    const betaBox = document.getElementById('team-beta-members');
    const alphaMembers = this.lobbyPlayers.filter(p => p.team === 'alpha');
    const betaMembers = this.lobbyPlayers.filter(p => p.team === 'beta');

    const alphaCount = document.getElementById('team-alpha-count');
    if (alphaCount) {
      alphaCount.textContent = `${alphaMembers.length} OPERATIVE${alphaMembers.length !== 1 ? 'S' : ''}`;
    }
    const betaCount = document.getElementById('team-beta-count');
    if (betaCount) {
      betaCount.textContent = `${betaMembers.length} OPERATIVE${betaMembers.length !== 1 ? 'S' : ''}`;
    }

    if (alphaBox) {
      if (alphaMembers.length === 0) {
        alphaBox.innerHTML = '<div class="team-empty-hint">NO OPERATIVES IN TEAM ALPHA</div>';
      } else {
        alphaBox.innerHTML = '';
        alphaMembers.forEach(m => {
          const item = document.createElement('div');
          item.className = 'team-member-item';
          item.innerHTML = `
            <span class="member-dot" style="background: ${this.alphaColor}; box-shadow: 0 0 6px ${this.alphaColor};"></span>
            <span class="member-name">${m.name} ${m.id === this.myId ? '(YOU)' : ''}</span>
            ${m.isHost ? '<span class="member-host-badge">LEADER</span>' : ''}
            <span class="member-ready-badge ${m.isReady ? 'ready' : 'waiting'}">${m.isReady ? 'READY ✓' : 'WAITING'}</span>
          `;
          alphaBox.appendChild(item);
        });
      }
    }

    if (betaBox) {
      if (betaMembers.length === 0) {
        betaBox.innerHTML = '<div class="team-empty-hint">NO OPERATIVES IN TEAM BETA</div>';
      } else {
        betaBox.innerHTML = '';
        betaMembers.forEach(m => {
          const item = document.createElement('div');
          item.className = 'team-member-item';
          item.innerHTML = `
            <span class="member-dot" style="background: ${this.betaColor}; box-shadow: 0 0 6px ${this.betaColor};"></span>
            <span class="member-name">${m.name} ${m.id === this.myId ? '(YOU)' : ''}</span>
            ${m.isHost ? '<span class="member-host-badge">LEADER</span>' : ''}
            <span class="member-ready-badge ${m.isReady ? 'ready' : 'waiting'}">${m.isReady ? 'READY ✓' : 'WAITING'}</span>
          `;
          betaBox.appendChild(item);
        });
      }
    }

    // 7. Join Buttons
    const btnJoinAlpha = document.getElementById('btn-join-alpha');
    const btnJoinBeta = document.getElementById('btn-join-beta');
    const cardAlpha = document.getElementById('team-card-alpha');
    const cardBeta = document.getElementById('team-card-beta');

    if (btnJoinAlpha) {
      const isAlpha = this.myTeam === 'alpha';
      btnJoinAlpha.classList.toggle('joined', isAlpha);
      btnJoinAlpha.innerHTML = isAlpha ? '<span>✓</span> JOINED TEAM ALPHA' : 'JOIN TEAM ALPHA';
      if (cardAlpha) cardAlpha.classList.toggle('my-team', isAlpha);
    }
    if (btnJoinBeta) {
      const isBeta = this.myTeam === 'beta';
      btnJoinBeta.classList.toggle('joined', isBeta);
      btnJoinBeta.innerHTML = isBeta ? '<span>✓</span> JOINED TEAM BETA' : 'JOIN TEAM BETA';
      if (cardBeta) cardBeta.classList.toggle('my-team', isBeta);
    }

    // 8. Color Locking in FFA
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(s => {
      const col = s.getAttribute('data-color');
      const isLocked = this.lockedColors.includes(col) && (col !== this.color);
      s.classList.toggle('locked', isLocked && this.lobbyMode === 'ffa');
      s.title = isLocked ? 'Color chosen by another operative' : '';
    });

    if (this.game && this.game.updateCustomizationSections) {
      this.game.updateCustomizationSections();
    }
  }

  updateServerIpDisplay(ip, port, allIps) {
    const displayEl = document.getElementById('lan-ip-address');
    if (displayEl) {
      displayEl.textContent = `http://${ip}:${port}`;
    }
    const hintEl = document.getElementById('lan-connect-hint');
    if (hintEl) {
      hintEl.textContent = `Share this address with other players on your LAN cable / Wi-Fi to join!`;
    }
  }

  updateNetworkBadge(online) {
    const badge = document.getElementById('net-status-badge');
    if (badge) {
      if (online) {
        badge.textContent = 'ONLINE // LAN READY';
        badge.className = 'status-chip online-chip';
      } else {
        badge.textContent = 'OFFLINE // STANDALONE';
        badge.className = 'status-chip offline-chip';
      }
    }
  }

  updateLobbyCount() {
    const countEl = document.getElementById('lobby-operatives-count');
    if (countEl) {
      const count = Object.keys(this.remotePlayers).length + 1;
      countEl.textContent = `${count} OPERATIVE${count > 1 ? 'S' : ''} CONNECTED`;
    }
  }

  updateTeamScoreboardHUD(teamStats) {
    const hud = document.getElementById('team-scoreboard-hud');
    if (!hud) return;

    if (this.game && this.game.gameMode === 'multiplayer' && this.lobbyMode === 'teams') {
      hud.classList.remove('hidden');
    } else {
      hud.classList.add('hidden');
      return;
    }

    const alpha = teamStats.alpha || { kills: 0, score: 0 };
    const beta = teamStats.beta || { kills: 0, score: 0 };

    const alphaKills = document.getElementById('hud-alpha-kills');
    const alphaScore = document.getElementById('hud-alpha-score');
    const betaKills = document.getElementById('hud-beta-kills');
    const betaScore = document.getElementById('hud-beta-score');

    const targetKills = teamStats.targetKills || 10;
    const targetPill = hud.querySelector('.team-hud-target-pill');
    if (targetPill) targetPill.textContent = `TARGET: ${targetKills} KILLS`;

    if (alphaKills) alphaKills.textContent = `${alpha.kills} / ${targetKills}`;
    if (alphaScore) alphaScore.textContent = Number(alpha.score || 0).toLocaleString();
    if (betaKills) betaKills.textContent = `${beta.kills} / ${targetKills}`;
    if (betaScore) betaScore.textContent = Number(beta.score || 0).toLocaleString();

    const alphaDot = document.getElementById('hud-alpha-dot');
    const betaDot = document.getElementById('hud-beta-dot');
    if (alphaDot) alphaDot.style.background = this.alphaColor || '#00f0ff';
    if (betaDot) betaDot.style.background = this.betaColor || '#ff3366';
  }

  showTeamMatchOverScreen(teamStats, winner, competitors) {
    const screen = document.getElementById('team-match-over-screen');
    if (!screen) return;

    const alpha = teamStats.alpha || { kills: 0, score: 0 };
    const beta = teamStats.beta || { kills: 0, score: 0 };

    const title = document.getElementById('team-match-title');
    const sub = document.getElementById('team-match-sub');
    const cardAlpha = document.getElementById('res-card-alpha');
    const cardBeta = document.getElementById('res-card-beta');
    const badgeAlpha = document.getElementById('res-alpha-badge');
    const badgeBeta = document.getElementById('res-beta-badge');

    const killsAlpha = document.getElementById('res-alpha-kills');
    const scoreAlpha = document.getElementById('res-alpha-score');
    const killsBeta = document.getElementById('res-beta-kills');
    const scoreBeta = document.getElementById('res-beta-score');

    const targetKills = teamStats.targetKills || 10;
    if (killsAlpha) killsAlpha.textContent = `${alpha.kills} / ${targetKills}`;
    if (scoreAlpha) scoreAlpha.textContent = Number(alpha.score).toLocaleString() + ' PTS';
    if (killsBeta) killsBeta.textContent = `${beta.kills} / ${targetKills}`;
    if (scoreBeta) scoreBeta.textContent = Number(beta.score).toLocaleString() + ' PTS';

    if (winner === 'alpha') {
      if (title) {
        title.textContent = 'TEAM ALPHA VICTORIOUS';
        title.style.color = this.alphaColor || '#00f0ff';
        title.style.textShadow = `0 0 20px ${this.alphaColor || '#00f0ff'}`;
      }
      if (cardAlpha) { cardAlpha.className = 'team-result-card winner'; }
      if (cardBeta) { cardBeta.className = 'team-result-card defeated'; }
      if (badgeAlpha) { badgeAlpha.className = 'team-result-badge win-badge'; badgeAlpha.textContent = 'VICTORY (HIGHEST SCORE)'; }
      if (badgeBeta) { badgeBeta.className = 'team-result-badge defeat-badge'; badgeBeta.textContent = 'DEFEATED'; }
    } else if (winner === 'beta') {
      if (title) {
        title.textContent = 'TEAM BETA VICTORIOUS';
        title.style.color = this.betaColor || '#ff3366';
        title.style.textShadow = `0 0 20px ${this.betaColor || '#ff3366'}`;
      }
      if (cardAlpha) { cardAlpha.className = 'team-result-card defeated'; }
      if (cardBeta) { cardBeta.className = 'team-result-card winner'; }
      if (badgeAlpha) { badgeAlpha.className = 'team-result-badge defeat-badge'; badgeAlpha.textContent = 'DEFEATED'; }
      if (badgeBeta) { badgeBeta.className = 'team-result-badge win-badge'; badgeBeta.textContent = 'VICTORY (HIGHEST SCORE)'; }
    } else {
      if (title) {
        title.textContent = 'MATCH CONCLUDED — DRAW';
        title.style.color = '#ffd166';
      }
      if (cardAlpha) { cardAlpha.className = 'team-result-card'; }
      if (cardBeta) { cardBeta.className = 'team-result-card'; }
      if (badgeAlpha) { badgeAlpha.className = 'team-result-badge'; badgeAlpha.textContent = 'DRAW'; }
      if (badgeBeta) { badgeBeta.className = 'team-result-badge'; badgeBeta.textContent = 'DRAW'; }
    }

    if (sub) {
      sub.textContent = `A squad reached the 20 rival kills target! Final victory is determined by HIGHEST COMBINED SCORE (Rival Eliminations + AI Neutralizations).`;
    }

    // Populate and render full competitors standings leaderboard
    this.renderMatchLeaderboard(competitors);

    screen.classList.remove('hidden');

    if (window.soundSystem) {
      if (this.myTeam === winner) {
        window.soundSystem.playWaveClear();
      } else {
        window.soundSystem.playGameOver();
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  renderMatchLeaderboard(competitors) {
    const tbody = document.getElementById('team-match-leaderboard-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // If competitors list was not provided by server, aggregate from local + remote players
    let list = Array.isArray(competitors) ? [...competitors] : [];
    if (list.length === 0) {
      const myName = (this.game && this.game.player && this.game.player.name) || this.callsign || 'YOU';
      list.push({
        id: this.myId,
        name: myName,
        team: this.myTeam || 'alpha',
        color: this.color || '#00f0ff',
        score: (this.game && this.game.score) || 0,
        kills: (this.game && this.game.kills) || 0,
        deaths: (this.game && this.game.deaths) || 0
      });
      for (const id in this.remotePlayers) {
        const rp = this.remotePlayers[id];
        list.push({
          id: rp.id,
          name: rp.name || 'OPERATIVE',
          team: rp.team || 'beta',
          color: rp.color || '#ff3366',
          score: rp.score || 0,
          kills: rp.kills || 0,
          deaths: rp.deaths || 0
        });
      }
    }

    // Sort competitors descending by score, tiebreaker by kills
    list.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.kills || 0) - (a.kills || 0));

    const rankLabels = ['1ST', '2ND', '3RD'];
    const rankBadges = ['🥇', '🥈', '🥉'];

    list.forEach((p, idx) => {
      const isMe = (p.id === this.myId) || (this.game && this.game.player && p.name === this.game.player.name);
      const tr = document.createElement('tr');
      const rankNum = idx + 1;
      tr.className = `mlb-row rank-${rankNum} ${isMe ? 'is-local-player' : ''}`;

      const rankBadgeHtml = rankNum <= 3
        ? `<span class="mlb-rank-badge rank-top-${rankNum}"><span class="mlb-rank-icon">${rankBadges[idx]}</span> ${rankLabels[idx]}</span>`
        : `<span class="mlb-rank-badge rank-other">#${rankNum}</span>`;

      const teamName = p.team === 'alpha' ? 'ALPHA' : (p.team === 'beta' ? 'BETA' : 'FFA');
      const teamColor = p.team === 'alpha' ? (this.alphaColor || '#00f0ff') : (p.team === 'beta' ? (this.betaColor || '#ff3366') : '#ffd166');

      tr.innerHTML = `
        <td class="col-rank">${rankBadgeHtml}</td>
        <td class="col-player">
          <div class="mlb-player-cell">
            <span class="mlb-color-dot" style="background: ${p.color || teamColor}; color: ${p.color || teamColor};"></span>
            <span class="mlb-player-name">${this.escapeHtml(p.name || 'OPERATIVE')}</span>
            ${isMe ? '<span class="mlb-you-tag">YOU</span>' : ''}
          </div>
        </td>
        <td class="col-team">
          <span class="mlb-team-pill team-${p.team || 'alpha'}" style="--team-color: ${teamColor};">
            ${teamName}
          </span>
        </td>
        <td class="col-score">
          <span class="mlb-score-val">${Number(p.score || 0).toLocaleString()}</span> <span class="mlb-pts">PTS</span>
        </td>
        <td class="col-kills">${p.kills || 0}</td>
        <td class="col-deaths">${p.deaths || 0}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

window.NetworkSystem = NetworkSystem;
