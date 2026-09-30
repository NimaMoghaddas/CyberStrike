/**
 * CYBER STRIKE // OPERATIVE CHASSIS SKINS & CUSTOM COLOR SYSTEM
 * Features 4 modular operative chassis models (Tactical Commando, Cyber Wheel, Hover Blade, Void Phantom)
 * and vibrant customizable palette presets.
 */

const OPERATIVE_MODELS = {
  commando: {
    id: 'commando',
    name: 'SPEC-OPS COMMANDO',
    shortName: 'COMMANDO',
    icon: '🪖',
    role: 'TACTICAL INFANTRY',
    desc: 'Heavy carbon-titanium body armor, articulated combat boots, and targeting HUD helmet.',
    defaultColor: '#00f0ff'
  },
  wheel: {
    id: 'wheel',
    name: 'CYBER-WHEEL JUGGERNAUT',
    shortName: 'MECH WHEEL',
    icon: '⚙️',
    role: 'HEAVY ASSAULT',
    desc: 'High-torque kinetic rotating cyber-wheel chassis with reinforced mudguard plating.',
    defaultColor: '#ff4400'
  },
  blade: {
    id: 'blade',
    name: 'HOVER-BLADE STRIKER',
    shortName: 'HOVER STRIKER',
    icon: '⚡',
    role: 'FAST RECON',
    desc: 'Triangular aerodynamic stealth chassis featuring dual razor hover-blades and twin thrusters.',
    defaultColor: '#39ff14'
  },
  phantom: {
    id: 'phantom',
    name: 'VOID PHANTOM',
    shortName: 'PHANTOM',
    icon: '👻',
    role: 'PSIONIC INFILTRATOR',
    desc: 'Floating ethereal ghost silhouette with glowing plasma capacitor core and void wisp trail.',
    defaultColor: '#b026ff'
  }
};

const OPERATIVE_COLORS = [
  { id: 'cyan', name: 'Cyber Cyan', hex: '#00f0ff' },
  { id: 'crimson', name: 'Crimson Red', hex: '#ff3366' },
  { id: 'acid', name: 'Acid Green', hex: '#39ff14' },
  { id: 'gold', name: 'Solar Gold', hex: '#ffb703' },
  { id: 'purple', name: 'Void Violet', hex: '#b026ff' },
  { id: 'white', name: 'Platinum White', hex: '#ffffff' },
  { id: 'orange', name: 'Magma Orange', hex: '#ff6600' },
  { id: 'blue', name: 'Cobalt Blue', hex: '#0077ff' },
  { id: 'teal', name: 'Matrix Teal', hex: '#00ffcc' },
  { id: 'pink', name: 'Hyper Pink', hex: '#ff00aa' }
];

const OPERATIVE_SKINS = {
  spectre: {
    id: 'spectre',
    modelType: 'commando',
    name: 'SPECTRE // SPEC-OPS',
    shortName: 'SPECTRE',
    color: '#00f0ff',
    visorColor: '#00f0ff',
    desc: 'Tactical infantry operative with ceramic body armor, combat boots, and HUD helmet.'
  },
  vulcan: {
    id: 'vulcan',
    modelType: 'wheel',
    name: 'VULCAN // JUGGERNAUT',
    shortName: 'VULCAN',
    color: '#ff4400',
    visorColor: '#ff3300',
    desc: 'Reinforced blast-resistant hazard plating with rotating kinetic wheel.'
  },
  venom: {
    id: 'venom',
    modelType: 'blade',
    name: 'VENOM // INFILTRATOR',
    shortName: 'VENOM',
    color: '#39ff14',
    visorColor: '#39ff14',
    desc: 'Aerodynamic triangular chassis with sharp hover-blade wings.'
  },
  vortex: {
    id: 'vortex',
    modelType: 'phantom',
    name: 'VORTEX // PSIONIC VOID',
    shortName: 'VORTEX',
    color: '#b026ff',
    visorColor: '#d946ef',
    desc: 'Deep obsidian prototype housing miniature sub-atomic capacitors and floating phantom trail.'
  }
};

for (const id in OPERATIVE_SKINS) {
  const s = OPERATIVE_SKINS[id];
  s.colors = { visor: s.visorColor || s.color };
}

// CommonJS and Browser compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OPERATIVE_MODELS,
    OPERATIVE_COLORS,
    OPERATIVE_SKINS,
    SKIN_DEFINITIONS: OPERATIVE_SKINS
  };
} else {
  window.OPERATIVE_MODELS = OPERATIVE_MODELS;
  window.OPERATIVE_COLORS = OPERATIVE_COLORS;
  window.OPERATIVE_SKINS = OPERATIVE_SKINS;
  window.SKIN_DEFINITIONS = OPERATIVE_SKINS;
}
