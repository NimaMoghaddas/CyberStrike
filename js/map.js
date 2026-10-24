/**
 * CYBER STRIKE // MAP & ENVIRONMENT
 * Generates an expansive industrial cyber-facility (2400x2400)
 * Includes concrete blast walls, cargo crates, reactor pillars, and explosive barrels.
 */

class GameMap {
  constructor(width = 2400, height = 2400, mapId = 'sector_09') {
    this.width = width;
    this.height = height;
    this.mapId = mapId;
    this.id = mapId;

    // Obstacle lists
    this.walls = []; // Rectangular solid obstacles {x, y, w, h, type}
    this.pillars = []; // Cylindrical reactor pillars {x, y, radius}
    this.portals = []; // Active tactical phase gates {id, x, y, targetX, targetY, color}
    this.boostPads = []; // Directional kinetic slingshots {x, y, dirX, dirY, speed, color}
    this.barrels = []; // Red explosive barrels {x, y, radius, hp, maxHp, exploded}
    this.spawnPoint = { x: 1200, y: 1200 };

    // Persistent Decal Layer (Blood, blast marks, spent shells)
    this.decalCanvas = document.createElement('canvas');
    this.decalCanvas.width = width;
    this.decalCanvas.height = height;
    this.decalCtx = this.decalCanvas.getContext('2d');

    // Pre-rendered Floor Canvas for high performance
    this.floorCanvas = document.createElement('canvas');
    this.floorCanvas.width = width;
    this.floorCanvas.height = height;
    this.floorCtx = this.floorCanvas.getContext('2d');

    this.initMap();
    this.renderFloor();
  }

  setMap(mapId) {
    if (!mapId) return;
    this.mapId = mapId;
    this.id = mapId;
    this.initMap();
    if (this.decalCanvas) {
      this.decalCanvas.width = this.width;
      this.decalCanvas.height = this.height;
    }
    if (this.floorCanvas) {
      this.floorCanvas.width = this.width;
      this.floorCanvas.height = this.height;
    }
    this.renderFloor();
    this.clearDecals();
  }

  clearDecals() {
    if (this.decalCtx && this.decalCanvas) {
      this.decalCtx.clearRect(0, 0, this.decalCanvas.width, this.decalCanvas.height);
    }
  }

  initMap() {
    const maps = (typeof window !== 'undefined' && window.MAP_DEFINITIONS) || (typeof MAP_DEFINITIONS !== 'undefined' && MAP_DEFINITIONS) || null;
    const def = (maps && maps[this.mapId]) || (maps && maps.sector_09);

    if (def) {
      this.width = def.width || 2400;
      this.height = def.height || 2400;
      this.spawnPoint = def.spawnPoint ? { ...def.spawnPoint } : { x: 1200, y: 1200 };
      this.spawns = def.spawns ? JSON.parse(JSON.stringify(def.spawns)) : [ { ...this.spawnPoint } ];
      this.ambientColor = def.ambientColor || 'rgba(6, 9, 15, 0.94)';
      this.accentColor = def.accentColor || '#00f0ff';
      this.walls = JSON.parse(JSON.stringify(def.walls || []));
      this.pillars = JSON.parse(JSON.stringify(def.pillars || []));
      this.portals = JSON.parse(JSON.stringify(def.portals || []));
      this.boostPads = (def.boostPads || []).map(b => ({ ...b, _activeTimer: 0, _cooldown: 0 }));
      this.barrels = (def.barrels || []).map((loc, idx) => ({
        id: idx + 1,
        x: loc.x,
        y: loc.y,
        radius: 18,
        hp: 35,
        maxHp: 35,
        exploded: false
      }));
      return;
    }

    // Fallback if definitions not yet loaded
    const W = this.width;
    const H = this.height;
    const wallThick = 50;
    this.walls = [
      { x: 0, y: 0, w: W, h: wallThick, type: 'boundary' },
      { x: 0, y: H - wallThick, w: W, h: wallThick, type: 'boundary' },
      { x: 0, y: 0, w: wallThick, h: H, type: 'boundary' },
      { x: W - wallThick, y: 0, w: wallThick, h: H, type: 'boundary' }
    ];
    this.pillars = [];
    this.barrels = [];
  }

  // Pre-render floor graphics tailored to the map theme (Zero central circles, completely asymmetrical)
  renderFloor() {
    const ctx = this.floorCtx;
    const maps = (typeof window !== 'undefined' && window.MAP_DEFINITIONS) || (typeof MAP_DEFINITIONS !== 'undefined' && MAP_DEFINITIONS) || null;
    const def = (maps && maps[this.mapId]) || (maps && maps.sector_09);
    const theme = def ? def.theme : 'industrial';

    ctx.save();
    if (theme === 'bunker') {
      this.renderFloorBunker(ctx, def);
    } else if (theme === 'neon') {
      this.renderFloorNeon(ctx, def);
    } else if (theme === 'reactor') {
      this.renderFloorReactor(ctx, def);
    } else if (theme === 'orbital') {
      this.renderFloorOrbital(ctx, def);
    } else if (theme === 'quantum' || this.mapId === 'chronos_collider') {
      this.renderFloorQuantumCollider(ctx, def);
    } else {
      this.renderFloorIndustrial(ctx, def);
    }
    ctx.restore();
  }

  // =========================================================================
  // 1. SECTOR-09 // INDUSTRIAL FREIGHT DOCKS & SMELTING FOUNDRY
  // Steel diamond-plate, forklift skid marks, crane gantry rails, fuel depot
  // =========================================================================
  renderFloorIndustrial(ctx, def) {
    const W = this.width;
    const H = this.height;

    // Deep slate-charcoal foundation
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, W, H);

    // Modular Concrete Expansion Slabs (80x80)
    const tileSize = 80;
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isAlt ? '#0f1420' : '#0c101a';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

