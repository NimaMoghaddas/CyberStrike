/**
 * CYBER STRIKE // WEAPON ARSENAL SYSTEM
 * Defines weapon configurations, unique ballistics, firing profiles, and weapon state.
 */

const WEAPON_DEFINITIONS = {
  rifle: {
    id: 'rifle',
    slot: 1,
    key: '1',
    name: 'ARC-9 PULSE RIFLE',
    shortName: 'ARC-9',
    category: 'ASSAULT RIFLE',
    icon: '⚡',
    description: 'Standard issue tactical energy rifle with calibrated plasma discharge.',
    magSize: 30,
    fireRate: 0.11, // ~9 rounds/sec
    reloadDuration: 1.25,
    damage: 28,
    speed: 1150,
    range: 1400,
    spread: 0.045,
    pellets: 1,
    recoil: 6,
    screenShake: 2.2,
    color: '#00f0ff',
    glowColor: '#00f0ff',
    bulletRadius: 4,
    sound: 'rifle',
    crosshairStyle: 'default',
    tag: 'BALANCED'
  },
  shotgun: {
    id: 'shotgun',
    slot: 2,
    key: '2',
    name: 'SG-12 SCATTERSHOT',
    shortName: 'SG-12',
    category: 'COMBAT SHOTGUN',
    icon: '💥',
    description: 'Devastating heavy flechette shotgun. Shreds hostiles in close quarters.',
    magSize: 8,
    fireRate: 0.68,
    reloadDuration: 1.55,
    damage: 18, // 8 * 18 = 144 max point-blank
    speed: 1000,
    range: 650,
    spread: 0.26,
    pellets: 8,
    recoil: 14,
    screenShake: 5.5,
    color: '#ff9500',
    glowColor: '#ffaa33',
    bulletRadius: 3.2,
    sound: 'shotgun',
    crosshairStyle: 'shotgun',
    tag: 'SPREAD x8'
  },
  smg: {
    id: 'smg',
    slot: 3,
    key: '3',
    name: 'VIPER-X DUAL SMG',
    shortName: 'VIPER-X',
    category: 'HIGH-RPM PDW',
    icon: '⚡⚡',
    description: 'Hyper-velocity submachine gun with extreme cyclic rate and light recoil.',
    magSize: 50,
    fireRate: 0.055, // ~18.2 rounds/sec
    reloadDuration: 1.15,
    damage: 16,
    speed: 1250,
    range: 480, // Decreased range for high-capacity SMG
    spread: 0.075,
    pellets: 1,
    recoil: 3.2,
    screenShake: 1.1,
    color: '#39ff14',
    glowColor: '#00ff88',
    bulletRadius: 3,
    sound: 'smg',
    crosshairStyle: 'smg',
    tag: 'HYPER RPM'
  },
  railgun: {
    id: 'railgun',
    slot: 4,
    key: '4',
    name: 'VORTEX-50 RAILGUN',
    shortName: 'VORTEX-50',
    category: 'PIERCING SNIPER',
    icon: '🎯',
    description: 'Supersonic electromagnetic slug that punches through multiple hostiles.',
    magSize: 5,
    fireRate: 1.15,
    reloadDuration: 1.75,
    damage: 125,
    speed: 2600,
    range: 2200,
    spread: 0.001,
    pellets: 1,
    penetrating: true,
    maxPenetrations: 5,
    recoil: 16,
    screenShake: 7.5,
    color: '#b026ff',
    glowColor: '#d946ef',
    bulletRadius: 5,
    sound: 'railgun',
    crosshairStyle: 'railgun',
    tag: 'PIERCING'
  },
  cannon: {
    id: 'cannon',
    slot: 5,
    key: '5',
    name: 'NOVA-PLAS CANNON',
    shortName: 'NOVA-PLAS',
    category: 'HEAVY EXPLOSIVE',
    icon: '💣',
    description: 'Heavy plasma explosive launcher dealing catastrophic AoE blast damage.',
    magSize: 4,
    fireRate: 0.88,
    reloadDuration: 2.1,
    damage: 45,
    splashDamage: 95,
    blastRadius: 130,
    explosive: true,
    speed: 680,
    range: 1100,
    spread: 0.02,
    pellets: 1,
    recoil: 13,
    screenShake: 8.0,
    color: '#ff2a5f',
    glowColor: '#ff0055',
    bulletRadius: 7,
    sound: 'cannon',
    crosshairStyle: 'cannon',
    tag: 'AOE BLAST'
  }
};

class WeaponInventory {
  constructor() {
    this.weapons = {};
    this.weaponOrder = ['rifle', 'shotgun', 'smg', 'railgun', 'cannon'];
    this.currentId = 'rifle';
    this.previousId = 'shotgun';

    // Initialize weapon states
    for (const id of this.weaponOrder) {
      const def = WEAPON_DEFINITIONS[id];
      this.weapons[id] = {
        ...def,
        ammo: def.magSize,
        isReloading: false,
        reloadTimer: 0
      };
    }
  }

  get current() {
    return this.weapons[this.currentId];
  }

  equip(id) {
    if (!this.weapons[id] || this.currentId === id) return false;
    this.previousId = this.currentId;
    this.currentId = id;
    if (window.soundSystem) {
      window.soundSystem.playWeaponSwitch();
    }
    return true;
  }

  equipByIndex(index) {
    if (index >= 0 && index < this.weaponOrder.length) {
      return this.equip(this.weaponOrder[index]);
    }
    return false;
  }

  next() {
    const currentIndex = this.weaponOrder.indexOf(this.currentId);
    const nextIndex = (currentIndex + 1) % this.weaponOrder.length;
    return this.equip(this.weaponOrder[nextIndex]);
  }

  previous() {
    const currentIndex = this.weaponOrder.indexOf(this.currentId);
    const prevIndex = (currentIndex - 1 + this.weaponOrder.length) % this.weaponOrder.length;
    return this.equip(this.weaponOrder[prevIndex]);
  }

  quickSwitch() {
    if (this.previousId && this.weapons[this.previousId]) {
      return this.equip(this.previousId);
    }
    return false;
  }

  refillAll() {
    for (const id in this.weapons) {
      const w = this.weapons[id];
      w.ammo = w.magSize;
      w.isReloading = false;
      w.reloadTimer = 0;
    }
  }

  update(dt, onReloadComplete) {
    for (const id in this.weapons) {
      const w = this.weapons[id];
      if (w.isReloading) {
        w.reloadTimer -= dt;
        if (w.reloadTimer <= 0) {
          w.ammo = w.magSize;
          w.isReloading = false;
          w.reloadTimer = 0;
          if (onReloadComplete) onReloadComplete(w);
        }
      }
    }
  }

  startReload(id = this.currentId) {
    const w = this.weapons[id];
    if (!w || w.isReloading || w.ammo === w.magSize) return false;
    w.isReloading = true;
    w.reloadTimer = w.reloadDuration;
    if (window.soundSystem) {
      window.soundSystem.playReload();
    }
    return true;
  }
}

window.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
window.WeaponInventory = WeaponInventory;
