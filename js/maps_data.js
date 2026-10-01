/**
 * CYBER STRIKE // ASYMMETRICAL TACTICAL MAPS
 * Radically unique, non-symmetrical architectural layouts.
 * Fully compatible with server-side collision validation and LAN synchronization.
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
      { x: 150, y: 1400, w: 260, h: 95, type: 'container', color: '#1a3a54' },
      { x: 470, y: 1350, w: 95, h: 280, type: 'container', color: '#54201a' },
      { x: 180, y: 1650, w: 220, h: 95, type: 'container', color: '#1a4a3a' },
      { x: 300, y: 1880, w: 280, h: 95, type: 'container', color: '#4a3a1a' },
      { x: 680, y: 1500, w: 95, h: 320, type: 'container', color: '#2a2040' },
      { x: 680, y: 1920, w: 240, h: 95, type: 'container', color: '#1a3a54' },
      { x: 860, y: 1350, w: 220, h: 95, type: 'container', color: '#54201a' },
      { x: 980, y: 1520, w: 95, h: 260, type: 'container', color: '#1a4a3a' },
      { x: 780, y: 1720, w: 140, h: 80, type: 'crate' },
      { x: 180, y: 2100, w: 160, h: 80, type: 'crate' },

      // --- ZONE 2 (NORTH-WEST): Forklift Staging & Cargo Pallets ---
      { x: 200, y: 220, w: 320, h: 55, type: 'wall' },
      { x: 200, y: 220, w: 55, h: 260, type: 'wall' },
      { x: 380, y: 580, w: 140, h: 90, type: 'crate' },
      { x: 600, y: 350, w: 90, h: 240, type: 'container', color: '#4a3a1a' },
      { x: 800, y: 200, w: 240, h: 90, type: 'container', color: '#1a3a54' },
      { x: 780, y: 550, w: 180, h: 80, type: 'barrier' },
      { x: 320, y: 850, w: 280, h: 55, type: 'wall' },
      { x: 720, y: 780, w: 55, h: 280, type: 'wall' },

      // --- ZONE 3 (NORTH-EAST): Heavy Foundry & Conveyor Gantry ---
      { x: 1350, y: 180, w: 420, h: 65, type: 'wall' },
      { x: 1880, y: 180, w: 65, h: 360, type: 'wall' },
      { x: 1350, y: 360, w: 90, h: 300, type: 'barrier' },
      { x: 1560, y: 450, w: 240, h: 90, type: 'container', color: '#54201a' },
      { x: 1920, y: 680, w: 280, h: 95, type: 'container', color: '#2a2040' },
      { x: 1480, y: 850, w: 340, h: 60, type: 'wall' },
      { x: 1350, y: 850, w: 60, h: 220, type: 'wall' },
      { x: 1720, y: 980, w: 160, h: 90, type: 'crate' },
      { x: 2050, y: 920, w: 180, h: 80, type: 'barrier' },

      // --- ZONE 4 (SOUTH-EAST): Fuel Depot & Maintenance Checkpoint ---
      { x: 1250, y: 1400, w: 55, h: 360, type: 'wall' },
      { x: 1400, y: 1320, w: 300, h: 60, type: 'wall' },
      { x: 1820, y: 1250, w: 95, h: 260, type: 'container', color: '#1a4a3a' },
      { x: 2050, y: 1420, w: 200, h: 95, type: 'container', color: '#4a3a1a' },
      { x: 1450, y: 1680, w: 240, h: 85, type: 'barrier' },
      { x: 1820, y: 1680, w: 85, h: 240, type: 'wall' },
      { x: 1400, y: 1980, w: 380, h: 60, type: 'wall' },
      { x: 1920, y: 2050, w: 180, h: 85, type: 'crate' },
      { x: 2150, y: 1750, w: 90, h: 220, type: 'container', color: '#1a3a54' },

      // --- ASYMMETRICAL TRANSIT CHOKEPOINTS (Midfield) ---
      { x: 1100, y: 650, w: 80, h: 260, type: 'barrier' },
      { x: 1050, y: 1080, w: 320, h: 65, type: 'barrier' }
    ],
    pillars: [
      // Smelting Vats & Hydraulic Crane Columns (Irregular)
      { x: 1655, y: 330, radius: 36 },
      { x: 2120, y: 420, radius: 42 },
      { x: 1525, y: 650, radius: 36 },
      { x: 1480, y: 1520, radius: 44 },
      { x: 1680, y: 1520, radius: 44 },
      { x: 550, y: 1050, radius: 38 },
      { x: 1180, y: 1820, radius: 40 }
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
      { x: 150, y: 200, w: 60, h: 420, type: 'wall', subType: 'server' },
      { x: 320, y: 200, w: 60, h: 420, type: 'wall', subType: 'server' },
      { x: 490, y: 200, w: 60, h: 420, type: 'wall', subType: 'server' },
      { x: 150, y: 720, w: 400, h: 55, type: 'barrier' },
      { x: 150, y: 880, w: 60, h: 520, type: 'wall', subType: 'server' },
      { x: 320, y: 980, w: 60, h: 520, type: 'wall', subType: 'server' },
      { x: 490, y: 880, w: 60, h: 520, type: 'wall', subType: 'server' },
      { x: 150, y: 1520, w: 320, h: 55, type: 'barrier' },
      { x: 220, y: 1680, w: 60, h: 480, type: 'wall', subType: 'server' },
      { x: 420, y: 1680, w: 60, h: 480, type: 'wall', subType: 'server' },
      { x: 650, y: 200, w: 65, h: 900, type: 'wall' },   // Main vault dividing bulkhead
      { x: 650, y: 1250, w: 65, h: 950, type: 'wall' },  // Lower vault dividing bulkhead

      // --- ZONE 2 (NORTH-EAST): Cryo-Stasis Containment Lab ---
      { x: 950, y: 180, w: 520, h: 60, type: 'wall' },
      { x: 1600, y: 180, w: 60, h: 320, type: 'wall' },
      { x: 1780, y: 180, w: 460, h: 60, type: 'wall' },
      { x: 1050, y: 380, w: 240, h: 70, type: 'barrier' },
      { x: 1400, y: 480, w: 70, h: 260, type: 'wall' },
      { x: 1620, y: 520, w: 280, h: 65, type: 'barrier' },
      { x: 2050, y: 350, w: 65, h: 380, type: 'wall' },
      { x: 1820, y: 720, w: 420, h: 65, type: 'wall' },

      // --- ZONE 3 (CENTER-EAST): Armored Tactical Command Chamber ---
      { x: 920, y: 850, w: 380, h: 60, type: 'wall' },
      { x: 1240, y: 910, w: 60, h: 260, type: 'wall' },
      { x: 920, y: 1280, w: 380, h: 60, type: 'wall' },
      { x: 1480, y: 920, w: 360, h: 60, type: 'barrier' },
      { x: 1780, y: 980, w: 60, h: 280, type: 'barrier' },
      { x: 1480, y: 1380, w: 360, h: 60, type: 'barrier' },
      { x: 2020, y: 920, w: 65, h: 420, type: 'wall' },

      // --- ZONE 4 (SOUTH): Decontamination Airlock & Security Corridors ---
      { x: 880, y: 1520, w: 65, h: 460, type: 'wall' },
      { x: 1080, y: 1600, w: 420, h: 65, type: 'wall' },
      { x: 1650, y: 1550, w: 65, h: 420, type: 'wall' },
      { x: 1200, y: 1820, w: 320, h: 65, type: 'barrier' },
      { x: 1080, y: 2150, w: 460, h: 60, type: 'wall' },
      { x: 1750, y: 1980, w: 360, h: 60, type: 'wall' },
      { x: 1880, y: 1680, w: 60, h: 220, type: 'barrier' }
    ],
    pillars: [
      // Cryo-Stasis Cylinders (Asymmetric pod layout)
      { x: 1375, y: 350, radius: 36 },
      { x: 1350, y: 325, radius: 36 },
      { x: 1500, y: 320, radius: 38 },
      { x: 1850, y: 380, radius: 46 },
      { x: 1960, y: 460, radius: 36 },
      // Command Hub Structural Reactor Columns
      { x: 1080, y: 1080, radius: 44 },
      { x: 1620, y: 1150, radius: 44 },
      // South Airlock Filter Pylons
      { x: 1565, y: 1720, radius: 36 }
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
      // Outer Perimeter Boundaries
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // --- ZONE 1 (NORTH-EAST): Tenement Alley Maze & Cyber-Ware Shops ---
      { x: 1350, y: 150, w: 380, h: 80, type: 'wall' },
      { x: 1880, y: 150, w: 320, h: 80, type: 'wall' },
      { x: 1480, y: 320, w: 80, h: 360, type: 'wall' },
      { x: 1680, y: 280, w: 260, h: 80, type: 'wall' },
      { x: 2080, y: 300, w: 80, h: 420, type: 'wall' },
      { x: 1680, y: 480, w: 280, h: 70, type: 'barrier' },
      { x: 1350, y: 780, w: 420, h: 80, type: 'wall' },
      { x: 1920, y: 780, w: 280, h: 80, type: 'wall' },
      { x: 1820, y: 600, w: 90, h: 120, type: 'crate' },

      // --- ZONE 2 (NORTH-WEST & MAIN BOULEVARD FLANK): Billboard Pylons & Dumpsters ---
      { x: 180, y: 180, w: 80, h: 320, type: 'wall' },
      { x: 380, y: 180, w: 240, h: 75, type: 'wall' },
      { x: 550, y: 350, w: 180, h: 80, type: 'barrier' },
      { x: 220, y: 580, w: 260, h: 75, type: 'wall' },
      { x: 600, y: 550, w: 80, h: 260, type: 'wall' },
      { x: 320, y: 820, w: 220, h: 85, type: 'barrier' },
      { x: 720, y: 880, w: 180, h: 80, type: 'crate' },

      // --- ZONE 3 (SOUTH-WEST): Night Market Shanty Stalls ---
      { x: 180, y: 1250, w: 320, h: 75, type: 'wall' },
      { x: 180, y: 1450, w: 80, h: 380, type: 'wall' },
      { x: 360, y: 1420, w: 220, h: 80, type: 'barrier' },
      { x: 680, y: 1280, w: 80, h: 360, type: 'wall' },
      { x: 380, y: 1650, w: 180, h: 80, type: 'barrier' },
      { x: 220, y: 1920, w: 320, h: 75, type: 'wall' },
      { x: 620, y: 1820, w: 240, h: 80, type: 'barrier' },
      { x: 420, y: 2100, w: 180, h: 80, type: 'crate' },

      // --- ZONE 4 (SOUTH-EAST): Transit Pylon Foundations & Concrete Depots ---
      { x: 1150, y: 1480, w: 340, h: 80, type: 'wall' },
      { x: 1600, y: 1350, w: 80, h: 360, type: 'wall' },
      { x: 1800, y: 1250, w: 320, h: 80, type: 'wall' },
      { x: 1280, y: 1720, w: 80, h: 280, type: 'wall' },
      { x: 1480, y: 1850, w: 360, h: 80, type: 'barrier' },
      { x: 1950, y: 1550, w: 80, h: 380, type: 'wall' },
      { x: 1550, y: 2080, w: 320, h: 80, type: 'wall' },
      { x: 1950, y: 2080, w: 260, h: 80, type: 'crate' },

      // Diagonal street dividers
      { x: 880, y: 450, w: 80, h: 240, type: 'barrier' },
      { x: 1050, y: 1050, w: 220, h: 80, type: 'barrier' }
    ],
    pillars: [
      // Heavy Concrete Transit Pylons & Hologram Projector Columns (Asymmetrical)
      { x: 820, y: 320, radius: 45 },
      { x: 1250, y: 620, radius: 45 },
      { x: 880, y: 1350, radius: 45 },
      { x: 1450, y: 1150, radius: 50 },
      { x: 1850, y: 1050, radius: 45 },
      { x: 1765, y: 1650, radius: 36 },
      { x: 1120, y: 1880, radius: 40 }
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
      // Outer Perimeter Boundaries
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // --- ZONE 1 (NORTH-WEST): Shattered Containment Dome & Heat Exchangers ---
      { x: 180, y: 200, w: 380, h: 65, type: 'wall' },
      { x: 680, y: 200, w: 65, h: 360, type: 'wall' },
      { x: 220, y: 450, w: 280, h: 75, type: 'barrier' },
      { x: 180, y: 620, w: 65, h: 420, type: 'wall' },
      { x: 380, y: 720, w: 320, h: 70, type: 'barrier' },
      { x: 750, y: 650, w: 75, h: 340, type: 'wall' },
      { x: 380, y: 1100, w: 260, h: 80, type: 'container', color: '#54201a' },
      { x: 780, y: 1100, w: 240, h: 75, type: 'barrier' },

      // --- ZONE 2 (NORTH & CRACK BRIDGE FLANK): Broken Cooling Galleries ---
      { x: 920, y: 180, w: 460, h: 65, type: 'wall' },
      { x: 1480, y: 180, w: 65, h: 320, type: 'wall' },
      { x: 1050, y: 380, w: 280, h: 70, type: 'barrier' },
      { x: 1680, y: 220, w: 360, h: 65, type: 'wall' },
      { x: 1420, y: 580, w: 80, h: 280, type: 'barrier' },
      { x: 1650, y: 450, w: 260, h: 80, type: 'container', color: '#1a4a3a' },

      // --- ZONE 3 (SOUTH-EAST): Overheated Turbine Banks & Generator Blocks ---
      { x: 1350, y: 1150, w: 320, h: 75, type: 'wall' },
      { x: 1780, y: 950, w: 75, h: 420, type: 'wall' },
      { x: 1980, y: 1150, w: 240, h: 75, type: 'container', color: '#54201a' },
      { x: 1480, y: 1420, w: 380, h: 70, type: 'barrier' },
      { x: 1280, y: 1580, w: 75, h: 380, type: 'wall' },
      { x: 1480, y: 1720, w: 280, h: 75, type: 'barrier' },
      { x: 1880, y: 1550, w: 75, h: 420, type: 'wall' },
      { x: 1450, y: 2050, w: 420, h: 65, type: 'wall' },
      { x: 1980, y: 1850, w: 240, h: 80, type: 'crate' },

      // --- ZONE 4 (SOUTH-WEST TRENCH FLANK): Slag Barrier Bastions ---
      { x: 180, y: 1450, w: 75, h: 380, type: 'wall' },
      { x: 380, y: 1450, w: 260, h: 75, type: 'barrier' },
      { x: 280, y: 1750, w: 320, h: 75, type: 'wall' },
      { x: 720, y: 1650, w: 75, h: 360, type: 'wall' },
      { x: 420, y: 2020, w: 380, h: 65, type: 'wall' },
      { x: 880, y: 1920, w: 240, h: 75, type: 'barrier' },

      // Jagged catwalk barriers overlooking the breach
      { x: 980, y: 820, w: 160, h: 75, type: 'barrier' },
      { x: 1180, y: 1250, w: 160, h: 75, type: 'barrier' }
    ],
    pillars: [
      // Cracked Cooling Towers & Massive Tungsten Reactor Rods (Asymmetrical)
      { x: 585, y: 480, radius: 36 },   // Giant breached cooling tower
      { x: 1250, y: 535, radius: 36 },  // Primary coolant pylon
      { x: 1995, y: 450, radius: 36 },  // Sub-reactor rod
      { x: 885, y: 1260, radius: 36 },  // Island rock bastion
      { x: 1585, y: 880, radius: 36 },  // Catwalk anchor tower
      { x: 1620, y: 1580, radius: 36 }, // High-voltage coil
      { x: 980, y: 1750, radius: 44 }   // Slag drain stack
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
      // Outer boundaries
      { x: 0, y: 0, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: MAP_HEIGHT - 50, w: MAP_WIDTH, h: 50, type: 'boundary' },
      { x: 0, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },
      { x: MAP_WIDTH - 50, y: 0, w: 50, h: MAP_HEIGHT, type: 'boundary' },

      // ZONE 1 (NORTH-WEST): Airlock Pressurized Terminal
      { x: 160, y: 220, w: 340, h: 60, type: 'wall' },
      { x: 160, y: 220, w: 60, h: 380, type: 'wall' },
      { x: 320, y: 420, w: 260, h: 65, type: 'barrier' },
      { x: 680, y: 180, w: 65, h: 360, type: 'wall' },
      { x: 500, y: 680, w: 320, h: 60, type: 'wall' },

      // ZONE 2 (NORTH-EAST): Solar Array Capacitor Banks
      { x: 1350, y: 180, w: 460, h: 60, type: 'wall' },
      { x: 1920, y: 180, w: 60, h: 380, type: 'wall' },
      { x: 1480, y: 380, w: 280, h: 70, type: 'container', color: '#1a3a54' },
      { x: 1820, y: 450, w: 240, h: 60, type: 'barrier' },
      { x: 1350, y: 650, w: 70, h: 280, type: 'wall' },
      { x: 1550, y: 820, w: 380, h: 60, type: 'wall' },

      // ZONE 3 (MIDFIELD & VOID BRIDGES): Cantilevered Catwalks
      { x: 920, y: 480, w: 240, h: 65, type: 'barrier' },
      { x: 780, y: 920, w: 60, h: 380, type: 'wall' },
      { x: 1220, y: 920, w: 60, h: 380, type: 'wall' },
      { x: 920, y: 1320, w: 240, h: 65, type: 'barrier' },

      // ZONE 4 (SOUTH-WEST): Main Thruster Exhaust Plazas
      { x: 200, y: 1250, w: 380, h: 65, type: 'wall' },
      { x: 200, y: 1450, w: 65, h: 420, type: 'wall' },
      { x: 380, y: 1520, w: 260, h: 70, type: 'barrier' },
      { x: 220, y: 1950, w: 360, h: 60, type: 'wall' },
      { x: 680, y: 1650, w: 65, h: 380, type: 'wall' },

      // ZONE 5 (SOUTH-EAST): Tactical Telemetry & Relay Core
      { x: 1420, y: 1350, w: 380, h: 65, type: 'wall' },
      { x: 1920, y: 1250, w: 65, h: 450, type: 'wall' },
      { x: 1480, y: 1650, w: 280, h: 70, type: 'barrier' },
      { x: 1350, y: 1950, w: 420, h: 60, type: 'wall' },
      { x: 1820, y: 1850, w: 260, h: 65, type: 'wall' }
    ],
    pillars: [
      // Magnetic Dock Pylons & Gravity Anchor Coils
      { x: 570, y: 330, radius: 36 },
      { x: 1815, y: 320, radius: 32 },
      { x: 1070, y: 720, radius: 42 },
      { x: 1070, y: 1120, radius: 42 },
      { x: 480, y: 1750, radius: 50 },
      { x: 1655, y: 1805, radius: 36 },
      { x: 2050, y: 950, radius: 40 }
    ],
    barrels: [
      { x: 380, y: 320 }, { x: 415, y: 320 },
      { x: 1680, y: 520 }, { x: 1715, y: 520 },
      { x: 980, y: 620 }, { x: 1015, y: 620 },
      { x: 420, y: 1420 }, { x: 455, y: 1420 },
      { x: 1780, y: 1520 }, { x: 1815, y: 1520 },
      { x: 1420, y: 1850 }, { x: 1455, y: 1850 }
    ]
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MAP_WIDTH, MAP_HEIGHT, MAP_DEFINITIONS };
} else {
  window.MAP_DEFINITIONS = MAP_DEFINITIONS;
}

