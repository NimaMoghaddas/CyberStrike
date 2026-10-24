
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
  },
  hydra: {
    id: 'hydra',
    slot: 6,
    key: '6',
    name: 'HYDRA-9 SWARM MISSILES',
    shortName: 'HYDRA-9',
    category: 'GUIDED ARTILLERY',
    icon: '🚀',
    description: 'Fires high-velocity micro-missiles with calibrated trajectory guidance.',
    magSize: 12,
    fireRate: 0.22,
    reloadDuration: 1.85,
    damage: 46,
    splashDamage: 0,
    blastRadius: 0,
    explosive: false,
    homing: true,
    speed: 780,
    range: 1350,
    spread: 0.08,
    pellets: 1,
    recoil: 8,
    screenShake: 3.5,
    color: '#ff007f',
    glowColor: '#ff0055',
    bulletRadius: 5.5,
    sound: 'hydra',
    crosshairStyle: 'default',
    tag: 'GUIDED SWARM'
  },
  tesla: {
    id: 'tesla',
    slot: 7,
    key: '7',
    name: 'TESLA-ARC LIGHTNING',
    shortName: 'TESLA-ARC',
    category: 'CHAIN VOLTAGE',
    icon: '⚡⚡⚡',
    description: 'High-voltage lightning arcs jumping between multiple hostiles with stun.',
    magSize: 20,
    fireRate: 0.26,
    reloadDuration: 1.55,
    damage: 54,
    chainDamage: 40,
    chainTargets: 3,
    chainRange: 220,
    speed: 1800,
    range: 1050,
    spread: 0.02,
    pellets: 1,
    recoil: 6,
    screenShake: 3.5,
    color: '#00f0ff',
    glowColor: '#38bdf8',
    bulletRadius: 5.5,
    sound: 'tesla',
    crosshairStyle: 'default',
    tag: 'CHAIN x4'
  },
  vortex: {
    id: 'vortex',
    slot: 8,
    key: '8',
    name: 'SINGULARITY VORTEX',
    shortName: 'VORTEX',
    category: 'GRAVITY CANNON',
    icon: '🌀',
    description: 'Launches a black hole orb that vacuums hostiles inward before gravitational implosion.',
    magSize: 3,
    fireRate: 1.15,
    reloadDuration: 2.3,
    damage: 50,
    splashDamage: 135,
    blastRadius: 165,
    pullRadius: 300,
    isVortex: true,
    explosive: true,
    speed: 260,
    range: 880,
    spread: 0.01,
    pellets: 1,
    recoil: 16,
    screenShake: 9.0,
    color: '#a855f7',
    glowColor: '#c084fc',
    bulletRadius: 10,
    sound: 'vortex',
    crosshairStyle: 'cannon',
    tag: 'GRAVITY PULL'
  }
};

class WeaponInventory {
  constructor() {
    this.weapons = {};
    this.weaponOrder = ['rifle', 'shotgun', 'smg', 'railgun', 'cannon', 'hydra', 'tesla', 'vortex'];
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

    // Proximity awareness for interactive glow
    const dist = Math.sqrt(distSq);
    this.proximity = Math.max(0, Math.min(1, 1 - (dist - touchDist) / 100));

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
      window.particleSystem.emit(this.x, this.y, 28, {
        speed: 150,
        color: color,
        life: 0.55
      });
      if (window.particleSystem.emitDamageNumber) {
        window.particleSystem.emitDamageNumber(this.x, this.y - 18, `+${this.def.shortName}`, true);
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

  // Draw detailed custom weapon models for dropped weapons
  drawWeaponVector(ctx, type, color, time, pulse) {
    ctx.save();

    switch (type) {
      case 'shotgun': {
        // --- SG-12 SCATTERSHOT COMBAT SHOTGUN ---
        // Centered around 0,0 (-20 to +20 X, -8 to +8 Y)
        // 1. Heavy Stock & Grip
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-20, -3.5, 9, 7, 2);
        else ctx.rect(-20, -3.5, 9, 7);
        ctx.fill();

        // 2. Heavy Receiver Chassis
        const recGrad = ctx.createLinearGradient(-12, -6, -12, 6);
        recGrad.addColorStop(0, '#334155');
        recGrad.addColorStop(0.5, '#1e293b');
        recGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = recGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-12, -5.5, 16, 11, 2);
        else ctx.rect(-12, -5.5, 16, 11);
        ctx.fill();

        // Amber Heat Indicator Vent
        ctx.fillStyle = '#ff9500';
        ctx.shadowColor = '#ff9500';
        ctx.shadowBlur = 6;
        ctx.fillRect(-10, -1, 10, 2);
        ctx.shadowBlur = 0;

        // 3. Twin Heavy Steel Barrels
        const bGrad = ctx.createLinearGradient(4, -4, 4, 4);
        bGrad.addColorStop(0, '#64748b');
        bGrad.addColorStop(0.5, '#334155');
        bGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bGrad;
        ctx.fillRect(4, -4.5, 17, 3.8); // Top Barrel
        ctx.fillRect(4, 0.5, 17, 3.8);  // Bottom Barrel

        // Barrel tips / heavy chokes
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(19, -4.8, 2.5, 4.4);
        ctx.fillRect(19, 0.2, 2.5, 4.4);

        // Muzzle Openings
        ctx.fillStyle = '#05070a';
        ctx.fillRect(21, -3.8, 1.2, 2.4);
        ctx.fillRect(21, 1.2, 1.2, 2.4);

        // 4. Perforated Heat Shroud on Top
        ctx.fillStyle = '#0f172a';
        for (let h = 0; h < 4; h++) {
          ctx.beginPath();
          ctx.arc(6 + h * 3.5, -2.6, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }

        // 5. Ribbed Tactical Pump Slider
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(5, 5, 10, 3, 1);
        else ctx.rect(5, 5, 10, 3);
        ctx.fill();
        ctx.stroke();

        // 6. Side Saddle Shells
        for (let s = 0; s < 3; s++) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-9 + s * 4.5, -8, 3, 2.2);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-9 + s * 4.5, -6.2, 3, 0.8);
        }
        break;
      }

