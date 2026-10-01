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
    this.renderFloor();
    this.clearDecals();
  }

  clearDecals() {
    if (this.decalCtx) {
      this.decalCtx.clearRect(0, 0, this.width, this.height);
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

  // --- Render Environment ---
  draw(ctx, camera) {
    // 1. Pre-rendered Floor
    ctx.drawImage(this.floorCanvas, 0, 0);

    // 2. Decal Canvas (Blood & Scorch marks)
    ctx.drawImage(this.decalCanvas, 0, 0);

    // 3. Render Solid Walls & Containers
    for (const wall of this.walls) {
      // Frustum culling: skip if offscreen
      if (wall.x + wall.w < camera.x || wall.x > camera.x + camera.width ||
          wall.y + wall.h < camera.y || wall.y > camera.y + camera.height) {
        continue;
      }

      ctx.save();
      // Drop Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;

      if (wall.type === 'boundary') {
        // High-security boundary wall
        ctx.fillStyle = '#141a29';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = this.accentColor || '#00f0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      } else if (wall.subType === 'server') {
        // --- High-Density Subterranean Server Rack ---
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

        // Rack Face Border
        ctx.strokeStyle = '#1a2436';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        // Server Blade Slots & Blinking Status LEDs
        const isVert = wall.h > wall.w;
        const now = Date.now();
        if (isVert) {
          for (let sy = wall.y + 12; sy < wall.y + wall.h - 12; sy += 24) {
            ctx.fillStyle = '#121926';
            ctx.fillRect(wall.x + 4, sy, wall.w - 8, 16);

            // Blinking Activity LEDs (Cyan, Green, Amber, Red)
            const blinkA = Math.sin(now * 0.008 + sy * 0.05) > 0;
            const blinkB = Math.cos(now * 0.006 + sy * 0.08) > 0;
            ctx.fillStyle = blinkA ? '#00f0ff' : '#004455';
            ctx.fillRect(wall.x + 8, sy + 6, 4, 4);

            ctx.fillStyle = blinkB ? '#00ff88' : '#004422';
            ctx.fillRect(wall.x + 16, sy + 6, 4, 4);

            ctx.fillStyle = (sy % 48 === 0) ? '#ff3366' : '#ffb703';
            ctx.fillRect(wall.x + 24, sy + 6, 4, 4);
          }
        } else {
          for (let sx = wall.x + 12; sx < wall.x + wall.w - 12; sx += 24) {
            ctx.fillStyle = '#121926';
            ctx.fillRect(sx, wall.y + 4, 16, wall.h - 8);

            const blinkA = Math.sin(now * 0.008 + sx * 0.05) > 0;
            ctx.fillStyle = blinkA ? '#00f0ff' : '#004455';
            ctx.fillRect(sx + 6, wall.y + 8, 4, 4);

            ctx.fillStyle = '#00ff88';
            ctx.fillRect(sx + 6, wall.y + 16, 4, 4);
          }
        }
      } else if (wall.type === 'container') {
        // --- Cargo Shipping Container with Dynamic Thematic Colors ---
        const contColor = wall.color || '#1a2838';
        ctx.fillStyle = contColor;
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        
        // Corrugated ridges
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 3;
        const step = 22;
        if (wall.w > wall.h) {
          for (let rx = wall.x + step; rx < wall.x + wall.w - step; rx += step) {
            ctx.beginPath();
            ctx.moveTo(rx, wall.y + 4);
            ctx.lineTo(rx, wall.y + wall.h - 4);
            ctx.stroke();
          }
        } else {
          for (let ry = wall.y + step; ry < wall.y + wall.h - step; ry += step) {
            ctx.beginPath();
            ctx.moveTo(wall.x + 4, ry);
            ctx.lineTo(wall.x + wall.w - 4, ry);
            ctx.stroke();
          }
        }

        // Corner Steel Reinforcement Brackets
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        // Tech Stencil Badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('CY-7', wall.x + 8, wall.y + 16);
      } else if (wall.type === 'crate') {
        // Heavy military crate
        ctx.fillStyle = '#222633';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        
        // Inner X brace
        ctx.strokeStyle = '#383f54';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wall.x + 6, wall.y + 6);
        ctx.lineTo(wall.x + wall.w - 6, wall.y + wall.h - 6);
        ctx.moveTo(wall.x + wall.w - 6, wall.y + 6);
        ctx.lineTo(wall.x + 6, wall.y + wall.h - 6);
        ctx.stroke();

        ctx.strokeStyle = '#4a5470';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      } else {
        // Reinforced Concrete Blast Barrier with Hazard Cap
        ctx.fillStyle = '#1c2230';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

        // Warning Hazard Cap on top
        ctx.save();
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(wall.x + 2, wall.y + 2, wall.w - 4, wall.h - 4);
        ctx.restore();

        ctx.strokeStyle = '#323c52';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      }
      ctx.restore();
    }

    // 4. Render Reactor & Structural Pillars (Themed visuals)
    for (const pillar of this.pillars) {
      ctx.save();
      // Base shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;

      // Outer metal cylinder rim
      ctx.fillStyle = '#181f2b';
      ctx.beginPath();
      ctx.arc(pillar.x, pillar.y, pillar.radius, 0, Math.PI * 2);
      ctx.fill();

      // Metallic border
      ctx.strokeStyle = '#3f4e70';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Theme-tailored Pulsating Core Center
      const pulse = Math.sin(Date.now() * 0.004) * 0.2 + 0.8;
      let coreColor = '#00f0ff';
      let shadowColor = '#00f0ff';

      if (this.mapId === 'reactor_crucible') {
        coreColor = '#ff5500';
        shadowColor = '#ff3300';
      } else if (this.mapId === 'cyber_bunker') {
        coreColor = '#ff0055';
        shadowColor = '#ff0055';
      } else if (this.mapId === 'neon_slums') {
        coreColor = '#bd00ff';
        shadowColor = '#bd00ff';
      }

      ctx.fillStyle = coreColor;
      ctx.globalAlpha = 0.5 * pulse;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 16 * pulse;
      ctx.beginPath();
      ctx.arc(pillar.x, pillar.y, pillar.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Core Highlight
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7 * pulse;
      ctx.beginPath();
      ctx.arc(pillar.x, pillar.y, pillar.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 5. Render Explosive Barrels
    for (const barrel of this.barrels) {
      if (barrel.exploded) continue;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      // Red barrel body
      ctx.fillStyle = '#d90429';
      ctx.beginPath();
      ctx.arc(barrel.x, barrel.y, barrel.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer rim
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Yellow hazard indicator / biohazard dot
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(barrel.x, barrel.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Small hazard stripes
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(barrel.x, barrel.y, 11, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }
}

window.GameMap = GameMap;
