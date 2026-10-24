/**
 * CYBER STRIKE // ASYMMETRICAL TACTICAL MAPS
 * Radically unique, non-symmetrical architectural layouts.
 * Fully compatible with server-side collision validation and LAN synchronization.
 * Obstacles are rich, thematic real-world entities (vehicles, food kiosks, cryo pods, server mainframes, solar capacitors, etc.)
 */

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 2400;

const MAP_DEFINITIONS = {
  // =========================================================================
  // 1. SECTOR-09 // CONTAINER DOCKS & HEAVY SMELTING WORKS
  // Theme: Industrial Freight Terminal & Steel Foundry
  // Topology: Asymmetric container maze (SW), open loading bay (NW),
  //           furnace machinery (NE), secure fuel depot (SE).
  // =========================================================================
  sector_09: {
    id: 'sector_09',
    name: 'SECTOR-09 // INDUSTRIAL DOCKS',
    shortName: 'SECTOR-09',
    theme: 'industrial',
    ambientColor: 'rgba(6, 10, 18, 0.94)',
    accentColor: '#00f0ff',
    badge: 'ASYMMETRICAL // CARGO MAZE',
    hazardLevel: 'MODERATE',
    description: 'Expansive freight terminal with dense shipping container alleys, smelting furnaces, and open forklift transfer bays.',
    spawnPoint: { x: 450, y: 450 },
    spawns: [
      { x: 450, y: 450 },     // NW Forklift Bay
      { x: 1960, y: 1950 },   // SE Fuel Depot
      { x: 480, y: 2040 },    // SW Container Terminal
      { x: 2000, y: 550 }     // NE Foundry
    ],
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    walls: [
      // Outer Perimeter Boundaries
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // --- ZONE 1 (SOUTH-WEST): Multi-tier Shipping Container Maze ---
      { x: 150, y: 1400, w: 260, h: 95, type: 'container', color: '#133e66', label: 'MAERSK-CYBER', serial: 'CY-902' },
      { x: 470, y: 1350, w: 95, h: 280, type: 'container', color: '#873600', label: 'TITAN-CARGO', serial: 'TC-411' },
      { x: 180, y: 1650, w: 220, h: 95, type: 'container', color: '#114b3f', label: 'TAIKANG-LOG', serial: 'TK-880' },
      { x: 300, y: 1880, w: 280, h: 95, type: 'container', color: '#b9770e', label: 'ORION-FREIGHT', serial: 'OF-309' },
      { x: 680, y: 1500, w: 95, h: 320, type: 'container', color: '#4a235a', label: 'NEXUS-CARGO', serial: 'NX-771' },
      { x: 680, y: 1920, w: 240, h: 95, type: 'container', color: '#133e66', label: 'MAERSK-CYBER', serial: 'CY-903' },
      { x: 860, y: 1350, w: 220, h: 95, type: 'container', color: '#873600', label: 'TITAN-CARGO', serial: 'TC-412' },
      { x: 980, y: 1520, w: 95, h: 260, type: 'container', color: '#114b3f', label: 'TAIKANG-LOG', serial: 'TK-881' },
      { x: 780, y: 1720, w: 140, h: 80, type: 'pallet', label: 'HEAVY MACHINERY // P-14' },
      { x: 180, y: 2100, w: 160, h: 80, type: 'pallet', label: 'STEEL ALLOY CRATE' },

      // --- ZONE 2 (NORTH-WEST): Forklift Staging & Cargo Pallets ---
      { x: 200, y: 220, w: 320, h: 55, type: 'industrial_barrier', label: 'FORKLIFT GUIDERAIL' },
      { x: 200, y: 220, w: 55, h: 260, type: 'industrial_barrier', label: 'LOADING DOCK #1' },
      { x: 380, y: 580, w: 140, h: 90, type: 'pallet', label: 'PARTS PALLET #08' },
      { x: 600, y: 350, w: 90, h: 240, type: 'container', color: '#b9770e', label: 'ORION-FREIGHT', serial: 'OF-310' },
      { x: 800, y: 200, w: 240, h: 90, type: 'container', color: '#133e66', label: 'MAERSK-CYBER', serial: 'CY-904' },
      { x: 780, y: 550, w: 180, h: 80, type: 'forklift', direction: 'horizontal', label: 'HEAVY FORKLIFT #03' },
      { x: 320, y: 850, w: 280, h: 55, type: 'industrial_barrier', label: 'STAGING CHUTE' },
      { x: 720, y: 780, w: 55, h: 280, type: 'industrial_barrier', label: 'BAY 02 PERIMETER' },

      // --- ZONE 3 (NORTH-EAST): Heavy Foundry & Conveyor Gantry ---
      { x: 1350, y: 180, w: 420, h: 65, type: 'furnace', label: 'BLAST FURNACE UNIT A-1' },
      { x: 1880, y: 180, w: 65, h: 360, type: 'furnace', label: 'SLAG RECOVERY TOWER' },
      { x: 1350, y: 360, w: 90, h: 300, type: 'industrial_barrier', label: 'GANTRY CATWALK' },
      { x: 1560, y: 450, w: 240, h: 90, type: 'container', color: '#873600', label: 'TITAN-CARGO', serial: 'TC-415' },
      { x: 1920, y: 680, w: 280, h: 95, type: 'container', color: '#4a235a', label: 'NEXUS-CARGO', serial: 'NX-773' },
      { x: 1480, y: 850, w: 340, h: 60, type: 'furnace', label: 'HEAT EXCHANGER COIL' },
      { x: 1350, y: 850, w: 60, h: 220, type: 'steel_stack', label: 'INGOT STACK #4' },
      { x: 1720, y: 980, w: 160, h: 90, type: 'forklift', direction: 'horizontal', label: 'HEAVY FORKLIFT #07' },
      { x: 2050, y: 920, w: 180, h: 80, type: 'pallet', label: 'FOUNDRY TOOL PALLET' },

      // --- ZONE 4 (SOUTH-EAST): Fuel Depot & Maintenance Checkpoint ---
      { x: 1250, y: 1400, w: 55, h: 360, type: 'fuel_depot_tank', orientation: 'v', label: 'FUEL MANIFOLD LINE' },
      { x: 1400, y: 1320, w: 300, h: 60, type: 'fuel_depot_tank', orientation: 'h', label: 'DIESEL RESERVE TANK' },
      { x: 1820, y: 1250, w: 95, h: 260, type: 'container', color: '#114b3f', label: 'TAIKANG-LOG', serial: 'TK-885' },
      { x: 2050, y: 1420, w: 200, h: 95, type: 'container', color: '#b9770e', label: 'ORION-FREIGHT', serial: 'OF-312' },
      { x: 1450, y: 1680, w: 240, h: 85, type: 'pallet', label: 'HIGH-PRESSURE DRUM RACK' },
      { x: 1820, y: 1680, w: 85, h: 240, type: 'fuel_depot_tank', orientation: 'v', label: 'HYDRAULIC VALVE BLOCK' },
      { x: 1400, y: 1980, w: 380, h: 60, type: 'fuel_depot_tank', orientation: 'h', label: 'FUEL PIPELINE TRUNK' },
      { x: 1920, y: 2050, w: 180, h: 85, type: 'forklift', direction: 'horizontal', label: 'TRANSFER TUG #02' },
      { x: 2150, y: 1750, w: 90, h: 220, type: 'container', color: '#133e66', label: 'MAERSK-CYBER', serial: 'CY-908' },

      // --- ASYMMETRICAL TRANSIT CHOKEPOINTS (Midfield) ---
      { x: 1100, y: 650, w: 80, h: 260, type: 'industrial_barrier', label: 'RAIL CARRIER BUFFER' },
      { x: 1050, y: 1080, w: 320, h: 65, type: 'industrial_barrier', label: 'GANTRY CRANE STANCHION' }
    ],
    pillars: [
      // Smelting Vats & Hydraulic Crane Columns
      { x: 1655, y: 330, radius: 36, type: 'smelting_vat', label: 'VAT-01' },
      { x: 2120, y: 420, radius: 42, type: 'crane_column', label: 'TOWER-04' },
      { x: 1525, y: 650, radius: 36, type: 'smelting_vat', label: 'VAT-02' },
      { x: 1480, y: 1520, radius: 44, type: 'fuel_silo', label: 'SILO-A' },
      { x: 1680, y: 1520, radius: 44, type: 'fuel_silo', label: 'SILO-B' },
      { x: 550, y: 1050, radius: 38, type: 'crane_column', label: 'CRANE-01' },
      { x: 1180, y: 1820, radius: 40, type: 'fuel_silo', label: 'SILO-C' }
    ],
    barrels: [
      // Clustered near fuel depot and crane tracks
      { x: 1350, y: 1450 }, { x: 1380, y: 1450 }, { x: 1350, y: 1490 },
      { x: 2050, y: 1550 }, { x: 2085, y: 1550 },
      { x: 1550, y: 1930 }, { x: 1590, y: 1930 },
      { x: 820, y: 1480 }, { x: 855, y: 1480 },
      { x: 280, y: 680 }, { x: 315, y: 680 },
      { x: 1820, y: 550 }, { x: 1855, y: 550 }
    ]
  },

  // =========================================================================
  // 2. CYBER-BUNKER // SUBTERRANEAN BLACK-SITE LEVEL ZERO
  // Theme: Fortified Under-Bedrock Military & Research Installation
  // Topology: High-density server corridors (West), Cryo-stasis lab (NE),
  //           Airlock decompression chamber (South), Command bunker (East).
  // =========================================================================
  cyber_bunker: {
    id: 'cyber_bunker',
    name: 'CYBER-BUNKER // LEVEL ZERO',
    shortName: 'BUNKER ZERO',
    theme: 'bunker',
    ambientColor: 'rgba(8, 4, 12, 0.95)',
    accentColor: '#ff3366',
    badge: 'TIGHT CQB // FLANKING AISLES',
    hazardLevel: 'INTENSE',
    description: 'Subterranean classified installation with tight server bank corridors, cryo-stasis vaults, and heavy blast doors.',
    spawnPoint: { x: 440, y: 1210 },
    spawns: [
      { x: 440, y: 1210 },    // Server Vault Aisle
      { x: 2000, y: 610 },    // Cryo-Stasis Bay
      { x: 1350, y: 2050 },   // Decontamination Airlock
      { x: 1080, y: 510 }     // Tech Access Tunnel
    ],
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    walls: [
      // Outer Perimeter Boundaries
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // --- ZONE 1 (WEST): High-Density Server Rack Aisles (Tight CQB) ---
      { x: 150, y: 200, w: 60, h: 420, type: 'server_bank', label: 'MAINFRAME ROW #01', ledColor: '#00ff88' },
      { x: 320, y: 200, w: 60, h: 420, type: 'server_bank', label: 'MAINFRAME ROW #02', ledColor: '#00f0ff' },
      { x: 490, y: 200, w: 60, h: 420, type: 'server_bank', label: 'NEURAL CLUSTER #01', ledColor: '#ff0055' },
      { x: 150, y: 720, w: 400, h: 55, type: 'blast_door', label: 'VAULT LOCK A-12', orientation: 'h' },
      { x: 150, y: 880, w: 60, h: 520, type: 'server_bank', label: 'DATABASE ARCHIVE 01', ledColor: '#ffb703' },
      { x: 320, y: 980, w: 60, h: 520, type: 'server_bank', label: 'DATABASE ARCHIVE 02', ledColor: '#00f0ff' },
      { x: 490, y: 880, w: 60, h: 520, type: 'server_bank', label: 'QUANTUM CRYPT #04', ledColor: '#bd00ff' },
      { x: 150, y: 1520, w: 320, h: 55, type: 'blast_door', label: 'VAULT LOCK B-04', orientation: 'h' },
      { x: 220, y: 1680, w: 60, h: 480, type: 'server_bank', label: 'TELEMETRY BUS #01', ledColor: '#00ff88' },
      { x: 420, y: 1680, w: 60, h: 480, type: 'server_bank', label: 'TELEMETRY BUS #02', ledColor: '#00f0ff' },
      { x: 650, y: 200, w: 65, h: 900, type: 'reinforced_bulkhead', label: 'SUB-LEVEL BULKHEAD NORTH' },
      { x: 650, y: 1250, w: 65, h: 950, type: 'reinforced_bulkhead', label: 'SUB-LEVEL BULKHEAD SOUTH' },

      // --- ZONE 2 (NORTH-EAST): Cryo-Stasis Containment Lab ---
      { x: 950, y: 180, w: 520, h: 60, type: 'cryo_chamber', label: 'STASIS INCUBATOR ARRAY NORTH' },
      { x: 1600, y: 180, w: 60, h: 320, type: 'reinforced_bulkhead', label: 'CRYO LAB INTERIOR WALL' },
      { x: 1780, y: 180, w: 460, h: 60, type: 'cryo_chamber', label: 'CONTAINMENT VAULT ALPHA' },
      { x: 1050, y: 380, w: 240, h: 70, type: 'cryo_chamber', label: 'VITALS MONITOR BANK' },
      { x: 1400, y: 480, w: 70, h: 260, type: 'decon_station', label: 'DECON AIR-SHOWER #02' },
      { x: 1620, y: 520, w: 280, h: 65, type: 'cryo_chamber', label: 'SPECIMEN FREEZER #09' },
      { x: 2050, y: 350, w: 65, h: 380, type: 'reinforced_bulkhead', label: 'BIOSAFETY LEVEL 4 SEAL' },
      { x: 1820, y: 720, w: 420, h: 65, type: 'blast_door', label: 'CRYO-BAY BLAST DOOR', orientation: 'h' },

      // --- ZONE 3 (CENTER-EAST): Armored Tactical Command Chamber ---
      { x: 920, y: 850, w: 380, h: 60, type: 'command_console', label: 'TACTICAL RADAR TERMINAL' },
      { x: 1240, y: 910, w: 60, h: 260, type: 'command_console', label: 'OPS DISPATCH DESK' },
      { x: 920, y: 1280, w: 380, h: 60, type: 'command_console', label: 'DEFENSE MATRIX STATION' },
      { x: 1480, y: 920, w: 360, h: 60, type: 'blast_door', label: 'COMMAND AIRLOCK NORTH', orientation: 'h' },
      { x: 1780, y: 980, w: 60, h: 280, type: 'command_console', label: 'WAR-ROOM HOLO TABLE' },
      { x: 1480, y: 1380, w: 360, h: 60, type: 'blast_door', label: 'COMMAND AIRLOCK SOUTH', orientation: 'h' },
      { x: 2020, y: 920, w: 65, h: 420, type: 'reinforced_bulkhead', label: 'ARMORY ACCESS BULKHEAD' },

      // --- ZONE 4 (SOUTH): Decontamination Airlock & Security Corridors ---
      { x: 880, y: 1520, w: 65, h: 460, type: 'reinforced_bulkhead', label: 'AIRLOCK WEST WALL' },
      { x: 1080, y: 1600, w: 420, h: 65, type: 'blast_door', label: 'DECON HEAVY GATELOCK', orientation: 'h' },
      { x: 1650, y: 1550, w: 65, h: 420, type: 'reinforced_bulkhead', label: 'AIRLOCK EAST WALL' },
      { x: 1200, y: 1820, w: 320, h: 65, type: 'decon_station', label: 'DISINFECTANT MIST UNIT' },
      { x: 1080, y: 2150, w: 460, h: 60, type: 'reinforced_bulkhead', label: 'SUB-LEVEL EVAC CORRIDOR' },
      { x: 1750, y: 1980, w: 360, h: 60, type: 'blast_door', label: 'REACTOR EVAC PORT', orientation: 'h' },
      { x: 1880, y: 1680, w: 60, h: 220, type: 'decon_station', label: 'SCRUBBER UNIT #05' }
    ],
    pillars: [
      // Cryo-Stasis Cylinders (Asymmetric pod layout)
      { x: 1375, y: 350, radius: 36, type: 'cryo_stasis_pod', label: 'STASIS #01' },
      { x: 1350, y: 325, radius: 36, type: 'cryo_stasis_pod', label: 'STASIS #02' },
      { x: 1500, y: 320, radius: 38, type: 'cryo_stasis_pod', label: 'STASIS #03' },
      { x: 1850, y: 380, radius: 46, type: 'cryo_stasis_pod', label: 'STASIS #04' },
      { x: 1960, y: 460, radius: 36, type: 'cryo_stasis_pod', label: 'STASIS #05' },
      // Command Hub Structural Reactor Columns
      { x: 1080, y: 1080, radius: 44, type: 'bunker_reactor_pillar', label: 'REACTOR COIL 1' },
      { x: 1620, y: 1150, radius: 44, type: 'bunker_reactor_pillar', label: 'REACTOR COIL 2' },
      // South Airlock Filter Pylons
      { x: 1565, y: 1720, radius: 36, type: 'decon_filter_pylon', label: 'HEPA TOWER' }
    ],
    barrels: [
      // Chemical agent & fuel canisters in side-alcoves
      { x: 420, y: 760 }, { x: 450, y: 760 },
      { x: 230, y: 1560 }, { x: 260, y: 1560 },
      { x: 1680, y: 280 }, { x: 1715, y: 280 },
      { x: 1380, y: 1020 }, { x: 1415, y: 1020 },
      { x: 2120, y: 1050 }, { x: 2155, y: 1050 },
      { x: 1020, y: 1980 }, { x: 1055, y: 1980 }
    ]
  },

  // =========================================================================
  // 3. NEON-SLUMS // LOWER METROPOLIS TOKYO 2099
  // Theme: Rain-Slick Cyberpunk Night Street & Shanty Back-Alleys
  // Topology: Crooked diagonal boulevard cutting from NW to SE,
  //           Apartment alley maze (NE), Night market (SW), Mag-rail pylon yard (SE).
  // =========================================================================
  neon_slums: {
    id: 'neon_slums',
    name: 'NEON-SLUMS // TOKYO 2099',
    shortName: 'NEON SLUMS',
    theme: 'neon',
    ambientColor: 'rgba(5, 2, 10, 0.94)',
    accentColor: '#bd00ff',
    badge: 'RAIN-SLICK // URBAN WARFARE',
    hazardLevel: 'HIGH',
    description: 'Neon-drenched lower metropolis with winding rain-slick street avenues, narrow apartment alleys, and glowing holographic signs.',
    spawnPoint: { x: 380, y: 380 },
    spawns: [
      { x: 380, y: 380 },     // North-West Boulevard Entry
      { x: 2030, y: 2020 },   // South-East Metro Exit
      { x: 400, y: 1860 },    // South-West Night Market
      { x: 1930, y: 430 }     // North-East Tenement Rooftop
    ],
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    walls: [
      // Outer Perimeter Boundaries (Tenement City Walls with fire escapes and graffiti)
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // --- ZONE 1 (NORTH-EAST): Tenement Alley Maze & Cyber-Ware Shops ---
      { x: 1350, y: 150, w: 380, h: 80, type: 'ramen_stall', label: 'NEO-RAMEN // ラーメン屋', kanji: 'ラーメン', color: '#ff0055' },
      { x: 1880, y: 150, w: 320, h: 80, type: 'cyber_car', carType: 'sports', color: '#bd00ff', label: 'CYBER-COUPE GT' },
      { x: 1480, y: 320, w: 80, h: 360, type: 'transformer_box', label: 'STREET SUB-STATION 404', warning: 'HIGH VOLTAGE 50kV' },
      { x: 1680, y: 280, w: 260, h: 80, type: 'vending_machine', label: 'NEO-COLA & STIMS', brand: 'NEO-COLA' },
      { x: 2080, y: 300, w: 80, h: 420, type: 'neon_billboard', label: 'ARASAKA CORP // AD', color: '#ff0033' },
      { x: 1680, y: 480, w: 280, h: 70, type: 'dumpster', label: 'ALLEY WASTE DUMPSTER #12' },
      { x: 1350, y: 780, w: 420, h: 80, type: 'ramen_stall', label: 'CYBER GYOZA // 餃子', kanji: 'サイバー餃子', color: '#ffbe0b' },
      { x: 1920, y: 780, w: 280, h: 80, type: 'cyber_car', carType: 'sedan', color: '#00f0ff', label: 'POLICE ENFORCER' },
      { x: 1820, y: 600, w: 90, h: 120, type: 'dumpster', label: 'RECYCLE BIN #08' },

      // --- ZONE 2 (NORTH-WEST & MAIN BOULEVARD FLANK): Billboard Pylons & Dumpsters ---
      { x: 180, y: 180, w: 80, h: 320, type: 'transformer_box', label: 'STREET POWER MATRIX', warning: '100kV' },
      { x: 380, y: 180, w: 240, h: 75, type: 'cyber_car', carType: 'sports', color: '#ff3366', label: 'STREET RACER #7' },
      { x: 550, y: 350, w: 180, h: 80, type: 'vending_machine', label: 'CYBER-STIM DISPENSER', brand: 'STIM-X' },
      { x: 220, y: 580, w: 260, h: 75, type: 'dumpster', label: 'METRO TRASH DUMPSTER' },
      { x: 600, y: 550, w: 80, h: 260, type: 'neon_billboard', label: 'KENJI OPTICS // ホロ広告', color: '#00f0ff' },
      { x: 320, y: 820, w: 220, h: 85, type: 'cyber_car', carType: 'van', color: '#334466', label: 'SMUGGLER VAN' },
      { x: 720, y: 880, w: 180, h: 80, type: 'dumpster', label: 'CORNER REFUSE CONTAINER' },

      // --- ZONE 3 (SOUTH-WEST): Night Market Shanty Stalls ---
      { x: 180, y: 1250, w: 320, h: 75, type: 'ramen_stall', label: 'NIGHT MARKET YAKITORI', kanji: '焼き鳥', color: '#ff4400' },
      { x: 180, y: 1450, w: 80, h: 380, type: 'transformer_box', label: 'MARKET POWER GENERATOR' },
      { x: 360, y: 1420, w: 220, h: 80, type: 'vending_machine', label: 'HOT BEVERAGE VENDOR', brand: 'NEO-TEA' },
      { x: 680, y: 1280, w: 80, h: 360, type: 'neon_billboard', label: 'KABUKI DISTRICT // 看板', color: '#bd00ff' },
      { x: 380, y: 1650, w: 180, h: 80, type: 'dumpster', label: 'MARKET ORGANIC RECEPTACLE' },
      { x: 220, y: 1920, w: 320, h: 75, type: 'ramen_stall', label: 'SUSHI BAR // 寿司バー', kanji: '寿司', color: '#00ffaa' },
      { x: 620, y: 1820, w: 240, h: 80, type: 'cyber_car', carType: 'sports', color: '#ffbe0b', label: 'VIP SEDAN 2099' },
      { x: 420, y: 2100, w: 180, h: 80, type: 'dumpster', label: 'SERVICE ENTRANCE BIN' },

      // --- ZONE 4 (SOUTH-EAST): Transit Pylon Foundations & Concrete Depots ---
      { x: 1150, y: 1480, w: 340, h: 80, type: 'cyber_car', carType: 'truck', color: '#445566', label: 'METRO LOGISTICS CAB' },
      { x: 1600, y: 1350, w: 80, h: 360, type: 'transformer_box', label: 'MAG-RAIL TRACTION SUB-STATION' },
      { x: 1800, y: 1250, w: 320, h: 80, type: 'vending_machine', label: 'METRO STATION COMMISSARY', brand: 'METRO-STIM' },
      { x: 1280, y: 1720, w: 80, h: 280, type: 'neon_billboard', label: 'SHIBUYA 2099 // 広告', color: '#ff00aa' },
      { x: 1480, y: 1850, w: 360, h: 80, type: 'ramen_stall', label: 'MIDNIGHT NOODLE CABIN', kanji: '深夜麺', color: '#ff3300' },
      { x: 1950, y: 1550, w: 80, h: 380, type: 'transformer_box', label: 'FEEDER JUNCTION 88' },
      { x: 1550, y: 2080, w: 320, h: 80, type: 'cyber_car', carType: 'sports', color: '#00d4ff', label: 'NEON RUNNER SPEEDSTER' },
      { x: 1950, y: 2080, w: 260, h: 80, type: 'dumpster', label: 'TERMINAL COMPACTOR' },

      // Diagonal street dividers
      { x: 880, y: 450, w: 80, h: 240, type: 'neon_barrier', label: 'BOULEVARD TRAFFIC MEDIAN' },
      { x: 1050, y: 1050, w: 220, h: 80, type: 'neon_barrier', label: 'METRO OVERPASS MEDIAN' }
    ],
    pillars: [
      // Heavy Concrete Transit Pylons & Hologram Projector Columns (Wrapped in neon billboards)
      { x: 820, y: 320, radius: 45, type: 'neon_transit_pylon', label: 'PYLON 01', adColor: '#ff0055' },
      { x: 1250, y: 620, radius: 45, type: 'neon_transit_pylon', label: 'PYLON 02', adColor: '#00f0ff' },
      { x: 880, y: 1350, radius: 45, type: 'neon_transit_pylon', label: 'PYLON 03', adColor: '#bd00ff' },
      { x: 1450, y: 1150, radius: 50, type: 'neon_transit_pylon', label: 'CENTRAL METRO HUB', adColor: '#ffbe0b' },
      { x: 1850, y: 1050, radius: 45, type: 'neon_transit_pylon', label: 'PYLON 05', adColor: '#00ff88' },
      { x: 1765, y: 1650, radius: 36, type: 'neon_transit_pylon', label: 'PYLON 06', adColor: '#ff00aa' },
      { x: 1120, y: 1880, radius: 40, type: 'neon_transit_pylon', label: 'PYLON 07', adColor: '#00d4ff' }
    ],
    barrels: [
      // Street trash fires & explosive fuel canisters
      { x: 480, y: 380 }, { x: 515, y: 380 },
      { x: 1780, y: 420 }, { x: 1815, y: 420 },
      { x: 280, y: 1350 }, { x: 315, y: 1350 },
      { x: 580, y: 1750 }, { x: 615, y: 1750 },
      { x: 1420, y: 1450 }, { x: 1455, y: 1450 },
      { x: 2080, y: 1920 }, { x: 2115, y: 1920 },
      { x: 950, y: 920 }, { x: 985, y: 920 }
    ]
  },

  // =========================================================================
  // 4. REACTOR-CRUCIBLE // VOLCANIC FAULT & CORE MELTDOWN
  // Theme: Shattered Containment Dome & Molten Radiation Breach
  // Topology: Jagged diagonal volcanic magma trench cutting SW to NE,
  //           Broken cooling towers (NW), Overheated turbine banks (SE),
  //           Catwalk choke bridges.
  // =========================================================================
  reactor_crucible: {
    id: 'reactor_crucible',
    name: 'REACTOR CRUCIBLE // CORE MELTDOWN',
    shortName: 'REACTOR CRUCIBLE',
    theme: 'reactor',
    ambientColor: 'rgba(10, 4, 3, 0.95)',
    accentColor: '#ff5500',
    badge: 'CORE BREACH // VOLATILE HAZARDS',
    hazardLevel: 'EXTREME',
    description: 'Catastrophic nuclear core breach with jagged molten lava fault lines, toxic coolant canals, and shattered blast deflectors.',
    spawnPoint: { x: 450, y: 850 },
    spawns: [
      { x: 450, y: 850 },     // NW Cooling Basin
      { x: 2020, y: 1650 },   // SE Transformer Field
      { x: 1140, y: 510 },    // North Perimeter Station
      { x: 1390, y: 2080 }    // South Slag Drain
    ],
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    walls: [
      // Outer Perimeter Boundaries (Thermal ceramic blast containment)
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // --- ZONE 1 (NORTH-WEST): Shattered Containment Dome & Heat Exchangers ---
      { x: 180, y: 200, w: 380, h: 65, type: 'heat_shield', label: 'CERAMIC THERMAL DEFLECTOR 01' },
      { x: 680, y: 200, w: 65, h: 360, type: 'coolant_pipe', label: 'SUPERHEATED STEAM MANIFOLD' },
      { x: 220, y: 450, w: 280, h: 75, type: 'slag_barrier', label: 'SCORCHED MOLTEN REBAR WALL' },
      { x: 180, y: 620, w: 65, h: 420, type: 'heat_shield', label: 'RADIATION BAFFLE WEST' },
      { x: 380, y: 720, w: 320, h: 70, type: 'slag_barrier', label: 'BREACH DEFENSE PARAPET' },
      { x: 750, y: 650, w: 75, h: 340, type: 'coolant_pipe', label: 'PRIMARY COOLANT CONDUIT #1' },
      { x: 380, y: 1100, w: 260, h: 80, type: 'waste_containment', label: 'SPENT FUEL CASK HOLD' },
      { x: 780, y: 1100, w: 240, h: 75, type: 'slag_barrier', label: 'SLAG OVERFLOW DAM' },

      // --- ZONE 2 (NORTH & CRACK BRIDGE FLANK): Broken Cooling Galleries ---
      { x: 920, y: 180, w: 460, h: 65, type: 'heat_shield', label: 'CONTAINMENT SHELL SEGMENT' },
      { x: 1480, y: 180, w: 65, h: 320, type: 'coolant_pipe', label: 'HEAVY SODIUM CONDUIT #4' },
      { x: 1050, y: 380, w: 280, h: 70, type: 'slag_barrier', label: 'MELTED BASALT RUBBLE WALL' },
      { x: 1680, y: 220, w: 360, h: 65, type: 'heat_shield', label: 'TURBINE RADIATION BULKHEAD' },
      { x: 1420, y: 580, w: 80, h: 280, type: 'coolant_pipe', label: 'AUXILIARY COOLING INTAKE' },
      { x: 1650, y: 450, w: 260, h: 80, type: 'waste_containment', label: 'RAD-SHIELDED BUNKER #2' },

      // --- ZONE 3 (SOUTH-EAST): Overheated Turbine Banks & Generator Blocks ---
      { x: 1350, y: 1150, w: 320, h: 75, type: 'turbine_block', label: 'MAIN STEAM TURBINE UNIT #1' },
      { x: 1780, y: 950, w: 75, h: 420, type: 'turbine_block', label: 'MAGNETIC INDUCTION ROTOR' },
      { x: 1980, y: 1150, w: 240, h: 75, type: 'waste_containment', label: 'RADIOACTIVE FILTER BANK' },
      { x: 1480, y: 1420, w: 380, h: 70, type: 'slag_barrier', label: 'MOLTEN CORE SLAG BARRIER' },
      { x: 1280, y: 1580, w: 75, h: 380, type: 'coolant_pipe', label: 'DRAINAGE VALVE STATION' },
      { x: 1480, y: 1720, w: 280, h: 75, type: 'turbine_block', label: 'HIGH-VOLTAGE BUSBAR TRANSFORMER' },
      { x: 1880, y: 1550, w: 75, h: 420, type: 'turbine_block', label: 'ELECTROMAGNETIC ARRESTOR' },
      { x: 1450, y: 2050, w: 420, h: 65, type: 'heat_shield', label: 'SUB-FLOOR THERMAL BAFFLE' },
      { x: 1980, y: 1850, w: 240, h: 80, type: 'waste_containment', label: 'RAD-WASTE STORAGE PALLET' },

      // --- ZONE 4 (SOUTH-WEST TRENCH FLANK): Slag Barrier Bastions ---
      { x: 180, y: 1450, w: 75, h: 380, type: 'slag_barrier', label: 'VOLCANIC DIKE RETAINER' },
      { x: 380, y: 1450, w: 260, h: 75, type: 'heat_shield', label: 'FLAME DEFLECTOR TRAY' },
      { x: 280, y: 1750, w: 320, h: 75, type: 'slag_barrier', label: 'CRACKED BASALT BASTION' },
      { x: 720, y: 1650, w: 75, h: 360, type: 'coolant_pipe', label: 'EMERGENCY STEAM DISCHARGE' },
      { x: 420, y: 2020, w: 380, h: 65, type: 'heat_shield', label: 'SOUTH QUENCH TANK BARRIER' },
      { x: 880, y: 1920, w: 240, h: 75, type: 'slag_barrier', label: 'SLAG RETENTION REVETMENT' },

      // Jagged catwalk barriers overlooking the breach
      { x: 980, y: 820, w: 160, h: 75, type: 'slag_barrier', label: 'CORE PIT BRIDGEHEAD' },
      { x: 1180, y: 1250, w: 160, h: 75, type: 'slag_barrier', label: 'CATWALK ANCHOR BLOCK' }
    ],
    pillars: [
      // Cracked Cooling Towers & Massive Tungsten Reactor Rods
      { x: 585, y: 480, radius: 36, type: 'reactor_core_rod', label: 'ROD CLUSTER A' },
      { x: 1250, y: 535, radius: 36, type: 'reactor_core_rod', label: 'COOLANT TOWER-01' },
      { x: 1995, y: 450, radius: 36, type: 'reactor_core_rod', label: 'ROD CLUSTER B' },
      { x: 885, y: 1260, radius: 36, type: 'plasma_stabilizer', label: 'PLASMA COIL #3' },
      { x: 1585, y: 880, radius: 36, type: 'plasma_stabilizer', label: 'PLASMA COIL #4' },
      { x: 1620, y: 1580, radius: 36, type: 'reactor_core_rod', label: 'MAIN TRANSFORMER' },
      { x: 980, y: 1750, radius: 44, type: 'reactor_core_rod', label: 'VENTILATION STACK' }
    ],
    barrels: [
      // Dense clusters of leaking radioactive fuel cells near cracks
      { x: 580, y: 420 }, { x: 615, y: 420 },
      { x: 420, y: 1020 }, { x: 455, y: 1020 },
      { x: 1080, y: 780 }, { x: 1115, y: 780 }, { x: 1080, y: 815 },
      { x: 1250, y: 1350 }, { x: 1285, y: 1350 },
      { x: 1680, y: 1350 }, { x: 1715, y: 1350 },
      { x: 1980, y: 1350 }, { x: 2015, y: 1350 },
      { x: 1380, y: 1880 }, { x: 1415, y: 1880 },
      { x: 820, y: 1820 }, { x: 855, y: 1820 }
    ]
  },

  // =========================================================================
  // 5. ORBITAL-STATION // DEEP SPACE ZERO-G CATWALKS
  // Theme: High-orbit orbital defense station overlooking starfield void
  // Topology: Asymmetric space station catwalks, docking airlock bay (NW),
  //           solar capacitor array (NE), plasma conduit bridge (Mid), command tower (SE).
  // =========================================================================
  orbital_station: {
    id: 'orbital_station',
    name: 'ORBITAL-PLATFORM // ZERO-G DOCK',
    shortName: 'ORBITAL DOCK',
    theme: 'orbital',
    ambientColor: 'rgba(3, 5, 14, 0.95)',
    accentColor: '#00d4ff',
    badge: 'ZERO-G // VOID CHASM',
    hazardLevel: 'EXTREME',
    description: 'Deep-space orbital battlestation with reinforced titanium catwalks, solar collectors, and open void chasms.',
    spawnPoint: { x: 390, y: 360 },
    spawns: [
      { x: 390, y: 360 },     // Airlock Dock Bay
      { x: 1980, y: 1980 },   // Observation Deck
      { x: 2060, y: 570 },    // Solar Array Node
      { x: 420, y: 1890 }     // Thruster Engine Bank
    ],
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    walls: [
      // Outer boundaries (Deep Space Station Hull with vacuum viewport glass)
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // ZONE 1 (NORTH-WEST): Airlock Pressurized Terminal
      { x: 160, y: 220, w: 340, h: 60, type: 'orbital_bulkhead', label: 'MODULE 01 AEROSPACE HULL' },
      { x: 160, y: 220, w: 60, h: 380, type: 'orbital_bulkhead', label: 'DOCKING CLAMP BULKHEAD' },
      { x: 320, y: 420, w: 260, h: 65, type: 'airlock_hatch', label: 'PRESSURE AIRLOCK PORT #01' },
      { x: 680, y: 180, w: 65, h: 360, type: 'orbital_bulkhead', label: 'DECOMPRESSION WALL WEST' },
      { x: 500, y: 680, w: 320, h: 60, type: 'science_station', label: 'ORBITAL FLIGHT CONTROL CONSOLE' },

      // ZONE 2 (NORTH-EAST): Solar Array Capacitor Banks
      { x: 1350, y: 180, w: 460, h: 60, type: 'solar_capacitor', label: 'PHOTOVOLTAIC INVERTER BANK 1' },
      { x: 1920, y: 180, w: 60, h: 380, type: 'orbital_bulkhead', label: 'SOLAR BUS CONDUCTOR WALL' },
      { x: 1480, y: 380, w: 280, h: 70, type: 'solar_capacitor', label: 'HIGH-CAPACITY BATTERY CELL A' },
      { x: 1820, y: 450, w: 240, h: 60, type: 'airlock_hatch', label: 'EVA SUIT MAINTENANCE GATE' },
      { x: 1350, y: 650, w: 70, h: 280, type: 'science_station', label: 'SOLAR ARRAY TELEMETRY DESK' },
      { x: 1550, y: 820, w: 380, h: 60, type: 'solar_capacitor', label: 'PHOTOVOLTAIC INVERTER BANK 2' },

      // ZONE 3 (MIDFIELD & VOID BRIDGES): Cantilevered Catwalks
      { x: 920, y: 480, w: 240, h: 65, type: 'magnetic_barrier', label: 'CHASM CATWALK SAFETY RAIL' },
      { x: 780, y: 920, w: 60, h: 380, type: 'orbital_bulkhead', label: 'VOID CONNECTOR TUBE NORTH' },
      { x: 1220, y: 920, w: 60, h: 380, type: 'orbital_bulkhead', label: 'VOID CONNECTOR TUBE SOUTH' },
      { x: 920, y: 1320, w: 240, h: 65, type: 'magnetic_barrier', label: 'MAG-LIFT CROSSWALK GUARD' },

      // ZONE 4 (SOUTH-WEST): Main Thruster Exhaust Plazas
      { x: 200, y: 1250, w: 380, h: 65, type: 'thruster_housing', label: 'RCS VECTOR MANIFOLD #01' },
      { x: 200, y: 1450, w: 65, h: 420, type: 'orbital_bulkhead', label: 'ION DRIVE COWL WALL' },
      { x: 380, y: 1520, w: 260, h: 70, type: 'thruster_housing', label: 'FUEL GIMBAL ACTUATOR' },
      { x: 220, y: 1950, w: 360, h: 60, type: 'orbital_bulkhead', label: 'EXHAUST DEFLECTOR PYLON' },
      { x: 680, y: 1650, w: 65, h: 380, type: 'airlock_hatch', label: 'THRUSTER ENGINE SERVICE AIRLOCK' },

      // ZONE 5 (SOUTH-EAST): Tactical Telemetry & Relay Core
      { x: 1420, y: 1350, w: 380, h: 65, type: 'science_station', label: 'DEEP-SPACE ANTENNA TELEMETRY' },
      { x: 1920, y: 1250, w: 65, h: 450, type: 'orbital_bulkhead', label: 'RADOME SHIELDED BULKHEAD' },
      { x: 1480, y: 1650, w: 280, h: 70, type: 'airlock_hatch', label: 'OBSERVATORY ACCESS DECK' },
      { x: 1350, y: 1950, w: 420, h: 60, type: 'solar_capacitor', label: 'RESERVE POWER ACCUMULATOR' },
      { x: 1820, y: 1850, w: 260, h: 65, type: 'science_station', label: 'STELLAR SPECTROMETRY CONSOLE' }
    ],
    pillars: [
      // Magnetic Dock Pylons & Gravity Anchor Coils
      { x: 570, y: 330, radius: 36, type: 'gravity_coil', label: 'GRAV COIL #1' },
      { x: 1815, y: 320, radius: 32, type: 'solar_node', label: 'SOLAR NODE A' },
      { x: 1070, y: 720, radius: 42, type: 'magnetic_pylon', label: 'DOCK PYLON NORTH' },
      { x: 1070, y: 1120, radius: 42, type: 'magnetic_pylon', label: 'DOCK PYLON SOUTH' },
      { x: 480, y: 1750, radius: 50, type: 'thruster_nozzle', label: 'THRUSTER BELL' },
      { x: 1655, y: 1805, radius: 36, type: 'gravity_coil', label: 'GRAV COIL #2' },
      { x: 2050, y: 950, radius: 40, type: 'solar_node', label: 'SOLAR NODE B' }
    ],
    barrels: [
      { x: 380, y: 320 }, { x: 415, y: 320 },
      { x: 1680, y: 520 }, { x: 1715, y: 520 },
      { x: 980, y: 620 }, { x: 1015, y: 620 },
      { x: 420, y: 1420 }, { x: 455, y: 1420 },
      { x: 1780, y: 1520 }, { x: 1815, y: 1520 },
      { x: 1420, y: 1850 }, { x: 1455, y: 1850 }
    ]
  },

  // =========================================================================
  // 6. CHRONOS-COLLIDER // HADRON WARP VAULT & TACHYON LAB
  // Theme: Sub-atomic Particle Collider & Quantum Teleportation Complex
  // Topology: Giant octagonal synchrotron beam ring with central singularity core,
  //           Active tactical Phase Gates (Alpha <-> Beta, Gamma <-> Delta),
  //           Directional Kinetic Slingshot Boost Pads, and High-Flux Laser Conduits.
  // =========================================================================
  chronos_collider: {
    id: 'chronos_collider',
    name: 'QUANTUM-NEXUS // HADRON WARP VAULT',
    shortName: 'QUANTUM NEXUS',
    theme: 'quantum',
    ambientColor: 'rgba(2, 6, 14, 0.96)',
    accentColor: '#00ffcc',
    secondaryColor: '#bd00ff',
    badge: 'WARP PORTALS // BOOST PADS',
    hazardLevel: 'CRITICAL',
    description: 'Particle synchrotron complex featuring high-velocity magnetic accelerator boost pads, instant phase teleporters, and an active tachyon singularity core.',
    spawnPoint: { x: 420, y: 420 },
    spawns: [
      { x: 420, y: 420 },     // NW Tachyon Injector
      { x: 1980, y: 1980 },   // SE Graviton Resonance Bay
      { x: 1980, y: 420 },    // NE Laser Condenser
      { x: 420, y: 1980 }     // SW Telemetry Hub
    ],
    width: MAP_WIDTH,
    height: MAP_HEIGHT,

    // Active Tactical Quantum Phase Gates (Instantaneous Teleportation)
    portals: [
      { id: 'alpha', targetId: 'beta',  x: 380,  y: 680,  targetX: 2020, targetY: 1720, label: 'PHASE GATE ALPHA', color: '#00ffcc', radius: 42 },
      { id: 'beta',  targetId: 'alpha', x: 2020, y: 1720, targetX: 380,  targetY: 680,  label: 'PHASE GATE BETA',  color: '#00ffcc', radius: 42 },
      { id: 'gamma', targetId: 'delta', x: 680,  y: 2020, targetX: 1720, targetY: 380,  label: 'PHASE GATE GAMMA', color: '#bd00ff', radius: 42 },
      { id: 'delta', targetId: 'gamma', x: 1720, y: 380,  targetX: 680,  targetY: 2020, label: 'PHASE GATE DELTA', color: '#bd00ff', radius: 42 }
    ],

    // Active Directional Kinetic Grav-Accelerator Slingshots
    boostPads: [
      { x: 760,  y: 760,  dirX: 0.707,  dirY: 0.707,  speed: 860, label: 'KINETIC SLINGSHOT SE', color: '#00ffcc', radius: 38 },
      { x: 1640, y: 760,  dirX: -0.707, dirY: 0.707,  speed: 860, label: 'KINETIC SLINGSHOT SW', color: '#00ffcc', radius: 38 },
      { x: 760,  y: 1640, dirX: 0.707,  dirY: -0.707, speed: 860, label: 'KINETIC SLINGSHOT NE', color: '#00ffcc', radius: 38 },
      { x: 1640, y: 1640, dirX: -0.707, dirY: -0.707, speed: 860, label: 'KINETIC SLINGSHOT NW', color: '#00ffcc', radius: 38 },
      { x: 1200, y: 800,  dirX: 0,      dirY: 1,      speed: 920, label: 'CORE ACCELERATOR S',   color: '#ffb703', radius: 38 },
      { x: 1200, y: 1600, dirX: 0,      dirY: -1,     speed: 920, label: 'CORE ACCELERATOR N',   color: '#ffb703', radius: 38 }
    ],

    walls: [
      // Outer Perimeter Boundaries (Magnetic Containment Bulkhead)
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // --- ZONE 1 (NORTH-WEST): Tachyon Beam Guide & Cryo Vault ---
      { x: 220, y: 220, w: 380, h: 65, type: 'magnetic_beam_guide', label: 'LINEAR TACHYON ACCELERATOR #01', beamColor: '#00ffcc' },
      { x: 220, y: 380, w: 65, h: 360, type: 'cryo_manifold', label: 'SUPERCONDUCTING CRYO-LINE A' },
      { x: 400, y: 550, w: 260, h: 65, type: 'quantum_holo_deck', label: 'BEAM STEERING CONSOLE' },
      { x: 680, y: 220, w: 65, h: 380, type: 'magnetic_beam_guide', label: 'FLUX DEFLECTOR ARRAY NORTH', beamColor: '#00ffcc' },
      { x: 380, y: 820, w: 320, h: 70, type: 'warp_deflector', label: 'CONTAINMENT BULKHEAD A-1' },
      { x: 740, y: 700, w: 75, h: 280, type: 'tachyon_injector', label: 'PRIMARY INJECTION TOWER' },

      // --- ZONE 2 (NORTH-EAST): High-Flux Laser Condenser & Antimatter Silo ---
      { x: 1400, y: 220, w: 460, h: 65, type: 'laser_focus_array', label: 'OPTICAL LASER CAVITY ALPHA', laserColor: '#ff0055' },
      { x: 1920, y: 220, w: 65, h: 420, type: 'antimatter_pod', label: 'ANTIMATTER STORAGE VAULT #4' },
      { x: 1550, y: 420, w: 260, h: 70, type: 'quantum_capacitor', label: 'TACHYON CONDENSER CELL B' },
      { x: 1400, y: 620, w: 65, h: 360, type: 'magnetic_beam_guide', label: 'BEAM SYNCHRONIZER TUBE', beamColor: '#00ffcc' },
      { x: 1680, y: 680, w: 380, h: 65, type: 'warp_deflector', label: 'CONTAINMENT BULKHEAD B-2' },
      { x: 1820, y: 850, w: 220, h: 75, type: 'quantum_capacitor', label: 'ENERGY BANK CLUSTER #9' },

      // --- ZONE 3 (SOUTH-WEST): Quantum Telemetry & Warp Deflectors ---
      { x: 220, y: 1400, w: 65, h: 420, type: 'antimatter_pod', label: 'TACHYON RESERVOIR CELL C' },
      { x: 380, y: 1350, w: 360, h: 65, type: 'quantum_holo_deck', label: 'QUANTUM WARP TELEMETRY' },
      { x: 620, y: 1520, w: 65, h: 380, type: 'magnetic_beam_guide', label: 'FIELD COMPRESSION TUBE', beamColor: '#bd00ff' },
      { x: 220, y: 1950, w: 420, h: 65, type: 'warp_deflector', label: 'CONTAINMENT BULKHEAD C-3' },
      { x: 420, y: 1720, w: 260, h: 70, type: 'cryo_manifold', label: 'SUPERCONDUCTING CRYO-LINE B' },
      { x: 780, y: 1780, w: 75, h: 320, type: 'tachyon_injector', label: 'SECONDARY INJECTION TOWER' },

      // --- ZONE 4 (SOUTH-EAST): Graviton Resonance & Stasis Chamber ---
      { x: 1400, y: 1400, w: 360, h: 65, type: 'graviton_resonator', label: 'GRAVITON HARMONIC EMITTER' },
      { x: 1880, y: 1350, w: 65, h: 450, type: 'cryo_manifold', label: 'LIQUID HELIUM MATRIX' },
      { x: 1520, y: 1620, w: 280, h: 70, type: 'quantum_capacitor', label: 'RESONANCE CAPACITOR D' },
      { x: 1350, y: 1820, w: 460, h: 65, type: 'warp_deflector', label: 'CONTAINMENT BULKHEAD D-4' },
      { x: 1920, y: 1880, w: 220, h: 65, type: 'laser_focus_array', label: 'OPTICAL LASER CAVITY BETA', laserColor: '#00ffcc' },
      { x: 1680, y: 1980, w: 65, h: 260, type: 'graviton_resonator', label: 'SUB-HARMONIC COUPLER' },

      // --- MIDFIELD / SYNCHROTRON COLLIMATOR SHIELDS ---
      { x: 920, y: 550, w: 240, h: 60, type: 'warp_deflector', label: 'NORTH COLLIMATOR SHIELD' },
      { x: 920, y: 1790, w: 240, h: 60, type: 'warp_deflector', label: 'SOUTH COLLIMATOR SHIELD' },
      { x: 550, y: 1080, w: 60, h: 240, type: 'warp_deflector', label: 'WEST COLLIMATOR SHIELD' },
      { x: 1790, y: 1080, w: 60, h: 240, type: 'warp_deflector', label: 'EAST COLLIMATOR SHIELD' }
    ],

    pillars: [
      // 4 Heavy Hadron Collimator Pylons framing the central Singularity Vortex
      { x: 1020, y: 1020, radius: 46, type: 'hadron_collimator_pillar', label: 'COLLIMATOR PYLON #1' },
      { x: 1380, y: 1020, radius: 46, type: 'hadron_collimator_pillar', label: 'COLLIMATOR PYLON #2' },
      { x: 1020, y: 1380, radius: 46, type: 'hadron_collimator_pillar', label: 'COLLIMATOR PYLON #3' },
      { x: 1380, y: 1380, radius: 46, type: 'hadron_collimator_pillar', label: 'COLLIMATOR PYLON #4' },

      // 4 Corner Quadrant Harmonic Resonance Nodes
      { x: 520, y: 520, radius: 38, type: 'quantum_resonator_pylon', label: 'RESONATOR NW' },
      { x: 1880, y: 520, radius: 38, type: 'quantum_resonator_pylon', label: 'RESONATOR NE' },
      { x: 520, y: 1880, radius: 38, type: 'quantum_resonator_pylon', label: 'RESONATOR SW' },
      { x: 1880, y: 1880, radius: 38, type: 'quantum_resonator_pylon', label: 'RESONATOR SE' }
    ],

    barrels: [
      // Unstable Tachyon Flux Canisters (Implosive Quantum Cells)
      { x: 380, y: 340 }, { x: 415, y: 340 },
      { x: 1620, y: 350 }, { x: 1655, y: 350 },
      { x: 480, y: 1650 }, { x: 515, y: 1650 },
      { x: 1980, y: 1520 }, { x: 2015, y: 1520 },
      { x: 860, y: 920 }, { x: 895, y: 920 },
      { x: 1520, y: 920 }, { x: 1555, y: 920 },
      { x: 860, y: 1480 }, { x: 895, y: 1480 },
      { x: 1520, y: 1480 }, { x: 1555, y: 1480 }
    ]
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MAP_WIDTH, MAP_HEIGHT, MAP_DEFINITIONS };
} else {
  window.MAP_DEFINITIONS = MAP_DEFINITIONS;
}
