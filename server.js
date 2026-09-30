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

// Load modular map configurations
const { MAP_DEFINITIONS, MAP_WIDTH, MAP_HEIGHT } = require('./js/maps_data');
let currentMapId = 'sector_09';

function getActiveMap() {
  return MAP_DEFINITIONS[currentMapId] || MAP_DEFINITIONS.sector_09;
}

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

// --- MAP GEOMETRY (Driven by active map definition for server collision & enemy AI) ---
function isCollidingWithMap(x, y, radius = 20) {
  const map = getActiveMap();
  if (x < 50 + radius || x > map.width - 50 - radius || y < 50 + radius || y > map.height - 50 - radius) {
    return true;
  }
  for (const w of map.walls) {
    if (w.type === 'boundary') continue;
    const nearX = Math.max(w.x, Math.min(x, w.x + w.w));
    const nearY = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - nearX;
    const dy = y - nearY;
    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }
  for (const p of map.pillars) {
    const dx = x - p.x;
    const dy = y - p.y;
    const minD = radius + p.radius;
    if (dx * dx + dy * dy < minD * minD) {
      return true;
    }
  }
  return false;
}

function resolveCircleCollision(entity) {
  const map = getActiveMap();
  let collided = false;
  const r = entity.radius;

  // 1. Boundaries
  const pad = 52 + r;
  if (entity.x < pad) { entity.x = pad; collided = true; }
  if (entity.x > map.width - pad) { entity.x = map.width - pad; collided = true; }
  if (entity.y < pad) { entity.y = pad; collided = true; }
  if (entity.y > map.height - pad) { entity.y = map.height - pad; collided = true; }

  // 2. Rectangular Walls
  for (const wall of map.walls) {
    if (wall.type === 'boundary') continue;
    const nearestX = Math.max(wall.x, Math.min(entity.x, wall.x + wall.w));
    const nearestY = Math.max(wall.y, Math.min(entity.y, wall.y + wall.h));
    const dx = entity.x - nearestX;
    const dy = entity.y - nearestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < r * r) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist === 0) {
        entity.x = wall.x - r;
      } else {
        const overlap = r - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }
  }

  // 3. Pillars
  for (const pillar of map.pillars) {
    const dx = entity.x - pillar.x;
    const dy = entity.y - pillar.y;
    const minDist = r + pillar.radius;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDist * minDist) {
      collided = true;
      const dist = Math.sqrt(distSq) || 1;
      const overlap = minDist - dist;
      entity.x += (dx / dist) * overlap;
      entity.y += (dy / dist) * overlap;
    }
  }

  return collided;
}

