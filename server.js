/**
 * CYBER STRIKE // DEDICATED LAN & ONLINE MULTIPLAYER SERVER
 * High-performance Node.js + Socket.io Server
 * Features:
 * - Unique Operative Room / Squad IDs with Party Join & Leader Delegation
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

function getActiveMap(mapId = currentMapId) {
  return MAP_DEFINITIONS[mapId] || MAP_DEFINITIONS.sector_09;
}

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Helper: Get LAN IP Addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
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
  let totalActivePlayers = 0;
  for (const rId in rooms) {
    totalActivePlayers += Object.keys(rooms[rId].activePlayers).length;
  }
  res.json({
    primaryIp: primaryLanIp,
    allIps: networkIps,
    port: PORT,
    playersCount: totalActivePlayers
  });
});

// --- MAP GEOMETRY (Collision for Server AI) ---
function isCollidingWithMap(x, y, radius = 20, mapId = currentMapId) {
  const map = getActiveMap(mapId);
  const pad = 50 + radius;
  if (x < pad || x > map.width - pad || y < pad || y > map.height - pad) {
    return true;
  }
  for (let i = 0; i < map.walls.length; i++) {
    const w = map.walls[i];
    if (w.type === 'boundary') continue;

    // Inside rect check
    if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) {
      return true;
    }

    if (radius > 0) {
      const nearX = Math.max(w.x, Math.min(x, w.x + w.w));
      const nearY = Math.max(w.y, Math.min(y, w.y + w.h));
      const dx = x - nearX;
      const dy = y - nearY;
      if (dx * dx + dy * dy < radius * radius) {
        return true;
      }
    }
  }
  for (let i = 0; i < map.pillars.length; i++) {
    const p = map.pillars[i];
    const dx = x - p.x;
    const dy = y - p.y;
    const minD = radius + p.radius;
    if (dx * dx + dy * dy < minD * minD) {
      return true;
    }
  }
  return false;
}

function hasLineOfSight(x1, y1, x2, y2, mapId) {
  const steps = 16;
  for (let s = 1; s < steps; s++) {
    const tx = x1 + (x2 - x1) * (s / steps);
    const ty = y1 + (y2 - y1) * (s / steps);
    if (isCollidingWithMap(tx, ty, 8, mapId)) return false;
  }
  return true;
}

function resolveCircleCollision(entity, mapId = currentMapId) {
  const map = getActiveMap(mapId);
  let hadCollision = false;
  const r = entity.radius || 20;
  const maxPasses = 4; // Multi-pass relaxation solver

  for (let pass = 0; pass < maxPasses; pass++) {
    let collidedThisPass = false;

    // 1. Boundaries
    const pad = 52 + r;
    if (entity.x < pad) { entity.x = pad; collidedThisPass = true; }
    if (entity.x > map.width - pad) { entity.x = map.width - pad; collidedThisPass = true; }
    if (entity.y < pad) { entity.y = pad; collidedThisPass = true; }
    if (entity.y > map.height - pad) { entity.y = map.height - pad; collidedThisPass = true; }

    // 2. Rectangular Walls
    for (let i = 0; i < map.walls.length; i++) {
      const wall = map.walls[i];
      if (wall.type === 'boundary') continue;

      // Case A: Circle center is INSIDE the rectangle (Deep Penetration)
      if (entity.x >= wall.x && entity.x <= wall.x + wall.w &&
          entity.y >= wall.y && entity.y <= wall.y + wall.h) {
        collidedThisPass = true;
        // Calculate distance to all 4 edges to find Minimum Translation Vector (MTV)
        const dLeft = entity.x - wall.x;
        const dRight = (wall.x + wall.w) - entity.x;
        const dTop = entity.y - wall.y;
        const dBottom = (wall.y + wall.h) - entity.y;
        const min = Math.min(dLeft, dRight, dTop, dBottom);

        if (min === dLeft) {
          entity.x = wall.x - r - 0.5;
        } else if (min === dRight) {
          entity.x = wall.x + wall.w + r + 0.5;
        } else if (min === dTop) {
          entity.y = wall.y - r - 0.5;
        } else {
          entity.y = wall.y + wall.h + r + 0.5;
        }
      } else {
        // Case B: Circle center is outside
        const nearestX = Math.max(wall.x, Math.min(entity.x, wall.x + wall.w));
        const nearestY = Math.max(wall.y, Math.min(entity.y, wall.y + wall.h));
        const dx = entity.x - nearestX;
        const dy = entity.y - nearestY;
        const distSq = dx * dx + dy * dy;

        if (distSq < r * r) {
          collidedThisPass = true;
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const overlap = r - dist + 0.5;
            entity.x += (dx / dist) * overlap;
            entity.y += (dy / dist) * overlap;
          } else {
            entity.x = wall.x - r - 0.5;
          }
        }
      }
    }

    // 3. Pillars
    for (let i = 0; i < map.pillars.length; i++) {
      const pillar = map.pillars[i];
      const dx = entity.x - pillar.x;
      const dy = entity.y - pillar.y;
      const minDist = r + pillar.radius;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDist * minDist) {
        collidedThisPass = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = minDist - dist + 0.5;
          entity.x += (dx / dist) * overlap;
          entity.y += (dy / dist) * overlap;
        } else {
          entity.x = pillar.x + minDist + 0.5;
        }
      }
    }

    if (collidedThisPass) {
      hadCollision = true;
    } else {
      break;
    }
  }

  // Ultimate safeguard: if entity is still colliding after relaxation passes, trigger unstuck rescue
  if (hadCollision && isCollidingWithMap(entity.x, entity.y, r, mapId)) {
    unstuckEntityServer(entity, mapId);
  }

  return hadCollision;
}

// Emergency Server-Side Unstuck Handler
function unstuckEntityServer(entity, mapId = currentMapId) {
  const r = entity.radius || 20;
  if (!isCollidingWithMap(entity.x, entity.y, r, mapId)) {
    return false;
  }
  const testRadii = [16, 32, 48, 64, 85, 115, 160, 220];
  for (let d = 0; d < testRadii.length; d++) {
    const dist = testRadii[d];
    for (let a = 0; a < 16; a++) {
      const theta = (a / 16) * Math.PI * 2;
      const tx = entity.x + Math.cos(theta) * dist;
      const ty = entity.y + Math.sin(theta) * dist;
      if (!isCollidingWithMap(tx, ty, r, mapId)) {
        entity.x = tx;
        entity.y = ty;
        return true;
      }
    }
  }
  const map = getActiveMap(mapId);
  const spawn = (map.spawns && map.spawns[0]) || map.spawnPoint || { x: 1200, y: 1200 };
  entity.x = spawn.x;
  entity.y = spawn.y;
  return true;
}

// Tactical Spawn Points (with Left/Right Team Division & collision-free guarantee)
function getRandomSpawnPoint(mapId = currentMapId, team = null, mode = 'teams') {
  const map = getActiveMap(mapId);
  const w = map.width || 2400;
  const h = map.height || 2400;

  // In Team mode, divide the battlefield into Left (Alpha) and Right (Beta) zones
  if (mode === 'teams' && (team === 'alpha' || team === 'beta')) {
    const isLeftTeam = (team === 'alpha'); // Alpha = Left side in lobby
    const minX = isLeftTeam ? 140 : Math.round(w / 2 + 100);
    const maxX = isLeftTeam ? Math.round(w / 2 - 100) : (w - 140);
    const minY = 140;
    const maxY = h - 140;

    for (let attempt = 0; attempt < 40; attempt++) {
      const cx = minX + Math.random() * (maxX - minX);
      const cy = minY + Math.random() * (maxY - minY);
      if (!isCollidingWithMap(cx, cy, 26, mapId)) {
        return { x: Math.round(cx), y: Math.round(cy) };
      }
    }
    // Reliable fallback within zone
    const fallbackX = isLeftTeam ? Math.round(w * 0.25) : Math.round(w * 0.75);
    const fallbackY = Math.round(h * 0.5);
    const candidate = { x: fallbackX, y: fallbackY, radius: 24 };
    unstuckEntityServer(candidate, mapId);
    return { x: candidate.x, y: candidate.y };
  }

  // FFA or Solo default spawn points
  const spawns = (map.spawns && map.spawns.length > 0) ? map.spawns : [map.spawnPoint || { x: 1200, y: 1200 }];
  const baseSpawn = spawns[Math.floor(Math.random() * spawns.length)];

  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = {
      x: baseSpawn.x + (Math.random() - 0.5) * 140,
      y: baseSpawn.y + (Math.random() - 0.5) * 140
    };
    if (!isCollidingWithMap(candidate.x, candidate.y, 24, mapId)) {
      return candidate;
    }
  }
  return { x: baseSpawn.x, y: baseSpawn.y };
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

// --- MULTI-ROOM / PARTY SYSTEM WITH MEMORABLE OPERATIVE IDs ---
let nextRoomCodeNum = 1000 + Math.floor(Math.random() * 8999);
function getNextUserCode() {
  const code = (nextRoomCodeNum++).toString();
  if (nextRoomCodeNum > 9999) nextRoomCodeNum = 1000;
  return code;
}

const rooms = {};

function createRoom(hostId, hostCode, mapId = 'sector_09') {
  return {
    id: hostId,
    code: hostCode,
    hostId: hostId,
    mode: 'teams', // 'teams' | 'ffa'
    weaponMode: 'standard', // 'standard' | 'ground'
    pvpOnly: false, // true = no enemies, players fight each other, first to 10 kills
    mapId: mapId,
    lightingMode: 'tactical', // 'tactical' (dark + flashlight) | 'full' (fully illuminated)
    gameStarted: false,
    alphaColor: '#00f0ff',
    betaColor: '#ff3366',
    lockedColors: {},
    teamStats: {
      alpha: { kills: 0, score: 0 },
      beta: { kills: 0, score: 0 },
      targetKills: 10,
      matchFinished: false,
      winner: null
    },
    players: {},       // [socketId]: { id, userCode, name, team, color, isHost, isReady, modelType, skinId }
    activePlayers: {}, // [socketId]: Player object in game
    enemies: {},
    barrels: getInitialBarrelsForMap(mapId),
    medkits: {},
    weaponDrops: {},
    nextEnemyId: 1,
    nextMedkitId: 1,
    nextWeaponDropId: 1,
    medkitTimer: 0,
    weaponDropTimer: 0,
    waveManager: {
      wave: 1,
      state: 'intermission', // 'intermission' | 'active' | 'cleared'
      timer: 3.0,
      enemiesToSpawn: 0,
      totalEnemiesInWave: 0,
      spawnInterval: 0.5,
      spawnTimer: 0
    }
  };
}

function getRoomForSocket(socket) {
  if (socket.roomId && rooms[socket.roomId]) {
    return rooms[socket.roomId];
  }
  if (rooms[socket.id]) {
    return rooms[socket.id];
  }
  return null;
}

function broadcastLobbySync(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(room.id).emit('lobby_sync', {
    roomId: room.id,
    roomCode: room.code,
    hostId: room.hostId,
    mode: room.mode,
    weaponMode: room.weaponMode || 'standard',
    pvpOnly: !!room.pvpOnly,
    mapId: room.mapId,
    lightingMode: room.lightingMode || 'tactical',
    gameStarted: room.gameStarted,
    alphaColor: room.alphaColor,
    betaColor: room.betaColor,
    lockedColors: Object.keys(room.lockedColors),
    players: Object.values(room.players)
  });
}

const MEDKIT_SPAWN_INTERVAL = 5.0; // 5 seconds
const MAX_SERVER_MEDKITS = 8;
const WEAPON_TYPES = ['rifle', 'shotgun', 'smg', 'railgun', 'cannon'];

function spawnServerMedkit(room) {
  const map = getActiveMap(room.mapId);
  let spawnX, spawnY;
  let attempts = 0;
  const pad = 120;
  do {
    spawnX = pad + Math.random() * (map.width - pad * 2);
    spawnY = pad + Math.random() * (map.height - pad * 2);
    attempts++;
  } while (attempts < 30 && isCollidingWithMap(spawnX, spawnY, 35, room.mapId));

  const medkitId = `med_${room.nextMedkitId++}`;
  const medkit = {
    id: medkitId,
    x: Math.round(spawnX),
    y: Math.round(spawnY),
    heal: 50
  };
  room.medkits[medkitId] = medkit;
  io.to(room.id).emit('medkit_spawned', medkit);
}

function spawnServerWeaponDrop(room, specificType = null) {
  const map = getActiveMap(room.mapId);
  const wType = specificType || WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
  let spawnX, spawnY;
  let attempts = 0;
  const pad = 140;
  do {
    spawnX = pad + Math.random() * (map.width - pad * 2);
    spawnY = pad + Math.random() * (map.height - pad * 2);
    attempts++;
  } while (attempts < 35 && isCollidingWithMap(spawnX, spawnY, 32, room.mapId));

  const dropId = `wdrop_${room.nextWeaponDropId++}`;
  const drop = {
    id: dropId,
    weaponType: wType,
    x: Math.round(spawnX),
    y: Math.round(spawnY)
  };
  if (!room.weaponDrops) room.weaponDrops = {};
  room.weaponDrops[dropId] = drop;
  io.to(room.id).emit('weapon_drop_spawned', drop);
  return drop;
}

function startWave(room, waveNum) {
  if (room.pvpOnly) {
    room.waveManager.enemiesToSpawn = 0;
    room.waveManager.totalEnemiesInWave = 0;
    room.enemies = {};
    return;
  }
  room.waveManager.wave = waveNum;
  room.waveManager.state = 'intermission';
  room.waveManager.timer = 3.0;

  const count = 20 + (waveNum - 1) * 8 + Math.floor((waveNum - 1) * (waveNum - 1) * 1.5);
  room.waveManager.enemiesToSpawn = count;
  room.waveManager.totalEnemiesInWave = count;
  room.waveManager.spawnTimer = 0.1;

  io.to(room.id).emit('wave_start', {
    wave: room.waveManager.wave,
    totalEnemies: room.waveManager.totalEnemiesInWave,
    message: `HOSTILE WAVE ${waveNum}`
  });
}

function triggerServerBomberExplosion(room, x, y, killerSocketId, killerPlayer) {
  const blastRadius = 160;
  io.to(room.id).emit('barrel_exploded', {
    barrelId: 'drone_' + Math.floor(Math.random() * 10000),
    x,
    y,
    radius: blastRadius
  });

  // 1. Damage alive players in blast
  const alivePlayers = Object.values(room.activePlayers).filter(p => p.alive);
  for (const p of alivePlayers) {
    const dist = Math.hypot(p.x - x, p.y - y);
    if (dist < blastRadius && p.invulnerableTimer <= 0) {
      const dmg = Math.round(75 * (1 - dist / blastRadius));
      p.hp -= dmg;
      p.invulnerableTimer = 0.25;
      if (p.hp <= 0) {
        p.hp = 0;
        p.alive = false;
        p.deaths++;
        schedulePlayerRespawn(room, p);
        io.to(room.id).emit('player_eliminated', {
          victimId: p.id,
          victimName: p.name,
          victimColor: p.color,
          killerName: 'BOMBER BLAST',
          killerColor: '#ff7700',
          isPvP: false
        });
        io.to(room.id).emit('kill_feed_msg', {
          killer: 'BOMBER BLAST',
          killerColor: '#ff7700',
          victim: p.name,
          victimColor: p.color,
          type: 'pve_death'
        });
      } else {
        io.to(p.id).emit('player_damaged', {
          damage: dmg,
          hp: p.hp,
          attackerName: 'BOMBER BLAST'
        });
        io.to(room.id).emit('player_hit_fx', {
          targetId: p.id,
          damage: dmg,
          hp: p.hp,
          x: p.x,
          y: p.y,
          isCritical: true
        });
      }
    }
  }

  // 2. Damage surrounding hostiles in blast (chain reaction!)
  for (const otherId in room.enemies) {
    const other = room.enemies[otherId];
    if (!other) continue;
    const d = Math.hypot(other.x - x, other.y - y);
    if (d < blastRadius && d > 0) {
      const blastDmg = Math.round(95 * (1 - d / blastRadius));
      other.hp -= blastDmg;
      if (other.hp <= 0) {
        delete room.enemies[otherId];
        if (killerPlayer) {
          killerPlayer.kills++;
          killerPlayer.score += other.scoreValue;
          if (room.mode === 'teams' && killerPlayer.team && room.teamStats) {
            room.teamStats[killerPlayer.team].score += other.scoreValue;
            io.to(room.id).emit('team_stats_update', { teamStats: room.teamStats });
          }
        }
        io.to(room.id).emit('enemy_killed', {
          enemyId: otherId,
          killerId: killerSocketId || 'blast',
          killerName: killerPlayer ? killerPlayer.name : 'BOMBER EXPLOSION',
          killerColor: killerPlayer ? killerPlayer.color : '#ff7700',
          score: other.scoreValue,
          enemyType: other.type
        });
        // Chain react if this enemy was also a bomber
        if (other.type === 'bomber') {
          setTimeout(() => {
            if (rooms[room.id]) {
              triggerServerBomberExplosion(room, other.x, other.y, killerSocketId, killerPlayer);
            }
          }, 60);
        } else if (other.type === 'splitter' && (other.generation || 0) < 2) {
          triggerServerSplitterSpawn(room, other);
        }
      } else {
        io.to(room.id).emit('enemy_damaged', {
          enemyId: otherId,
          damage: blastDmg,
          hp: other.hp,
          isCritical: true,
          x: other.x,
          y: other.y
        });
      }
    }
  }
}

function triggerServerSplitterSpawn(room, enemy) {
  if (enemy.type !== 'splitter' || (enemy.generation || 0) >= 2) return;
  const nextGen = (enemy.generation || 0) + 1;
  const map = getActiveMap(room.mapId);

  let childRadius = 17, childMaxHp = 55, childSpeed = 155, childDamage = 10, childScore = 100, childColor = '#39ff14';
  if (nextGen >= 2) {
    childRadius = 11; childMaxHp = 22; childSpeed = 190; childDamage = 6; childScore = 50; childColor = '#88ff99';
  }

  const baseAngle = enemy.angle || 0;
  const spreadOffset = Math.PI * 0.42;
  const angles = [baseAngle + spreadOffset, baseAngle - spreadOffset];
  const spawnDist = enemy.radius * 0.65 + childRadius + 4;

  for (let i = 0; i < 2; i++) {
    const ang = angles[i];
    let cx = enemy.x + Math.cos(ang) * spawnDist;
    let cy = enemy.y + Math.sin(ang) * spawnDist;

    cx = Math.max(30, Math.min(map.width - 30, cx));
    cy = Math.max(30, Math.min(map.height - 30, cy));

    const childId = `e_${room.nextEnemyId++}`;
    const child = {
      id: childId,
      type: 'splitter',
      generation: nextGen,
      x: Math.round(cx),
      y: Math.round(cy),
      angle: ang,
      radius: childRadius,
      maxHp: childMaxHp,
      hp: childMaxHp,
      speed: childSpeed,
      damage: childDamage,
      scoreValue: childScore,
      color: childColor,
      attackCooldown: 0.75,
      attackRange: childRadius + 14,
      attackTimer: 0,
      spitCooldown: 5.0,
      spitTimer: 9999,
      spitWindupTimer: 0
    };

    if (isCollidingWithMap(child.x, child.y, child.radius, room.mapId)) {
      unstuckEntityServer(child, room.mapId);
    }

    room.enemies[childId] = child;
    io.to(room.id).emit('enemy_spawned', { enemy: child });
  }
}

function spawnServerEnemy(room) {
  if (room.pvpOnly) return;
  const roll = Math.random();
  let type = 'normal';
  let generation = 0;
  let radius = 22, maxHp = 90, speed = 155, damage = 20, scoreValue = 100, color = '#00ff88', attackCooldown = 0.85, attackRange = 48;

  const wave = room.waveManager.wave;
  if (wave === 1) {
    if (roll < 0.35) {
      type = 'normal';
    } else if (roll < 0.55) {
      type = 'fast';
      radius = 16; maxHp = 45; speed = 255; damage = 14; scoreValue = 125; color = '#00f0ff'; attackCooldown = 0.45; attackRange = 32;
    } else if (roll < 0.72) {
      type = 'splitter';
      generation = 0;
      radius = 26; maxHp = 120; speed = 120; damage = 14; scoreValue = 200; color = '#00ff88'; attackCooldown = 0.75; attackRange = 40;
    } else if (roll < 0.88) {
      type = 'toxic';
      radius = 24; maxHp = 110; speed = 130; damage = 22; scoreValue = 220; color = '#39ff14'; attackCooldown = 0.9; attackRange = 52;
    } else {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    }
  } else if (wave === 2) {
    if (roll < 0.30) {
      type = 'normal';
    } else if (roll < 0.55) {
      type = 'fast';
      radius = 16; maxHp = 45; speed = 255; damage = 14; scoreValue = 125; color = '#00f0ff'; attackCooldown = 0.45; attackRange = 32;
    } else if (roll < 0.75) {
      type = 'splitter';
      generation = 0;
      radius = 26; maxHp = 120; speed = 120; damage = 14; scoreValue = 200; color = '#00ff88'; attackCooldown = 0.75; attackRange = 40;
    } else if (roll < 0.88) {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    } else {
      type = 'sniper';
      radius = 20; maxHp = 75; speed = 115; damage = 28; scoreValue = 300; color = '#b026ff'; attackCooldown = 1.0; attackRange = 40;
    }
  } else if (wave === 3) {
    if (roll < 0.25) {
      type = 'normal';
    } else if (roll < 0.45) {
      type = 'fast';
      radius = 16; maxHp = 45; speed = 255; damage = 14; scoreValue = 125; color = '#00f0ff'; attackCooldown = 0.45; attackRange = 32;
    } else if (roll < 0.65) {
      type = 'splitter';
      generation = 0;
      radius = 26; maxHp = 120; speed = 120; damage = 14; scoreValue = 200; color = '#00ff88'; attackCooldown = 0.75; attackRange = 40;
    } else if (roll < 0.80) {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    } else if (roll < 0.90) {
      type = 'sniper';
      radius = 20; maxHp = 75; speed = 115; damage = 28; scoreValue = 300; color = '#b026ff'; attackCooldown = 1.0; attackRange = 40;
    } else {
      type = 'tank';
      radius = 24; maxHp = 180; speed = 95; damage = 30; scoreValue = 350; color = '#ff3366'; attackCooldown = 1.1; attackRange = 36;
    }
  } else {
    if (roll < 0.20) {
      type = 'normal';
    } else if (roll < 0.40) {
      type = 'fast';
      radius = 16; maxHp = 45; speed = 255; damage = 14; scoreValue = 125; color = '#00f0ff'; attackCooldown = 0.45; attackRange = 32;
    } else if (roll < 0.60) {
      type = 'splitter';
      generation = 0;
      radius = 26; maxHp = 120; speed = 120; damage = 14; scoreValue = 200; color = '#00ff88'; attackCooldown = 0.75; attackRange = 40;
    } else if (roll < 0.74) {
      type = 'bomber';
      radius = 18; maxHp = 60; speed = 210; damage = 50; scoreValue = 200; color = '#ff7700'; attackCooldown = 0.5; attackRange = 36;
    } else if (roll < 0.88) {
      type = 'sniper';
      radius = 20; maxHp = 75; speed = 115; damage = 28; scoreValue = 300; color = '#b026ff'; attackCooldown = 1.0; attackRange = 40;
    } else {
      type = 'tank';
      radius = 24; maxHp = 180; speed = 95; damage = 30; scoreValue = 350; color = '#ff3366'; attackCooldown = 1.1; attackRange = 36;
    }
  }

  const alivePlayers = Object.values(room.activePlayers).filter(p => p.alive);
  const anchor = alivePlayers.length > 0
    ? alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    : { x: 1200, y: 1200 };

  let spawnX, spawnY;
  let attempts = 0;
  const minD = 550, maxD = 1100;
  const map = getActiveMap(room.mapId);

  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = minD + Math.random() * (maxD - minD);
    spawnX = anchor.x + Math.cos(angle) * dist;
    spawnY = anchor.y + Math.sin(angle) * dist;
    attempts++;
  } while (
    attempts < 25 &&
    (spawnX < 80 || spawnX > map.width - 80 || spawnY < 80 || spawnY > map.height - 80 || isCollidingWithMap(spawnX, spawnY, radius + 10, room.mapId))
  );

  const enemyId = `e_${room.nextEnemyId++}`;
  room.enemies[enemyId] = {
    id: enemyId,
    type,
    generation,
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
    spitCooldown: 5.0,
    spitTimer: 1.0 + Math.random() * 4.0, // Every 5 seconds
    spitWindupTimer: 0
  };

  room.waveManager.enemiesToSpawn--;

  io.to(room.id).emit('enemy_spawned', {
    enemy: room.enemies[enemyId]
  });
}

function triggerBarrelExplosion(room, barrel, triggererName = 'Explosion') {
  if (barrel.exploded) return;
  barrel.exploded = true;
  barrel.hp = 0;

  const blastRadius = 170;
  const maxDamage = 140;

  io.to(room.id).emit('barrel_exploded', {
    id: barrel.id,
    x: barrel.x,
    y: barrel.y,
    blastRadius
  });

  // Damage enemies in room
  for (const enemyId in room.enemies) {
    const e = room.enemies[enemyId];
    const dist = Math.hypot(e.x - barrel.x, e.y - barrel.y);
    if (dist < blastRadius) {
      const dmg = Math.round(maxDamage * (1 - dist / blastRadius));
      e.hp -= dmg;
      if (e.hp <= 0) {
        delete room.enemies[enemyId];
        io.to(room.id).emit('enemy_killed', {
          enemyId,
          killerId: null,
          killerName: 'Barrel Blast',
          score: e.scoreValue,
          enemyType: e.type
        });
      } else {
        io.to(room.id).emit('enemy_damaged', {
          enemyId,
          damage: dmg,
          hp: e.hp,
          isCritical: true
        });
      }
    }
  }

  // Damage players in room
  for (const socketId in room.activePlayers) {
    const p = room.activePlayers[socketId];
    if (!p.alive || p.invulnerableTimer > 0) continue;
    const dist = Math.hypot(p.x - barrel.x, p.y - barrel.y);
    if (dist < blastRadius) {
      const dmg = Math.round(maxDamage * 0.75 * (1 - dist / blastRadius));
      p.hp -= dmg;
      if (p.hp <= 0) {
        p.hp = 0;
        p.alive = false;
        p.deaths++;
        schedulePlayerRespawn(room, p);

        io.to(room.id).emit('player_eliminated', {
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

function schedulePlayerRespawn(room, player) {
  if (player.respawnTimeout) {
    clearTimeout(player.respawnTimeout);
    player.respawnTimeout = null;
  }
  const respawnTime = 4.0;
  io.to(player.id).emit('respawn_countdown', { seconds: respawnTime });

  player.respawnTimeout = setTimeout(() => {
    player.respawnTimeout = null;
    if (!room || !room.activePlayers[player.id]) return;
    const spawn = getRandomSpawnPoint(room.mapId, player.team, room.mode);
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = player.maxHp || 100;
    player.alive = true;
    player.invulnerableTimer = 2.5;

    io.to(room.id).emit('player_respawned', {
      id: player.id,
      x: player.x,
      y: player.y,
      hp: player.hp,
      invulnerableTimer: 2.5
    });
  }, respawnTime * 1000);
}

// --- SOCKET CONNECTION HANDLING ---
io.on('connection', (socket) => {
  // Generate unique 4-digit code for this player
  socket.userCode = getNextUserCode();
  socket.roomId = socket.id; // Initially, player is leader of their own room!

  const defaultName = `OPERATIVE-${socket.userCode}`;
  const assignedColor = OPERATIVE_COLORS[Math.floor(Math.random() * OPERATIVE_COLORS.length)];

  // Create player's private default room
  const room = createRoom(socket.id, socket.userCode);
  rooms[socket.roomId] = room;
  socket.join(room.id);

  room.players[socket.id] = {
    id: socket.id,
    userCode: socket.userCode,
    name: defaultName,
    team: 'alpha',
    color: room.alphaColor,
    isHost: true,
    isReady: false,
    modelType: 'commando',
    skinId: 'spectre'
  };

  console.log(`[CONNECT] Operative ${defaultName} connected with ID [${socket.userCode}]`);

  // 1. Send initialization data to the new client
  socket.emit('init_data', {
    yourId: socket.id,
    userCode: socket.userCode,
    serverIp: primaryLanIp,
    port: PORT,
    allIps: networkIps,
    players: Object.values(room.activePlayers),
    enemies: Object.values(room.enemies),
    barrels: room.barrels,
    medkits: Object.values(room.medkits),
    lobby: {
      roomId: room.id,
      roomCode: room.code,
      mode: room.mode,
      hostId: room.hostId,
      mapId: room.mapId,
      lightingMode: room.lightingMode || 'tactical',
      gameStarted: room.gameStarted,
      alphaColor: room.alphaColor,
      betaColor: room.betaColor,
      lockedColors: Object.keys(room.lockedColors),
      players: Object.values(room.players)
    },
    waveInfo: {
      wave: room.waveManager.wave,
      state: room.waveManager.state,
      timer: room.waveManager.timer,
      totalEnemies: room.waveManager.totalEnemiesInWave,
      enemiesLeft: Object.keys(room.enemies).length + room.waveManager.enemiesToSpawn
    }
  });

  broadcastLobbySync(room.id);

  // Join Room by Leader's Operative ID or Code
  socket.on('lobby_join_by_id', (data) => {
    const targetCode = data && data.targetId ? String(data.targetId).trim().toUpperCase() : '';
    if (!targetCode) return;

    // Search all rooms and players for matching code or ID
    let targetRoom = null;
    let targetHostPlayer = null;

    for (const rid in rooms) {
      const r = rooms[rid];
      if (r.code === targetCode || r.id === targetCode) {
        targetRoom = r;
        break;
      }
      for (const pid in r.players) {
        const p = r.players[pid];
        if (p.userCode === targetCode || p.id === targetCode) {
          targetRoom = r;
          targetHostPlayer = p;
          break;
        }
      }
      if (targetRoom) break;
    }

    if (!targetRoom) {
      socket.emit('lobby_error', { message: `Operative ID "${targetCode}" not found!` });
      return;
    }

    if (targetRoom.id === socket.roomId) {
      return; // Already in this room
    }

    // Leave old room
    const oldRoom = rooms[socket.roomId];
    if (oldRoom) {
      delete oldRoom.players[socket.id];
      delete oldRoom.activePlayers[socket.id];
      socket.leave(oldRoom.id);
      if (Object.keys(oldRoom.players).length === 0) {
        delete rooms[oldRoom.id];
      } else if (oldRoom.hostId === socket.id) {
        const remainingPids = Object.keys(oldRoom.players);
        oldRoom.hostId = remainingPids[0];
        oldRoom.players[oldRoom.hostId].isHost = true;
        broadcastLobbySync(oldRoom.id);
      } else {
        broadcastLobbySync(oldRoom.id);
      }
    }

    // Join target room
    socket.join(targetRoom.id);
    socket.roomId = targetRoom.id;

    // Auto-balance team
    const alphaCount = Object.values(targetRoom.players).filter(p => p.team === 'alpha').length;
    const betaCount = Object.values(targetRoom.players).filter(p => p.team === 'beta').length;
    const assignedTeam = alphaCount <= betaCount ? 'alpha' : 'beta';

    const playerColor = targetRoom.mode === 'teams'
      ? (assignedTeam === 'alpha' ? targetRoom.alphaColor : targetRoom.betaColor)
      : OPERATIVE_COLORS.find(c => !targetRoom.lockedColors[c]) || OPERATIVE_COLORS[0];

    const currentName = (data && data.name && data.name.trim().length > 0)
      ? data.name.trim().substring(0, 16)
      : `OPERATIVE-${socket.userCode}`;

    targetRoom.players[socket.id] = {
      id: socket.id,
      userCode: socket.userCode,
      name: currentName,
      team: assignedTeam,
      color: playerColor,
      isHost: false,
      isReady: false,
      skinId: (data && data.skinId) ? data.skinId : 'spectre',
      modelType: (data && data.modelType) ? data.modelType : 'commando'
    };

    socket.emit('lobby_joined_room', {
      roomId: targetRoom.id,
      roomCode: targetRoom.code,
      hostId: targetRoom.hostId,
      gameStarted: targetRoom.gameStarted,
      mode: targetRoom.mode,
      mapId: targetRoom.mapId,
      lightingMode: targetRoom.lightingMode || 'tactical'
    });

    broadcastLobbySync(targetRoom.id);
    console.log(`[PARTY] Operative ${socket.userCode} joined room of leader [${targetRoom.code}]`);
  });

  // Leave Squad / Return to Solo Room as Leader
  socket.on('lobby_leave_room', () => {
    const currentRoom = rooms[socket.roomId];
    if (!currentRoom || currentRoom.hostId === socket.id) return; // already leader

    delete currentRoom.players[socket.id];
    delete currentRoom.activePlayers[socket.id];
    socket.leave(currentRoom.id);
    broadcastLobbySync(currentRoom.id);

    // Create private room for this socket
    socket.roomId = socket.id;
    const newRoom = createRoom(socket.id, socket.userCode);
    rooms[socket.roomId] = newRoom;
    socket.join(newRoom.id);

    newRoom.players[socket.id] = {
      id: socket.id,
      userCode: socket.userCode,
      name: defaultName,
      team: 'alpha',
      color: newRoom.alphaColor,
      isHost: true,
      isReady: false,
      modelType: 'commando',
      skinId: 'spectre'
    };

    broadcastLobbySync(newRoom.id);
  });

  // Toggle Ready Status
  socket.on('lobby_toggle_ready', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const lp = room.players[socket.id];
    if (!lp) return;

    lp.isReady = data && data.isReady !== undefined ? !!data.isReady : !lp.isReady;
    broadcastLobbySync(room.id);

    // Check if ALL players in the squad are ready
    const playerList = Object.values(room.players);
    const allReady = playerList.length > 0 && playerList.every(p => p.isReady);
    if (allReady && !room.gameStarted) {
      room.gameStarted = true;
      io.to(room.id).emit('game_start_signal', {
        mapId: room.mapId,
        mode: room.mode
      });
      broadcastLobbySync(room.id);
      console.log(`[LAUNCH] All operatives in squad [${room.code}] are READY! Launching match.`);
    }
  });

  // Update Callsign
  socket.on('lobby_update_name', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const lp = room.players[socket.id];
    if (lp && data && data.name) {
      lp.name = data.name.trim().substring(0, 16);
      if (room.activePlayers[socket.id]) {
        room.activePlayers[socket.id].name = lp.name;
      }
      broadcastLobbySync(room.id);
    }
  });

  // Update Model / Chassis
  socket.on('lobby_update_model', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const lp = room.players[socket.id];
    if (lp && data && (data.modelType || data.skinId)) {
      if (data.modelType) lp.modelType = data.modelType;
      if (data.skinId) lp.skinId = data.skinId;
      broadcastLobbySync(room.id);
    }
  });

  // Host Only: Set Mode (Teams vs FFA)
  socket.on('lobby_set_mode', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || socket.id !== room.hostId) return;
    if (data && (data.mode === 'teams' || data.mode === 'ffa')) {
      room.mode = data.mode;
      for (const pid in room.players) {
        const lp = room.players[pid];
        if (room.mode === 'teams') {
          lp.color = lp.team === 'alpha' ? room.alphaColor : room.betaColor;
        } else {
          for (const col in room.lockedColors) {
            if (room.lockedColors[col] === pid) {
              lp.color = col;
              break;
            }
          }
        }
        if (room.activePlayers[pid]) {
          room.activePlayers[pid].color = lp.color;
        }
      }
      broadcastLobbySync(room.id);
    }
  });

  // Host Only: Set Team Colors
  socket.on('lobby_set_team_color', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || socket.id !== room.hostId) return;
    if (!data || !data.team || !data.color) return;
    if (data.team === 'alpha') {
      room.alphaColor = data.color;
    } else if (data.team === 'beta') {
      room.betaColor = data.color;
    }
    for (const pid in room.players) {
      const lp = room.players[pid];
      if (lp.team === data.team) {
        lp.color = data.color;
        if (room.activePlayers[pid]) room.activePlayers[pid].color = data.color;
      }
    }
    broadcastLobbySync(room.id);
  });

  // Host Only: Set Map
  socket.on('lobby_set_map', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || socket.id !== room.hostId) return;
    if (data && data.mapId && MAP_DEFINITIONS[data.mapId]) {
      room.mapId = data.mapId;
      room.barrels = getInitialBarrelsForMap(room.mapId);
      io.to(room.id).emit('map_sync', { mapId: room.mapId });
      broadcastLobbySync(room.id);
    }
  });

  // Host Only: Set Visibility Protocol (Lighting Mode)
  socket.on('lobby_set_lighting', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || socket.id !== room.hostId) return;
    if (data && (data.lightingMode === 'tactical' || data.lightingMode === 'full')) {
      room.lightingMode = data.lightingMode;
      io.to(room.id).emit('lighting_sync', { lightingMode: room.lightingMode });
      broadcastLobbySync(room.id);
    }
  });

  // Host Only: Set Weapon Procurement Mode (Standard vs Ground Drops)
  socket.on('lobby_set_weapon_mode', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || socket.id !== room.hostId) return;
    if (data && (data.weaponMode === 'standard' || data.weaponMode === 'ground')) {
      room.weaponMode = data.weaponMode;
      io.to(room.id).emit('weapon_mode_sync', { weaponMode: room.weaponMode });
      broadcastLobbySync(room.id);
    }
  });

  // Host Only: Set Hostile Threat Protocol (With Enemies vs PvP Only)
  socket.on('lobby_set_pvp_only', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || socket.id !== room.hostId) return;
    room.pvpOnly = !!data.pvpOnly;
    if (room.pvpOnly) {
      room.enemies = {};
      room.waveManager.enemiesToSpawn = 0;
      room.waveManager.totalEnemiesInWave = 0;
    }
    io.to(room.id).emit('pvp_only_sync', { pvpOnly: room.pvpOnly });
    broadcastLobbySync(room.id);
  });

  // Leader Starts Match Directly
  socket.on('leader_start_game', () => {
    const room = getRoomForSocket(socket);
    if (!room || socket.id !== room.hostId) return;
    room.gameStarted = true;
    for (const pid in room.activePlayers) {
      room.activePlayers[pid].score = 0;
      room.activePlayers[pid].kills = 0;
      room.activePlayers[pid].deaths = 0;
    }
    room.teamStats = {
      alpha: { kills: 0, score: 0 },
      beta: { kills: 0, score: 0 },
      targetKills: 10,
      matchFinished: false,
      winner: null
    };
    if (room.pvpOnly) {
      room.enemies = {};
      room.waveManager.enemiesToSpawn = 0;
      room.waveManager.totalEnemiesInWave = 0;
    }
    if (room.weaponMode === 'ground') {
      room.weaponDrops = {};
      room.nextWeaponDropId = 1;
      WEAPON_TYPES.forEach(type => {
        spawnServerWeaponDrop(room, type);
      });
    }
    io.to(room.id).emit('team_stats_update', { teamStats: room.teamStats });
    io.to(room.id).emit('game_start_signal', {
      mapId: room.mapId,
      mode: room.mode,
      lightingMode: room.lightingMode || 'tactical',
      weaponMode: room.weaponMode || 'standard',
      pvpOnly: !!room.pvpOnly,
      targetKills: 10
    });
    broadcastLobbySync(room.id);
  });

  // Member & Leader: Join Team (Alpha or Beta)
  socket.on('lobby_join_team', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const lp = room.players[socket.id];
    if (lp && data && (data.team === 'alpha' || data.team === 'beta')) {
      lp.team = data.team;
      lp.color = data.team === 'alpha' ? room.alphaColor : room.betaColor;
      if (room.activePlayers[socket.id]) {
        room.activePlayers[socket.id].team = lp.team;
        room.activePlayers[socket.id].color = lp.color;
      }
      broadcastLobbySync(room.id);
    }
  });

  // Member & Leader: Select Individual FFA Color
  socket.on('lobby_select_color', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const lp = room.players[socket.id];
    if (lp && data && data.color) {
      if (room.lockedColors[data.color] && room.lockedColors[data.color] !== socket.id) {
        socket.emit('color_lock_rejected', { color: data.color });
        return;
      }
      for (const col in room.lockedColors) {
        if (room.lockedColors[col] === socket.id) {
          delete room.lockedColors[col];
        }
      }
      room.lockedColors[data.color] = socket.id;
      lp.color = data.color;
      if (room.activePlayers[socket.id]) {
        room.activePlayers[socket.id].color = data.color;
      }
      broadcastLobbySync(room.id);
    }
  });

  // Deploy / Join Active Game (Pre-game launch or Mid-game drop-in)
  socket.on('join_game', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const lp = room.players[socket.id];
    const team = (room.mode === 'teams' && lp) ? lp.team : 'solo';
    const spawn = getRandomSpawnPoint(room.mapId, team, room.mode);
    const name = (data && data.name && data.name.trim().length > 0)
      ? data.name.trim().substring(0, 16)
      : (lp ? lp.name : defaultName);

    if (lp) lp.name = name;

    const color = (room.mode === 'teams' && lp)
      ? (lp.team === 'alpha' ? room.alphaColor : room.betaColor)
      : (lp ? lp.color : assignedColor);

    // Push pre-existing enemies away from spawn point so joining player is safe
    for (const eid in room.enemies) {
      const e = room.enemies[eid];
      const d = Math.hypot(e.x - spawn.x, e.y - spawn.y);
      if (d < 500) {
        const angle = Math.atan2(e.y - spawn.y, e.x - spawn.x) || Math.random() * Math.PI * 2;
        e.x = spawn.x + Math.cos(angle) * 650;
        e.y = spawn.y + Math.sin(angle) * 650;
        resolveCircleCollision(e, room.mapId);
      }
    }

    const newPlayer = {
      id: socket.id,
      name,
      team,
      color,
      skinId: (data && data.skinId) ? data.skinId : (lp && lp.skinId ? lp.skinId : 'spectre'),
      modelType: (data && (data.modelType || data.skinModel)) ? (data.modelType || data.skinModel) : (lp && lp.modelType ? lp.modelType : 'commando'),
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

    room.activePlayers[socket.id] = newPlayer;

    // Start wave 1 if no active wave running in this room
    if (room.waveManager.enemiesToSpawn === 0 && Object.keys(room.enemies).length === 0) {
      startWave(room, 1);
    }

    // Acknowledge to joined player
    socket.emit('joined_successfully', {
      player: newPlayer,
      mapId: room.mapId
    });

    // Broadcast to other squad members in room
    const joinRecipients = new Set([
      ...Object.keys(room.players || {}),
      ...Object.keys(room.activePlayers || {})
    ]);
    joinRecipients.delete(socket.id);
    joinRecipients.forEach(targetId => {
      io.to(targetId).emit('player_joined', { player: newPlayer });
    });

    io.to(room.id).emit('kill_feed_msg', {
      text: `${name} DEPLOYED TO SECTOR [${team.toUpperCase()}]`,
      type: 'join',
      color: newPlayer.color
    });

    console.log(`[JOIN] ${name} deployed into squad [${room.code}] on [${room.mapId}]`);
  });

  // High-frequency Player Input / Position Update
  socket.on('player_update', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const p = room.activePlayers[socket.id];
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

  // Shoot Event (Synchronized across all squad members)
  socket.on('player_shoot', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const p = room.activePlayers[socket.id] || room.players[socket.id];

    const bulletColor = data.color || (p ? p.color : '#00f0ff');
    const playerTeam = (p && p.team) || data.team || (room.players[socket.id] ? room.players[socket.id].team : null);
    const weaponType = data.weaponType || (p ? p.weapon : 'rifle') || 'rifle';

    const shootPayload = {
      shooterId: socket.id,
      team: playerTeam,
      x: data.x,
      y: data.y,
      angle: data.angle,
      isCritical: !!data.isCritical,
      damage: data.damage || 28,
      color: bulletColor,
      weaponType: weaponType,
      speed: data.speed,
      range: data.range,
      radius: data.radius,
      penetrating: !!data.penetrating,
      explosive: !!data.explosive,
      splashDamage: data.splashDamage,
      blastRadius: data.blastRadius
    };

    // Broadcast to ALL other players in this squad room
    // Note: Must dispatch to each peer socket directly because for the room leader/host,
    // room.id === socket.id, which causes socket.to(room.id) to be dropped by Socket.IO as self-excluding!
    const recipientIds = new Set([
      ...Object.keys(room.players || {}),
      ...Object.keys(room.activePlayers || {})
    ]);
    recipientIds.delete(socket.id);

    recipientIds.forEach(targetId => {
      io.to(targetId).emit('remote_shoot', shootPayload);
    });
  });

  // PvE Hit Enemy
  socket.on('hit_enemy', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const enemy = room.enemies[data.enemyId];
    const shooter = room.activePlayers[socket.id];
    if (!enemy || !shooter) return;

    const damage = data.damage || 28;
    enemy.hp -= damage;

    if (enemy.hp <= 0) {
      delete room.enemies[data.enemyId];
      shooter.kills++;
      shooter.score += enemy.scoreValue;

      // Add to team score in Team Mode
      if (room.mode === 'teams' && shooter.team && room.teamStats && room.teamStats[shooter.team]) {
        room.teamStats[shooter.team].score += enemy.scoreValue;
        io.to(room.id).emit('team_stats_update', { teamStats: room.teamStats });
      }

      // If it was a bomber, trigger surrounding explosion!
      if (enemy.type === 'bomber') {
        triggerServerBomberExplosion(room, enemy.x, enemy.y, socket.id, shooter);
      } else if (enemy.type === 'splitter' && (enemy.generation || 0) < 2) {
        triggerServerSplitterSpawn(room, enemy);
      }

      io.to(room.id).emit('enemy_killed', {
        enemyId: data.enemyId,
        killerId: socket.id,
        killerName: shooter.name,
        killerColor: shooter.color,
        score: enemy.scoreValue,
        enemyType: enemy.type
      });

      io.to(room.id).emit('kill_feed_msg', {
        killer: shooter.name,
        killerColor: shooter.color,
        victim: `${enemy.type.toUpperCase()} CYBORG`,
        type: 'pve',
        score: enemy.scoreValue
      });
    } else {
      io.to(room.id).emit('enemy_damaged', {
        enemyId: data.enemyId,
        damage,
        hp: enemy.hp,
        isCritical: !!data.isCritical,
        x: data.x,
        y: data.y
      });
    }
  });

  // PvP Hit Player
  socket.on('hit_player', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const shooter = room.activePlayers[socket.id];
    const target = room.activePlayers[data.targetId];

    if (!shooter || !target || !target.alive || socket.id === data.targetId) return;
    if (target.invulnerableTimer > 0) return;

    const shooterTeam = shooter.team || (room.players[socket.id] && room.players[socket.id].team);
    const targetTeam = target.team || (room.players[data.targetId] && room.players[data.targetId].team);

    // Friendly fire protection in Team Battle
    if (room.mode === 'teams' && shooterTeam && targetTeam && shooterTeam.toLowerCase() === targetTeam.toLowerCase()) {
      return;
    }

    const damage = data.damage || 28;
    target.hp -= damage;

    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      target.deaths++;
      shooter.kills++;
      const rivalKillBonus = 750; // Much higher than standard enemies (~100-200)
      shooter.score += rivalKillBonus;

      // Team mode stats update (Rival Kills & Score)
      if (room.mode === 'teams' && shooter.team && target.team && shooter.team !== target.team && room.teamStats) {
        if (!room.teamStats[shooter.team]) room.teamStats[shooter.team] = { kills: 0, score: 0 };
        room.teamStats[shooter.team].kills++;
        room.teamStats[shooter.team].score += rivalKillBonus;

        io.to(room.id).emit('team_stats_update', { teamStats: room.teamStats });

        // Check 10-kill victory condition:
        // When either team or any player reaches 10 kills, match terminates!
        const TARGET_VICTORY_KILLS = 10;
        let shouldFinish = false;
        let winner = null;

        if (room.mode === 'teams' && room.teamStats) {
          const alpha = room.teamStats.alpha || { kills: 0, score: 0 };
          const beta = room.teamStats.beta || { kills: 0, score: 0 };
          if (alpha.kills >= TARGET_VICTORY_KILLS || beta.kills >= TARGET_VICTORY_KILLS || shooter.kills >= TARGET_VICTORY_KILLS) {
            shouldFinish = true;
            if (alpha.score > beta.score) {
              winner = 'alpha';
            } else if (beta.score > alpha.score) {
              winner = 'beta';
            } else {
              winner = alpha.kills >= beta.kills ? 'alpha' : 'beta';
            }
          }
        } else {
          if (shooter.kills >= TARGET_VICTORY_KILLS) {
            shouldFinish = true;
            winner = shooter.id;
          }
        }

        if (shouldFinish && room.teamStats && !room.teamStats.matchFinished) {
          room.teamStats.matchFinished = true;
          room.teamStats.winner = winner;

          const playerMap = new Map();
          for (const pid in room.players) {
            const p = room.players[pid];
            playerMap.set(pid, {
              id: p.id,
              name: p.name,
              team: p.team || 'solo',
              color: p.color,
              score: 0,
              kills: 0,
              deaths: 0,
              modelType: p.modelType || 'commando'
            });
          }
          for (const pid in room.activePlayers) {
            const ap = room.activePlayers[pid];
            playerMap.set(pid, {
              id: ap.id,
              name: ap.name,
              team: ap.team || (room.players[pid] ? room.players[pid].team : 'solo'),
              color: ap.color,
              score: ap.score || 0,
              kills: ap.kills || 0,
              deaths: ap.deaths || 0,
              modelType: ap.modelType || 'commando'
            });
          }
          const competitors = Array.from(playerMap.values()).sort((a, b) => (b.kills || 0) - (a.kills || 0) || (b.score || 0) - (a.score || 0));

          const winMsg = room.mode === 'teams'
            ? `MATCH TERMINATED // ${winner === 'draw' ? 'DRAW MATCH' : (winner === 'alpha' ? 'TEAM ALPHA' : 'TEAM BETA') + ' VICTORIOUS'}`
            : `MATCH TERMINATED // ${shooter.name.toUpperCase()} VICTORIOUS (${TARGET_VICTORY_KILLS} KILLS)`;

          io.to(room.id).emit('team_match_finished', {
            teamStats: room.teamStats,
            winner: winner,
            winnerName: shooter.name,
            competitors: competitors,
            message: winMsg
          });
        }
      }

      schedulePlayerRespawn(room, target);

      io.to(room.id).emit('player_eliminated', {
        killerId: shooter.id,
        killerName: shooter.name,
        killerColor: shooter.color,
        victimId: target.id,
        victimName: target.name,
        victimColor: target.color,
        isPvP: true
      });

      io.to(room.id).emit('kill_feed_msg', {
        killer: shooter.name,
        killerColor: shooter.color,
        victim: target.name,
        victimColor: target.color,
        type: 'pvp'
      });
    } else {
      io.to(target.id).emit('player_damaged', {
        damage,
        hp: target.hp,
        attackerId: shooter.id,
        attackerName: shooter.name
      });

      io.to(room.id).emit('player_hit_fx', {
        targetId: target.id,
        damage,
        hp: target.hp,
        x: data.x || target.x,
        y: data.y || target.y,
        isCritical: !!data.isCritical
      });
    }
  });

  // Player Self-Death / Suicide
  socket.on('player_died', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const p = room.activePlayers[socket.id];
    if (!p || !p.alive) return;

    p.hp = 0;
    p.alive = false;
    p.deaths++;

    schedulePlayerRespawn(room, p);

    io.to(room.id).emit('player_eliminated', {
      killerId: p.id,
      killerName: p.name,
      killerColor: p.color,
      victimId: p.id,
      victimName: p.name,
      victimColor: p.color,
      isSelf: true
    });

    io.to(room.id).emit('kill_feed_msg', {
      killer: p.name,
      killerColor: p.color,
      victim: (data && data.reason) ? data.reason : 'SELF (CRITICAL CASUALTY)',
      type: 'pvp_death',
      isSelf: true
    });
  });

  // Pickup Medkit (+50 HP)
  socket.on('pickup_medkit', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const p = room.activePlayers[socket.id];
    if (!p || !p.alive) return;
    const medkit = room.medkits[data.id];
    if (!medkit) return;

    const dx = p.x - medkit.x;
    const dy = p.y - medkit.y;
    if (dx * dx + dy * dy <= 60 * 60) {
      delete room.medkits[data.id];
      const healAmount = Math.max(1, Math.round(p.maxHp * 0.20));
      p.hp = Math.min(p.maxHp, p.hp + healAmount);
      io.to(room.id).emit('medkit_collected', {
        id: data.id,
        collectorId: socket.id,
        collectorName: p.name,
        hp: p.hp,
        x: medkit.x,
        y: medkit.y
      });
    }
  });

  // Pickup Weapon Drop
  socket.on('pickup_weapon_drop', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const p = room.activePlayers[socket.id];
    if (!p || !p.alive) return;
    const drop = room.weaponDrops && room.weaponDrops[data.id];
    if (!drop) return;

    const dx = p.x - drop.x;
    const dy = p.y - drop.y;
    if (dx * dx + dy * dy <= 70 * 70) {
      delete room.weaponDrops[data.id];
      p.weapon = drop.weaponType;
      io.to(room.id).emit('weapon_drop_collected', {
        id: data.id,
        weaponType: drop.weaponType,
        collectorId: socket.id,
        collectorName: p.name,
        x: drop.x,
        y: drop.y
      });
    }
  });

  // Weapon Mode Toggle (Host)
  socket.on('set_weapon_mode', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || room.hostId !== socket.id) return;
    if (data && (data.weaponMode === 'standard' || data.weaponMode === 'ground')) {
      room.weaponMode = data.weaponMode;
      io.to(room.id).emit('weapon_mode_sync', { weaponMode: room.weaponMode });
      broadcastLobbySync(room.id);
    }
  });

  // Threat Level / PvP Only Toggle (Host)
  socket.on('set_pvp_only', (data) => {
    const room = getRoomForSocket(socket);
    if (!room || room.hostId !== socket.id) return;
    room.pvpOnly = !!data.pvpOnly;
    if (room.pvpOnly) {
      room.enemies = {};
      room.waveManager.enemiesToSpawn = 0;
      room.waveManager.totalEnemiesInWave = 0;
    }
    io.to(room.id).emit('pvp_only_sync', { pvpOnly: room.pvpOnly });
    broadcastLobbySync(room.id);
  });

  // Hit Barrel
  socket.on('hit_barrel', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const barrel = room.barrels.find(b => b.id === data.barrelId);
    if (!barrel || barrel.exploded) return;

    barrel.hp -= (data.damage || 28);
    if (barrel.hp <= 0) {
      const shooter = room.activePlayers[socket.id];
      triggerBarrelExplosion(room, barrel, shooter ? shooter.name : 'Unknown');
    }
  });

  // Tactical Chat Message
  socket.on('send_chat', (data) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const p = room.activePlayers[socket.id] || room.players[socket.id];
    if (!p || !data || !data.message) return;

    const cleanMsg = data.message.trim().substring(0, 100);
    if (cleanMsg.length === 0) return;

    io.to(room.id).emit('chat_message', {
      senderId: socket.id,
      senderName: p.name,
      senderColor: p.color,
      text: cleanMsg,
      timestamp: Date.now()
    });
  });

  // Ping Latency Check
  socket.on('ping_check', (timestamp) => {
    socket.emit('pong_reply', timestamp);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const room = getRoomForSocket(socket);
    if (room) {
      delete room.players[socket.id];
      delete room.activePlayers[socket.id];
      for (const col in room.lockedColors) {
        if (room.lockedColors[col] === socket.id) {
          delete room.lockedColors[col];
        }
      }

      if (Object.keys(room.players).length === 0) {
        delete rooms[room.id];
        console.log(`[CLEANUP] Room [${room.code}] closed.`);
      } else {
        if (room.hostId === socket.id) {
          const remaining = Object.keys(room.players);
          room.hostId = remaining[0];
          room.players[room.hostId].isHost = true;
          console.log(`[MIGRATION] New host for room [${room.code}] is ${room.players[room.hostId].name}`);
        }
        broadcastLobbySync(room.id);
        io.to(room.id).emit('player_left', { id: socket.id });
      }
    }
  });
});

// --- SERVER TICK LOOP (30 FPS) ---
const TICK_RATE = 30;
const DT = 1 / TICK_RATE;

setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (!room) continue;

    const alivePlayers = Object.values(room.activePlayers).filter(p => p.alive);

    // 1. Decrement Player invulnerability timers
    for (const socketId in room.activePlayers) {
      const p = room.activePlayers[socketId];
      if (p.invulnerableTimer > 0) {
        p.invulnerableTimer = Math.max(0, p.invulnerableTimer - DT);
      }
    }

    // 2. Wave Progression & Spawning (Active Game Only)
    if (alivePlayers.length > 0 && room.gameStarted) {
      // Medkit Spawn Timer (Every 5 seconds)
      room.medkitTimer += DT;
      if (room.medkitTimer >= MEDKIT_SPAWN_INTERVAL) {
        room.medkitTimer = 0;
        if (Object.keys(room.medkits).length < MAX_SERVER_MEDKITS) {
          spawnServerMedkit(room);
        }
      }

      if (room.waveManager.state === 'intermission') {
        room.waveManager.timer -= DT;
        if (room.waveManager.timer <= 0) {
          room.waveManager.state = 'active';
          io.to(room.id).emit('wave_state_changed', { state: 'active', wave: room.waveManager.wave });
        }
      } else if (room.waveManager.state === 'active') {
        if (room.waveManager.enemiesToSpawn > 0) {
          room.waveManager.spawnTimer -= DT;
          if (Object.keys(room.enemies).length === 0) {
            room.waveManager.spawnTimer = 0;
          }
          if (room.waveManager.spawnTimer <= 0) {
            const batchSize = Math.min(room.waveManager.enemiesToSpawn, Math.max(3, Math.floor(3 + room.waveManager.wave * 0.7)));
            for (let b = 0; b < batchSize; b++) {
              spawnServerEnemy(room);
            }
            const interval = Math.max(2.0, 4.2 - room.waveManager.wave * 0.35);
            room.waveManager.spawnTimer = interval;
          }
        } else if (Object.keys(room.enemies).length === 0) {
          // Wave Cleared!
          room.waveManager.state = 'cleared';
          // Moderate, steady HP scaling instead of exponential 1.6 factor
          const maxHpBonus = Math.round(10 + (room.waveManager.wave - 1) * 6);
          io.to(room.id).emit('wave_cleared', {
            wave: room.waveManager.wave,
            bonus: 1000,
            maxHpBonus: maxHpBonus
          });

          // Upgrade maxHp exponentially and heal all alive players to 100% full HP
          for (const p of alivePlayers) {
            p.score += 1000;
            p.maxHp = (p.maxHp || 100) + maxHpBonus;
            p.hp = p.maxHp; // Full heal to 100% of new upgraded baseline vitality!
          }

          io.to(room.id).emit('kill_feed_msg', {
            text: `SECTOR CLEARED // WAVE ${room.waveManager.wave} COMPLETE (+${maxHpBonus} MAX VITALITY)`,
            type: 'wave'
          });

          setTimeout(() => {
            if (rooms[room.id]) {
              startWave(room, room.waveManager.wave + 1);
            }
          }, 4000);
        }
      }
    }

    // 3. Enemy AI & Movement
    for (const enemyId in room.enemies) {
      const enemy = room.enemies[enemyId];
      if (enemy.attackTimer > 0) enemy.attackTimer -= DT;

      // UNCONDITIONAL GREEN ENEMY ACID SPIT (Every 5 seconds, anywhere, blind fire!)
      if (enemy.type === 'normal') {
        if (enemy.spitTimer === undefined) enemy.spitTimer = 1.0 + Math.random() * 4.0;
        if (enemy.spitWindupTimer > 0) {
          enemy.spitWindupTimer -= DT;
          if (enemy.spitWindupTimer <= 0) {
            const mouthX = enemy.x + Math.cos(enemy.angle) * (enemy.radius + 6);
            const mouthY = enemy.y + Math.sin(enemy.angle) * (enemy.radius + 6);
            io.to(room.id).emit('enemy_spit', {
              enemyId: enemy.id,
              x: mouthX,
              y: mouthY,
              angle: enemy.angle,
              speed: 460,
              damage: 16,
              color: '#00ff88',
              ignoreWalls: false,
              leavesPool: false
            });
          }
        } else {
          enemy.spitTimer -= DT;
          if (enemy.spitTimer <= 0) {
            enemy.spitTimer = 5.0; // Shoot every 5 seconds unconditionally!
            enemy.spitWindupTimer = 0.35;
            io.to(room.id).emit('enemy_windup', { enemyId: enemy.id, duration: 0.35 });
          }
        }
      }

      // TOXIC SLIMER (Leaves a 3-second acid puddle on the ground)
      if (enemy.type === 'toxic') {
        if (enemy.spitTimer === undefined) enemy.spitTimer = 1.0 + Math.random() * 3.0;
        if (enemy.spitWindupTimer > 0) {
          enemy.spitWindupTimer -= DT;
          if (enemy.spitWindupTimer <= 0) {
            const mouthX = enemy.x + Math.cos(enemy.angle) * (enemy.radius + 8);
            const mouthY = enemy.y + Math.sin(enemy.angle) * (enemy.radius + 8);
            io.to(room.id).emit('enemy_spit', {
              enemyId: enemy.id,
              x: mouthX,
              y: mouthY,
              angle: enemy.angle,
              speed: 400,
              damage: 20,
              color: '#39ff14',
              ignoreWalls: false,
              leavesPool: true
            });
          }
        } else {
          enemy.spitTimer -= DT;
          if (enemy.spitTimer <= 0) {
            enemy.spitTimer = 3.8;
            enemy.spitWindupTimer = 0.45;
            io.to(room.id).emit('enemy_windup', { enemyId: enemy.id, duration: 0.45 });
          }
        }
      }

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
          const minDistanceToPlayer = enemy.radius + 20;

          // 1. Stuck Check
          enemy.stuckCheckTimer = (enemy.stuckCheckTimer || 0) + DT;
          if (enemy.detourTimer > 0) enemy.detourTimer -= DT;

          if (curDist <= minDistanceToPlayer + 25) {
            enemy.detourTimer = 0;
            enemy.stuckAccumTime = 0;
          }

          if (enemy.stuckCheckTimer >= 0.5) {
            const distMoved = Math.hypot(enemy.x - (enemy.lastCheckX || enemy.x), enemy.y - (enemy.lastCheckY || enemy.y));
            enemy.lastCheckX = enemy.x;
            enemy.lastCheckY = enemy.y;
            enemy.stuckCheckTimer = 0;

            if (distMoved < 12 && curDist > minDistanceToPlayer + 35) {
              enemy.stuckAccumTime = (enemy.stuckAccumTime || 0) + 0.5;
              if (enemy.stuckAccumTime >= 5.0) {
                enemy.detourTimer = 1.8;
                enemy.detourSign = Math.random() < 0.5 ? 1 : -1;
                enemy.stuckAccumTime = 0;
              }
            } else {
              enemy.stuckAccumTime = Math.max(0, (enemy.stuckAccumTime || 0) - 0.5);
            }
          }

          // 2. Wall steering feelers
          const probeDist = Math.min(curDist, enemy.radius * 2.2);
          const probeX = enemy.x + Math.cos(targetAngle) * probeDist;
          const probeY = enemy.y + Math.sin(targetAngle) * probeDist;
          const pathBlocked = isCollidingWithMap(probeX, probeY, enemy.radius, room.mapId);

          if ((pathBlocked || enemy.detourTimer > 0) && curDist > minDistanceToPlayer + 20) {
            const detourSign = enemy.detourSign || 1;
            const offsets = [
              detourSign * (Math.PI / 4),
              detourSign * (Math.PI / 2),
              -detourSign * (Math.PI / 4),
              -detourSign * (Math.PI / 2)
            ];

            for (const off of offsets) {
              const testA = targetAngle + off;
              const tx = enemy.x + Math.cos(testA) * probeDist;
              const ty = enemy.y + Math.sin(testA) * probeDist;
              if (!isCollidingWithMap(tx, ty, enemy.radius, room.mapId)) {
                targetAngle = testA;
                break;
              }
            }
          }

          // Smooth rotation
          let angleDiff = targetAngle - enemy.angle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          enemy.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 9.0 * DT);

          // Movement
          let stepX = Math.cos(enemy.angle) * enemy.speed * DT;
          let stepY = Math.sin(enemy.angle) * enemy.speed * DT;

          if (curDist <= minDistanceToPlayer + 4 && curDist > 0.001) {
            const toPx = (closestP.x - enemy.x) / curDist;
            const toPy = (closestP.y - enemy.y) / curDist;
            const dot = stepX * toPx + stepY * toPy;
            if (dot > 0) {
              stepX -= toPx * dot;
              stepY -= toPy * dot;
            }
          }

          enemy.x += stepX;
          resolveCircleCollision(enemy, room.mapId);
          enemy.y += stepY;
          resolveCircleCollision(enemy, room.mapId);

          // Solid Player Collision
          const afterDist = Math.hypot(closestP.x - enemy.x, closestP.y - enemy.y);
          if (afterDist < minDistanceToPlayer && afterDist > 0.0001) {
            const pushOut = minDistanceToPlayer - afterDist;
            const nx = (enemy.x - closestP.x) / afterDist;
            const ny = (enemy.y - closestP.y) / afterDist;
            enemy.x += nx * pushOut;
            enemy.y += ny * pushOut;
            resolveCircleCollision(enemy, room.mapId);
          }

          if (isCollidingWithMap(enemy.x, enemy.y, enemy.radius, room.mapId)) {
            unstuckEntityServer(enemy, room.mapId);
          }

          // Sniper attack logic
          if (enemy.type === 'sniper') {
            if (enemy.sniperTimer === undefined) enemy.sniperTimer = 2.0 + Math.random() * 2.0;
            if (enemy.sniperAimTimer > 0) {
              enemy.sniperAimTimer -= DT;
              if (enemy.sniperAimTimer <= 0) {
                const muzzleX = enemy.x + Math.cos(enemy.angle) * (enemy.radius + 14);
                const muzzleY = enemy.y + Math.sin(enemy.angle) * (enemy.radius + 14);
                io.to(room.id).emit('enemy_spit', {
                  enemyId: enemy.id,
                  x: muzzleX,
                  y: muzzleY,
                  angle: enemy.angle,
                  speed: 820,
                  damage: 28,
                  color: '#ff00aa',
                  ignoreWalls: true
                });
              }
            } else {
              enemy.sniperTimer -= DT;
              if (enemy.sniperTimer <= 0 && curDist <= 900 && hasLineOfSight(enemy.x, enemy.y, closestP.x, closestP.y, room.mapId)) {
                enemy.sniperTimer = 5.0;
                enemy.sniperAimTimer = 1.0;
                io.to(room.id).emit('enemy_windup', { enemyId: enemy.id, duration: 1.0 });
              }
            }
          }

          // Melee Attack Check (Reliable contact check on player)
          const distAfterMove = Math.hypot(closestP.x - enemy.x, closestP.y - enemy.y);
          const attackReach = Math.max(enemy.attackRange || 36, minDistanceToPlayer + 8);

          // Bomber explodes on contact or close proximity!
          if (enemy.type === 'bomber' && (distAfterMove <= attackReach || curDist <= minDistanceToPlayer + 8)) {
            triggerServerBomberExplosion(room, enemy.x, enemy.y, null, null);
            delete room.enemies[enemyId];
            continue;
          }

          if (distAfterMove <= attackReach && enemy.attackTimer <= 0) {
            enemy.attackTimer = enemy.attackCooldown;

            if (closestP.invulnerableTimer <= 0) {
              closestP.hp = Math.max(0, closestP.hp - enemy.damage);
              closestP.invulnerableTimer = 0.25;

              if (closestP.hp <= 0) {
                closestP.hp = 0;
                closestP.alive = false;
                closestP.deaths++;
                schedulePlayerRespawn(room, closestP);

                io.to(room.id).emit('player_eliminated', {
                  victimId: closestP.id,
                  victimName: closestP.name,
                  victimColor: closestP.color,
                  killerName: `${enemy.type.toUpperCase()} CYBORG`,
                  killerColor: enemy.color,
                  isPvP: false
                });

                io.to(room.id).emit('kill_feed_msg', {
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

                io.to(room.id).emit('player_hit_fx', {
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

    // 3.5. Weapon Drop Spawn Timer (Every 5 seconds in ground drop mode)
    if (room.weaponMode === 'ground' && room.gameStarted) {
      room.weaponDropTimer = (room.weaponDropTimer || 0) + DT;
      if (room.weaponDropTimer >= 5.0) {
        room.weaponDropTimer = 0;
        if (Object.keys(room.weaponDrops || {}).length < 12) {
          spawnServerWeaponDrop(room);
        }
      }
    }

    // 4. Broadcast Master Game State Snapshot per Room
    if (room.gameStarted && Object.keys(room.activePlayers).length > 0) {
      io.to(room.id).emit('game_snapshot', {
        timestamp: Date.now(),
        players: Object.values(room.activePlayers).map(p => ({
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
        enemies: Object.values(room.enemies).map(e => ({
          id: e.id,
          type: e.type,
          generation: e.generation || 0,
          x: Math.round(e.x),
          y: Math.round(e.y),
          angle: Number(e.angle.toFixed(3)),
          hp: Math.round(e.hp),
          maxHp: e.maxHp,
          radius: e.radius,
          color: e.color
        })),
        medkits: Object.values(room.medkits || {}),
        weaponDrops: Object.values(room.weaponDrops || {}),
        weaponMode: room.weaponMode || 'standard',
        pvpOnly: !!room.pvpOnly,
        wave: {
          wave: room.waveManager.wave,
          state: room.waveManager.state,
          enemiesLeft: Object.keys(room.enemies).length + room.waveManager.enemiesToSpawn
        }
      });
    }
  }
}, 1000 / TICK_RATE);

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(58));
  console.log('🎯 CYBER STRIKE // MULTI-ROOM LAN & ONLINE MULTIPLAYER SERVER');
  console.log('='.repeat(58));
  console.log(`Local Access:        http://localhost:${PORT}`);
  console.log(`LAN Network Address: http://${primaryLanIp}:${PORT}`);
  if (networkIps.length > 1) {
    networkIps.slice(1).forEach(net => {
      console.log(`Alt LAN Interface:   http://${net.ip}:${PORT} (${net.interface})`);
    });
  }
  console.log('\n🚀 ALL PLAYERS ON LAN / WI-FI CAN CONNECT WITH OPERATIVE IDs!');
  console.log('='.repeat(58) + '\n');
});
