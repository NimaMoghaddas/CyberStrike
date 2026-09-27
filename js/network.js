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
        this.serverIp = data.serverIp;
        this.serverPort = data.port;
        this.updateServerIpDisplay(data.serverIp, data.port, data.allIps);

        // Pre-populate any existing remote players
        if (data.players) {
          data.players.forEach(p => {
            if (p.id !== this.myId) {
              this.addRemotePlayer(p);
            }
          });
          this.updateLobbyCount();
        }
      });

      // 2. Acknowledge Join
      this.socket.on('joined_successfully', (data) => {
        const p = data.player;
        this.game.player.x = p.x;
        this.game.player.y = p.y;
        this.game.player.color = p.color;
        this.game.player.name = p.name;
        this.game.player.invulnerableTime = p.invulnerableTimer || 2.0;
        this.game.player.alive = true;
        this.game.player.hp = p.hp;
        this.game.localPlayerId = this.myId;
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

      // 8. PvE Wave Events
      this.socket.on('wave_start', (data) => {
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
        const clearBanner = document.getElementById('wave-clear-banner');
        if (clearBanner) {
          document.getElementById('cleared-wave-title').textContent = `WAVE ${data.wave} COMPLETE`;
          clearBanner.classList.remove('hidden');
          setTimeout(() => clearBanner.classList.add('hidden'), 3000);
        }
        this.game.score += data.bonus;
        this.game.player.hp = Math.min(this.game.player.maxHp, this.game.player.hp + 35);
        this.game.player.ammo = this.game.player.magSize;
        this.game.updateAmmoUI();
        this.game.updateHUD();
        window.soundSystem.playWaveClear();
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
          this.game.player.x = data.x;
          this.game.player.y = data.y;
          this.game.player.hp = data.hp;
          this.game.player.alive = true;
          this.game.player.invulnerableTime = data.invulnerableTimer || 2.5;
          this.game.player.ammo = this.game.player.magSize;
          this.hideRespawnOverlay();
          this.game.updateHUD();
          this.game.updateAmmoUI();
          window.soundSystem.playReload();
        } else if (this.remotePlayers[data.id]) {
          const rp = this.remotePlayers[data.id];
          rp.x = data.x;
          rp.y = data.y;
          rp.hp = data.hp;
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
        recoilOffset: Number(p.recoilOffset.toFixed(1))
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
    }
  }

  // --- Broadcast Shoot Event ---
  emitShoot(x, y, angle, isCritical, damage) {
    if (!this.connected || !this.socket) return;
    this.socket.emit('player_shoot', {
      x: Math.round(x),
      y: Math.round(y),
      angle: Number(angle.toFixed(3)),
      isCritical: !!isCritical,
      damage
    });
  }

  // --- Report Hit on Enemy (PvE) ---
  reportEnemyHit(enemyId, damage, isCritical, x, y) {
    if (!this.connected || !this.socket) return;
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
    const rp = this.remotePlayers[data.shooterId];
    if (rp) {
      rp.recoilOffset = 6;
      rp.muzzleFlashTimer = 0.06;
    }

    // Spawn visual bullet projectile in game
    const bullet = new Bullet(data.x, data.y, data.angle, {
      speed: 1100,
      damage: data.damage,
      range: 1400
    });
    bullet.isCritical = data.isCritical;
    bullet.shooterId = data.shooterId;
    this.game.bullets.push(bullet);

    // Audio & Effects
    window.soundSystem.playShoot();
    window.particleSystem.emitMuzzleFlash(data.x, data.y, data.angle);
    window.particleSystem.ejectShell(data.x, data.y, data.angle);
  }

  // --- Handle Master Game Snapshot ---
  handleGameSnapshot(snapshot) {
    // 1. Update Remote Players
    if (snapshot.players) {
      snapshot.players.forEach(pData => {
        if (pData.id === this.myId) {
          // Update our authoritative score, kills, deaths from server
          this.game.score = Math.max(this.game.score, pData.score);
          this.game.kills = Math.max(this.game.kills, pData.kills);
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
        rp.invulnerableTimer = pData.invulnerableTimer;
        rp.isDashing = pData.isDashing;
        rp.isReloading = pData.isReloading;
        rp.isMoving = pData.isMoving;
        rp.walkCycle = pData.walkCycle;
        rp.recoilOffset = pData.recoilOffset;
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
          enemy = new Enemy(eData.x, eData.y, eData.type);
          enemy.id = eData.id;
          enemy.color = eData.color;
          enemy.radius = eData.radius;
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

    this.updateScoreboard();
  }

  // --- Add Remote Player Instance ---
  addRemotePlayer(pData) {
    const rp = new Player(pData.x, pData.y);
    rp.id = pData.id;
    rp.name = pData.name;
    rp.color = pData.color;
    rp.hp = pData.hp;
    rp.maxHp = pData.maxHp || 100;
    rp.score = pData.score || 0;
    rp.kills = pData.kills || 0;
    rp.deaths = pData.deaths || 0;
    rp.alive = pData.alive !== false;
    rp.isRemote = true;
    rp.targetX = pData.x;
    rp.targetY = pData.y;
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

    // Draw local player shield if invulnerable
    if (this.game.player.alive && this.game.player.invulnerableTime > 0) {
      this.drawForceShield(ctx, this.game.player);
    }
  }

  // --- Render Custom Stylized Operative ---
  drawOperative(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.translate(-p.recoilOffset, 0);

    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Moving legs
    const legSway = Math.sin(p.walkCycle) * 7;
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(-12, -10 + legSway, 12, 6);
    ctx.fillRect(-12, 4 - legSway, 12, 6);

    // Rifle
    ctx.fillStyle = '#111824';
    ctx.fillRect(4, 5, 28, 6);
    ctx.fillStyle = '#374151';
    ctx.fillRect(32, 6.5, 8, 3);

    // Gun Rail LED in player color
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(12, 4.5, 12, 1.5);
    ctx.shadowBlur = 0;

    // Tactical Arms & Hands
    ctx.fillStyle = '#2b394a';
    ctx.beginPath();
    ctx.ellipse(8, -6, 7, 5, 0.4, 0, Math.PI * 2);
    ctx.ellipse(14, 8, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Gloves
    ctx.fillStyle = '#151c24';
    ctx.beginPath();
    ctx.arc(22, 7, 3.5, 0, Math.PI * 2);
    ctx.arc(16, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Torso & Armor Vest
    ctx.fillStyle = '#1d2836';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic Armor Plate
    ctx.fillStyle = '#2d3d52';
    ctx.beginPath();
    ctx.ellipse(-1, 0, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#0f1724';
    ctx.beginPath();
    ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Cyber Visor (Glows with player's custom color)
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(3, 0, 5, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.lineTo(2, 0);
    ctx.fill();
    ctx.shadowBlur = 0;

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

    // Muzzle flash if firing
    if (p.muzzleFlashTimer > 0) {
      ctx.save();
      ctx.translate(40, 8);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Force Field if invulnerable
    if (p.invulnerableTimer > 0) {
      this.drawForceShield(ctx, p);
    }
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

    // Callsign text shadow & fill
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.fillText(p.name, 0, -4);
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
    const nameInput = document.getElementById('operative-callsign-input');
    if (nameInput && nameInput.value.trim().length > 0) {
      this.callsign = nameInput.value.trim().toUpperCase();
    }

    if (this.socket && this.connected) {
      this.socket.emit('join_game', {
        name: this.callsign,
        color: this.color
      });
    } else {
      // Standalone single-player mode
      this.game.player.color = this.color;
      this.game.player.name = this.callsign;
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
    let left = Math.round(seconds);
    const countEl = document.getElementById('respawn-seconds');
    if (countEl) countEl.textContent = left;

    const timer = setInterval(() => {
      left--;
      if (countEl) countEl.textContent = Math.max(0, left);
      if (left <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  }

  hideRespawnOverlay() {
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

  // --- Start Screen Lobby UI ---
  initLobbyUI() {
    // 1. Color Picker Badges
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.color = swatch.getAttribute('data-color');

        // Update preview visor
        const previewVisor = document.getElementById('operative-visor-preview');
        if (previewVisor) previewVisor.style.background = this.color;
      });
    });

    // 2. Random Tactical Callsign Generator Button
    const randomBtn = document.getElementById('random-callsign-btn');
    if (randomBtn) {
      const callsigns = ['GHOST', 'VIPER', 'TITAN', 'REAPER', 'SPECTRE', 'VALKYRIE', 'FROST', 'HAZARD', 'SHADOW', 'NEXUS'];
      randomBtn.addEventListener('click', () => {
        const rand = callsigns[Math.floor(Math.random() * callsigns.length)];
        const input = document.getElementById('operative-callsign-input');
        if (input) input.value = `${rand}-${Math.floor(10 + Math.random() * 90)}`;
      });
    }

    // 3. Copy LAN URL Button
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
}

window.NetworkSystem = NetworkSystem;