      case 'smg': {
        // --- VIPER-X DUAL SMG (HIGH-RPM COMPACT PDW) ---
        // 1. Compact Aerodynamic Receiver
        const smgGrad = ctx.createLinearGradient(-14, -5, -14, 5);
        smgGrad.addColorStop(0, '#1e293b');
        smgGrad.addColorStop(0.5, '#0f172a');
        smgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = smgGrad;
        ctx.beginPath();
        ctx.moveTo(-16, -2);
        ctx.lineTo(8, -4);
        ctx.lineTo(10, 4);
        ctx.lineTo(-14, 5);
        ctx.closePath();
        ctx.fill();

        // 2. Dual Ported Muzzle Compensator
        ctx.fillStyle = '#334155';
        ctx.fillRect(9, -3.2, 9, 6.2);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(11, -3.8, 1.2, 7.4);
        ctx.fillRect(14, -3.8, 1.2, 7.4);

        // Muzzle Bore
        ctx.fillStyle = '#000';
        ctx.fillRect(17.5, -1.5, 1.0, 3);

        // 3. Curved Extended Mag with Glowing Neon Ammo Window
        ctx.save();
        ctx.translate(-2, 4);
        ctx.rotate(0.2);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, 4.5, 12);
        // Translucent Green Window
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 6;
        ctx.fillRect(1.0, 1.5, 2.5, 9);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#475569';
        ctx.fillRect(-0.5, 11, 5.5, 1.8);
        ctx.restore();

