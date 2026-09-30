/**
 * CYBER STRIKE // OPERATIVE SKINS & LOADOUT SYSTEM
 * Defines modular character skins, armor palettes, visor silhouettes, and tactical perks.
 * Built to be easily extensible for future cosmetics, armor attachments, and gadgets.
 */

const OPERATIVE_SKINS = {
  spectre: {
    id: 'spectre',
    name: 'SPECTRE // SPEC-OPS',
    shortName: 'SPECTRE',
    role: 'TACTICAL RECON',
    description: 'High-agility carbon-titanium chassis with calibrated optic laser targeting.',
    color: '#00f0ff',            // Primary LED & laser color (Cyan)
    suitColor: '#1d2836',        // Tactical undersuit
    armorColor: '#2d3d52',       // Ceramic chest & shoulder armor
    trimColor: '#0f1722',        // Harness & straps
    helmetColor: '#0f1724',      // Helmet outer shell
    visorColor: '#00f0ff',       // Visor glow
    bootsColor: '#1c2430',       // Combat boots
    visorShape: 'visor',         // 'visor' | 'quad_sensor' | 'cross' | 'cyclops' | 'heavy_mask' | 'split'
    perkName: 'TACTICAL DASH',
    perkDesc: 'Enhanced agility & rapid thruster recharge'
  },
  vulcan: {
    id: 'vulcan',
    name: 'VULCAN // JUGGERNAUT',
    shortName: 'VULCAN',
    role: 'HEAVY DEMOLITIONS',
    description: 'Reinforced blast-resistant hazard plating and thermal sensor mask.',
    color: '#ff4400',            // Primary LED (Magma Orange)
    suitColor: '#2b1b17',
    armorColor: '#4d281f',
    trimColor: '#1a0e0b',
    helmetColor: '#1f1311',
    visorColor: '#ff3300',
    bootsColor: '#1a100d',
    visorShape: 'heavy_mask',
    perkName: 'BLAST SHIELD',
    perkDesc: 'Heavy ceramic armor reduces self-ordnance splash impact'
  },
  venom: {
    id: 'venom',
    name: 'VENOM // INFILTRATOR',
    shortName: 'VENOM',
    role: 'TOXIC SABOTEUR',
    description: 'Ultra-light carbon weave treated with hazardous bio-synth camouflage.',
    color: '#39ff14',            // Neon Acid Green
    suitColor: '#172b1b',
    armorColor: '#234429',
    trimColor: '#0d1a10',
    helmetColor: '#122216',
    visorColor: '#39ff14',
    bootsColor: '#101c13',
    visorShape: 'quad_sensor',
    perkName: 'HYPER AGILITY',
    perkDesc: 'Silent swift footwork and lightning sprint reflexes'
  },
  vortex: {
    id: 'vortex',
    name: 'VORTEX // PSIONIC VOID',
    shortName: 'VORTEX',
    role: 'ELECTROMAGNETIC SPEC',
    description: 'Deep obsidian prototype rig housing miniature sub-atomic capacitors.',
    color: '#b026ff',            // Purple / Violet
    suitColor: '#201633',
    armorColor: '#39215e',
    trimColor: '#110a1f',
    helmetColor: '#180e2b',
    visorColor: '#d946ef',
    bootsColor: '#130c24',
    visorShape: 'cyclops',
    perkName: 'ION ENERGY',
    perkDesc: 'Amplified shield regeneration & weapon charge'
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'VALKYRIE // GOLD VANGUARD',
    shortName: 'VALKYRIE',
    role: 'APEX COMMANDO',
    description: 'Prestige gold-anodized alloy armor awarded to elite combat veterans.',
    color: '#ffb703',            // Solar Gold / Amber
    suitColor: '#2d2617',
    armorColor: '#4e3f1c',
    trimColor: '#1c160a',
    helmetColor: '#241c0c',
    visorColor: '#ffe600',
    bootsColor: '#1a1409',
    visorShape: 'cross',
    perkName: 'VANGUARD FOCUS',
    perkDesc: 'Precision fire recoil dampening & tactical aim'
  },
  chromex: {
    id: 'chromex',
    name: 'CHROME-X // PROTO-SYNTH',
    shortName: 'CHROME-X',
    role: 'SYNTHETIC CYBORG',
    description: 'Polished mirrored titanium superstructure powered by cryogenic core.',
    color: '#00e5ff',            // Ice Blue / Platinum
    suitColor: '#2a3342',
    armorColor: '#52637a',
    trimColor: '#1e293b',
    helmetColor: '#334155',
    visorColor: '#e0f2fe',
    bootsColor: '#0f172a',
    visorShape: 'split',
    perkName: 'CRYOGENIC CORE',
    perkDesc: 'Supercooled reactor and maximum kinetic stability'
  }
};

// Add convenience properties
for (const id in OPERATIVE_SKINS) {
  const s = OPERATIVE_SKINS[id];
  s.desc = s.description;
  s.perk = { name: s.perkName, desc: s.perkDesc };
  s.colors = { visor: s.visorColor || s.color };
}

// CommonJS and Browser compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OPERATIVE_SKINS, SKIN_DEFINITIONS: OPERATIVE_SKINS };
} else {
  window.OPERATIVE_SKINS = OPERATIVE_SKINS;
  window.SKIN_DEFINITIONS = OPERATIVE_SKINS;
}
