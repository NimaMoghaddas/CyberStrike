/**
 * CYBER STRIKE // DEDICATED LAN & ONLINE MULTIPLAYER SERVER
 * High-performance Node.js + Socket.io Server
 * Features:
 * - Real-time Player Synchronization (WASD movement, aiming, dash, reload)
 * - PvP Combat (Friendly Fire / Player vs Player combat & damage)
 * - PvE Co-op Wave AI (Synchronized enemy hordes, wave progression, shared objectives)
 * - Tactical Elimination & Respawn Protocol (with temporary invulnerability shield)
 * - Explosive Barrels Synchronization
 * - Tactical Kill Feed & Real-time In-Game Scoreboard
 * - In-game Tactical Text Chat (Enter key)
 * - Automatic Local LAN IP Detection & Broadcast
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MAP_WIDTH = 2400;
const MAP_HEIGHT = 2400;

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Helper: Get LAN IP Addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // IPv4 and non-internal
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, ip: net.address });
      }
    }
  }
  return addresses;
}

const networkIps = getNetworkIps();
const primaryLanIp = networkIps.length > 0 ? networkIps[0].ip : '127.0.0.1';

// API: Network Info for connected clients
app.get('/api/network-info', (req, res) => {
  res.json({
    primaryIp: primaryLanIp,
    allIps: networkIps,
    port: PORT,
    playersCount: Object.keys(players).length
  });
});

// --- MAP GEOMETRY (Matching map.js for server collision & enemy AI) ---
const cx = MAP_WIDTH / 2;
const cy = MAP_HEIGHT / 2;

const mapWalls = [
  // Boundaries
  { x: 0, y: 0, w: MAP_WIDTH, h: 50 },
  { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50 },
  { x: 0, y: 0, w: 50, h: MAP_HEIGHT },
  { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT },
  // Center barriers
  { x: cx - 120, y: cy - 20, w: 240, h: 40 },
  { x: cx - 20, y: cy - 120, w: 40, h: 240 },
  // Quadrant 1 (NW)
  { x: 250, y: 250, w: 180, h: 90 },
  { x: 470, y: 250, w: 90, h: 180 },
  { x: 250, y: 480, w: 140, h: 80 },
  { x: 680, y: 350, w: 80, h: 260 },
  { x: 350, y: 720, w: 300, h: 50 },
  // Quadrant 2 (NE)
  { x: MAP_WIDTH - 450, y: 250, w: 200, h: 90 },
  { x: MAP_WIDTH - 700, y: 280, w: 70, h: 280 },
  { x: MAP_WIDTH - 580, y: 560, w: 320, h: 60 },
  { x: MAP_WIDTH - 400, y: 740, w: 120, h: 120 },
  // Quadrant 3 (SW)
  { x: 250, y: MAP_HEIGHT - 420, w: 220, h: 90 },
  { x: 550, y: MAP_HEIGHT - 420, w: 80, h: 200 },
  { x: 300, y: MAP_HEIGHT - 750, w: 320, h: 60 },
  { x: 720, y: MAP_HEIGHT - 650, w: 60, h: 280 },
  // Quadrant 4 (SE)
  { x: MAP_WIDTH - 500, y: MAP_HEIGHT - 450, w: 240, h: 100 },
  { x: MAP_WIDTH - 780, y: MAP_HEIGHT - 550, w: 160, h: 80 },
  { x: MAP_WIDTH - 400, y: MAP_HEIGHT - 780, w: 80, h: 240 },
  { x: MAP_WIDTH - 700, y: MAP_HEIGHT - 850, w: 280, h: 60 },
  // Midfield
  { x: cx - 500, y: cy - 40, w: 180, h: 80 },
  { x: cx + 320, y: cy - 40, w: 180, h: 80 },
  { x: cx - 40, y: cy - 500, w: 80, h: 180 },
  { x: cx - 40, y: cy + 320, w: 80, h: 180 }
];

const mapPillars = [
  { x: cx - 260, y: cy - 260, radius: 45 },
  { x: cx + 260, y: cy - 260, radius: 45 },
  { x: cx - 260, y: cy + 260, radius: 45 },
  { x: cx + 260, y: cy + 260, radius: 45 },
  { x: 520, y: cy, radius: 40 },
  { x: MAP_WIDTH - 520, y: cy, radius: 40 },
  { x: cx, y: 520, radius: 40 },
  { x: cx, y: MAP_HEIGHT - 520, radius: 40 }
];

function isCollidingWithMap(x, y, radius = 20) {
  // Boundaries
  if (x < 50 + radius || x > MAP_WIDTH - 50 - radius || y < 50 + radius || y > MAP_HEIGHT - 50 - radius) {
    return true;
  }
  // Walls
  for (const w of mapWalls) {
    const nearX = Math.max(w.x, Math.min(x, w.x + w.w));
    const nearY = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - nearX;
    const dy = y - nearY;
    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }
  // Pillars
  for (const p of mapPillars) {
    const dx = x - p.x;
    const dy = y - p.y;
    const minD = radius + p.radius;
    if (dx * dx + dy * dy < minD * minD) {
      return true;
    }
  }
  return false;
}

// Tactical Spawn Points for Operatives
const SPAWN_POINTS = [
  { x: cx, y: cy + 140 },
  { x: cx, y: cy - 140 },
  { x: cx - 140, y: cy },
  { x: cx + 140, y: cy },
  { x: 420, y: 420 },
  { x: MAP_WIDTH - 420, y: 420 },
  { x: 420, y: MAP_HEIGHT - 420 },
  { x: MAP_WIDTH - 420, y: MAP_HEIGHT - 420 }
];

function getRandomSpawnPoint() {
  const idx = Math.floor(Math.random() * SPAWN_POINTS.length);
  const pt = SPAWN_POINTS[idx];
  // Add small random jitter
  return {
    x: pt.x + (Math.random() - 0.5) * 40,
    y: pt.y + (Math.random() - 0.5) * 40
  };
}

// Preset Operative Colors
const OPERATIVE_COLORS = [
  '#00f0ff', // Cyan (Ghost)
  '#00ff88', // Neon Green (Viper)
  '#ffb703', // Amber (Titan)
  '#ff3366', // Crimson (Reaper)
  '#bd00ff', // Purple (Spectre)
  '#ff00aa', // Neon Pink (Valkyrie)
  '#00d4ff', // Electric Blue (Frost)
  '#ffe600'  // Hazard Yellow (Hazard)
];

// --- SERVER GAME STATE ---
const players = {};
let nextEnemyId = 1;
const enemies = {};

// Barrel States
const initialBarrels = [
  { id: 1, x: cx - 180, y: cy - 180, radius: 18, hp: 35, exploded: false },
  { id: 2, x: cx + 180, y: cy - 180, radius: 18, hp: 35, exploded: false },
  { id: 3, x: cx - 180, y: cy + 180, radius: 18, hp: 35, exploded: false },
  { id: 4, x: cx + 180, y: cy + 180, radius: 18, hp: 35, exploded: false },
  { id: 5, x: 420, y: 450, radius: 18, hp: 35, exploded: false },
  { id: 6, x: 460, y: 450, radius: 18, hp: 35, exploded: false },
  { id: 7, x: MAP_WIDTH - 420, y: 450, radius: 18, hp: 35, exploded: false },
  { id: 8, x: MAP_WIDTH - 460, y: 450, radius: 18, hp: 35, exploded: false },
  { id: 9, x: 420, y: MAP_HEIGHT - 450, radius: 18, hp: 35, exploded: false },
  { id: 10, x: MAP_WIDTH - 420, y: MAP_HEIGHT - 450, radius: 18, hp: 35, exploded: false },
  { id: 11, x: cx - 350, y: cy, radius: 18, hp: 35, exploded: false },
  { id: 12, x: cx + 350, y: cy, radius: 18, hp: 35, exploded: false },
  { id: 13, x: cx, y: cy - 350, radius: 18, hp: 35, exploded: false },
  { id: 14, x: cx, y: cy + 350, radius: 18, hp: 35, exploded: false }
];

let barrels = JSON.parse(JSON.stringify(initialBarrels));

// Shared Wave State
const waveManager = {
  wave: 1,
  state: 'intermission', // 'intermission' | 'active' | 'cleared'
  timer: 3.0,
  enemiesToSpawn: 0,
  totalEnemiesInWave: 0,
  spawnInterval: 0.5,
  spawnTimer: 0
};

function startWave(waveNum) {
  waveManager.wave = waveNum;
  waveManager.state = 'intermission';
  waveManager.timer = 3.0;

  const count = 5 + waveNum * 3;
  waveManager.enemiesToSpawn = count;
  waveManager.totalEnemiesInWave = count;
  waveManager.spawnTimer = 0.5;

  io.emit('wave_start', {
    wave: waveManager.wave,
    totalEnemies: waveManager.totalEnemiesInWave,
    message: `HOSTILE WAVE ${waveNum} DETECTED`
  });
}

function spawnServerEnemy() {
  const roll = Math.random();
  let type = 'normal';
  let radius = 22, maxHp = 90, speed = 155, damage = 20, scoreValue = 100, color = '#00ff88', attackCooldown = 0.85, attackRange = 32;

  if (waveManager.wave >= 3 && roll < 0.22) {
    type = 'tank';
    radius = 34; maxHp = 350; speed = 85; damage = 38; scoreValue = 400; color = '#ff3366'; attackCooldown = 1.2; attackRange = 46;
  } else if (waveManager.wave >= 2 && roll < 0.55) {
    type = 'fast';
    radius = 16; maxHp = 45; speed = 240; damage = 12; scoreValue = 150; color = '#00f0ff'; attackCooldown = 0.6; attackRange = 26;
  }

  // Pick random alive player as anchor to spawn around
  const alivePlayers = Object.values(players).filter(p => p.alive);
  const anchor = alivePlayers.length > 0
    ? alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    : { x: cx, y: cy };

  let spawnX, spawnY;
  let attempts = 0;
  const minD = 550, maxD = 1100;

  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = minD + Math.random() * (maxD - minD);
    spawnX = anchor.x + Math.cos(angle) * dist;
    spawnY = anchor.y + Math.sin(angle) * dist;
    attempts++;
  } while (
    attempts < 25 &&
    (spawnX < 80 || spawnX > MAP_WIDTH - 80 || spawnY < 80 || spawnY > MAP_HEIGHT - 80 || isCollidingWithMap(spawnX, spawnY, radius + 10))
  );

  const enemyId = `e_${nextEnemyId++}`;
  enemies[enemyId] = {
    id: enemyId,
    type,
    x: Math.round(spawnX),
    y: Math.round(spawnY),
    angle: 0,
    radius,
    maxHp,
    hp: maxHp,
    speed,
    damage,
    scoreValue,
    color,
    attackCooldown,
    attackRange,
    attackTimer: 0
  };

  waveManager.enemiesToSpawn--;

  io.emit('enemy_spawned', {
    enemy: enemies[enemyId]
  });
}

function triggerBarrelExplosion(barrel, triggererName = 'Explosion') {
  if (barrel.exploded) return;
  barrel.exploded = true;
  barrel.hp = 0;

  const blastRadius = 170;
  const maxDamage = 140;

  io.emit('barrel_exploded', {
    id: barrel.id,
    x: barrel.x,
    y: barrel.y,
    blastRadius
  });

  // Damage enemies in blast radius
  for (const enemyId in enemies) {
    const e = enemies[enemyId];
    const dist = Math.hypot(e.x - barrel.x, e.y - barrel.y);
    if (dist < blastRadius) {
      const dmg = Math.round(maxDamage * (1 - dist / blastRadius));
      e.hp -= dmg;
      if (e.hp <= 0) {
        delete enemies[enemyId];
        io.emit('enemy_killed', {
          enemyId,
          killerId: null,
          killerName: 'Barrel Blast',
          score: e.scoreValue,
          enemyType: e.type
        });
      } else {
        io.emit('enemy_damaged', {
          enemyId,
          damage: dmg,
          hp: e.hp,
          isCritical: true
        });
      }
    }
  }

  // Damage players in blast radius
  for (const socketId in players) {
    const p = players[socketId];
    if (!p.alive || p.invulnerableTimer > 0) continue;
    const dist = Math.hypot(p.x - barrel.x, p.y - barrel.y);
    if (dist < blastRadius) {
      const dmg = Math.round(maxDamage * 0.75 * (1 - dist / blastRadius));
      p.hp -= dmg;
      if (p.hp <= 0) {
        p.hp = 0;
        p.alive = false;
        p.deaths++;
        schedulePlayerRespawn(p);

        io.emit('player_eliminated', {
          victimId: p.id,
          victimName: p.name,
          victimColor: p.color,
          killerName: 'Barrel Blast',
          killerColor: '#ff5500',
          isPvP: false
        });
      } else {
        io.to(p.id).emit('player_damaged', {
          damage: dmg,
          hp: p.hp,
          attackerName: 'Barrel Blast'
        });
      }
    }
  }
}

function schedulePlayerRespawn(player) {
  const RESPAWN_TIME = 4.0;
  player.respawnTimer = RESPAWN_TIME;

  io.to(player.id).emit('respawn_countdown', {
    seconds: RESPAWN_TIME
  });

  setTimeout(() => {
    if (!players[player.id]) return; // Player disconnected in meantime
    const spawn = getRandomSpawnPoint();
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = player.maxHp;
    player.alive = true;
    player.respawnTimer = 0;
    player.invulnerableTimer = 2.5; // 2.5s shield grace

    io.emit('player_respawned', {
      id: player.id,
      name: player.name,
      color: player.color,
      x: player.x,
      y: player.y,
      hp: player.hp,
      invulnerableTimer: 2.5
    });

    io.emit('kill_feed_msg', {
      text: `${player.name} REDEPLOYED // SHIELD ACTIVE`,
      type: 'info'
    });
  }, RESPAWN_TIME * 1000);
}

// --- SOCKET.IO CONNECTION HANDLING ---
io.on('connection', (socket) => {
  console.log(`[CONNECT] Operative connected: ${socket.id}`);

  // Auto assign color and callsign
  const colorIndex = Object.keys(players).length % OPERATIVE_COLORS.length;
  const defaultColor = OPERATIVE_COLORS[colorIndex];
  const defaultName = `OPERATIVE-${socket.id.substring(0, 4).toUpperCase()}`;

  // 1. Send initialization data to the new client
  socket.emit('init_data', {
    yourId: socket.id,
    serverIp: primaryLanIp,
    port: PORT,
    allIps: networkIps,
    players: Object.values(players),
    enemies: Object.values(enemies),
    barrels,
    waveInfo: {
      wave: waveManager.wave,
      state: waveManager.state,
      timer: waveManager.timer,
      totalEnemies: waveManager.totalEnemiesInWave,
      enemiesLeft: Object.keys(enemies).length + waveManager.enemiesToSpawn
    }
  });

  // 2. Client joins active game
  socket.on('join_game', (data) => {
    const spawn = getRandomSpawnPoint();
    const name = (data && data.name && data.name.trim().length > 0)
      ? data.name.trim().substring(0, 16)
      : defaultName;
    const color = (data && data.color) ? data.color : defaultColor;

    const newPlayer = {
      id: socket.id,
      name,
      color,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: 100,
      maxHp: 100,
      score: 0,
      kills: 0,
      deaths: 0,
      alive: true,
      invulnerableTimer: 2.0,
      isDashing: false,
      isReloading: false,
      isMoving: false,
      walkCycle: 0,
      recoilOffset: 0,
      ping: 0,
      lastUpdate: Date.now()
    };

    players[socket.id] = newPlayer;

    // Acknowledge to joined player
    socket.emit('joined_successfully', {
      player: newPlayer
    });

    // Broadcast to other players
    socket.broadcast.emit('player_joined', {
      player: newPlayer
    });

    // Killfeed notification
    io.emit('kill_feed_msg', {
      text: `${name} DEPLOYED TO SECTOR`,
      type: 'join',
      color: newPlayer.color
    });

    console.log(`[JOIN] ${name} (${socket.id}) entered battle. Total: ${Object.keys(players).length}`);
  });

  // 3. High-frequency Player Input / Position Update
  socket.on('player_update', (data) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;

    p.x = data.x;
    p.y = data.y;
    p.vx = data.vx || 0;
    p.vy = data.vy || 0;
    p.angle = data.angle || 0;
    p.isDashing = !!data.isDashing;
    p.isReloading = !!data.isReloading;
    p.isMoving = !!data.isMoving;
    p.walkCycle = data.walkCycle || 0;
    p.recoilOffset = data.recoilOffset || 0;
    p.lastUpdate = Date.now();
  });

  // 4. Player Shoot Event (Broadcast to all clients for instant local rendering)
  socket.on('player_shoot', (data) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;

    // Relay to other players
    socket.broadcast.emit('remote_shoot', {
      shooterId: socket.id,
      x: data.x,
      y: data.y,
      angle: data.angle,
      isCritical: !!data.isCritical,
      damage: data.damage || 28
    });
  });

  // 5. PvE Hit: Bullet hit an enemy
  socket.on('hit_enemy', (data) => {
    const enemy = enemies[data.enemyId];
    const shooter = players[socket.id];
    if (!enemy || !shooter) return;

    const damage = data.damage || 28;
    enemy.hp -= damage;

    if (enemy.hp <= 0) {
      // Enemy eliminated!
      delete enemies[data.enemyId];
      shooter.kills++;
      shooter.score += enemy.scoreValue;

      io.emit('enemy_killed', {
        enemyId: data.enemyId,
        killerId: socket.id,
        killerName: shooter.name,
        killerColor: shooter.color,
        score: enemy.scoreValue,
        enemyType: enemy.type
      });

      io.emit('kill_feed_msg', {
        killer: shooter.name,
        killerColor: shooter.color,
        victim: `${enemy.type.toUpperCase()} CYBORG`,
        type: 'pve',
        score: enemy.scoreValue
      });
    } else {
      io.emit('enemy_damaged', {
        enemyId: data.enemyId,
        damage,
        hp: enemy.hp,
        isCritical: !!data.isCritical,
        x: data.x,
        y: data.y
      });
    }
  });

  // 6. PvP Hit: Bullet hit another player (Friendly Fire / PvP)
  socket.on('hit_player', (data) => {
    const shooter = players[socket.id];
    const target = players[data.targetId];

    if (!shooter || !target || !target.alive || socket.id === data.targetId) return;
    if (target.invulnerableTimer > 0) return; // Spawn / dash invulnerability

    const damage = data.damage || 28;
    target.hp -= damage;

    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      target.deaths++;
      shooter.kills++;
      shooter.score += 500; // 500 points for PvP elimination

      // Schedule respawn
      schedulePlayerRespawn(target);

      io.emit('player_eliminated', {
        killerId: shooter.id,
        killerName: shooter.name,
        killerColor: shooter.color,
        victimId: target.id,
        victimName: target.name,
        victimColor: target.color,
        isPvP: true
      });

      io.emit('kill_feed_msg', {
        killer: shooter.name,
        killerColor: shooter.color,
        victim: target.name,
        victimColor: target.color,
        type: 'pvp'
      });
    } else {
      // Notify target and all players
      io.to(target.id).emit('player_damaged', {
        damage,
        hp: target.hp,
        attackerId: shooter.id,
        attackerName: shooter.name
      });

      io.emit('player_hit_fx', {
        targetId: target.id,
        damage,
        hp: target.hp,
        x: data.x || target.x,
        y: data.y || target.y,
        isCritical: !!data.isCritical
      });
    }
  });

  // 7. Hit Barrel
  socket.on('hit_barrel', (data) => {
    const barrel = barrels.find(b => b.id === data.barrelId);
    if (!barrel || barrel.exploded) return;

    barrel.hp -= (data.damage || 28);
    if (barrel.hp <= 0) {
      const shooter = players[socket.id];
      triggerBarrelExplosion(barrel, shooter ? shooter.name : 'Unknown');
    }
  });

  // 8. In-Game Tactical Text Chat
  socket.on('send_chat', (data) => {
    const p = players[socket.id];
    if (!p || !data || !data.message) return;

    const cleanMsg = data.message.trim().substring(0, 100);
    if (cleanMsg.length === 0) return;

    io.emit('chat_message', {
      senderId: socket.id,
      senderName: p.name,
      senderColor: p.color,
      text: cleanMsg,
      timestamp: Date.now()
    });
  });

  // 9. Latency / Ping Check
  socket.on('ping_check', (timestamp) => {
    socket.emit('pong_reply', timestamp);
  });

  // 10. Disconnect
  socket.on('disconnect', () => {
    const p = players[socket.id];
    if (p) {
      console.log(`[DISCONNECT] ${p.name} left`);
      io.emit('player_left', {
        id: socket.id,
        name: p.name
      });
      io.emit('kill_feed_msg', {
        text: `${p.name} WITHDREW FROM COMBAT`,
        type: 'leave'
      });
      delete players[socket.id];
    }
  });
});

// --- SERVER TICK LOOP (30 FPS) ---
const TICK_RATE = 30;
const DT = 1 / TICK_RATE;

setInterval(() => {
  const alivePlayers = Object.values(players).filter(p => p.alive);

  // 1. Decrement Player invulnerability timers
  for (const socketId in players) {
    const p = players[socketId];
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer = Math.max(0, p.invulnerableTimer - DT);
    }
  }

  // 2. Wave Progression & Spawning
  if (alivePlayers.length > 0) {
    if (waveManager.state === 'intermission') {
      waveManager.timer -= DT;
      if (waveManager.timer <= 0) {
        waveManager.state = 'active';
        io.emit('wave_state_changed', { state: 'active', wave: waveManager.wave });
      }
    } else if (waveManager.state === 'active') {
      if (waveManager.enemiesToSpawn > 0) {
        waveManager.spawnTimer -= DT;
        if (waveManager.spawnTimer <= 0) {
          spawnServerEnemy();
          waveManager.spawnTimer = 0.45 + Math.random() * 0.4;
        }
      } else if (Object.keys(enemies).length === 0) {
        // Wave Cleared!
        waveManager.state = 'cleared';
        io.emit('wave_cleared', {
          wave: waveManager.wave,
          bonus: 1000
        });

        // Reward all alive players with bonus points and health
        for (const p of alivePlayers) {
          p.score += 1000;
          p.hp = Math.min(p.maxHp, p.hp + 35);
        }

        io.emit('kill_feed_msg', {
          text: `SECTOR CLEARED // WAVE ${waveManager.wave} COMPLETE (+1,000 BONUS)`,
          type: 'wave'
        });

        // Next Wave in 4 seconds
        setTimeout(() => {
          startWave(waveManager.wave + 1);
        }, 4000);
      }
    }
  }

  // 3. Enemy AI & Movement (Target closest alive player)
  for (const enemyId in enemies) {
    const enemy = enemies[enemyId];
    if (enemy.attackTimer > 0) enemy.attackTimer -= DT;

    if (alivePlayers.length > 0) {
      // Find closest alive player
      let closestP = null;
      let minDistance = Infinity;

      for (const p of alivePlayers) {
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (d < minDistance) {
          minDistance = d;
          closestP = p;
        }
      }

      if (closestP) {
        const dx = closestP.x - enemy.x;
        const dy = closestP.y - enemy.y;
        let targetAngle = Math.atan2(dy, dx);

        // Simple obstacle probe ahead
        const probeDist = enemy.radius * 2.0;
        const probeX = enemy.x + Math.cos(targetAngle) * probeDist;
        const probeY = enemy.y + Math.sin(targetAngle) * probeDist;

        if (isCollidingWithMap(probeX, probeY, enemy.radius)) {
          const leftAngle = targetAngle - Math.PI / 3;
          const rightAngle = targetAngle + Math.PI / 3;
          if (!isCollidingWithMap(enemy.x + Math.cos(leftAngle) * probeDist, enemy.y + Math.sin(leftAngle) * probeDist, enemy.radius)) {
            targetAngle = leftAngle;
          } else if (!isCollidingWithMap(enemy.x + Math.cos(rightAngle) * probeDist, enemy.y + Math.sin(rightAngle) * probeDist, enemy.radius)) {
            targetAngle = rightAngle;
          } else {
            targetAngle += Math.PI / 2;
          }
        }

        enemy.angle = targetAngle;

        // Move towards target
        const stepX = Math.cos(enemy.angle) * enemy.speed * DT;
        const stepY = Math.sin(enemy.angle) * enemy.speed * DT;

        const nextX = enemy.x + stepX;
        const nextY = enemy.y + stepY;

        if (!isCollidingWithMap(nextX, nextY, enemy.radius)) {
          enemy.x = nextX;
          enemy.y = nextY;
        }

        // Melee Attack Check
        if (minDistance <= enemy.attackRange + closestP.radius && enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.attackCooldown;

          if (closestP.invulnerableTimer <= 0) {
            closestP.hp -= enemy.damage;

            if (closestP.hp <= 0) {
              closestP.hp = 0;
              closestP.alive = false;
              closestP.deaths++;
              schedulePlayerRespawn(closestP);

              io.emit('player_eliminated', {
                victimId: closestP.id,
                victimName: closestP.name,
                victimColor: closestP.color,
                killerName: `${enemy.type.toUpperCase()} CYBORG`,
                killerColor: enemy.color,
                isPvP: false
              });

              io.emit('kill_feed_msg', {
                killer: `${enemy.type.toUpperCase()} CYBORG`,
                killerColor: enemy.color,
                victim: closestP.name,
                victimColor: closestP.color,
                type: 'pve_death'
              });
            } else {
              io.to(closestP.id).emit('player_damaged', {
                damage: enemy.damage,
                hp: closestP.hp,
                attackerName: `${enemy.type.toUpperCase()} CYBORG`
              });

              io.emit('player_hit_fx', {
                targetId: closestP.id,
                damage: enemy.damage,
                hp: closestP.hp,
                x: closestP.x,
                y: closestP.y,
                isCritical: false
              });
            }
          }
        }
      }
    }
  }

  // 4. Broadcast Master Game State Snapshot
  io.emit('game_snapshot', {
    timestamp: Date.now(),
    players: Object.values(players).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      x: Math.round(p.x),
      y: Math.round(p.y),
      vx: Math.round(p.vx),
      vy: Math.round(p.vy),
      angle: Number(p.angle.toFixed(3)),
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      alive: p.alive,
      invulnerableTimer: Number((p.invulnerableTimer || 0).toFixed(2)),
      score: p.score,
      kills: p.kills,
      deaths: p.deaths,
      isDashing: p.isDashing,
      isReloading: p.isReloading,
      isMoving: p.isMoving,
      walkCycle: Number(p.walkCycle.toFixed(2)),
      recoilOffset: Number(p.recoilOffset.toFixed(1))
    })),
    enemies: Object.values(enemies).map(e => ({
      id: e.id,
      type: e.type,
      x: Math.round(e.x),
      y: Math.round(e.y),
      angle: Number(e.angle.toFixed(3)),
      hp: Math.round(e.hp),
      maxHp: e.maxHp,
      radius: e.radius,
      color: e.color
    })),
    wave: {
      wave: waveManager.wave,
      state: waveManager.state,
      enemiesLeft: Object.keys(enemies).length + waveManager.enemiesToSpawn
    }
  });
}, 1000 / TICK_RATE);

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(58));
  console.log('🎯 CYBER STRIKE // LAN & ONLINE MULTIPLAYER SERVER');
  console.log('='.repeat(58));
  console.log(`Local Access:        http://localhost:${PORT}`);
  console.log(`LAN Network Address: http://${primaryLanIp}:${PORT}`);
  if (networkIps.length > 1) {
    networkIps.slice(1).forEach(net => {
      console.log(`Alt LAN Interface:   http://${net.ip}:${PORT} (${net.interface})`);
    });
  }
  console.log('\n🚀 ALL PLAYERS ON THE SAME CABLE OR WI-FI CAN CONNECT!');
  console.log('='.repeat(58) + '\n');
});