        // 4. Reflex Holo Sight
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, -6.5, 8, 2.5);
        ctx.fillStyle = 'rgba(57, 255, 20, 0.5)';
        ctx.fillRect(-1, -6.2, 3, 1.8);
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 5;
        ctx.fillRect(0.5, -5.6, 1.2, 1.0);
        ctx.shadowBlur = 0;

        // 5. Lime Accent Energy Rail
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 6;
        ctx.fillRect(-8, 0, 14, 1.4);
        ctx.shadowBlur = 0;

        // Skeletonized Minimal Stock
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-16, -1);
        ctx.lineTo(-22, -1);
        ctx.lineTo(-22, 5);
        ctx.stroke();
        break;
      }

      case 'railgun': {
        // --- VORTEX-50 RAILGUN (ELECTROMAGNETIC SNIPER) ---
        // 1. Titanium Base Frame & Heavy Stock
        const rGrad = ctx.createLinearGradient(-22, -4, -22, 4);
        rGrad.addColorStop(0, '#2d1b4e');
        rGrad.addColorStop(0.5, '#130d24');
        rGrad.addColorStop(1, '#07050d');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-24, -3.5, 16, 7, 2);
        else ctx.rect(-24, -3.5, 16, 7);
        ctx.fill();

        // 2. Twin Supersonic Magnetic Rails
        const railMetal = ctx.createLinearGradient(0, -4, 0, 4);
        railMetal.addColorStop(0, '#c084fc');
        railMetal.addColorStop(0.5, '#4c1d95');
        railMetal.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = railMetal;
        ctx.fillRect(-8, -4.5, 32, 2.5); // Upper Rail
        ctx.fillRect(-8, 1.8, 32, 2.5);  // Lower Rail

        // Central Magnetic Induction Beam Channel (Glowing Violet)
        ctx.fillStyle = 'rgba(176, 38, 255, 0.6)';
        ctx.shadowColor = '#b026ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(-8, -1.8, 32, 3.4);
        ctx.shadowBlur = 0;

        // 3. Four Supercharged Electromagnetic Induction Coils
        for (let c = 0; c < 4; c++) {
          const coilX = -6 + c * 7.5;
          ctx.fillStyle = '#1e1035';
          ctx.fillRect(coilX - 1.5, -6.5, 4.5, 13);
          ctx.fillStyle = (c % 2 === 0) ? '#d946ef' : '#a855f7';
          ctx.shadowColor = '#d946ef';
          ctx.shadowBlur = 7 + pulse * 3;
          ctx.fillRect(coilX - 0.5, -5.5, 2.5, 11);
          ctx.shadowBlur = 0;
        }

        // 4. Large Sniper Scope Module
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-14, -8, 16, 3.5);
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, -8.5, 3.5, 4.5); // Front lens bell
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 6;
        ctx.fillRect(2.2, -7.8, 1.2, 3.2); // Lens Glint
        ctx.shadowBlur = 0;

        // Electrical Spark between rails
        if (Math.sin(time * 15 + this.pulsePhase) > 0.3) {
          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const sparkX = 8 + (Math.sin(time * 20) * 10);
          ctx.moveTo(sparkX, -3);
          ctx.lineTo(sparkX + 2, 0);
          ctx.lineTo(sparkX - 1, 3);
          ctx.stroke();
        }
        break;
      }

      case 'cannon': {
        // --- NOVA-PLAS DEVASTATOR CANNON ---
        // 1. Armored Heavy Chassis
        const cGrad = ctx.createLinearGradient(-18, -6, -18, 6);
        cGrad.addColorStop(0, '#3f0c1c');
        cGrad.addColorStop(0.5, '#1e050e');
        cGrad.addColorStop(1, '#0f0207');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-20, -5.5, 18, 12, 3);
        else ctx.rect(-20, -5.5, 18, 12);
        ctx.fill();

        // 2. Flared Heavy Plasma Muzzle Shroud
        const shroudG = ctx.createLinearGradient(8, -7, 8, 7);
        shroudG.addColorStop(0, '#881337');
        shroudG.addColorStop(0.5, '#4c0519');
        shroudG.addColorStop(1, '#2a0410');
        ctx.fillStyle = shroudG;
        ctx.fillRect(10, -6.5, 9, 13);
        // Hexagonal Muzzle Aperture
        ctx.fillStyle = '#080104';
        ctx.fillRect(17, -5, 2.5, 10);

        // 3. Swirling Plasma Reactor Chamber (Glass Cylinder Core)
        ctx.fillStyle = '#0a0205';
        ctx.fillRect(-7, -4.5, 17, 9);

        // Molten Plasma Core
        const pGrad = ctx.createRadialGradient(1, 0, 1, 1, 0, 6);
        pGrad.addColorStop(0, '#ffffff');
        pGrad.addColorStop(0.4, '#ff2a5f');
        pGrad.addColorStop(1, '#9f1239');
        ctx.fillStyle = pGrad;
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 12 + pulse * 6;
        ctx.beginPath();
        ctx.ellipse(1, 0, 7, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Reinforcement Metal Struts
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-7, -4.5, 17, 9);

        // Heavy Underslung Battery Core
        ctx.fillStyle = '#4c0519';
        ctx.fillRect(-12, 6.5, 12, 4);
        ctx.fillStyle = '#ff2a5f';
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 4;
        ctx.fillRect(-10, 7.8, 8, 1.4);
        ctx.shadowBlur = 0;
        break;
      }

      case 'hydra': {
        // --- HYDRA-9 SWARM MISSILE POD ---
        ctx.fillStyle = '#1e0517';
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-16, -7, 28, 14, 3);
        else ctx.rect(-16, -7, 28, 14);
        ctx.fill();
        ctx.stroke();

        // Dual rocket tubes
        ctx.fillStyle = '#0a0006';
        ctx.beginPath();
        ctx.arc(8, -3, 3, 0, Math.PI * 2);
        ctx.arc(8, 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Neon tips
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 8;
        ctx.fillRect(-10, -1.5, 14, 3);
        ctx.shadowBlur = 0;
        break;
      }

      case 'tesla': {
        // --- TESLA-ARC LIGHTNING CANNON ---
        ctx.fillStyle = '#061325';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-18, -5, 24, 10, 2);
        else ctx.rect(-18, -5, 24, 10);
        ctx.fill();
        ctx.stroke();

        // Dual Arc Emitter Prongs
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(6, -6, 10, 2.5);
        ctx.fillRect(6, 3.5, 10, 2.5);

        // Core glow & spark
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(-4, -2, 10, 4);
        ctx.shadowBlur = 0;
        break;
      }

      case 'vortex': {
        // --- SINGULARITY VORTEX CANNON ---
        ctx.fillStyle = '#1a0b2e';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-16, -6, 26, 12, 3);
        else ctx.rect(-16, -6, 26, 12);
        ctx.fill();
        ctx.stroke();

        // Rotating Gravitational Singularity Core
        const vG = ctx.createRadialGradient(2, 0, 0, 2, 0, 7);
        vG.addColorStop(0, '#ffffff');
        vG.addColorStop(0.4, '#c084fc');
        vG.addColorStop(1, '#581c87');
        ctx.fillStyle = vG;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(2, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }

      case 'rifle':
      default: {
        // --- ARC-9 PULSE RIFLE (TACTICAL ENERGY ASSAULT RIFLE) ---
        // 1. Carbon-Polymer Receiver Body
        const rGrad = ctx.createLinearGradient(-12, -4, -12, 4);
        rGrad.addColorStop(0, '#2a3447');
        rGrad.addColorStop(0.4, '#151d28');
        rGrad.addColorStop(1, '#0a0f16');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.moveTo(-20, -1);
        ctx.lineTo(10, -3.5);
        ctx.lineTo(12, 3.5);
        ctx.lineTo(-18, 4.5);
        ctx.closePath();
        ctx.fill();

        // Stock
        ctx.fillStyle = '#111827';
        ctx.fillRect(-22, -2, 4, 5);

        // 2. Fluted Tactical Outer Barrel with Compensator
        const bg = ctx.createLinearGradient(12, -2, 12, 2);
        bg.addColorStop(0, '#64748b');
        bg.addColorStop(0.5, '#334155');
        bg.addColorStop(1, '#1e293b');
        ctx.fillStyle = bg;
        ctx.fillRect(10, -2.5, 11, 3.2);

        // Muzzle Brake
        ctx.fillStyle = '#475569';
        ctx.fillRect(19, -3.2, 3.5, 4.4);
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(21.5, -2.2, 1.2, 2.4);

        // 3. Reflex Holo Sight on Top Rail
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-6, -6, 9, 2.4);
        // Holo Glass
        ctx.fillStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.fillRect(-3, -5.6, 4, 1.8);
        // Glowing Aim Dot
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 5;
        ctx.fillRect(-1.5, -5.0, 1.2, 1.0);
        ctx.shadowBlur = 0;

        // 4. Curved Plasma Magazine with Glowing LED Fuel Bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-6, 3.5, 5, 8);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 5;
        ctx.fillRect(-4.5, 4.5, 2.0, 5.5);
        ctx.shadowBlur = 0;

        // 5. High-Intensity Plasma Spine Conduit (Cyan Glow)
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 7 + pulse * 3;
        ctx.fillRect(-10, -1, 17, 1.6);
        ctx.shadowBlur = 0;

        // Angled Foregrip
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(3, 3.5);
        ctx.lineTo(8, 3.5);
        ctx.lineTo(6, 7);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  draw(ctx) {
    if (this.collected) return;

    const time = performance.now() * 0.001;
    const prox = this.proximity || 0;
    const bob = Math.sin(time * 3.2 + this.pulsePhase) * 4.5;
    const pulse = 1 + Math.sin(time * 4.2 + this.pulsePhase) * 0.08;
    const drawY = this.y - 12 + bob;
    const color = this.def.color || '#00f0ff';

    ctx.save();

    // 1. Ground Holographic Base & Aura
    const shadowAlpha = 0.25 + prox * 0.2;
    ctx.fillStyle = color;
    ctx.globalAlpha = shadowAlpha;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, (24 + prox * 6) * pulse, (9 + prox * 2) * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Rotating Holographic Tech Rings & Radar Sweep
    ctx.save();
    ctx.translate(this.x, this.y + 14);
    ctx.scale(1, 0.42); // Flatten perspective onto floor

    // Outer rotating tick ring
    ctx.rotate(time * 1.2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.5 + prox * 0.3;
    ctx.setLineDash([8, 6, 2, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Counter-rotating inner ring
    ctx.rotate(-time * 2.4);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35 + prox * 0.25;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Corner Projector Beacon Studs
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const bx = Math.cos(ang) * 26 * pulse;
      const by = Math.sin(ang) * 26 * pulse;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 3. Upward Holographic Light Pillar / Beacon Beam
    const beamGrad = ctx.createLinearGradient(0, this.y + 14, 0, drawY - 26);
    beamGrad.addColorStop(0, `${color}40`);
    beamGrad.addColorStop(0.5, `${color}18`);
    beamGrad.addColorStop(1, `${color}00`);
    ctx.fillStyle = beamGrad;
    ctx.globalAlpha = 0.8 + prox * 0.2;
    ctx.beginPath();
    ctx.moveTo(this.x - 16 * pulse, this.y + 14);
    ctx.lineTo(this.x - 22 * pulse, drawY - 20);
    ctx.lineTo(this.x + 22 * pulse, drawY - 20);
    ctx.lineTo(this.x + 16 * pulse, this.y + 14);
    ctx.closePath();
    ctx.fill();

    // Floating Rising Spark Motes
    for (let p = 0; p < 3; p++) {
      const pPhase = (time * 1.5 + p * 1.2 + this.pulsePhase) % 1;
      const py = (this.y + 12) - pPhase * 36;
      const px = this.x + Math.sin(time * 3 + p * 2) * 10;
      const pAlpha = Math.sin(pPhase * Math.PI) * 0.7;
      ctx.fillStyle = color;
      ctx.globalAlpha = pAlpha;
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Floating Holographic HUD Corner Brackets Around Weapon [  ]
    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.globalAlpha = 0.65 + prox * 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    const bw = 24 * pulse;
    const bh = 14 * pulse;
    const blen = 5;

    // Top-Left [
    ctx.beginPath();
    ctx.moveTo(-bw, -bh + blen);
    ctx.lineTo(-bw, -bh);
    ctx.lineTo(-bw + blen, -bh);
    ctx.stroke();

    // Top-Right ]
    ctx.beginPath();
    ctx.moveTo(bw - blen, -bh);
    ctx.lineTo(bw, -bh);
    ctx.lineTo(bw, -bh + blen);
    ctx.stroke();

    // Bottom-Left [
    ctx.beginPath();
    ctx.moveTo(-bw, bh - blen);
    ctx.lineTo(-bw, bh);
    ctx.lineTo(-bw + blen, bh);
    ctx.stroke();

    // Bottom-Right ]
    ctx.beginPath();
    ctx.moveTo(bw - blen, bh);
    ctx.lineTo(bw, bh);
    ctx.lineTo(bw, bh - blen);
    ctx.stroke();
    ctx.restore();

    // 5. Draw Floating Detailed Weapon Model
    ctx.save();
    ctx.translate(this.x, drawY);
    // Dynamic subtle hover wobble
    const hoverTilt = Math.sin(time * 2.2 + this.pulsePhase) * 0.08 - 0.05;
    ctx.rotate(hoverTilt);
    ctx.scale(1.15 * pulse, 1.15 * pulse);

    // Glowing weapon backdrop halo
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + prox * 8;
    this.drawWeaponVector(ctx, this.weaponType, color, time, pulse);
    ctx.restore();

    // 6. Holographic AR Floating Nameplate / Category Pill (Above Weapon)
    ctx.save();
    ctx.translate(this.x, drawY - 26);
    ctx.globalAlpha = 0.95;

    // Badge background box
    const tagText = this.def.shortName || 'WEAPON';
    const catText = this.def.category || 'FIREARM';
    ctx.font = 'bold 11px "Rajdhani", sans-serif';
    const nameWidth = ctx.measureText(tagText).width;
    const badgeW = Math.max(54, nameWidth + 16);
    const badgeH = 18;

    ctx.fillStyle = 'rgba(6, 12, 24, 0.88)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 4);
    else ctx.rect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
    ctx.fill();
    ctx.stroke();

    // Category micro-tag above badge
    ctx.font = '700 8px "Rajdhani", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 4;
    ctx.fillText(catText, 0, -badgeH / 2 - 2);

    // Weapon Name in badge
    ctx.font = 'bold 11px "Rajdhani", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.fillText(tagText, 0, 1);

    ctx.restore();
    ctx.restore();
  }
}

window.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
window.WeaponInventory = WeaponInventory;
window.WeaponDrop = WeaponDrop;

