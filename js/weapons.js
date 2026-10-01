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

class WeaponDrop {
  constructor(x, y, weaponType = 'rifle', id = null) {
    this.x = x;
    this.y = y;
    this.weaponType = weaponType;
    this.id = id || `wdrop_${Math.floor(Math.random() * 1000000)}`;
    this.def = WEAPON_DEFINITIONS[weaponType] || WEAPON_DEFINITIONS.rifle;
    this.radius = 24;
    this.collected = false;
    this.createdAt = performance.now();
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(dt, player, game) {
    if (this.collected) return false;
    if (!player || !player.alive) return false;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy;
    const touchDist = player.radius + this.radius;

    if (distSq <= touchDist * touchDist) {
      this.collect(player, game);
      return true;
    }
    return false;
  }

  collect(player, game) {
    if (this.collected) return;
    this.collected = true;

    player.equipWeapon(this.weaponType);
    player.ammo = player.magSize; // Full clip reload on pickup!

    const color = this.def.color || '#00f0ff';
    if (window.particleSystem) {
      window.particleSystem.emit(this.x, this.y, 25, {
        speed: 140,
        color: color,
        life: 0.5
      });
      if (window.particleSystem.emitDamageNumber) {
        window.particleSystem.emitDamageNumber(this.x, this.y - 15, `+${this.def.shortName}`, true);
      }
    }

    if (window.soundSystem && window.soundSystem.playWeaponShoot) {
      window.soundSystem.playWeaponShoot(this.weaponType);
    }

    if (game && game.showWeaponToast) {
      game.showWeaponToast(this.def);
    }
    if (game && game.updateHUD) {
      game.updateHUD();
    }

    // Multiplayer reporting
    if (game && game.network && game.gameMode === 'multiplayer') {
      game.network.reportWeaponDropPickup(this.id, this.weaponType);
    }
  }

  draw(ctx) {
    if (this.collected) return;

    const time = performance.now() * 0.001;
    const bob = Math.sin(time * 3.5 + this.pulsePhase) * 4;
    const pulse = 1 + Math.sin(time * 4.0 + this.pulsePhase) * 0.08;
    const drawY = this.y + bob;
    const color = this.def.color || '#00f0ff';

    ctx.save();

    // 1. Ground Shadow & Aura
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 16, 22 * pulse, 8 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Rotating Holographic Tech Ring
    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.rotate(time * 1.8);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Central Hexagonal Pedestal
    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = '#060c18';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const side = 18;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const px = Math.cos(a) * side;
      const py = Math.sin(a) * side;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Weapon Icon
    ctx.font = '16px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillText(this.def.icon || '⚡', 0, 0);

    // Floating text label above
    ctx.font = 'bold 11px "Rajdhani", monospace';
    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.fillText(this.def.shortName, 0, -28);

    ctx.restore();
    ctx.restore();
  }
}

window.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
window.WeaponInventory = WeaponInventory;
window.WeaponDrop = WeaponDrop;