        ctx.strokeStyle = '#161e2e';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize, tileSize);

        // Heavy industrial floor rivets on corner joints
        ctx.fillStyle = '#222d42';
        ctx.fillRect(x + 3, y + 3, 3, 3);
        ctx.fillRect(x + tileSize - 6, y + 3, 3, 3);
        ctx.fillRect(x + 3, y + tileSize - 6, 3, 3);
        ctx.fillRect(x + tileSize - 6, y + tileSize - 6, 3, 3);
      }
    }

    // --- ZONE 1: South-West Container Terminal (Steel Diamond-Plate Deck) ---
    ctx.save();
    ctx.fillStyle = '#121824';
    ctx.fillRect(80, 1280, 1020, 1040);
    ctx.strokeStyle = '#223048';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 1280, 1020, 1040);

    // Steel Diamond-Tread Texture in Container Yard
    ctx.strokeStyle = '#1b263a';
    ctx.lineWidth = 1;
    for (let dx = 90; dx < 1090; dx += 24) {
      for (let dy = 1290; dy < 2310; dy += 24) {
        ctx.beginPath();
        ctx.moveTo(dx, dy + 6);
        ctx.lineTo(dx + 6, dy);
        ctx.lineTo(dx + 12, dy + 6);
        ctx.lineTo(dx + 6, dy + 12);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Yellow & Black Diagonal Hazard Border for Cargo Loading Bays
    this.drawHazardBorder(ctx, 80, 1280, 1020, 1040, '#ffb703', 18);
    this.drawFloorStencil(ctx, 160, 1340, 'BAY 04', '#ffb703', 20);
    ctx.restore();

    // --- ZONE 2: North-West Forklift Staging Area ---
    ctx.save();
    // Yellow transit lanes with dashed guidelines
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(140, 150); ctx.lineTo(140, 850); ctx.lineTo(650, 850);
    ctx.moveTo(420, 150); ctx.lineTo(420, 600);
    ctx.stroke();
    ctx.setLineDash([]);

    // Heavy rubber forklift skid marks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(380, 480, 120, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(580, 720, 90, 1.1 * Math.PI, 1.7 * Math.PI);
    ctx.stroke();

    this.drawFloorStencil(ctx, 180, 200, 'STAGING 01', '#ffb703', 18);
    ctx.restore();

    // --- ZONE 3: North-East Smelting Foundry & Overhead Rails ---
    ctx.save();
    // Scorched dark iron foundry floor
    const foundryGrad = ctx.createRadialGradient(1650, 450, 50, 1650, 450, 600);
    foundryGrad.addColorStop(0, 'rgba(255, 80, 0, 0.15)');
    foundryGrad.addColorStop(0.5, 'rgba(255, 40, 0, 0.05)');
    foundryGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = foundryGrad;
    ctx.fillRect(1200, 80, 1120, 950);

    // Smelting Ingot Conveyor Rail Tracks (Horizontal dual steel beams)
    this.drawRailwayTrack(ctx, 1250, 360, 2200, 360, '#3f4f66');
    this.drawRailwayTrack(ctx, 1350, 720, 2200, 720, '#3f4f66');

    this.drawFloorStencil(ctx, 1400, 160, 'FOUNDRY #3', '#ff5500', 18);
    ctx.restore();

    // --- ZONE 4: South-East Fuel Depot & Chemical Containment ---
    ctx.save();
    // Yellow/Red hazard containment perimeter
    this.drawHazardBorder(ctx, 1220, 1220, 1100, 1100, '#ff3300', 16);
    this.drawFloorStencil(ctx, 1300, 1270, 'FUEL DEPOT', '#ff3300', 18);

    // Hydraulic Fluid & Oil Slicks (Glossy dark spills)
    this.drawOilSlick(ctx, 1550, 1480, 80, 50);
    this.drawOilSlick(ctx, 1850, 1820, 110, 65);
    this.drawOilSlick(ctx, 1450, 1880, 70, 45);
    ctx.restore();

    // --- Heavy Overhead Crane Gantry Rail Line (Spanning West to East at Y=1100) ---
    ctx.save();
    ctx.strokeStyle = '#2b3952';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(60, 1100); ctx.lineTo(W - 60, 1100);
    ctx.stroke();

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(60, 1093); ctx.lineTo(W - 60, 1093);
    ctx.moveTo(60, 1107); ctx.lineTo(W - 60, 1107);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Gantry rail cross-ties & rivets
    for (let gx = 100; gx < W - 60; gx += 80) {
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(gx - 4, 1088, 8, 24);
    }
    this.drawFloorStencil(ctx, 950, 1070, 'GANTRY #02', '#00f0ff', 14);
    ctx.restore();
  }

  // =========================================================================
  // 2. CYBER-BUNKER // SUBTERRANEAN BLACK-SITE LEVEL ZERO
  // Hexagonal armor tiles, glowing data-bus conduits, server aisle grates, airlock
  // =========================================================================
  renderFloorBunker(ctx, def) {
    const W = this.width;
    const H = this.height;

    // Deep subterranean obsidian base
    ctx.fillStyle = '#060309';
    ctx.fillRect(0, 0, W, H);

    // Hexagonal Tactical Composite Floor Tiles
    const hexR = 50;
    const hexH = Math.sqrt(3) * hexR;
    for (let y = -hexH; y < H + hexH; y += hexH) {
      for (let x = -hexR * 1.5; x < W + hexR * 1.5; x += hexR * 3) {
        this.drawHexagonTile(ctx, x, y, hexR);
        this.drawHexagonTile(ctx, x + hexR * 1.5, y + hexH / 2, hexR);
      }
    }

    // --- ZONE 1 (WEST): High-Density Server Aisles Floor Grates & Cooling ---
    ctx.save();
    // Sub-floor blue/cyan ventilation light peeking through server aisles
    ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.fillRect(100, 150, 480, 2100);

    // Metal floor grates between server racks
    for (let gx = 220; gx <= 450; gx += 170) {
      ctx.strokeStyle = '#1b1226';
      ctx.lineWidth = 1;
      for (let gy = 200; gy < 2250; gy += 16) {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 40, gy);
        ctx.stroke();
      }
    }

    // Server cable conduits with glowing red/magenta pulses
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(120, 200); ctx.lineTo(120, 2200);
    ctx.moveTo(560, 200); ctx.lineTo(560, 2200);
    ctx.stroke();
    ctx.shadowBlur = 0;

    this.drawFloorStencil(ctx, 160, 160, 'VAULT 01', '#ff0055', 18);
    ctx.restore();

    // --- ZONE 2 (NORTH-EAST): Cryo-Stasis Containment Lab ---
    ctx.save();
    // Cleanroom medical-grade floor pad
    ctx.fillStyle = '#071018';
    ctx.fillRect(920, 80, 1400, 680);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(920, 80, 1400, 680);

    // Glowing cyan cryogenic pod floor mounts under stasis pods
    const cryoPods = [
      { x: 1200, y: 320, id: '01' },
      { x: 1350, y: 320, id: '02' },
      { x: 1500, y: 320, id: '03' },
      { x: 1850, y: 380, id: '04' },
      { x: 1950, y: 520, id: '05' }
    ];

    for (const pod of cryoPods) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pod.x, pod.y, 60, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pod.x, pod.y, 75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      this.drawFloorStencil(ctx, pod.x - 24, pod.y + 90, `POD ${pod.id}`, '#00f0ff', 12);
    }

    this.drawFloorStencil(ctx, 980, 140, 'CRYO LAB', '#00f0ff', 20);
    ctx.restore();

    // --- ZONE 3 (CENTER-EAST): Armored Tactical Command Hub ---
    ctx.save();
    // Tactical deep crimson floor pad
    ctx.fillStyle = '#14060f';
    ctx.fillRect(880, 820, 1220, 560);
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(880, 820, 1220, 560);

    // Glowing data bus conduit lines connecting server matrix to command room
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(560, 1150); ctx.lineTo(880, 1150);
    ctx.moveTo(1240, 820); ctx.lineTo(1240, 600);
    ctx.stroke();
    ctx.shadowBlur = 0;

    this.drawFloorStencil(ctx, 940, 870, 'COMMAND 0', '#ff3366', 22);
    ctx.restore();

    // --- ZONE 4 (SOUTH): Decontamination Airlock Chamber ---
    ctx.save();
    this.drawHazardBorder(ctx, 860, 1500, 1450, 780, '#ff3366', 20);
    
    // Hydraulic heavy blast door tracks in floor
    ctx.strokeStyle = '#2b1633';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(900, 1620); ctx.lineTo(2250, 1620);
    ctx.moveTo(900, 2100); ctx.lineTo(2250, 2100);
    ctx.stroke();

    this.drawFloorStencil(ctx, 1150, 1550, 'AIRLOCK 0', '#ff3366', 20);
    ctx.restore();
  }

  // =========================================================================
  // 3. NEON-SLUMS // LOWER METROPOLIS TOKYO 2099
  // Rain-slick asphalt, glowing neon puddles, diagonal boulevard, Japanese Kanji
  // =========================================================================
  renderFloorNeon(ctx, def) {
    const W = this.width;
    const H = this.height;

    // Dark rain-slick asphalt foundation
    ctx.fillStyle = '#050209';
    ctx.fillRect(0, 0, W, H);

    // Rough asphalt texture grain
    const tileSize = 60;
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isAlt ? '#090412' : '#06030c';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

        ctx.strokeStyle = '#120822';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize, tileSize);
      }
    }

    // --- DIAGONAL MAIN BOULEVARD (From NW: 50,150 to SE: 2250,2300) ---
    ctx.save();
    // Boulevard Asphalt Track
    ctx.strokeStyle = '#0b0617';
    ctx.lineWidth = 260;
    ctx.beginPath();
    ctx.moveTo(50, 180);
    ctx.lineTo(1100, 1100);
    ctx.lineTo(2250, 2250);
    ctx.stroke();

    // Double solid yellow street centerline
    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ffbe0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(40, 175); ctx.lineTo(1095, 1095); ctx.lineTo(2245, 2245);
    ctx.moveTo(60, 185); ctx.lineTo(1105, 1105); ctx.lineTo(2255, 2255);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Zebra Crosswalk #1 (NW junction)
    this.drawDiagonalZebraCrosswalk(ctx, 550, 550, 220, -0.785);
    // Zebra Crosswalk #2 (SE junction)
    this.drawDiagonalZebraCrosswalk(ctx, 1600, 1600, 220, -0.785);

    // Sewer manhole covers with steam grates
    this.drawManholeCover(ctx, 800, 800, 36);
    this.drawManholeCover(ctx, 1800, 1800, 36);
    this.drawManholeCover(ctx, 400, 400, 32);
    ctx.restore();

    // --- NEON REFLECTION PUDDLES (Rain-slick water puddles reflecting vibrant neon) ---
    // Magenta Puddles
    this.drawNeonPuddle(ctx, 350, 1500, 140, 75, '#bd00ff');
    this.drawNeonPuddle(ctx, 1850, 550, 160, 85, '#bd00ff');
    this.drawNeonPuddle(ctx, 1400, 1200, 120, 60, '#bd00ff');

    // Cyan Puddles
    this.drawNeonPuddle(ctx, 750, 350, 150, 70, '#00f0ff');
    this.drawNeonPuddle(ctx, 1550, 1950, 180, 90, '#00f0ff');
    this.drawNeonPuddle(ctx, 950, 1450, 130, 65, '#00f0ff');

    // Hot Pink Puddles
    this.drawNeonPuddle(ctx, 520, 1850, 110, 55, '#ff007f');
    this.drawNeonPuddle(ctx, 2050, 1350, 130, 70, '#ff007f');

    // --- ZONE 1 (NORTH-EAST): Tenement Cyber-Ware Alleys ---
    ctx.save();
    this.drawFloorStencil(ctx, 1400, 180, 'ALLEY 09', '#bd00ff', 18);
    ctx.restore();

    // --- ZONE 2 (SOUTH-WEST): Night Market Kanji & Stalls ---
    ctx.save();
    this.drawFloorStencil(ctx, 220, 1280, '夜市 // MARKET', '#ff007f', 20);
    ctx.restore();

    // --- ZONE 3 (SOUTH-EAST): Mag-Rail Transit Pylons ---
    ctx.save();
    this.drawHazardBorder(ctx, 1150, 1450, 1150, 850, '#00f0ff', 16);
    this.drawFloorStencil(ctx, 1250, 1520, 'MAG-RAIL', '#00f0ff', 18);
    ctx.restore();
  }

  // =========================================================================
  // 4. REACTOR-CRUCIBLE // VOLCANIC FAULT & CORE MELTDOWN
  // Jagged diagonal magma trench, toxic green pools, basalt fissures, radiation stencils
  // =========================================================================
  renderFloorReactor(ctx, def) {
    const W = this.width;
    const H = this.height;

    // Scorched volcanic basalt foundation
    ctx.fillStyle = '#080302';
    ctx.fillRect(0, 0, W, H);

    // Shattered Basalt Slabs
    const tileSize = 80;
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isAlt ? '#0f0604' : '#0a0403';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

        ctx.strokeStyle = '#1c0a07';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize, tileSize);
      }
    }

    // --- MASSIVE JAGGED VOLCANIC MAGMA TRENCH (Cuts SW to NE) ---
    // A wild, jagged fault line ripping through the bedrock
    const magmaPoints = [
      { x: 120, y: 2280 },
      { x: 380, y: 2020 },
      { x: 520, y: 1780 },
      { x: 740, y: 1540 },
      { x: 920, y: 1350 },
      { x: 1150, y: 1100 },
      { x: 1380, y: 880 },
      { x: 1580, y: 640 },
      { x: 1820, y: 420 },
      { x: 2050, y: 240 },
      { x: 2280, y: 100 }
    ];

    ctx.save();
    // 1. Broad Volcanic Heat Radiation Glow
    ctx.strokeStyle = 'rgba(255, 60, 0, 0.16)';
    ctx.lineWidth = 180;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(magmaPoints[0].x, magmaPoints[0].y);
    for (let i = 1; i < magmaPoints.length; i++) {
      ctx.lineTo(magmaPoints[i].x, magmaPoints[i].y);
    }
    ctx.stroke();

    // 2. Charred Basalt Magma Chasm Border
    ctx.strokeStyle = '#2b0b04';
    ctx.lineWidth = 90;
    ctx.beginPath();
    ctx.moveTo(magmaPoints[0].x, magmaPoints[0].y);
    for (let i = 1; i < magmaPoints.length; i++) {
      ctx.lineTo(magmaPoints[i].x, magmaPoints[i].y);
    }
    ctx.stroke();

    // 3. Bubbling Red-Orange Molten Magma
    ctx.strokeStyle = '#ff4400';
    ctx.lineWidth = 45;
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(magmaPoints[0].x, magmaPoints[0].y);
    for (let i = 1; i < magmaPoints.length; i++) {
      ctx.lineTo(magmaPoints[i].x, magmaPoints[i].y);
    }
    ctx.stroke();

    // 4. White-Hot Lava Vein Core
    ctx.strokeStyle = '#fff399';
    ctx.lineWidth = 14;
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Catwalk Steel Bridges Spanning Over the Magma Rift
    this.drawCatwalkBridge(ctx, 880, 1380, 1020, 1260);
    this.drawCatwalkBridge(ctx, 1500, 720, 1660, 580);
    ctx.restore();

    // --- RADIOACTIVE TOXIC COOLANT RUNOFF POOLS (Emerald Green) ---
    // Leaking from shattered cooling tower in NW
    this.drawRadioactivePool(ctx, 520, 520, 160, 95);
    this.drawRadioactivePool(ctx, 360, 850, 120, 70);
    this.drawRadioactivePool(ctx, 1350, 1950, 140, 80);

    // --- TECTONIC BASALT FISSURES & CRACKS ---
    ctx.save();
    ctx.strokeStyle = '#ff3300';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 6;
    // Cracks radiating from main rift
    this.drawJaggedCrack(ctx, 740, 1540, 580, 1350);
    this.drawJaggedCrack(ctx, 1150, 1100, 1380, 1250);
    this.drawJaggedCrack(ctx, 1580, 640, 1850, 800);
    this.drawJaggedCrack(ctx, 380, 2020, 220, 1850);
    ctx.restore();

    // --- INDUSTRIAL RADIATION STENCILS & BLAST ZONES ---
    ctx.save();
    // Massive Trefoil Radiation Icons
    this.drawRadiationSymbol(ctx, 550, 260, 55);
    this.drawRadiationSymbol(ctx, 1850, 1400, 65);
    this.drawRadiationSymbol(ctx, 950, 1850, 50);

    this.drawFloorStencil(ctx, 220, 160, '☢ CORE MELTDOWN', '#ff5500', 20);
    this.drawFloorStencil(ctx, 1450, 1120, 'TURBINE 04', '#ffaa00', 18);
    ctx.restore();
  }

  // =========================================================================
  // 5. ORBITAL-STATION // DEEP SPACE ZERO-G CATWALKS
  // =========================================================================
  renderFloorOrbital(ctx, def) {
    const W = this.width;
    const H = this.height;

    // Void space background
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, W, H);

    // Distant Stars & Space Dust
    for (let i = 0; i < 300; i++) {
      const sx = ((i * 1973 + 123) % W);
      const sy = ((i * 3181 + 456) % H);
      const sr = (i % 3 === 0) ? 1.8 : 0.9;
      const alpha = 0.3 + (i % 5) * 0.14;
      ctx.fillStyle = `rgba(220, 240, 255, ${alpha})`;
      ctx.fillRect(sx, sy, sr, sr);
    }

    // Distant Nebula Gas Clouds
    const neb1 = ctx.createRadialGradient(700, 600, 50, 700, 600, 550);
    neb1.addColorStop(0, 'rgba(0, 180, 255, 0.08)');
    neb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(150, 50, 1100, 1100);

    const neb2 = ctx.createRadialGradient(1800, 1600, 80, 1800, 1600, 650);
    neb2.addColorStop(0, 'rgba(120, 0, 255, 0.07)');
    neb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(1150, 950, 1300, 1300);

    // Titanium Catwalk Mesh Panels (Modular 90x90)
    const tileSize = 90;
    for (let x = 60; x < W - 60; x += tileSize) {
      for (let y = 60; y < H - 60; y += tileSize) {
        // Leave asymmetric void chasms in space
        if ((x > 850 && x < 1250 && y > 150 && y < 450) ||
            (x > 1250 && x < 1750 && y > 950 && y < 1300) ||
            (x > 750 && x < 1150 && y > 1400 && y < 1850)) {
          continue;
        }

        ctx.fillStyle = '#080d18';
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        ctx.strokeStyle = '#142036';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize, tileSize);

        // Titanium perforated mesh dots
        ctx.fillStyle = '#1e304f';
        ctx.fillRect(x + 12, y + 12, 3, 3);
        ctx.fillRect(x + tileSize - 15, y + 12, 3, 3);
        ctx.fillRect(x + 12, y + tileSize - 15, 3, 3);
        ctx.fillRect(x + tileSize - 15, y + tileSize - 15, 3, 3);
      }
    }

    // Glowing Azure Magnetic Rails on Catwalk Spines
    ctx.save();
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(180, 650); ctx.lineTo(1350, 650);
    ctx.moveTo(1070, 480); ctx.lineTo(1070, 1450);
    ctx.moveTo(780, 1400); ctx.lineTo(1950, 1400);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Airlock & Solar Array Stencils (Minimal & sleek)
    this.drawFloorStencil(ctx, 200, 200, 'AIRLOCK DOCK', '#00d4ff', 16);
    this.drawFloorStencil(ctx, 1400, 160, 'SOLAR ARRAY', '#ffb703', 16);
    this.drawFloorStencil(ctx, 1450, 1380, 'RELAY CORE', '#00d4ff', 16);
    this.drawFloorStencil(ctx, 220, 1280, 'THRUSTER PLAZA', '#ff5500', 16);
  }

  // =========================================================================
  // 6. CHRONOS-COLLIDER // HADRON WARP VAULT & TACHYON LAB FLOOR
  // Giant circular synchrotron collider ring, quantum hexagonal field mesh,
  // magnetic deflection coils, sub-floor glowing particle tracks, hazard zones.
  // =========================================================================
  renderFloorQuantumCollider(ctx, def) {
    const W = this.width;
    const H = this.height;
    const centerX = W / 2;
    const centerY = H / 2;

    // 1. Deep obsidian-carbon quantum void base
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, W, H);

    // 2. Quantum Hexagonal Field Lattice
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
    ctx.lineWidth = 1;
    const hexRadius = 45;
    const hexW = hexRadius * Math.sqrt(3);
    const hexH = hexRadius * 1.5;
    for (let hy = 100; hy < H - 100; hy += hexH) {
      const offsetX = ((Math.round(hy / hexH) % 2) === 0) ? 0 : hexW / 2;
      for (let hx = 100 + offsetX; hx < W - 100; hx += hexW) {
        this.drawHexagonTile(ctx, hx, hy, hexRadius);
      }
    }
    ctx.restore();

    // 3. Four Quadrant Zone Flooring Patterns
    ctx.save();
    // Zone 1 (NW): Superconducting Cryo Lab (Frosty cyan grid lines)
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.08)';
    ctx.lineWidth = 1.5;
    for (let gx = 100; gx <= 1000; gx += 80) {
      ctx.beginPath(); ctx.moveTo(gx, 100); ctx.lineTo(gx, 1000); ctx.stroke();
    }
    for (let gy = 100; gy <= 1000; gy += 80) {
      ctx.beginPath(); ctx.moveTo(100, gy); ctx.lineTo(1000, gy); ctx.stroke();
    }

    // Zone 2 (NE): High-Flux Laser Optical Bay (Red/magenta cross-hatch)
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.08)';
    for (let gx = 1400; gx <= 2300; gx += 80) {
      ctx.beginPath(); ctx.moveTo(gx, 100); ctx.lineTo(gx, 1000); ctx.stroke();
    }
    for (let gy = 100; gy <= 1000; gy += 80) {
      ctx.beginPath(); ctx.moveTo(1400, gy); ctx.lineTo(2300, gy); ctx.stroke();
    }

    // Zone 3 (SW): Quantum Telemetry Hub (Violet concentric arcs)
    ctx.strokeStyle = 'rgba(189, 0, 255, 0.08)';
    for (let r = 120; r <= 800; r += 90) {
      ctx.beginPath();
      ctx.arc(350, 2050, r, -Math.PI / 2, 0);
      ctx.stroke();
    }

    // Zone 4 (SE): Graviton Resonance Bay (Gold/amber electromagnetic wave grid)
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.08)';
    for (let gx = 1400; gx <= 2300; gx += 80) {
      ctx.beginPath(); ctx.moveTo(gx, 1400); ctx.lineTo(gx, 2300); ctx.stroke();
    }
    for (let gy = 1400; gy <= 2300; gy += 80) {
      ctx.beginPath(); ctx.moveTo(1400, gy); ctx.lineTo(2300, gy); ctx.stroke();
    }
    ctx.restore();

    // 4. Giant Synchrotron Particle Accelerator Track (Circular Ring)
    ctx.save();
    const ringRadius = 820;
    const ringWidth = 90;

    // Outer and Inner Conduit Trenches
    ctx.strokeStyle = '#071626';
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Trench Sidewall Rims
    ctx.strokeStyle = '#0e2b44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius - ringWidth / 2, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, ringRadius + ringWidth / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing Particle Accelerator Beams (Dual counter-rotating conduits beneath floor glass)
    // Primary Cyan Beam Track
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.6)';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius - 20, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary Magenta Antimatter Track
    ctx.strokeStyle = 'rgba(189, 0, 255, 0.55)';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#bd00ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius + 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 8 Magnetic Deflection Prism Stations around the accelerator ring
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      const px = centerX + Math.cos(angle) * ringRadius;
      const py = centerY + Math.sin(angle) * ringRadius;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);

      // Magnetic deflector block
      ctx.fillStyle = '#0a1a2b';
      ctx.fillRect(-28, -ringWidth / 2 - 8, 56, ringWidth + 16);
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.strokeRect(-28, -ringWidth / 2 - 8, 56, ringWidth + 16);

      // Copper electromagnetic coil bands
      ctx.fillStyle = '#b87333';
      ctx.fillRect(-22, -ringWidth / 2, 8, ringWidth);
      ctx.fillRect(14, -ringWidth / 2, 8, ringWidth);

      // Polarity indicator
      ctx.fillStyle = (i % 2 === 0) ? '#00ffcc' : '#ff0055';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText((i % 2 === 0) ? 'N [+]' : 'S [-]', 0, 4);

      ctx.restore();
    }

    // 5. Four Radial Injection Beam Lines leading into Center
    const injectAngles = [Math.PI * 0.75, Math.PI * 0.25, Math.PI * 1.25, Math.PI * 1.75];
    const injectColors = ['#00ffcc', '#ff0055', '#bd00ff', '#ffb703'];
    for (let k = 0; k < 4; k++) {
      const ang = injectAngles[k];
      const col = injectColors[k];
      const startX = centerX + Math.cos(ang) * (ringRadius + 250);
      const startY = centerY + Math.sin(ang) * (ringRadius + 250);
      const endX = centerX + Math.cos(ang) * 260;
      const endY = centerY + Math.sin(ang) * 260;

      ctx.strokeStyle = '#061320';
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 6. Central Singularity Floor Arena (Octagonal Platform)
    ctx.fillStyle = '#040b18';
    ctx.beginPath();
    const octRadius = 300;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const ox = centerX + Math.cos(a) * octRadius;
      const oy = centerY + Math.sin(a) * octRadius;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Central Hazard Stripes around Singularity Core
    this.drawHazardBorder(ctx, centerX - 180, centerY - 180, 360, 360, '#ffb703', 12);

    // Busbar links between Central Platform and the 4 Collimator Pylons
    const pylons = [
      { x: 1020, y: 1020 }, { x: 1380, y: 1020 },
      { x: 1020, y: 1380 }, { x: 1380, y: 1380 }
    ];
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.45)';
    ctx.lineWidth = 4;
    for (const p of pylons) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    ctx.restore();

    // 7. Tactical Floor Stencils & Markings
    this.drawFloorStencil(ctx, 380, 260, 'TACHYON INJECTOR // BAY 01', '#00ffcc', 16);
    this.drawFloorStencil(ctx, 1420, 260, 'OPTICAL LASER CAVITY // BAY 02', '#ff0055', 16);
    this.drawFloorStencil(ctx, 380, 2150, 'QUANTUM TELEMETRY // BAY 03', '#bd00ff', 16);
    this.drawFloorStencil(ctx, 1420, 2150, 'GRAVITON RESONANCE // BAY 04', '#ffb703', 16);
    this.drawFloorStencil(ctx, centerX - 150, centerY - 210, 'SINGULARITY CORE // 1.21 TeV', '#00ffcc', 17);
    this.drawFloorStencil(ctx, centerX - 130, centerY + 225, 'DANGER: TACHYON FLUX OVERLOAD', '#ffb703', 15);
  }

  // =========================================================================
  // GRAPHICAL HELPER UTILITIES FOR THEMATIC FLOORS
  // =========================================================================
  drawHazardBorder(ctx, x, y, w, h, color = '#ffb703', size = 16) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = size;
    ctx.setLineDash([size, size]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  drawFloorStencil(ctx, x, y, text, color, fontSize = 16) {
    ctx.save();
    ctx.font = `bold ${fontSize}px "Orbitron", monospace, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawRailwayTrack(ctx, x1, y1, x2, y2, color = '#3f4f66') {
    ctx.save();
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.translate(x1, y1);
    ctx.rotate(angle);

    // Cross ties / sleepers
    ctx.fillStyle = '#1c222e';
    for (let d = 0; d < dist; d += 36) {
      ctx.fillRect(d, -18, 14, 36);
    }

    // Dual parallel rails
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(dist, -10);
    ctx.moveTo(0, 10); ctx.lineTo(dist, 10);
    ctx.stroke();

    ctx.restore();
  }

  drawOilSlick(ctx, x, y, rx, ry) {
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, 10, x, y, Math.max(rx, ry));
    grad.addColorStop(0, 'rgba(5, 7, 10, 0.85)');
    grad.addColorStop(0.7, 'rgba(15, 20, 28, 0.55)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHexagonTile(ctx, x, y, r) {
    ctx.strokeStyle = '#12081c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + r * Math.cos(angle);
      const hy = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  }

  drawNeonPuddle(ctx, x, y, rx, ry, color) {
    ctx.save();
    // Dark glossy water pool
    ctx.fillStyle = '#020104';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Vibrant Neon light reflection in center of puddle
    const grad = ctx.createRadialGradient(x, y, 5, x, y, rx);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, color + 'aa');
    grad.addColorStop(0.8, color + '22');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.85, ry * 0.85, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawDiagonalZebraCrosswalk(ctx, x, y, len, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    for (let i = -len / 2; i < len / 2; i += 32) {
      ctx.fillRect(i, -70, 18, 140);
    }
    ctx.restore();
  }

  drawManholeCover(ctx, x, y, radius) {
    ctx.save();
    ctx.fillStyle = '#100b18';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#281a38';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Vent slots
    ctx.strokeStyle = '#3d2854';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (radius - 8), y + Math.sin(a) * (radius - 8));
      ctx.lineTo(x - Math.cos(a) * (radius - 8), y - Math.sin(a) * (radius - 8));
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRadioactivePool(ctx, x, y, rx, ry) {
    ctx.save();
    // Green radioactive glow
    const grad = ctx.createRadialGradient(x, y, 10, x, y, rx);
    grad.addColorStop(0, '#00ff88');
    grad.addColorStop(0.4, 'rgba(0, 255, 100, 0.5)');
    grad.addColorStop(0.8, 'rgba(0, 180, 60, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Boiling bubble specs
    ctx.fillStyle = '#afffd4';
    ctx.fillRect(x - 15, y - 8, 4, 4);
    ctx.fillRect(x + 22, y + 10, 5, 5);
    ctx.fillRect(x + 8, y - 18, 3, 3);
    ctx.restore();
  }

  drawCatwalkBridge(ctx, x1, y1, x2, y2) {
    ctx.save();
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.translate(x1, y1);
    ctx.rotate(angle);

    // Grated metal bridge floor
    ctx.fillStyle = '#1c1f26';
    ctx.fillRect(0, -28, dist, 56);

    // Cross grating
    ctx.strokeStyle = '#323a47';
    ctx.lineWidth = 2;
    for (let d = 0; d < dist; d += 16) {
      ctx.beginPath();
      ctx.moveTo(d, -28); ctx.lineTo(d, 28);
      ctx.stroke();
    }

    // Safety guard rails with warning yellow stripes
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -28); ctx.lineTo(dist, -28);
    ctx.moveTo(0, 28); ctx.lineTo(dist, 28);
    ctx.stroke();

    ctx.restore();
  }

  drawJaggedCrack(ctx, x1, y1, x2, y2) {
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 40;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 40;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  drawRadiationSymbol(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);

    // Yellow warning hazard backing
    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Black Trefoil blades
    ctx.fillStyle = '#110502';
    for (let i = 0; i < 3; i++) {
      const startAngle = (i * 2 * Math.PI) / 3 - Math.PI / 6;
      const endAngle = startAngle + Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius * 0.85, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
    }

    // Inner circle cutout
    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Center black dot
    ctx.fillStyle = '#110502';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Collision Detection & Sliding Resolution ---
  resolveCircleCollision(entity) {
    let hadCollision = false;
    const r = entity.radius || 20;
    const maxPasses = 4; // Multi-pass relaxation solver to resolve corners and multiple intersecting obstacles

    for (let pass = 0; pass < maxPasses; pass++) {
      let collidedThisPass = false;

      // 1. Check against Map Boundaries
      const pad = 52 + r;
      if (entity.x < pad) { entity.x = pad; collidedThisPass = true; }
      if (entity.x > this.width - pad) { entity.x = this.width - pad; collidedThisPass = true; }
      if (entity.y < pad) { entity.y = pad; collidedThisPass = true; }
      if (entity.y > this.height - pad) { entity.y = this.height - pad; collidedThisPass = true; }

      // 2. Check against Rectangular Walls & Containers
      for (let i = 0; i < this.walls.length; i++) {
        const wall = this.walls[i];
        if (wall.type === 'boundary') continue; // already handled by pad

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

          // Eject along the nearest edge with a slight safety offset (0.5px)
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
          // Case B: Circle center is OUTSIDE the rectangle, check corner/edge penetration
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

      // 3. Check against Cylindrical Pillars
      for (let i = 0; i < this.pillars.length; i++) {
        const pillar = this.pillars[i];
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
        // All constraints satisfied, no more overlaps
        break;
      }
    }

    // Ultimate safeguard: if entity is still colliding after 4 relaxation passes, trigger unstuck rescue
    if (hadCollision && this.isColliding(entity.x, entity.y, r)) {
      this.unstuckEntity(entity);
    }

    return hadCollision;
  }

  // --- Point / Circle Overlap check (used for bullet & spawn tests) ---
  isColliding(x, y, radius = 0) {
    // Boundary check
    const pad = 50 + radius;
    if (x < pad || x > this.width - pad || y < pad || y > this.height - pad) {
      return true;
    }

    // Wall rect check
    for (let i = 0; i < this.walls.length; i++) {
      const w = this.walls[i];
      if (w.type === 'boundary') continue;

      // Inside rectangle check
      if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) {
        return true;
      }

      if (radius > 0) {
        const nx = Math.max(w.x, Math.min(x, w.x + w.w));
        const ny = Math.max(w.y, Math.min(y, w.y + w.h));
        const dx = x - nx;
        const dy = y - ny;
        if (dx * dx + dy * dy < radius * radius) {
          return true;
        }
      }
    }

    // Pillar circle check
    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const r = radius + p.radius;
      if (dx * dx + dy * dy < r * r) return true;
    }

    return false;
  }

  // --- Emergency Auto-Unstuck Recovery Failsafe ---
  unstuckEntity(entity) {
    const r = entity.radius || 20;
    if (!this.isColliding(entity.x, entity.y, r)) {
      return false; // Entity is free
    }

    // Radial search sweep (8 concentric rings in 16 directions)
    const testRadii = [16, 32, 48, 64, 85, 115, 160, 220];
    for (let d = 0; d < testRadii.length; d++) {
      const dist = testRadii[d];
      for (let a = 0; a < 16; a++) {
        const theta = (a / 16) * Math.PI * 2;
        const tx = entity.x + Math.cos(theta) * dist;
        const ty = entity.y + Math.sin(theta) * dist;
        if (!this.isColliding(tx, ty, r)) {
          entity.x = tx;
          entity.y = ty;
          if (entity.vx !== undefined) entity.vx = 0;
          if (entity.vy !== undefined) entity.vy = 0;
          return true;
        }
      }
    }

    // Ultimate fallback: safely restore to last confirmed safe coordinate or spawn point
    if (entity.lastSafeX !== undefined && entity.lastSafeY !== undefined && !this.isColliding(entity.lastSafeX, entity.lastSafeY, r)) {
      entity.x = entity.lastSafeX;
      entity.y = entity.lastSafeY;
    } else {
      const sp = (this.spawns && this.spawns[0]) || this.spawnPoint || { x: 1200, y: 1200 };
      entity.x = sp.x;
      entity.y = sp.y;
    }

    if (entity.vx !== undefined) entity.vx = 0;
    if (entity.vy !== undefined) entity.vy = 0;
    return true;
  }

  // Check line of sight between two points (returns false if blocked by wall/pillar)
  hasLineOfSight(x1, y1, x2, y2) {
    const steps = 15;
    for (let i = 1; i < steps; i++) {
      const tx = x1 + (x2 - x1) * (i / steps);
      const ty = y1 + (y2 - y1) * (i / steps);
      if (this.isColliding(tx, ty, 8)) {
        return false;
      }
    }
    return true;
  }

  // --- Explode Barrel ---
  triggerBarrelExplosion(barrel, game) {
    if (barrel.exploded) return;
    barrel.exploded = true;

    // FX & Audio
    window.particleSystem.emitExplosion(barrel.x, barrel.y, 90);
    window.soundSystem.playExplosion();
    game.addScreenShake(14);

    // Burn mark on decal canvas
    this.decalCtx.save();
    this.decalCtx.fillStyle = '#111419';
    this.decalCtx.beginPath();
    this.decalCtx.arc(barrel.x, barrel.y, 45, 0, Math.PI * 2);
    this.decalCtx.fill();
    this.decalCtx.restore();

    // Damage enemies & player within explosion radius (140px)
    const blastRadius = 140;
    const blastDamage = 160;

    // Damage Player
    const pDist = Math.hypot(game.player.x - barrel.x, game.player.y - barrel.y);
    if (pDist < blastRadius) {
      const pDmg = Math.round(blastDamage * (1 - pDist / blastRadius));
      game.player.takeDamage(pDmg);
      window.soundSystem.playPlayerHurt();
    }

    // Damage Enemies
    for (const enemy of game.enemies) {
      const eDist = Math.hypot(enemy.x - barrel.x, enemy.y - barrel.y);
      if (eDist < blastRadius) {
        const eDmg = Math.round(blastDamage * (1 - eDist / blastRadius));
        enemy.takeDamage(eDmg, barrel.x, barrel.y);
      }
    }

    // Chain reaction with nearby barrels!
    for (const other of this.barrels) {
      if (other !== barrel && !other.exploded) {
        const bDist = Math.hypot(other.x - barrel.x, other.y - barrel.y);
        if (bDist < blastRadius) {
          setTimeout(() => {
            this.triggerBarrelExplosion(other, game);
          }, 120);
        }
      }
    }
  }

  // --- Master Map Physics & Interactive Entities Update ---
  update(dt, player, enemies, game) {
    if (!dt || dt <= 0) return;

    // 1. Decrement Cooldowns
    if (player && player._portalCooldown > 0) {
      player._portalCooldown -= dt;
    }
    if (enemies && enemies.length > 0) {
      for (const enemy of enemies) {
        if (enemy && enemy._portalCooldown > 0) {
          enemy._portalCooldown -= dt;
        }
      }
    }

    // 2. Interactive Directional Kinetic Boost Pads
    if (this.boostPads && this.boostPads.length > 0) {
      for (const pad of this.boostPads) {
        if (pad._activeTimer > 0) pad._activeTimer -= dt;
        if (pad._cooldown > 0) pad._cooldown -= dt;

        const pr = pad.radius || 38;

        // Player boost interaction
        if (player && player.alive) {
          const pDist = Math.hypot(player.x - pad.x, player.y - pad.y);
          if (pDist <= pr + (player.radius || 20) && (!pad._cooldown || pad._cooldown <= 0)) {
            pad._activeTimer = 0.35;
            pad._cooldown = 0.45;
            const boostSpeed = pad.speed || 860;
            player.isDashing = true;
            player.dashTimer = 0.32;
            player.dashSpeed = boostSpeed;
            player.dashAngle = Math.atan2(pad.dirY, pad.dirX);
            player.vx = pad.dirX * boostSpeed;
            player.vy = pad.dirY * boostSpeed;

            // Directional kinetic energy particles
            if (window.particleSystem) {
              window.particleSystem.emit(pad.x, pad.y, 24, {
                color: pad.color || '#00ffcc',
                speed: 340,
                angle: Math.atan2(pad.dirY, pad.dirX),
                spread: 0.7,
                life: 0.35
              });
            }
            if (window.soundSystem && window.soundSystem.playBoostPad) {
              window.soundSystem.playBoostPad();
            }
            if (game && game.addScreenShake) {
              game.addScreenShake(5);
            }
          }
        }

        // Enemy boost interaction (enemies also get propelled forward!)
        if (enemies && enemies.length > 0) {
          for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const eDist = Math.hypot(enemy.x - pad.x, enemy.y - pad.y);
            if (eDist <= pr + (enemy.radius || 20) && (!pad._cooldown || pad._cooldown <= 0)) {
              pad._activeTimer = 0.25;
              enemy.x += pad.dirX * 50;
              enemy.y += pad.dirY * 50;
              this.resolveCircleCollision(enemy);
            }
          }
        }
      }
    }

    // 3. Interactive Quantum Phase Gates (Instantaneous Teleportation)
    if (this.portals && this.portals.length > 0) {
      for (const portal of this.portals) {
        portal._pulseTimer = (portal._pulseTimer || 0) + dt * 3.5;
        const pRadius = portal.radius || 42;

        // Player Teleportation
        if (player && player.alive && (!player._portalCooldown || player._portalCooldown <= 0)) {
          const pDist = Math.hypot(player.x - portal.x, player.y - portal.y);
          if (pDist <= pRadius + (player.radius || 20)) {
            player._portalCooldown = 1.35;
            const srcX = player.x;
            const srcY = player.y;
            player.x = portal.targetX;
            player.y = portal.targetY;
            this.resolveCircleCollision(player);

            // Audio & Visual Warp FX
            if (window.soundSystem && window.soundSystem.playTeleport) {
              window.soundSystem.playTeleport();
            }
            if (window.particleSystem) {
              window.particleSystem.emitShockwave(srcX, srcY, 75, portal.color || '#00ffcc');
              window.particleSystem.emitShockwave(player.x, player.y, 85, portal.color || '#00ffcc');
              window.particleSystem.emit(srcX, srcY, 28, {
                color: portal.color || '#00ffcc',
                speed: 260,
                life: 0.45
              });
              window.particleSystem.emit(player.x, player.y, 28, {
                color: portal.color || '#00ffcc',
                speed: 260,
                life: 0.45
              });
            }
            if (game && game.addScreenShake) {
              game.addScreenShake(7);
            }
          }
        }

        // Enemy Teleportation (Stalkers & cyborgs can flank through gates!)
        if (enemies && enemies.length > 0) {
          for (const enemy of enemies) {
            if (!enemy.alive || (enemy._portalCooldown && enemy._portalCooldown > 0)) continue;
            const eDist = Math.hypot(enemy.x - portal.x, enemy.y - portal.y);
            if (eDist <= pRadius + (enemy.radius || 20)) {
              enemy._portalCooldown = 1.6;
              const ex = enemy.x;
              const ey = enemy.y;
              enemy.x = portal.targetX;
              enemy.y = portal.targetY;
              this.resolveCircleCollision(enemy);

              if (window.particleSystem) {
                window.particleSystem.emitShockwave(ex, ey, 55, portal.color || '#bd00ff');
                window.particleSystem.emitShockwave(enemy.x, enemy.y, 55, portal.color || '#bd00ff');
              }
            }
          }
        }
      }
    }
  }

  // --- Render Environment ---
  draw(ctx, camera) {
    // 1. Pre-rendered Floor
    ctx.drawImage(this.floorCanvas, 0, 0);

    // 2. Decal Canvas (Blood & Scorch marks)
    ctx.drawImage(this.decalCanvas, 0, 0);

    const now = Date.now();
    const mapId = this.mapId || 'sector_09';

    // 2.2. Interactive Directional Kinetic Boost Pads
    this.drawBoostPads(ctx, camera, now);

    // 2.4. Interactive Quantum Phase Gates
    this.drawPortals(ctx, camera, now);

    // 2.6. Central Singularity Core (Active Tachyon Vortex for chronos_collider)
    if (mapId === 'chronos_collider') {
      this.drawSingularityCore(ctx, camera, now);
    }

    // 3. Render Solid Obstacles (Thematic real-world objects)
    for (const wall of this.walls) {
      // Frustum culling: skip if offscreen
      if (wall.x + wall.w < camera.x || wall.x > camera.x + camera.width ||
          wall.y + wall.h < camera.y || wall.y > camera.y + camera.height) {
        continue;
      }

      ctx.save();
      // Drop Shadow for high depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;

      if (wall.type === 'boundary') {
        this.drawBoundary(ctx, wall, mapId);
      } else {
        this.drawThemedObstacle(ctx, wall, mapId, now);
      }
      ctx.restore();
    }

    // 4. Render Structural Pillars & Columns
    for (const pillar of this.pillars) {
      // Frustum culling
      if (pillar.x + pillar.radius < camera.x || pillar.x - pillar.radius > camera.x + camera.width ||
          pillar.y + pillar.radius < camera.y || pillar.y - pillar.radius > camera.y + camera.height) {
        continue;
      }
      ctx.save();
      this.drawThemedPillar(ctx, pillar, now, mapId);
      ctx.restore();
    }

    // 5. Render Barrels / Hazard Canisters
    for (const barrel of this.barrels) {
      if (barrel.exploded) continue;
      if (barrel.x + barrel.radius < camera.x || barrel.x - barrel.radius > camera.x + camera.width ||
          barrel.y + barrel.radius < camera.y || barrel.y - barrel.radius > camera.y + camera.height) {
        continue;
      }
      ctx.save();
      this.drawThemedBarrel(ctx, barrel, now, mapId);
      ctx.restore();
    }
  }

  // Helper for safe rounded rect
  drawRoundedBox(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  // =========================================================================
  // BOUNDARY WALL RENDERING (Distinct per map)
  // =========================================================================
  drawBoundary(ctx, wall, mapId) {
    const { x, y, w, h } = wall;
    if (mapId === 'neon_slums') {
      // Tenement Brick/Concrete Building Facades with graffiti and neon edge
      ctx.fillStyle = '#0a0612';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#bd00ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      // Neon rooftop trim
      ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    } else if (mapId === 'cyber_bunker') {
      // Under-bedrock reinforced blast bunker boundary
      ctx.fillStyle = '#08050c';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      // Steel rivets along perimeter
      ctx.fillStyle = '#2a1226';
      if (w > h) {
        for (let rx = x + 20; rx < x + w - 20; rx += 50) {
          ctx.fillRect(rx, y + h / 2 - 2, 4, 4);
        }
      } else {
        for (let ry = y + 20; ry < y + h - 20; ry += 50) {
          ctx.fillRect(x + w / 2 - 2, ry, 4, 4);
        }
      }
    } else if (mapId === 'reactor_crucible') {
      // Scorched volcanic containment wall with thermal orange accents
      ctx.fillStyle = '#140704';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ff5500';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      // Thermal hazard warning dashes
      ctx.strokeStyle = 'rgba(255, 100, 0, 0.35)';
      ctx.setLineDash([12, 12]);
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
      ctx.setLineDash([]);
    } else if (mapId === 'orbital_station') {
      // Sleek pressurized aerospace space station hull looking into void
      ctx.fillStyle = '#0b101d';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);
      // Aerodynamic bevel line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    } else if (mapId === 'chronos_collider') {
      // Heavy Particle Synchrotron Magnetic Containment Bulkhead
      ctx.fillStyle = '#020712';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);
      // Inner violet magnetic field trace
      ctx.strokeStyle = 'rgba(189, 0, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
      // Gold quantum grounding terminals along perimeter
      ctx.fillStyle = '#ffb703';
      if (w > h) {
        for (let rx = x + 40; rx < x + w - 40; rx += 80) {
          ctx.fillRect(rx, y + h / 2 - 2, 8, 4);
        }
      } else {
        for (let ry = y + 40; ry < y + h - 40; ry += 80) {
          ctx.fillRect(x + w / 2 - 2, ry, 4, 8);
        }
      }
    } else {
      // Sector 09: Industrial Docks heavy steel retaining wall
      ctx.fillStyle = '#101622';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      // Yellow hazard diagonal trim
      ctx.save();
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      ctx.restore();
    }
  }

  // =========================================================================
  // THEMED OBSTACLE DISPATCHER
  // =========================================================================
  drawThemedObstacle(ctx, wall, mapId, now) {
    const type = wall.type;

    // Sector 09 Obstacles
    if (type === 'container') return this.drawContainer(ctx, wall);
    if (type === 'pallet' || type === 'crate') return this.drawPallet(ctx, wall);
    if (type === 'forklift') return this.drawForklift(ctx, wall, now);
    if (type === 'furnace') return this.drawFurnace(ctx, wall, now);
    if (type === 'steel_stack') return this.drawSteelStack(ctx, wall);
    if (type === 'fuel_depot_tank') return this.drawFuelDepotTank(ctx, wall);
    if (type === 'industrial_barrier') return this.drawIndustrialBarrier(ctx, wall);

    // Cyber Bunker Obstacles
    if (type === 'server_bank' || wall.subType === 'server') return this.drawServerBank(ctx, wall, now);
    if (type === 'blast_door') return this.drawBlastDoor(ctx, wall, now);
    if (type === 'cryo_chamber') return this.drawCryoChamber(ctx, wall, now);
    if (type === 'command_console') return this.drawCommandConsole(ctx, wall, now);
    if (type === 'decon_station') return this.drawDeconStation(ctx, wall, now);
    if (type === 'reinforced_bulkhead') return this.drawReinforcedBulkhead(ctx, wall);

    // Neon Slums Obstacles
    if (type === 'ramen_stall') return this.drawRamenStall(ctx, wall, now);
    if (type === 'cyber_car') return this.drawCyberCar(ctx, wall, now);
    if (type === 'vending_machine') return this.drawVendingMachine(ctx, wall, now);
    if (type === 'dumpster') return this.drawDumpster(ctx, wall);
    if (type === 'transformer_box') return this.drawTransformerBox(ctx, wall, now);
    if (type === 'neon_billboard') return this.drawNeonBillboard(ctx, wall, now);
    if (type === 'neon_barrier') return this.drawNeonBarrier(ctx, wall);

    // Reactor Crucible Obstacles
    if (type === 'heat_shield') return this.drawHeatShield(ctx, wall);
    if (type === 'coolant_pipe') return this.drawCoolantPipe(ctx, wall, now);
    if (type === 'slag_barrier') return this.drawSlagBarrier(ctx, wall, now);
    if (type === 'turbine_block') return this.drawTurbineBlock(ctx, wall, now);
    if (type === 'waste_containment') return this.drawWasteContainment(ctx, wall);

    // Orbital Station Obstacles
    if (type === 'orbital_bulkhead') return this.drawOrbitalBulkhead(ctx, wall);
    if (type === 'airlock_hatch') return this.drawAirlockHatch(ctx, wall, now);
    if (type === 'solar_capacitor') return this.drawSolarCapacitor(ctx, wall, now);
    if (type === 'science_station') return this.drawScienceStation(ctx, wall, now);
    if (type === 'magnetic_barrier') return this.drawMagneticBarrier(ctx, wall, now);
    if (type === 'thruster_housing') return this.drawThrusterHousing(ctx, wall, now);

    // Chronos Collider / Quantum Nexus Obstacles
    if (type === 'magnetic_beam_guide') return this.drawMagneticBeamGuide(ctx, wall, now);
    if (type === 'cryo_manifold') return this.drawCryoManifold(ctx, wall, now);
    if (type === 'quantum_holo_deck') return this.drawQuantumHoloDeck(ctx, wall, now);
    if (type === 'warp_deflector') return this.drawWarpDeflector(ctx, wall, now);
    if (type === 'tachyon_injector') return this.drawTachyonInjector(ctx, wall, now);
    if (type === 'laser_focus_array') return this.drawLaserFocusArray(ctx, wall, now);
    if (type === 'antimatter_pod') return this.drawAntimatterPod(ctx, wall, now);
    if (type === 'quantum_capacitor') return this.drawQuantumCapacitor(ctx, wall, now);
    if (type === 'graviton_resonator') return this.drawGravitonResonator(ctx, wall, now);

    // Fallback: draw theme-tailored tactical barrier
    this.drawFallbackBarrier(ctx, wall, mapId);
  }

  // =========================================================================
  // 1. SECTOR-09 OBJECTS: Containers, Pallets, Forklifts, Furnaces, Fuel Tanks
  // =========================================================================
  drawContainer(ctx, wall) {
    const { x, y, w, h } = wall;
    const baseColor = wall.color || '#133e66';

    // Metal container base
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, w, h);

    // Corrugated metal ridges with 3D beveling
    const step = 18;
    const isHoriz = w > h;
    ctx.lineWidth = 2.5;

    if (isHoriz) {
      for (let rx = x + step; rx < x + w - step; rx += step) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.moveTo(rx, y + 3);
        ctx.lineTo(rx, y + h - 3);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(rx + 2, y + 3);
        ctx.lineTo(rx + 2, y + h - 3);
        ctx.stroke();
      }
    } else {
      for (let ry = y + step; ry < y + h - step; ry += step) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.moveTo(x + 3, ry);
        ctx.lineTo(x + w - 3, ry);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(x + 3, ry + 2);
        ctx.lineTo(x + w - 3, ry + 2);
        ctx.stroke();
      }
    }

    // Cast steel corner castings (ISO corners)
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(x, y, 14, 14);
    ctx.fillRect(x + w - 14, y, 14, 14);
    ctx.fillRect(x, y + h - 14, 14, 14);
    ctx.fillRect(x + w - 14, y + h - 14, 14, 14);

    // Corner lifting holes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y + 4, 6, 6);
    ctx.fillRect(x + w - 10, y + 4, 6, 6);
    ctx.fillRect(x + 4, y + h - 10, 6, 6);
    ctx.fillRect(x + w - 10, y + h - 10, 6, 6);

    // Outer frame outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Double locking door bars at one end
    ctx.fillStyle = '#222834';
    if (isHoriz) {
      ctx.fillRect(x + w - 18, y + 4, 4, h - 8);
      ctx.fillRect(x + w - 10, y + 4, 4, h - 8);
    } else {
      ctx.fillRect(x + 4, y + h - 18, w - 8, 4);
      ctx.fillRect(x + 4, y + h - 10, w - 8, 4);
    }

    // Stencil brand & serial text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = 'bold 11px monospace';
    const label = wall.label || 'CY-CARGO';
    ctx.fillText(label, x + 20, y + 20);
    if (wall.serial) {
      ctx.font = '9px monospace';
      ctx.fillStyle = '#ffb703';
      ctx.fillText(wall.serial, x + 20, y + 33);
    }
  }

  drawPallet(ctx, wall) {
    const { x, y, w, h } = wall;
    // Wooden pallet base slats
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x, y, w, h);

    // Pallet wood slats
    ctx.strokeStyle = '#2b1f16';
    ctx.lineWidth = 3;
    for (let py = y + 8; py < y + h; py += 16) {
      ctx.beginPath();
      ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
    }

    // Shrink-wrapped industrial equipment payload (center block)
    const pad = 8;
    ctx.fillStyle = '#2b394a';
    ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);

    // Plastic shrink wrap sheen
    const grad = ctx.createLinearGradient(x + pad, y + pad, x + w - pad, y + h - pad);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);

    // Heavy orange tie-down ratchet straps
    ctx.strokeStyle = '#ff7b00';
    ctx.lineWidth = 4;
    // Strap 1
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.3, y + h); ctx.stroke();
    // Strap 2
    ctx.beginPath();
    ctx.moveTo(x + w * 0.7, y); ctx.lineTo(x + w * 0.7, y + h); ctx.stroke();

    // Metal buckles
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x + w * 0.3 - 4, y + h * 0.5 - 4, 8, 8);
    ctx.fillRect(x + w * 0.7 - 4, y + h * 0.5 - 4, 8, 8);

    // Stencil
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('FRAGILE // HEAVY', x + 12, y + 20);
  }

  drawForklift(ctx, wall, now) {
    const { x, y, w, h } = wall;
    const isHoriz = w > h;

    // Safety Yellow/Orange Chassis
    ctx.fillStyle = '#f39c12';
    this.drawRoundedBox(ctx, x, y, w, h, 8);

    // Black heavy rear counterweight block
    ctx.fillStyle = '#1c2331';
    if (isHoriz) {
      ctx.fillRect(x, y, 40, h);
    } else {
      ctx.fillRect(x, y, w, 40);
    }

    // Overhead Safety Roll-Cage (Lattice)
    ctx.strokeStyle = '#111722';
    ctx.lineWidth = 3;
    const cx = x + (isHoriz ? 45 : 8);
    const cy = y + (isHoriz ? 8 : 45);
    const cw = isHoriz ? w - 90 : w - 16;
    const ch = isHoriz ? h - 16 : h - 90;
    ctx.strokeRect(cx, cy, cw, ch);

    // Cage cross slats
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      if (isHoriz) {
        ctx.moveTo(cx + (cw * i) / 4, cy);
        ctx.lineTo(cx + (cw * i) / 4, cy + ch);
      } else {
        ctx.moveTo(cx, cy + (ch * i) / 4);
        ctx.lineTo(cx + cw, cy + (ch * i) / 4);
      }
      ctx.stroke();
    }

    // Driver seat & steering wheel
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.arc(cx + cw / 2, cy + ch / 2, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hydraulic Front Mast & Two Steel Fork Tines
    ctx.fillStyle = '#2c3e50';
    if (isHoriz) {
      // Mast
      ctx.fillRect(x + w - 40, y + 10, 12, h - 20);
      // Forks extending forward
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(x + w - 28, y + 15, 26, 8);
      ctx.fillRect(x + w - 28, y + h - 23, 26, 8);
    } else {
      ctx.fillRect(x + 10, y + h - 40, w - 20, 12);
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(x + 15, y + h - 28, 8, 26);
      ctx.fillRect(x + w - 23, y + h - 28, 8, 26);
    }

    // Flashing Amber Warning Beacon on Roll-cage Roof
    const beaconFlash = Math.sin(now * 0.01) > 0;
    ctx.fillStyle = beaconFlash ? '#ffea00' : '#d35400';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = beaconFlash ? 14 : 2;
    ctx.beginPath();
    ctx.arc(cx + cw * 0.25, cy + ch * 0.3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('CAT-FORK', cx + 4, cy + ch - 6);
  }

  drawFurnace(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Heavy cast iron foundry structure
    ctx.fillStyle = '#1c1512';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#44281d';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Glowing Molten Core Grate (breathing pulse)
    const pulse = 0.7 + Math.sin(now * 0.005 + x) * 0.3;
    ctx.fillStyle = `rgba(255, 80, 0, ${0.45 * pulse})`;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 16 * pulse;
    const innerPad = 12;
    ctx.fillRect(x + innerPad, y + innerPad, w - innerPad * 2, h - innerPad * 2);
    ctx.shadowBlur = 0;

    // Heavy iron ventilation bars over the furnace
    ctx.strokeStyle = '#2d180f';
    ctx.lineWidth = 5;
    if (w > h) {
      for (let fx = x + 24; fx < x + w - 20; fx += 28) {
        ctx.beginPath();
        ctx.moveTo(fx, y + innerPad); ctx.lineTo(fx, y + h - innerPad); ctx.stroke();
      }
    } else {
      for (let fy = y + 24; fy < y + h - 20; fy += 28) {
        ctx.beginPath();
        ctx.moveTo(x + innerPad, fy); ctx.lineTo(x + w - innerPad, fy); ctx.stroke();
      }
    }

    // Heat shimmer label
    ctx.fillStyle = '#ffaa44';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('HOT // 1450°C', x + 16, y + 22);
  }

  drawSteelStack(ctx, wall) {
    const { x, y, w, h } = wall;
    ctx.fillStyle = '#1a222d';
    ctx.fillRect(x, y, w, h);

    // Individual steel billets / ingots
    const isHoriz = w > h;
    const count = 5;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < count; i++) {
      const bx = isHoriz ? x : x + (w * i) / count;
      const by = isHoriz ? y + (h * i) / count : y;
      const bw = isHoriz ? w : w / count;
      const bh = isHoriz ? h / count : h;

      ctx.fillStyle = i % 2 === 0 ? '#3a475a' : '#2d3746';
      ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
      ctx.strokeStyle = '#5a6e8c';
      ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
    }

    // Heavy steel banding
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
  }

  drawFuelDepotTank(ctx, wall) {
    const { x, y, w, h } = wall;
    // Pressurized heavy steel fuel tank
    ctx.fillStyle = '#1a2634';
    this.drawRoundedBox(ctx, x, y, w, h, 10);
    ctx.strokeStyle = '#324a66';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Fuel Manifold Piping & Valves
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 6;
    if (w > h) {
      ctx.beginPath();
      ctx.moveTo(x + 15, y + h / 2);
      ctx.lineTo(x + w - 15, y + h / 2);
      ctx.stroke();

      // Valves
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(x + w * 0.3, y + h / 2, 7, 0, Math.PI * 2);
      ctx.arc(x + w * 0.7, y + h / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 15);
      ctx.lineTo(x + w / 2, y + h - 15);
      ctx.stroke();

      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.3, 7, 0, Math.PI * 2);
      ctx.arc(x + w / 2, y + h * 0.7, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pressure Gauge Dial
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Needle
    ctx.strokeStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 20); ctx.lineTo(x + 24, y + 16); ctx.stroke();

    ctx.fillStyle = '#ff7b00';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('DIESEL', x + 35, y + 23);
  }

  drawIndustrialBarrier(ctx, wall) {
    const { x, y, w, h } = wall;
    // Reinforced steel/concrete crash barrier
    ctx.fillStyle = '#1a1f2b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3d4b66';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Diagonal Hazard Stripes (Yellow / Black)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, w - 4, h - 4);
    ctx.clip();

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 10;
    const span = w + h;
    for (let d = -span; d < span; d += 24) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
      ctx.stroke();
    }
    ctx.restore();

    // Top metal cap
    ctx.strokeStyle = '#5a6e8c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  // =========================================================================
  // 2. CYBER-BUNKER OBJECTS: Server Banks, Blast Doors, Cryo Pods, Command Desks
  // =========================================================================
  drawServerBank(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // High-Density Subterranean Server Enclosure
    ctx.fillStyle = '#06080d';
    ctx.fillRect(x, y, w, h);

    // Outer metal chassis border
    ctx.strokeStyle = '#1c2638';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Server blade racks with blinking high-density LED arrays
    const isVert = h > w;
    const baseLedColor = wall.ledColor || '#00f0ff';

    if (isVert) {
      for (let sy = y + 8; sy < y + h - 8; sy += 20) {
        ctx.fillStyle = '#0e1420';
        ctx.fillRect(x + 3, sy, w - 6, 15);
        ctx.strokeStyle = '#1b263b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, sy, w - 6, 15);

        // Blinking activity LEDs
        const b1 = Math.sin(now * 0.009 + sy * 0.1) > 0;
        const b2 = Math.cos(now * 0.007 + sy * 0.15) > 0;
        ctx.fillStyle = b1 ? baseLedColor : '#003344';
        ctx.fillRect(x + 6, sy + 5, 4, 4);

        ctx.fillStyle = b2 ? '#00ff88' : '#004422';
        ctx.fillRect(x + 14, sy + 5, 4, 4);

        ctx.fillStyle = (sy % 40 === 0) ? '#ff3366' : '#ffb703';
        ctx.fillRect(x + 22, sy + 5, 4, 4);
      }
    } else {
      for (let sx = x + 8; sx < x + w - 8; sx += 20) {
        ctx.fillStyle = '#0e1420';
        ctx.fillRect(sx, y + 3, 15, h - 6);
        ctx.strokeStyle = '#1b263b';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, y + 3, 15, h - 6);

        const b1 = Math.sin(now * 0.009 + sx * 0.1) > 0;
        ctx.fillStyle = b1 ? baseLedColor : '#003344';
        ctx.fillRect(sx + 5, y + 6, 4, 4);

        ctx.fillStyle = '#00ff88';
        ctx.fillRect(sx + 5, y + 14, 4, 4);
      }
    }

    // Top cable management tray (Orange & Cyan fiber cables)
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2); ctx.lineTo(x + w - 4, y + 2); ctx.stroke();
    ctx.strokeStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + 4); ctx.stroke();
  }

  drawBlastDoor(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Heavy Reinforced Vault Blast Door
    ctx.fillStyle = '#150d18';
    ctx.fillRect(x, y, w, h);

    // Hazard striped door frame
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Interlocking hydraulic teeth / locking wedges
    const isHoriz = w > h;
    ctx.fillStyle = '#2d182e';
    if (isHoriz) {
      for (let dx = x + 16; dx < x + w - 16; dx += 32) {
        ctx.fillRect(dx, y + 4, 16, h - 8);
      }
      // Center locking seam
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + h / 2); ctx.lineTo(x + w - 8, y + h / 2); ctx.stroke();

      // Hydraulic pistons on left & right ends
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 4, y + 6, 8, h - 12);
      ctx.fillRect(x + w - 12, y + 6, 8, h - 12);
    } else {
      for (let dy = y + 16; dy < y + h - 16; dy += 32) {
        ctx.fillRect(x + 4, dy, w - 8, 16);
      }
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 8); ctx.lineTo(x + w / 2, y + h - 8); ctx.stroke();

      ctx.fillStyle = '#666';
      ctx.fillRect(x + 6, y + 4, w - 12, 8);
      ctx.fillRect(x + 6, y + h - 12, w - 12, 8);
    }

    // Center Mechanical Locking Wheel & Status LED
    const mx = x + w / 2;
    const my = y + h / 2;
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pulsing Security Status LED (Green locked)
    const ledGlow = Math.sin(now * 0.005) > 0;
    ctx.fillStyle = ledGlow ? '#00ff88' : '#005522';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = ledGlow ? 10 : 0;
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawCryoChamber(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Medical-Grade Cryo Containment Station
    ctx.fillStyle = '#08141d';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Luminous Cryogenic Fluid Chamber
    const pulse = 0.8 + Math.sin(now * 0.004 + x) * 0.2;
    ctx.fillStyle = `rgba(0, 240, 255, ${0.25 * pulse})`;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12 * pulse;
    ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
    ctx.shadowBlur = 0;

    // Cryo glass reflection line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 10);
    ctx.lineTo(x + w - 10, y + h - 10);
    ctx.stroke();

    // Telemetry Vitals Display on Corner
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('CRYO: -196°C', x + 10, y + 20);

    // ECG Heartbeat line simulation
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const eY = y + h - 14;
    ctx.moveTo(x + 10, eY);
    ctx.lineTo(x + 25, eY);
    ctx.lineTo(x + 30, eY - 6);
    ctx.lineTo(x + 35, eY + 6);
    ctx.lineTo(x + 40, eY);
    ctx.lineTo(x + 55, eY);
    ctx.stroke();
  }

  drawCommandConsole(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Tactical Ergonomic Command Station
    ctx.fillStyle = '#140c18';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Tactical Radar CRT Display (Circular Screen)
    const cx = x + 28;
    const cy = y + h / 2;
    const r = Math.min(18, h / 2 - 6);
    ctx.fillStyle = '#051810';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Radar rotating sweep hand
    const sweepAngle = (now * 0.003) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
    ctx.stroke();

    // Keyboard & Telemetry Buttons Deck
    const kx = cx + r + 10;
    const kw = w - (kx - x) - 10;
    if (kw > 30) {
      ctx.fillStyle = '#1f1624';
      ctx.fillRect(kx, y + 8, kw, h - 16);

      // Multicolor indicator switches
      for (let bx = kx + 4; bx < kx + kw - 4; bx += 10) {
        ctx.fillStyle = (bx % 20 === 0) ? '#ff3366' : '#00f0ff';
        ctx.fillRect(bx, y + 12, 6, 6);
      }
    }
  }

  drawDeconStation(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Decontamination Air-Shower Unit
    ctx.fillStyle = '#12161f';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Floor drain grating
    ctx.strokeStyle = '#273447';
    ctx.lineWidth = 2;
    for (let gx = x + 8; gx < x + w - 8; gx += 12) {
      ctx.beginPath();
      ctx.moveTo(gx, y + 6); ctx.lineTo(gx, y + h - 6); ctx.stroke();
    }

    // High-pressure spray mist nozzles
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(x + 4, y + 4, 6, 6);
    ctx.fillRect(x + w - 10, y + 4, 6, 6);
    ctx.fillRect(x + 4, y + h - 10, 6, 6);
    ctx.fillRect(x + w - 10, y + h - 10, 6, 6);

    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('DECON // BIO-CLEAN', x + 12, y + h / 2 + 3);
  }

  drawReinforcedBulkhead(ctx, wall) {
    const { x, y, w, h } = wall;
    ctx.fillStyle = '#100c14';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3d2542';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Heavy steel rebar plate joints
    ctx.fillStyle = '#221426';
    if (w > h) {
      for (let rx = x + 40; rx < x + w - 40; rx += 60) {
        ctx.fillRect(rx, y + 2, 8, h - 4);
      }
    } else {
      for (let ry = y + 40; ry < y + h - 40; ry += 60) {
        ctx.fillRect(x + 2, ry, w - 4, 8);
      }
    }

    // Hex bolts
    ctx.fillStyle = '#55335e';
    ctx.fillRect(x + 4, y + 4, 4, 4);
    ctx.fillRect(x + w - 8, y + 4, 4, 4);
    ctx.fillRect(x + 4, y + h - 8, 4, 4);
    ctx.fillRect(x + w - 8, y + h - 8, 4, 4);
  }

  // =========================================================================
  // 3. NEON-SLUMS OBJECTS: Ramen Stalls, Cyber Cars, Vending Machines, Dumpsters
  // =========================================================================
  drawRamenStall(ctx, wall, now) {
    const { x, y, w, h } = wall;
    const isHoriz = w > h;

    // Wooden bar counter foundation
    ctx.fillStyle = '#2b1b17';
    ctx.fillRect(x, y, w, h);

    // Striped Fabric Awning / Canopy (Red & White or Magenta & Cyan)
    const stripeColor1 = wall.color || '#ff0055';
    const stripeColor2 = '#ffffff';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, isHoriz ? h * 0.6 : h);
    ctx.clip();

    const stripeW = 16;
    for (let s = -h; s < w + h; s += stripeW * 2) {
      ctx.fillStyle = stripeColor1;
      ctx.fillRect(x + s, y, stripeW, h);
      ctx.fillStyle = stripeColor2;
      ctx.fillRect(x + s + stripeW, y, stripeW, h);
    }
    ctx.restore();

    // Wooden Dining Counter Bar (Front)
    ctx.fillStyle = '#5c3a21';
    if (isHoriz) {
      ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
      // Food bowls on counter
      for (let bx = x + 30; bx < x + w - 30; bx += 60) {
        // Ceramic bowl
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(bx, y + h * 0.8, 8, 0, Math.PI * 2);
        ctx.fill();
        // Broth / ramen inside
        ctx.fillStyle = '#d35400';
        ctx.beginPath();
        ctx.arc(bx, y + h * 0.8, 6, 0, Math.PI * 2);
        ctx.fill();
        // Chopsticks
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - 10, y + h * 0.8 - 4);
        ctx.lineTo(bx + 10, y + h * 0.8 + 4);
        ctx.stroke();
      }
    } else {
      ctx.fillRect(x + w * 0.6, y, w * 0.4, h);
      for (let by = y + 30; by < y + h - 30; by += 60) {
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(x + w * 0.8, by, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d35400';
        ctx.beginPath();
        ctx.arc(x + w * 0.8, by, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glowing Red/Amber Japanese Lanterns at Corners
    const lanternGlow = 0.8 + Math.sin(now * 0.006) * 0.2;
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 14 * lanternGlow;
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 7, 0, Math.PI * 2);
    ctx.arc(x + w - 12, y + 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Neon Kanji Signboard on top
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(wall.kanji || 'ラーメン', x + w / 2 - 25, y + 16);
    ctx.shadowBlur = 0;
  }

  drawCyberCar(ctx, wall, now) {
    const { x, y, w, h } = wall;
    const isHoriz = w > h;
    const carColor = wall.color || '#bd00ff';

    // Aerodynamic Cyberpunk Vehicle Chassis
    ctx.fillStyle = carColor;
    this.drawRoundedBox(ctx, x, y, w, h, 14);

    // Metallic body shading
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Tinted Glass Cockpit (Windshield & Roof)
    ctx.fillStyle = '#080d1a';
    if (isHoriz) {
      const wx = x + w * 0.25;
      const wy = y + 8;
      const ww = w * 0.5;
      const wh = h - 16;
      this.drawRoundedBox(ctx, wx, wy, ww, wh, 6);

      // Glass reflection streak
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + 8, wy + 4); ctx.lineTo(wx + ww - 8, wy + wh - 4); ctx.stroke();

      // Twin LED Headlights (Front - Right side)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(x + w - 6, y + 8, 4, 12);
      ctx.fillRect(x + w - 6, y + h - 20, 4, 12);

      // Neon Red Full-width Taillight Bar (Rear - Left side)
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 12;
      ctx.fillRect(x + 2, y + 10, 4, h - 20);
      ctx.shadowBlur = 0;

      // Aerodynamic Rear Wing / Spoiler
      ctx.fillStyle = '#111';
      ctx.fillRect(x + 8, y + 6, 6, h - 12);
    } else {
      const wx = x + 8;
      const wy = y + h * 0.25;
      const ww = w - 16;
      const wh = h * 0.5;
      this.drawRoundedBox(ctx, wx, wy, ww, wh, 6);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + 4, wy + 8); ctx.lineTo(wx + ww - 4, wy + wh - 8); ctx.stroke();

      // Headlights (Bottom)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(x + 8, y + h - 6, 12, 4);
      ctx.fillRect(x + w - 20, y + h - 6, 12, 4);

      // Taillight (Top)
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 12;
      ctx.fillRect(x + 10, y + 2, w - 20, 4);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#111';
      ctx.fillRect(x + 6, y + 8, w - 12, 6);
    }

    // High-tech hood vents
    ctx.fillStyle = '#111';
    if (isHoriz) {
      ctx.fillRect(x + w * 0.8, y + h * 0.35, 12, h * 0.3);
    } else {
      ctx.fillRect(x + w * 0.35, y + h * 0.8, w * 0.3, 12);
    }
  }

  drawVendingMachine(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Cyberpunk Illuminated Vending Machine Cabinet
    ctx.fillStyle = '#110b1a';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = '#bd00ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Glowing Glass Showcase showing beverage cans
    const isHoriz = w > h;
    const brand = wall.brand || 'NEO-COLA';

    // Top Neon Brand Header
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(brand, x + 8, y + 16);
    ctx.shadowBlur = 0;

    // Illuminated rows of drinks
    const rowPad = 22;
    if (isHoriz) {
      for (let cx = x + 10; cx < x + w - 40; cx += 18) {
        // Can 1 (Cyan)
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(cx, y + rowPad, 12, 18);
        // Can 2 (Gold)
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(cx, y + rowPad + 22, 12, 18);
      }
      // Right side coin slot / keypad
      ctx.fillStyle = '#2a1a38';
      ctx.fillRect(x + w - 30, y + rowPad, 22, h - rowPad - 8);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(x + w - 24, y + rowPad + 8, 10, 4);
    } else {
      for (let cy = y + rowPad; cy < y + h - 40; cy += 18) {
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(x + 10, cy, 18, 12);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(x + 32, cy, 18, 12);
      }
      ctx.fillStyle = '#2a1a38';
      ctx.fillRect(x + 10, y + h - 32, w - 20, 22);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(x + 16, y + h - 24, 10, 4);
    }

    // Soft neon ground glow
    ctx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }

  drawDumpster(ctx, wall) {
    const { x, y, w, h } = wall;
    // Municipal Green / Steel Industrial Dumpster
    ctx.fillStyle = '#1e382b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#2d5a42';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Split Plastic Lids (Black ribbed)
    const isHoriz = w > h;
    ctx.fillStyle = '#0f1712';
    if (isHoriz) {
      // Left lid
      ctx.fillRect(x + 4, y + 4, w * 0.48 - 4, h - 8);
      // Right lid (slightly open)
      ctx.fillRect(x + w * 0.52, y + 4, w * 0.48 - 4, h - 8);

      // Ribbing
      ctx.strokeStyle = '#223026';
      ctx.lineWidth = 1.5;
      for (let rx = x + 12; rx < x + w - 12; rx += 14) {
        ctx.beginPath();
        ctx.moveTo(rx, y + 6); ctx.lineTo(rx, y + h - 6); ctx.stroke();
      }
    } else {
      ctx.fillRect(x + 4, y + 4, w - 8, h * 0.48 - 4);
      ctx.fillRect(x + 4, y + h * 0.52, w - 8, h * 0.48 - 4);
    }

    // Street Graffiti Tag in vibrant spray paint
    ctx.fillStyle = '#ff007f';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('REVOLT', x + 16, y + h / 2 + 4);
  }

  drawTransformerBox(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // High-Voltage Electrical Utility Box
    ctx.fillStyle = '#1f242e';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3a4457';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Cooling louver grates
    ctx.strokeStyle = '#11161f';
    ctx.lineWidth = 2;
    for (let gy = y + 10; gy < y + h - 10; gy += 8) {
      ctx.beginPath();
      ctx.moveTo(x + 8, gy); ctx.lineTo(x + w - 8, gy); ctx.stroke();
    }

    // Yellow Lightning Warning Decal
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    const mx = x + w / 2;
    const my = y + h / 2;
    ctx.moveTo(mx + 2, my - 8);
    ctx.lineTo(mx - 4, my);
    ctx.lineTo(mx + 1, my);
    ctx.lineTo(mx - 2, my + 8);
    ctx.lineTo(mx + 5, my - 1);
    ctx.lineTo(mx, my - 1);
    ctx.closePath();
    ctx.fill();

    // Sprawling electric conduit cables coming out
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + h); ctx.quadraticCurveTo(x + 5, y + h + 15, x - 10, y + h + 20); ctx.stroke();
    ctx.strokeStyle = '#3498db';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + h); ctx.quadraticCurveTo(x + 25, y + h + 18, x + 35, y + h + 22); ctx.stroke();
  }

  drawNeonBillboard(ctx, wall, now) {
    const { x, y, w, h } = wall;
    const neonColor = wall.color || '#ff0033';

    // Dark glass advertising stanchion
    ctx.fillStyle = '#0a0510';
    ctx.fillRect(x, y, w, h);

    // Glowing Neon Frame
    const pulse = 0.8 + Math.sin(now * 0.007) * 0.2;
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 14 * pulse;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Glowing holographic advertisement text
    ctx.fillStyle = neonColor;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(wall.label || 'ARASAKA // AD', x + 12, y + 24);

    // Scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let sy = y + 4; sy < y + h; sy += 6) {
      ctx.fillRect(x, sy, w, 2);
    }
  }

  drawNeonBarrier(ctx, wall) {
    const { x, y, w, h } = wall;
    ctx.fillStyle = '#130a1c';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#bd00ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Glowing cat-eye reflectors
    if (w > h) {
      for (let rx = x + 20; rx < x + w - 20; rx += 30) {
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(rx, y + h / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let ry = y + 20; ry < y + h - 20; ry += 30) {
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(x + w / 2, ry, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // =========================================================================
  // 4. REACTOR-CRUCIBLE OBJECTS: Heat Shields, Coolant Pipes, Slag Barriers, Turbines
  // =========================================================================
  drawHeatShield(ctx, wall) {
    const { x, y, w, h } = wall;
    // Thermal Protection System (Ceramic TPS Tiles)
    ctx.fillStyle = '#1c1514';
    ctx.fillRect(x, y, w, h);

    // Burnt Titanium Rainbow Oxidation Gradient on Edge
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#784212');
    grad.addColorStop(0.3, '#7d3c98');
    grad.addColorStop(0.7, '#2471a3');
    grad.addColorStop(1, '#117864');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Hexagonal / Square thermal tile grid
    ctx.strokeStyle = '#2d1f1c';
    ctx.lineWidth = 1;
    const tSize = 16;
    for (let tx = x; tx < x + w; tx += tSize) {
      ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke();
    }
    for (let ty = y; ty < y + h; ty += tSize) {
      ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke();
    }

    // Heavy titanium anchor bolts
    ctx.fillStyle = '#ff7b00';
    ctx.fillRect(x + 4, y + 4, 4, 4);
    ctx.fillRect(x + w - 8, y + 4, 4, 4);
    ctx.fillRect(x + 4, y + h - 8, 4, 4);
    ctx.fillRect(x + w - 8, y + h - 8, 4, 4);
  }

  drawCoolantPipe(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Superheated Coolant Conduit wrapped in thermal gold/bronze foil
    ctx.fillStyle = '#593816';
    this.drawRoundedBox(ctx, x, y, w, h, 8);

    // Thermal foil wrapping pattern
    ctx.strokeStyle = '#a06e30';
    ctx.lineWidth = 2;
    const isHoriz = w > h;
    if (isHoriz) {
      for (let px = x + 16; px < x + w; px += 24) {
        ctx.beginPath();
        ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke();
      }
    } else {
      for (let py = y + 16; py < y + h; py += 24) {
        ctx.beginPath();
        ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
      }
    }

    // Glowing steam relief vents
    const ventPulse = Math.sin(now * 0.008) > 0.5;
    ctx.fillStyle = ventPulse ? '#ffaa00' : '#442200';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = ventPulse ? 12 : 0;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stencil
    ctx.fillStyle = '#ffbe0b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('SODIUM // 650°C', x + 8, y + 16);
  }

  drawSlagBarrier(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Scorched Molten Basalt & Shattered Rebar Barrier
    ctx.fillStyle = '#140c0a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3d2019';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Glowing Molten Magma Veins Cracking Through the Rock
    const pulse = 0.7 + Math.sin(now * 0.006 + x) * 0.3;
    ctx.strokeStyle = '#ff3700';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff3700';
    ctx.shadowBlur = 12 * pulse;

    ctx.beginPath();
    ctx.moveTo(x + 10, y + h * 0.3);
    ctx.lineTo(x + w * 0.4, y + h * 0.7);
    ctx.lineTo(x + w * 0.7, y + h * 0.2);
    ctx.lineTo(x + w - 10, y + h * 0.6);
    ctx.stroke();

    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Exposed rebar rods sticking out
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, y - 6);
    ctx.moveTo(x + w - 12, y + h); ctx.lineTo(x + w - 12, y + h + 6);
    ctx.stroke();
  }

  drawTurbineBlock(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Heavy Turbine Generator Housing
    ctx.fillStyle = '#1a100c';
    this.drawRoundedBox(ctx, x, y, w, h, 8);
    ctx.strokeStyle = '#59321c';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Exposed electromagnetic rotor coil
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.35;
    ctx.fillStyle = '#3a1c0d';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Swirling magnetic induction arcs
    const spin = now * 0.005;
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = spin + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7, a, a + 0.6);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffbe0b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('TURBINE // 12kV', x + 10, y + 18);
  }

  drawWasteContainment(ctx, wall) {
    const { x, y, w, h } = wall;
    // Lead-Lined Nuclear Waste Cask
    ctx.fillStyle = '#221e10';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Hazard yellow/black border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    ctx.setLineDash([]);

    // Radiation Trefoil symbol in center
    this.drawRadiationSymbol(ctx, x + w / 2, y + h / 2, Math.min(16, h / 2 - 6));
  }

  // =========================================================================
  // 5. ORBITAL-STATION OBJECTS: Bulkheads, Airlocks, Solar Capacitors, Telemetry
  // =========================================================================
  drawOrbitalBulkhead(ctx, wall) {
    const { x, y, w, h } = wall;
    // Aerospace Cleanroom Composite Hull (Sleek white / matte slate)
    ctx.fillStyle = '#141d2e';
    this.drawRoundedBox(ctx, x, y, w, h, 6);

    // Smooth composite white outer panels
    ctx.strokeStyle = '#2b3f63';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Continuous Inset Blue LED Status Line
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (w > h) {
      ctx.moveTo(x + 8, y + h / 2); ctx.lineTo(x + w - 8, y + h / 2);
    } else {
      ctx.moveTo(x + w / 2, y + 8); ctx.lineTo(x + w / 2, y + h - 8);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Aerospace panel seams & hex bolts
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y + 4, 3, 3);
    ctx.fillRect(x + w - 7, y + 4, 3, 3);
    ctx.fillRect(x + 4, y + h - 7, 3, 3);
    ctx.fillRect(x + w - 7, y + h - 7, 3, 3);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('AEROSPACE-9', x + 10, y + 16);
  }

  drawAirlockHatch(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Pressurized Space Station Airlock Hatch
    ctx.fillStyle = '#0f1826';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Circular Hatch Door
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(22, Math.min(w, h) / 2 - 4);

    ctx.fillStyle = '#1b2a42';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rotating Manual Yellow Locking Wheel
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    // Wheel spokes
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (r * 0.5), cy + Math.sin(a) * (r * 0.5));
      ctx.stroke();
    }

    // Depressurization Warning Beacon
    const sealGlow = Math.sin(now * 0.005) > 0;
    ctx.fillStyle = sealGlow ? '#00ff88' : '#005522';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = sealGlow ? 10 : 0;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffbe0b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('AIRLOCK // VACUUM', x + 10, y + 16);
  }

  drawSolarCapacitor(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Photovoltaic Solar Capacitor Array
    ctx.fillStyle = '#061324';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Deep-blue crystalline solar cells with silver grid lines
    const cellSize = 18;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let sx = x + 4; sx < x + w - 4; sx += cellSize) {
      for (let sy = y + 4; sy < y + h - 4; sy += cellSize) {
        ctx.fillStyle = '#0a2544';
        ctx.fillRect(sx, sy, cellSize - 2, cellSize - 2);
        ctx.strokeRect(sx, sy, cellSize - 2, cellSize - 2);
      }
    }

    // Segmented Power Level LED Bar Display
    const barW = Math.min(80, w - 20);
    const chargeLevel = 0.5 + Math.sin(now * 0.003) * 0.45;
    ctx.fillStyle = '#003344';
    ctx.fillRect(x + 10, y + h - 14, barW, 6);

    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(x + 10, y + h - 14, barW * chargeLevel, 6);
    ctx.shadowBlur = 0;
  }

  drawScienceStation(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Sterile White Science Telemetry Station
    ctx.fillStyle = '#101726';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = '#324a73';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Holographic Orbital Trajectory Projector (Wireframe Globe)
    const cx = x + 30;
    const cy = y + h / 2;
    const r = Math.min(18, h / 2 - 6);

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating orbital ring
    const spin = now * 0.002;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.4, spin, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Satellite coordinate telemetry readout
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('ORBIT: 420km', x + 55, y + 20);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('TELEMETRY: SYNC', x + 55, y + 33);
  }

  drawMagneticBarrier(ctx, wall, now) {
    const { x, y, w, h } = wall;
    ctx.fillStyle = '#0e1624';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Pulsing magnetic guide-rail strip
    const pulse = 0.7 + Math.sin(now * 0.006) * 0.3;
    ctx.fillStyle = `rgba(0, 212, 255, ${0.4 * pulse})`;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10 * pulse;
    if (w > h) {
      ctx.fillRect(x + 4, y + h / 2 - 2, w - 8, 4);
    } else {
      ctx.fillRect(x + w / 2 - 2, y + 4, 4, h - 8);
    }
    ctx.shadowBlur = 0;
  }

  drawThrusterHousing(ctx, wall, now) {
    const { x, y, w, h } = wall;
    // Reaction Control System (RCS) Rocket Cowling
    ctx.fillStyle = '#131b26';
    this.drawRoundedBox(ctx, x, y, w, h, 8);
    ctx.strokeStyle = '#2b3f5c';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Titanium Rocket Nozzles in Housing
    ctx.fillStyle = '#2c3e50';
    if (w > h) {
      for (let nx = x + 24; nx < x + w - 20; nx += 40) {
        ctx.beginPath();
        ctx.arc(nx, y + h / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(nx, y + h / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let ny = y + 24; ny < y + h - 20; ny += 40) {
        ctx.beginPath();
        ctx.arc(x + w / 2, ny, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(x + w / 2, ny, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#ff7b00';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('RCS-THRUSTER', x + 8, y + 16);
  }

  // =========================================================================
  // 6. CHRONOS-COLLIDER / QUANTUM NEXUS INTERACTIVE ENTITY DRAW HELPERS
  // =========================================================================

  drawBoostPads(ctx, camera, now) {
    if (!this.boostPads || this.boostPads.length === 0) return;

    for (const pad of this.boostPads) {
      const pr = pad.radius || 38;
      // Frustum culling
      if (pad.x + pr < camera.x || pad.x - pr > camera.x + camera.width ||
          pad.y + pr < camera.y || pad.y - pr > camera.y + camera.height) {
        continue;
      }

      ctx.save();
      const col = pad.color || '#00ffcc';
      const angle = Math.atan2(pad.dirY, pad.dirX);
      const isTriggered = (pad._activeTimer > 0);

      // Base Platform Disc
      ctx.fillStyle = '#061220';
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pr, 0, Math.PI * 2);
      ctx.fill();

      // Outer Neon Rim
      ctx.strokeStyle = isTriggered ? '#ffffff' : col;
      ctx.lineWidth = isTriggered ? 4 : 2.5;
      ctx.shadowColor = col;
      ctx.shadowBlur = isTriggered ? 26 : 14;
      ctx.stroke();

      // Inner Rotating Accelerator Grid
      ctx.translate(pad.x, pad.y);
      ctx.rotate(angle);

      // Animated Forward-Moving Chevrons (3 kinetic arrows)
      const phase = (now * 0.005) % 1;
      ctx.fillStyle = isTriggered ? '#ffffff' : col;
      ctx.shadowColor = col;
      ctx.shadowBlur = isTriggered ? 20 : 8;

      for (let i = 0; i < 3; i++) {
        const offset = ((i / 3 + phase) % 1) * (pr * 1.3) - (pr * 0.65);
        ctx.beginPath();
        ctx.moveTo(offset - 9, -14);
        ctx.lineTo(offset + 7, 0);
        ctx.lineTo(offset - 9, 14);
        ctx.lineTo(offset - 4, 14);
        ctx.lineTo(offset + 12, 0);
        ctx.lineTo(offset - 4, -14);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawPortals(ctx, camera, now) {
    if (!this.portals || this.portals.length === 0) return;

    for (const portal of this.portals) {
      const pr = portal.radius || 42;
      // Frustum culling
      if (portal.x + pr < camera.x || portal.x - pr > camera.x + camera.width ||
          portal.y + pr < camera.y || portal.y - pr > camera.y + camera.height) {
        continue;
      }

      ctx.save();
      const col = portal.color || '#00ffcc';
      const pulse = 0.8 + Math.sin(now * 0.006 + portal.x) * 0.2;

      // Outer Heavy Containment Arch
      ctx.fillStyle = '#030a16';
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, pr, 0, Math.PI * 2);
      ctx.fill();

      // Outer Rotating Magnetic Field Ring (Segmented)
      ctx.save();
      ctx.translate(portal.x, portal.y);
      ctx.rotate(now * 0.002);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.shadowColor = col;
      ctx.shadowBlur = 18 * pulse;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, pr - 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Counter-Rotating Inner Field Ring
      ctx.save();
      ctx.translate(portal.x, portal.y);
      ctx.rotate(-now * 0.0035);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, pr - 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Swirling Event Horizon (Radial Gradient from white/cyan to void)
      const grad = ctx.createRadialGradient(portal.x, portal.y, 4, portal.x, portal.y, pr - 14);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, col);
      grad.addColorStop(0.8, 'rgba(10, 4, 25, 0.95)');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, pr - 14, 0, Math.PI * 2);
      ctx.fill();

      // Floating Hologram Badge Tag
      ctx.font = 'bold 9px "Orbitron", monospace, sans-serif';
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 6;
      ctx.fillText(portal.label || 'PHASE GATE', portal.x, portal.y - pr - 10);

      ctx.restore();
    }
  }

  drawSingularityCore(ctx, camera, now) {
    const cx = 1200;
    const cy = 1200;
    const radius = 110;

    // Frustum culling
    if (cx + radius < camera.x || cx - radius > camera.x + camera.width ||
        cy + radius < camera.y || cy - radius > camera.y + camera.height) {
      return;
    }

    ctx.save();
    const rot = now * 0.0018;

    // 1. Expanding Quantum Shockwave Rings
    const waveRadius = 40 + ((now * 0.06) % 180);
    const waveAlpha = Math.max(0, 1 - waveRadius / 220);
    ctx.strokeStyle = `rgba(0, 255, 204, ${waveAlpha * 0.5})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Swirling Plasma Accretion Disk (Cyan & Violet)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // Outer plasma spokes
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 24;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 35, Math.sin(a) * 35);
      ctx.lineTo(Math.cos(a) * (radius - 10), Math.sin(a) * (radius - 10));
      ctx.stroke();
    }

    // Counter-spinning violet spiral
    ctx.rotate(-rot * 2.4);
    ctx.strokeStyle = 'rgba(189, 0, 255, 0.45)';
    ctx.shadowColor = '#bd00ff';
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 25, a, a + Math.PI / 3);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Pitch-Black Singularity Event Horizon Core
    const pulse = 0.85 + Math.sin(now * 0.008) * 0.15;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, cy, 38 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 28;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 22 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Tachyon Lightning Arcs to the 4 Collimator Pylons
    const pylons = [
      { x: 1020, y: 1020 }, { x: 1380, y: 1020 },
      { x: 1020, y: 1380 }, { x: 1380, y: 1380 }
    ];
    if (Math.sin(now * 0.01) > 0.45) {
      const targetPylon = pylons[Math.floor((now / 350) % 4)];
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // Jagged middle points
      const mid1X = cx + (targetPylon.x - cx) * 0.33 + (Math.random() - 0.5) * 28;
      const mid1Y = cy + (targetPylon.y - cy) * 0.33 + (Math.random() - 0.5) * 28;
      const mid2X = cx + (targetPylon.x - cx) * 0.66 + (Math.random() - 0.5) * 28;
      const mid2Y = cy + (targetPylon.y - cy) * 0.66 + (Math.random() - 0.5) * 28;
      ctx.lineTo(mid1X, mid1Y);
      ctx.lineTo(mid2X, mid2Y);
      ctx.lineTo(targetPylon.x, targetPylon.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // =========================================================================
  // 6. CHRONOS-COLLIDER / QUANTUM NEXUS OBSTACLE DRAWING METHODS
  // =========================================================================

  drawMagneticBeamGuide(ctx, wall, now) {
    const { x, y, w, h } = wall;
    const isHoriz = w > h;
    const beamColor = wall.beamColor || '#00ffcc';

    // Heavy titanium vacuum tube housing
    ctx.fillStyle = '#081320';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = '#1b324d';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Magnetic containment solenoids / clamps
    ctx.fillStyle = '#102236';
    if (isHoriz) {
      for (let rx = x + 24; rx < x + w - 20; rx += 46) {
        ctx.fillRect(rx, y, 12, h);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, y, 12, h);
      }
    } else {
      for (let ry = y + 24; ry < y + h - 20; ry += 46) {
        ctx.fillRect(x, ry, w, 12);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, ry, w, 12);
      }
    }

    // Central Glass Beam Canal with high-speed particle stream
    const pulse = 0.75 + Math.sin(now * 0.008 + x) * 0.25;
    ctx.strokeStyle = beamColor;
    ctx.lineWidth = isHoriz ? Math.min(8, h * 0.25) : Math.min(8, w * 0.25);
    ctx.shadowColor = beamColor;
    ctx.shadowBlur = 14 * pulse;
    ctx.beginPath();
    if (isHoriz) {
      ctx.moveTo(x + 6, y + h / 2);
      ctx.lineTo(x + w - 6, y + h / 2);
    } else {
      ctx.moveTo(x + w / 2, y + 6);
      ctx.lineTo(x + w / 2, y + h - 6);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Stencil label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wall.label || 'BEAM TUBE', x + 10, y + 16);
  }

  drawCryoManifold(ctx, wall, now) {
    const { x, y, w, h } = wall;
    const isHoriz = w > h;

    // Superconducting vacuum-jacketed stainless steel manifold
    ctx.fillStyle = '#0a1622';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Frost crystals & cryogenic ice bands
    ctx.strokeStyle = 'rgba(200, 245, 255, 0.45)';
    ctx.lineWidth = 3;
    if (isHoriz) {
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    } else {
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    }

    // Liquid Helium Cryo Manometer
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x + (isHoriz ? 24 : w / 2), y + (isHoriz ? h / 2 : 24), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wall.label || 'CRYO-4.2K', x + (isHoriz ? 38 : 6), y + (isHoriz ? h / 2 + 3 : 42));
  }

  drawQuantumHoloDeck(ctx, wall, now) {
    const { x, y, w, h } = wall;

    // Carbon-alloy slanted terminal desk
    ctx.fillStyle = '#07101b';
    this.drawRoundedBox(ctx, x, y, w, h, 8);
    ctx.strokeStyle = '#bd00ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Glowing 3D Holographic Projection Matrix
    const pulse = 0.8 + Math.sin(now * 0.005 + x) * 0.2;
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 12 * pulse;

    // Hologram circular dials
    const midX = x + w / 2;
    const midY = y + h / 2;
    ctx.beginPath();
    ctx.arc(midX, midY, Math.min(w, h) * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#bd00ff';
    ctx.beginPath();
    ctx.arc(midX, midY, Math.min(w, h) * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Telemetry text
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wall.label || 'QUANTUM TERMINAL', x + 10, y + 16);
  }

  drawWarpDeflector(ctx, wall, now) {
    const { x, y, w, h } = wall;

    // Heavy angular kinetic blast shield
    ctx.fillStyle = '#060e18';
    this.drawRoundedBox(ctx, x, y, w, h, 4);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Hexagonal energy dissipation honeycomb pattern
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
    ctx.lineWidth = 1;
    const step = 26;
    if (w > h) {
      for (let rx = x + step; rx < x + w; rx += step) {
        ctx.beginPath();
        ctx.moveTo(rx, y + 3); ctx.lineTo(rx - 10, y + h - 3);
        ctx.stroke();
      }
    } else {
      for (let ry = y + step; ry < y + h; ry += step) {
        ctx.beginPath();
        ctx.moveTo(x + 3, ry); ctx.lineTo(x + w - 3, ry - 10);
        ctx.stroke();
      }
    }

    // Hazard warning border
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wall.label || 'DEFLECTOR', x + 8, y + 16);
  }

  drawTachyonInjector(ctx, wall, now) {
    const { x, y, w, h } = wall;

    // High-pressure vertical particle injection stanchion
    ctx.fillStyle = '#081422';
    this.drawRoundedBox(ctx, x, y, w, h, 8);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Solenoid magnetic bands
    ctx.fillStyle = '#112940';
    for (let ry = y + 18; ry < y + h - 15; ry += 32) {
      ctx.fillRect(x + 4, ry, w - 8, 14);
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 4, ry, w - 8, 14);
    }

    // Glowing core emitter nozzle
    const pulse = 0.8 + Math.sin(now * 0.01 + y) * 0.2;
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 14 * pulse;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('INJECTOR', x + 6, y + 14);
  }

  drawLaserFocusArray(ctx, wall, now) {
    const { x, y, w, h } = wall;
    const laserColor = wall.laserColor || '#ff0055';

    // Prismatic optical laser emitter stanchion
    ctx.fillStyle = '#100612';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Optical glass lens prisms
    const count = Math.max(2, Math.floor(Math.max(w, h) / 55));
    ctx.fillStyle = '#250b28';
    if (w > h) {
      for (let i = 0; i < count; i++) {
        const lx = x + 18 + i * ((w - 36) / (count - 1 || 1));
        ctx.beginPath();
        ctx.arc(lx, y + h / 2, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Focused laser dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx, y + h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < count; i++) {
        const ly = y + 18 + i * ((h - 36) / (count - 1 || 1));
        ctx.beginPath();
        ctx.arc(x + w / 2, ly, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + w / 2, ly, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = laserColor;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wall.label || 'OPTICAL ARRAY', x + 8, y + 16);
  }

  drawAntimatterPod(ctx, wall, now) {
    const { x, y, w, h } = wall;

    // Heavy reinforced magnetic containment bottle
    ctx.fillStyle = '#050a14';
    this.drawRoundedBox(ctx, x, y, w, h, 8);
    ctx.strokeStyle = '#bd00ff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Suspended antimatter plasma chamber inside
    const pulse = 0.75 + Math.sin(now * 0.007 + x) * 0.25;
    const midX = x + w / 2;
    const midY = y + h / 2;

    ctx.fillStyle = '#bd00ff';
    ctx.shadowColor = '#bd00ff';
    ctx.shadowBlur = 18 * pulse;
    ctx.beginPath();
    ctx.arc(midX, midY, Math.min(w, h) * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(midX, midY, Math.min(w, h) * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Containment field safety brackets
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);

    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('ANTIMATTER', x + 8, y + 16);
  }

  drawQuantumCapacitor(ctx, wall, now) {
    const { x, y, w, h } = wall;

    // Multi-cell high-discharge capacitor power bank
    ctx.fillStyle = '#071220';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Capacitor cell coils
    const isHoriz = w > h;
    ctx.fillStyle = '#0d2238';
    if (isHoriz) {
      for (let cx = x + 16; cx < x + w - 16; cx += 28) {
        ctx.fillRect(cx, y + 6, 18, h - 12);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx, y + 6, 18, h - 12);
      }
    } else {
      for (let cy = y + 16; cy < y + h - 16; cy += 28) {
        ctx.fillRect(x + 6, cy, w - 12, 18);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 6, cy, w - 12, 18);
      }
    }

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wall.label || 'CAPACITOR BANK', x + 8, y + 16);
  }

  drawGravitonResonator(ctx, wall, now) {
    const { x, y, w, h } = wall;

    // Graviton harmonic resonator assembly
    ctx.fillStyle = '#09081a';
    this.drawRoundedBox(ctx, x, y, w, h, 6);
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Pulsing tuning fork resonator arms
    const pulse = 0.8 + Math.sin(now * 0.009 + y) * 0.2;
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffb703';
    ctx.shadowBlur = 14 * pulse;

    const midX = x + w / 2;
    const midY = y + h / 2;
    ctx.beginPath();
    ctx.arc(midX, midY, Math.min(w, h) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wall.label || 'GRAVITON RESONATOR', x + 8, y + 16);
  }

  drawFallbackBarrier(ctx, wall, mapId) {
    const { x, y, w, h } = wall;
    ctx.fillStyle = '#141a24';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = this.accentColor || '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.save();
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.restore();
  }

  // =========================================================================
  // THEMED PILLARS (Distinct per map)
  // =========================================================================
  drawThemedPillar(ctx, pillar, now, mapId) {
    const { x, y, radius } = pillar;

    // Base Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;

    if (mapId === 'neon_slums') {
      // Massive Concrete Monorail / Overpass Column Wrapped with Hologram Ads
      ctx.fillStyle = '#160c20';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d2054';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Wrapped Neon Advertising Hologram Ring
      const adColor = pillar.adColor || '#ff007f';
      const pulse = 0.75 + Math.sin(now * 0.005 + x) * 0.25;
      ctx.strokeStyle = adColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = adColor;
      ctx.shadowBlur = 16 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('AD // 広告', x - 18, y + 3);
      ctx.shadowBlur = 0;

    } else if (mapId === 'cyber_bunker') {
      // Vertical Cryo-Stasis Pod with human/specimen silhouette inside
      ctx.fillStyle = '#08141d';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Glowing Cyan Cryogenic Bioliquid Core
      const pulse = 0.8 + Math.sin(now * 0.004) * 0.2;
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Frozen specimen core silhouette
      ctx.fillStyle = '#03141f';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (mapId === 'reactor_crucible') {
      // Breached Reactor Core Rod with swirling fiery plasma flare
      ctx.fillStyle = '#180703';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff3300';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Swirling fiery plasma core
      const pulse = 0.7 + Math.sin(now * 0.006 + x) * 0.3;
      ctx.fillStyle = '#ff5500';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 22 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (mapId === 'orbital_station') {
      // Artificial Gravity / Magnetic Docking Coil with concentric blue rings
      ctx.fillStyle = '#0c1422';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 4;
      ctx.stroke();

      const pulse = 0.8 + Math.sin(now * 0.005) * 0.2;
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 16 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (mapId === 'chronos_collider') {
      // Hadron Collimator Pylon or Quantum Resonator Node
      if (pillar.type === 'hadron_collimator_pillar') {
        // Heavy multi-tiered electromagnetic collimator tower
        ctx.fillStyle = '#061120';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Copper solenoid coils around pylon
        ctx.fillStyle = '#b87333';
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const cx = x + Math.cos(a) * (radius - 7);
          const cy = y + Math.sin(a) * (radius - 7);
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Swirling tachyon focus beam in center
        const pulse = 0.8 + Math.sin(now * 0.006 + x) * 0.2;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 18 * pulse;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
        ctx.stroke();

        // High-density energy core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Quantum Harmonic Resonator Node
        ctx.fillStyle = '#100820';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bd00ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        const pulse = 0.75 + Math.sin(now * 0.005 + y) * 0.25;
        ctx.fillStyle = '#bd00ff';
        ctx.shadowColor = '#bd00ff';
        ctx.shadowBlur = 14 * pulse;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

    } else {
      // Sector-09: Heavy Industrial Fuel Silo & Smelting Vat
      ctx.fillStyle = '#141b26';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#394b66';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Circular Rivet Flange
      ctx.fillStyle = '#ffb703';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rx = x + Math.cos(a) * (radius - 8);
        const ry = y + Math.sin(a) * (radius - 8);
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
      }

      // Center inspection hatch
      ctx.fillStyle = '#222d3d';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a7199';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // =========================================================================
  // THEMED BARRELS / HAZARD CONTAINERS (Distinct per map)
  // =========================================================================
  drawThemedBarrel(ctx, barrel, now, mapId) {
    const { x, y, radius } = barrel;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    if (mapId === 'reactor_crucible') {
      // Radioactive Waste Barrel (Hazard Yellow with Glowing Green Sludge)
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Glowing radioactive center
      const pulse = 0.8 + Math.sin(now * 0.008 + x) * 0.2;
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Radiation symbol
      this.drawRadiationSymbol(ctx, x, y, 9);

    } else if (mapId === 'neon_slums') {
      // Street Burn Barrel (Trash fire barrel with flickering orange flame)
      ctx.fillStyle = '#2c1e19';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a2d24';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Flickering orange fire core
      const flame = 0.7 + Math.sin(now * 0.015 + x * 0.1) * 0.3;
      ctx.fillStyle = '#ff4400';
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur = 14 * flame;
      ctx.beginPath();
      ctx.arc(x, y, 8 * flame, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(x, y, 4 * flame, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (mapId === 'cyber_bunker') {
      // Pressurized Chemical Agent Canister (Dark Titanium with Purple Biohazard)
      ctx.fillStyle = '#1c1322';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bd00ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Purple Biohazard Core
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (mapId === 'orbital_station') {
      // Cryogenic LOX (Liquid Oxygen) Aerospace Pressure Sphere
      ctx.fillStyle = '#e8f4f8';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Blue cryogenic thermal band
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (mapId === 'chronos_collider') {
      // Unstable Tachyon Flux Canister (Quantum Antimatter Cell)
      ctx.fillStyle = '#050c18';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pulsating Tachyon Core (Alternating Cyan & Violet)
      const flash = (Math.sin(now * 0.012 + x * 0.5) + 1) * 0.5;
      const coreColor = flash > 0.5 ? '#00ffcc' : '#bd00ff';
      ctx.fillStyle = coreColor;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Golden containment lock rings
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else {
      // Sector-09: Industrial Oil Drum (Deep Red / Crimson with Oil Stains)
      ctx.fillStyle = '#d90429';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Yellow Flammable Hazard Dot
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

window.GameMap = GameMap;