// Tactical Spawn Points for Operatives
function getRandomSpawnPoint() {
  const map = getActiveMap();
  const spawn = map.spawnPoint || { x: 1200, y: 1200 };
  return {
    x: spawn.x + (Math.random() - 0.5) * 120,
    y: spawn.y + (Math.random() - 0.5) * 120
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

// Multiplayer Lobby & Team Battle State
const lobbyState = {
  mode: 'teams', // 'teams' | 'ffa'
  hostId: null,
  mapId: 'sector_09',
  gameStarted: false,
  alphaColor: '#00f0ff',
  betaColor: '#ff3366',
  players: {}, // [socketId]: { id, name, team: 'alpha'|'beta'|'solo', color, isHost, modelType }
  lockedColors: {} // [color]: socketId
};

function broadcastLobbySync() {
  io.emit('lobby_sync', {
    mode: lobbyState.mode,
    hostId: lobbyState.hostId,
    mapId: lobbyState.mapId || currentMapId,
    gameStarted: lobbyState.gameStarted,
    alphaColor: lobbyState.alphaColor,
    betaColor: lobbyState.betaColor,
    lockedColors: Object.keys(lobbyState.lockedColors),
    players: Object.values(lobbyState.players)
  });
}

// Barrel States Generator
function getInitialBarrelsForMap(mapId) {
  const map = MAP_DEFINITIONS[mapId] || MAP_DEFINITIONS.sector_09;
  return (map.barrels || []).map((b, idx) => ({
    id: idx + 1,
    x: b.x,
    y: b.y,
    radius: 18,
    hp: 35,
    exploded: false
  }));
}

let barrels = getInitialBarrelsForMap(currentMapId);

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

// Tactical Health Pack (Medkit) System - Spawns every 5 seconds
let nextMedkitId = 1;
const medkits = {}; // { [id]: { id, x, y, heal: 50 } }
let medkitTimer = 0;
const MEDKIT_SPAWN_INTERVAL = 5.0; // 5 seconds
const MAX_SERVER_MEDKITS = 8;

function spawnServerMedkit() {
  const map = getActiveMap();
  let spawnX, spawnY;
  let attempts = 0;
  const pad = 120;
  do {
    spawnX = pad + Math.random() * (map.width - pad * 2);
    spawnY = pad + Math.random() * (map.height - pad * 2);
    attempts++;
  } while (attempts < 30 && isCollidingWithMap(spawnX, spawnY, 35));

  const medkitId = `med_${nextMedkitId++}`;
  const medkit = {
    id: medkitId,
    x: Math.round(spawnX),
    y: Math.round(spawnY),
    heal: 50
  };
  medkits[medkitId] = medkit;

  io.emit('medkit_spawned', medkit);
}

function startWave(waveNum) {
  waveManager.wave = waveNum;
  waveManager.state = 'intermission';
  waveManager.timer = 3.0;

  // Total enemies: Wave 1 starts with exactly 20 hostiles, scaling exponentially per wave
  const count = 20 + (waveNum - 1) * 8 + Math.floor((waveNum - 1) * (waveNum - 1) * 1.5);
  waveManager.enemiesToSpawn = count;
  waveManager.totalEnemiesInWave = count;
  waveManager.spawnTimer = 0.1; // initial spawn batch right when wave activates

  io.emit('wave_start', {
    wave: waveManager.wave,
    totalEnemies: waveManager.totalEnemiesInWave,
    message: `HOSTILE WAVE ${waveNum}`
  });
}

function spawnServerEnemy() {
  const roll = Math.random();
  let type = 'normal';
  let radius = 22, maxHp = 90, speed = 155, damage = 20, scoreValue = 100, color = '#00ff88', attackCooldown = 0.85, attackRange = 48;

  // Blue enemies (fast, shielded) completely removed!
  // Vast majority are standard green grunts and agile bombers, few snipers, and rare red tanks.
  if (waveManager.wave === 1) {
    if (roll < 0.85) {
      type = 'normal';
    } else {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    }
  } else if (waveManager.wave === 2) {
    if (roll < 0.70) {
      type = 'normal';
    } else if (roll < 0.90) {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    } else {
      type = 'sniper';
      radius = 20; maxHp = 75; speed = 115; damage = 28; scoreValue = 300; color = '#b026ff'; attackCooldown = 1.0; attackRange = 40;
    }
  } else if (waveManager.wave === 3) {
    if (roll < 0.60) {
      type = 'normal';
    } else if (roll < 0.80) {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    } else if (roll < 0.94) {
      type = 'sniper';
      radius = 20; maxHp = 75; speed = 115; damage = 28; scoreValue = 300; color = '#b026ff'; attackCooldown = 1.0; attackRange = 40;
    } else {
      type = 'tank'; // rare
      radius = 34; maxHp = 350; speed = 85; damage = 38; scoreValue = 400; color = '#ff3366'; attackCooldown = 1.2; attackRange = 60;
    }
  } else { // Wave 4+
    if (roll < 0.50) {
      type = 'normal';
    } else if (roll < 0.75) {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    } else if (roll < 0.90) {
      type = 'sniper';
      radius = 20; maxHp = 75; speed = 115; damage = 28; scoreValue = 300; color = '#b026ff'; attackCooldown = 1.0; attackRange = 40;
    } else {
      type = 'tank'; // rare big enemy
      radius = 34; maxHp = 350; speed = 85; damage = 38; scoreValue = 400; color = '#ff3366'; attackCooldown = 1.2; attackRange = 60;
    }
  }

  // Pick random alive player as anchor to spawn around
  const alivePlayers = Object.values(players).filter(p => p.alive);
  const anchor = alivePlayers.length > 0
    ? alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    : { x: 1200, y: 1200 };

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
    attackTimer: 0,
    spitCooldown: 3.2,
    spitTimer: 1.5 + Math.random() * 2.0,
    spitWindupTimer: 0
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

  // Assign or retain Room Host
  if (!lobbyState.hostId) {
    lobbyState.hostId = socket.id;
  }

  // Auto assign color and callsign
  const defaultName = `OPERATIVE-${socket.id.substring(0, 4).toUpperCase()}`;
  let assignedColor = OPERATIVE_COLORS.find(c => !lobbyState.lockedColors[c]) || OPERATIVE_COLORS[0];
  lobbyState.lockedColors[assignedColor] = socket.id;

  // Auto-balance team
  const alphaCount = Object.values(lobbyState.players).filter(p => p.team === 'alpha').length;
  const betaCount = Object.values(lobbyState.players).filter(p => p.team === 'beta').length;
  const assignedTeam = alphaCount <= betaCount ? 'alpha' : 'beta';

  const playerColor = lobbyState.mode === 'teams'
    ? (assignedTeam === 'alpha' ? lobbyState.alphaColor : lobbyState.betaColor)
    : assignedColor;

  lobbyState.players[socket.id] = {
    id: socket.id,
    name: defaultName,
    team: assignedTeam,
    color: playerColor,
    isHost: socket.id === lobbyState.hostId
  };

  // 1. Send initialization data to the new client
  socket.emit('init_data', {
    yourId: socket.id,
    serverIp: primaryLanIp,
    port: PORT,
    allIps: networkIps,
    players: Object.values(players),
    enemies: Object.values(enemies),
    barrels,
    medkits: Object.values(medkits),
    lobby: {
      mode: lobbyState.mode,
      hostId: lobbyState.hostId,
      alphaColor: lobbyState.alphaColor,
      betaColor: lobbyState.betaColor,
      lockedColors: Object.keys(lobbyState.lockedColors),
      players: Object.values(lobbyState.players)
    },
    waveInfo: {
      wave: waveManager.wave,
      state: waveManager.state,
      timer: waveManager.timer,
      totalEnemies: waveManager.totalEnemiesInWave,
      enemiesLeft: Object.keys(enemies).length + waveManager.enemiesToSpawn
    }
  });

  broadcastLobbySync();

  // Lobby: Update Operative Callsign
  socket.on('lobby_update_name', (data) => {
    const lp = lobbyState.players[socket.id];
    if (lp && data && data.name) {
      lp.name = data.name.trim().substring(0, 16);
      broadcastLobbySync();
    }
  });

  // Lobby: Host updates Mode (Teams vs FFA)
  socket.on('lobby_set_mode', (data) => {
    if (socket.id !== lobbyState.hostId) return;
    if (data && (data.mode === 'teams' || data.mode === 'ffa')) {
      lobbyState.mode = data.mode;
      for (const pid in lobbyState.players) {
        const lp = lobbyState.players[pid];
        if (lobbyState.mode === 'teams') {
          lp.color = lp.team === 'alpha' ? lobbyState.alphaColor : lobbyState.betaColor;
        } else {
          for (const col in lobbyState.lockedColors) {
            if (lobbyState.lockedColors[col] === pid) {
              lp.color = col;
              break;
            }
          }
        }
        if (players[pid]) {
          players[pid].color = lp.color;
        }
      }
      broadcastLobbySync();
    }
  });

  // Lobby: Host sets Team Color (Alpha or Beta)
  socket.on('lobby_set_team_color', (data) => {
    if (socket.id !== lobbyState.hostId) return;
    if (!data || !data.team || !data.color) return;
    if (data.team === 'alpha') {
      lobbyState.alphaColor = data.color;
    } else if (data.team === 'beta') {
      lobbyState.betaColor = data.color;
    }
    for (const pid in lobbyState.players) {
      const lp = lobbyState.players[pid];
      if (lp.team === data.team) {
        lp.color = data.color;
        if (players[pid]) players[pid].color = data.color;
      }
    }
    broadcastLobbySync();
  });

  // Lobby: Leader sets Battlefield Map
  socket.on('lobby_set_map', (data) => {
    if (socket.id !== lobbyState.hostId) return;
    if (data && data.mapId && MAP_DEFINITIONS[data.mapId]) {
      currentMapId = data.mapId;
      lobbyState.mapId = data.mapId;
      barrels = getInitialBarrelsForMap(currentMapId);
      io.emit('map_sync', { mapId: currentMapId });
      broadcastLobbySync();
    }
  });

  // Lobby: Leader starts the match for all operatives in the squad
  socket.on('leader_start_game', (data) => {
    if (socket.id !== lobbyState.hostId) return;
    lobbyState.gameStarted = true;
    io.emit('game_start_signal', {
      mapId: currentMapId,
      mode: lobbyState.mode
    });
    broadcastLobbySync();
  });

  // Lobby: Player Joins a Team
  socket.on('lobby_join_team', (data) => {
    const lp = lobbyState.players[socket.id];
    if (lp && data && (data.team === 'alpha' || data.team === 'beta')) {
      lp.team = data.team;
      lp.color = data.team === 'alpha' ? lobbyState.alphaColor : lobbyState.betaColor;
      if (players[socket.id]) {
        players[socket.id].team = lp.team;
        players[socket.id].color = lp.color;
      }
      broadcastLobbySync();

      // If game is already active, immediately notify client to drop into the battle
      if (lobbyState.gameStarted && !players[socket.id]) {
        socket.emit('game_start_signal', {
          mapId: currentMapId,
          mode: lobbyState.mode,
          autoDeploy: true
        });
      }
    }
  });

  // Lobby: Player selects individual color in FFA mode
  socket.on('lobby_select_color', (data) => {
    const lp = lobbyState.players[socket.id];
    if (lp && data && data.color) {
      if (lobbyState.lockedColors[data.color] && lobbyState.lockedColors[data.color] !== socket.id) {
        socket.emit('color_lock_rejected', { color: data.color });
        return;
      }
      for (const col in lobbyState.lockedColors) {
        if (lobbyState.lockedColors[col] === socket.id) {
          delete lobbyState.lockedColors[col];
        }
      }
      lobbyState.lockedColors[data.color] = socket.id;
      lp.color = data.color;
      if (players[socket.id]) {
        players[socket.id].color = data.color;
      }
      broadcastLobbySync();
    }
  });

  // 2. Client joins active game
  socket.on('join_game', (data) => {
    const spawn = getRandomSpawnPoint();
    const lp = lobbyState.players[socket.id];
    const name = (data && data.name && data.name.trim().length > 0)
      ? data.name.trim().substring(0, 16)
      : (lp ? lp.name : defaultName);

    if (lp) lp.name = name;

    const team = (lobbyState.mode === 'teams' && lp) ? lp.team : 'solo';
    const color = (lobbyState.mode === 'teams' && lp)
      ? (lp.team === 'alpha' ? lobbyState.alphaColor : lobbyState.betaColor)
      : (lp ? lp.color : assignedColor);

    // Push pre-existing enemies away from spawn point so joining player is safe
    for (const eid in enemies) {
      const e = enemies[eid];
      const d = Math.hypot(e.x - spawn.x, e.y - spawn.y);
      if (d < 500) {
        const angle = Math.atan2(e.y - spawn.y, e.x - spawn.x) || Math.random() * Math.PI * 2;
        e.x = spawn.x + Math.cos(angle) * 650;
        e.y = spawn.y + Math.sin(angle) * 650;
        resolveCircleCollision(e);
      }
    }

    const newPlayer = {
      id: socket.id,
      name,
      team,
      color,
      skinId: (data && data.skinId) ? data.skinId : 'spectre',
      modelType: (data && (data.modelType || data.skinModel)) ? (data.modelType || data.skinModel) : 'commando',
      weapon: (data && data.weapon) ? data.weapon : 'rifle',
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
      invulnerableTimer: 2.5,
      isDashing: false,
      isReloading: false,
      isMoving: false,
      walkCycle: 0,
      recoilOffset: 0,
      ping: 0,
      lastUpdate: Date.now()
    };

    // If a specific map is requested and no other players are active, set map
    if (data && data.mapId && MAP_DEFINITIONS[data.mapId]) {
      if (Object.keys(players).length === 0) {
        currentMapId = data.mapId;
        barrels = getInitialBarrelsForMap(currentMapId);
        io.emit('map_sync', { mapId: currentMapId });
      }
    }

    players[socket.id] = newPlayer;

    // Start wave 1 if no active wave running on server
    if (waveManager.enemiesToSpawn === 0 && Object.keys(enemies).length === 0) {
      startWave(1);
    }

    // Acknowledge to joined player with current map
    socket.emit('joined_successfully', {
      player: newPlayer,
      mapId: currentMapId
    });

    // Broadcast to other players
    socket.broadcast.emit('player_joined', {
      player: newPlayer
    });

    // Killfeed notification
    io.emit('kill_feed_msg', {
      text: `${name} DEPLOYED TO SECTOR [${team.toUpperCase()}]`,
      type: 'join',
      color: newPlayer.color
    });

    console.log(`[JOIN] ${name} (${socket.id}) entered battle on map [${currentMapId}] Team: ${team}. Total: ${Object.keys(players).length}`);
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
    p.weapon = data.weapon || p.weapon || 'rifle';
    p.lastUpdate = Date.now();
  });

  // 4. Player Shoot Event (Broadcast to all clients for instant local rendering)
  socket.on('player_shoot', (data) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;

    const bulletColor = data.color || p.color || '#00f0ff';

    // Relay to other players with complete weapon & bullet physics
    socket.broadcast.emit('remote_shoot', {
      shooterId: socket.id,
      x: data.x,
      y: data.y,
      angle: data.angle,
      isCritical: !!data.isCritical,
      damage: data.damage || 28,
      color: bulletColor,
      weaponType: data.weaponType || p.weapon || 'rifle',
      speed: data.speed,
      range: data.range,
      radius: data.radius,
      penetrating: !!data.penetrating,
      explosive: !!data.explosive,
      splashDamage: data.splashDamage,
      blastRadius: data.blastRadius
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

    // Teammate friendly fire protection in Team Battle mode
    if (lobbyState.mode === 'teams' && shooter.team && target.team && shooter.team === target.team) {
      return;
    }

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

  // 6.5. Player Self-Elimination / Environmental Death
  socket.on('player_died', (data) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;

    p.hp = 0;
    p.alive = false;
    p.deaths++;

    schedulePlayerRespawn(p);

    io.emit('player_eliminated', {
      killerId: p.id,
      killerName: p.name,
      killerColor: p.color,
      victimId: p.id,
      victimName: p.name,
      victimColor: p.color,
      isSelf: true
    });

    io.emit('kill_feed_msg', {
      killer: p.name,
      killerColor: p.color,
      victim: (data && data.reason) ? data.reason : 'SELF (CRITICAL CASUALTY)',
      type: 'pvp_death',
      isSelf: true
    });
  });

  // 6.8. Pickup Medkit (+50 HP)
  socket.on('pickup_medkit', (data) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;
    const medkit = medkits[data.id];
    if (!medkit) return;

    const dx = p.x - medkit.x;
    const dy = p.y - medkit.y;
    if (dx * dx + dy * dy <= 60 * 60) {
      delete medkits[data.id];
      const healAmount = Math.max(1, Math.round(p.maxHp * 0.25));
      p.hp = Math.min(p.maxHp, p.hp + healAmount);
      io.emit('medkit_collected', {
        id: data.id,
        collectorId: socket.id,
        collectorName: p.name,
        hp: p.hp,
        x: medkit.x,
        y: medkit.y
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
    // Clean up from lobby
    delete lobbyState.players[socket.id];
    for (const col in lobbyState.lockedColors) {
      if (lobbyState.lockedColors[col] === socket.id) {
        delete lobbyState.lockedColors[col];
      }
    }
    if (lobbyState.hostId === socket.id) {
      const remaining = Object.keys(lobbyState.players);
      lobbyState.hostId = remaining.length > 0 ? remaining[0] : null;
      if (lobbyState.hostId && lobbyState.players[lobbyState.hostId]) {
        lobbyState.players[lobbyState.hostId].isHost = true;
      }
    }
    broadcastLobbySync();

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

    // Clean reset if room is completely empty
    if (Object.keys(players).length === 0) {
      for (const eid in enemies) delete enemies[eid];
      for (const mid in medkits) delete medkits[mid];
      waveManager.wave = 1;
      waveManager.state = 'intermission';
      waveManager.timer = 3.0;
      waveManager.enemiesToSpawn = 0;
      waveManager.totalEnemiesInWave = 0;
      barrels = getInitialBarrelsForMap(currentMapId);
      console.log('[RESET] All operatives disconnected. Sector restored to initial Wave 1.');
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
    // 2.1 Medkit Spawn Timer (Every 5 seconds)
    medkitTimer += DT;
    if (medkitTimer >= MEDKIT_SPAWN_INTERVAL) {
      medkitTimer = 0;
      if (Object.keys(medkits).length < MAX_SERVER_MEDKITS) {
        spawnServerMedkit();
      }
    }

    if (waveManager.state === 'intermission') {
      waveManager.timer -= DT;
      if (waveManager.timer <= 0) {
        waveManager.state = 'active';
        io.emit('wave_state_changed', { state: 'active', wave: waveManager.wave });
      }
    } else if (waveManager.state === 'active') {
      // Spawn pending wave enemies in staggered batches
      if (waveManager.enemiesToSpawn > 0) {
        waveManager.spawnTimer -= DT;
        // If all enemies on the field are eliminated, immediately flush next batch!
        if (Object.keys(enemies).length === 0) {
          waveManager.spawnTimer = 0;
        }
        if (waveManager.spawnTimer <= 0) {
          const batchSize = Math.min(waveManager.enemiesToSpawn, Math.max(3, Math.floor(3 + waveManager.wave * 0.7)));
          for (let b = 0; b < batchSize; b++) {
            spawnServerEnemy();
          }
          const interval = Math.max(2.0, 4.2 - waveManager.wave * 0.35);
          waveManager.spawnTimer = interval;
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
        const curDist = Math.hypot(dx, dy);
        const minDistanceToPlayer = enemy.radius + 20; // 20 is player radius

        // 1. 5-Second Stuck Detection: If stalled in one spot for 5s against a wall, force a detour
        enemy.stuckCheckTimer = (enemy.stuckCheckTimer || 0) + DT;
        if (enemy.detourTimer > 0) enemy.detourTimer -= DT;

        // Reset detour when arriving near player so enemy directly engages without circling
        if (curDist <= minDistanceToPlayer + 25) {
          enemy.detourTimer = 0;
          enemy.stuckAccumTime = 0;
        }

        if (enemy.stuckCheckTimer >= 0.5) {
          const distMoved = Math.hypot(enemy.x - (enemy.lastCheckX || enemy.x), enemy.y - (enemy.lastCheckY || enemy.y));
          enemy.lastCheckX = enemy.x;
          enemy.lastCheckY = enemy.y;
          enemy.stuckCheckTimer = 0;

          // Only accumulate stuck time if barely moved (< 12px in 0.5s) and far from player
          if (distMoved < 12 && curDist > minDistanceToPlayer + 35) {
            enemy.stuckAccumTime = (enemy.stuckAccumTime || 0) + 0.5;
            if (enemy.stuckAccumTime >= 5.0) { // Exactly 5 seconds threshold
              enemy.detourTimer = 1.8;
              enemy.detourSign = Math.random() < 0.5 ? 1 : -1;
              enemy.stuckAccumTime = 0;
            }
          } else {
            enemy.stuckAccumTime = Math.max(0, (enemy.stuckAccumTime || 0) - 0.5);
          }
        }

        // 2. Obstacle Avoidance & Steering Feelers (Only when blocked by a wall)
        const probeDist = Math.min(curDist, enemy.radius * 2.2);
        const probeX = enemy.x + Math.cos(targetAngle) * probeDist;
        const probeY = enemy.y + Math.sin(targetAngle) * probeDist;
        const pathBlocked = isCollidingWithMap(probeX, probeY, enemy.radius);

        if ((pathBlocked || enemy.detourTimer > 0) && curDist > minDistanceToPlayer + 20) {
          const detourSign = enemy.detourSign || 1;
          const offsets = [
            detourSign * (Math.PI / 4),
            detourSign * (Math.PI / 2),
            -detourSign * (Math.PI / 4),
            -detourSign * (Math.PI / 2),
            detourSign * (Math.PI * 0.75),
            -detourSign * (Math.PI * 0.75)
          ];

          for (const off of offsets) {
            const testA = targetAngle + off;
            const tx = enemy.x + Math.cos(testA) * probeDist;
            const ty = enemy.y + Math.sin(testA) * probeDist;

            if (!isCollidingWithMap(tx, ty, enemy.radius)) {
              targetAngle = testA;
              break;
            }
          }
        }

        // Smooth rotation towards target (eliminates jittery direction changes)
        let angleDiff = targetAngle - enemy.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        enemy.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 9.0 * DT);

        // Move towards target
        let stepX = Math.cos(enemy.angle) * enemy.speed * DT;
        let stepY = Math.sin(enemy.angle) * enemy.speed * DT;

        // Stop forward velocity into player when already touching player's body
        if (curDist <= minDistanceToPlayer + 4 && curDist > 0.001) {
          const toPx = (closestP.x - enemy.x) / curDist;
          const toPy = (closestP.y - enemy.y) / curDist;
          const dot = stepX * toPx + stepY * toPy;
          if (dot > 0) {
            stepX -= toPx * dot;
            stepY -= toPy * dot;
          }
        }

        // Apply movement with wall sliding
        enemy.x += stepX;
        resolveCircleCollision(enemy);
        enemy.y += stepY;
        resolveCircleCollision(enemy);

        // Solid Player Collision Resolution (Enemy cannot enter inside player's body)
        const afterDist = Math.hypot(closestP.x - enemy.x, closestP.y - enemy.y);
        if (afterDist < minDistanceToPlayer && afterDist > 0.0001) {
          const pushOut = minDistanceToPlayer - afterDist;
          const nx = (enemy.x - closestP.x) / afterDist;
          const ny = (enemy.y - closestP.y) / afterDist;
          enemy.x += nx * pushOut;
          enemy.y += ny * pushOut;
          resolveCircleCollision(enemy);
        }

        // Ranged Acid Spit Attack for Normal Enemies
        if (enemy.type === 'normal') {
          if (enemy.spitTimer === undefined) enemy.spitTimer = 1.5 + Math.random() * 2.0;
          if (enemy.spitWindupTimer > 0) {
            enemy.spitWindupTimer -= DT;
            if (enemy.spitWindupTimer <= 0) {
              const mouthX = enemy.x + Math.cos(enemy.angle) * (enemy.radius + 6);
              const mouthY = enemy.y + Math.sin(enemy.angle) * (enemy.radius + 6);
              io.emit('enemy_spit', {
                enemyId: enemy.id,
                x: mouthX,
                y: mouthY,
                angle: enemy.angle,
                speed: 460,
                damage: 16,
                color: '#39ff14',
                ignoreWalls: false
              });
            }
          } else {
            enemy.spitTimer -= DT;
            if (enemy.spitTimer <= 0 && curDist >= 85 && curDist <= 650) {
              enemy.spitTimer = 5.0; // Spit every 5.0 seconds
              enemy.spitWindupTimer = 0.35;
              io.emit('enemy_windup', { enemyId: enemy.id, duration: 0.35 });
            }
          }
        }

        // Ranged Sniper Shot for Phantom Sniper Enemies (1.0s aim, wall-penetrating)
        if (enemy.type === 'sniper') {
          if (enemy.sniperTimer === undefined) enemy.sniperTimer = 2.0 + Math.random() * 2.0;
          if (enemy.sniperAimTimer > 0) {
            enemy.sniperAimTimer -= DT;
            if (enemy.sniperAimTimer <= 0) {
              const muzzleX = enemy.x + Math.cos(enemy.angle) * (enemy.radius + 14);
              const muzzleY = enemy.y + Math.sin(enemy.angle) * (enemy.radius + 14);
              io.emit('enemy_spit', {
                enemyId: enemy.id,
                x: muzzleX,
                y: muzzleY,
                angle: enemy.angle,
                speed: 820,
                damage: 28,
                color: '#b026ff',
                ignoreWalls: true // Wall piercing sniper bolt!
              });
            }
          } else {
            enemy.sniperTimer -= DT;
            if (enemy.sniperTimer <= 0 && curDist <= 900) {
              enemy.sniperTimer = 5.0;
              enemy.sniperAimTimer = 1.0; // telegraph laser line for 1.0s
              io.emit('enemy_windup', { enemyId: enemy.id, duration: 1.0 });
            }
          }
        }

        // Melee Attack Check (Reliable reach when reaching/touching player)
        const distAfterMove = Math.hypot(closestP.x - enemy.x, closestP.y - enemy.y);
        const attackReach = enemy.radius + 20 + 12;
        if (distAfterMove <= attackReach && enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.attackCooldown;

          if (closestP.invulnerableTimer <= 0) {
            closestP.hp = Math.max(0, closestP.hp - enemy.damage);
            closestP.invulnerableTimer = 0.25;

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
      team: p.team || 'solo',
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
      recoilOffset: Number(p.recoilOffset.toFixed(1)),
      weapon: p.weapon || 'rifle',
      modelType: p.modelType || 'commando'
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
    medkits: Object.values(medkits),
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
