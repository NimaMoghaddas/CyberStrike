/**
 * CYBER STRIKE // PLAYER OPERATIVE
 * Detailed top-down tactical character with customizable weapon arsenal,
 * laser aim sight, walking kinematics, recoil kick, and tactical dash.
 */

// Shared Tactical Weapon Renderer (used by local player, remote players, and UI previews)
function drawTacticalWeapon(ctx, weaponId, color, isLocal = false, options = {}) {
  const animTimer = (options && options.animTimer !== undefined) ? options.animTimer : (performance.now() * 0.001);
  const isFiring = options && options.isFiring;
  const isReloading = options && options.isReloading;
  const pulse = Math.sin(animTimer * 5) * 0.5 + 0.5;
  const themeCol = color || '#00f0ff';

  ctx.save();

  switch (weaponId) {
    case 'shotgun': {
      // --- SG-12 SCATTERSHOT (HEAVY TWIN-BARREL COMBAT SHOTGUN) ---
      // 1. Lower Receiver / Stock Adapter
      ctx.fillStyle = '#10151d';
      ctx.beginPath();
      ctx.roundRect(2, 2.5, 26, 11, 2.5);
      ctx.fill();

      // Top Steel Rail with Bevel
      const railGrad = ctx.createLinearGradient(4, 2, 4, 14);
      railGrad.addColorStop(0, '#3a4659');
      railGrad.addColorStop(0.5, '#1e2633');
      railGrad.addColorStop(1, '#111722');
      ctx.fillStyle = railGrad;
      ctx.fillRect(4, 3.5, 22, 9);

      // 2. Twin Heavy Steel Barrels (Upper & Lower)
      const barrelGrad = ctx.createLinearGradient(26, 3, 26, 13);
      barrelGrad.addColorStop(0, '#53627a');
      barrelGrad.addColorStop(0.3, '#2a3545');
      barrelGrad.addColorStop(0.7, '#1b222d');
      barrelGrad.addColorStop(1, '#475569');

      ctx.fillStyle = barrelGrad;
      ctx.fillRect(26, 3.6, 14, 3.8); // Top Barrel
      ctx.fillRect(26, 8.6, 14, 3.8); // Bottom Barrel

      // Heavy Muzzle Rings / Chokes at tips
      ctx.fillStyle = '#718096';
      ctx.fillRect(38, 3.2, 3, 4.6);
      ctx.fillRect(38, 8.2, 3, 4.6);

      // Dark Muzzle Holes
      ctx.fillStyle = '#05070a';
      ctx.fillRect(40.5, 4.2, 1.5, 2.6);
      ctx.fillRect(40.5, 9.2, 1.5, 2.6);

      // 3. Perforated Heat Shroud on Top Barrel (Cooling Vents)
      ctx.fillStyle = '#1a232f';
      ctx.fillRect(16, 2.4, 16, 2.2);
      ctx.fillStyle = '#0a0e14';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(19 + i * 3.5, 3.5, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Ribbed Pump-Action Forearm Slider (Tactical Grip)
      const pumpOffset = isReloading ? Math.sin(animTimer * 12) * 5 : 0;
      ctx.fillStyle = '#222d3d';
      ctx.beginPath();
      ctx.roundRect(14 + pumpOffset, 1.2, 10, 3.2, 1.2);
      ctx.fill();
      // Ribs on pump
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.moveTo(16 + pumpOffset + r * 2.8, 1.5);
        ctx.lineTo(16 + pumpOffset + r * 2.8, 4.2);
        ctx.stroke();
      }

      // 5. Side-Saddle Shell Rack (3 Glowing 12-Gauge Red/Gold Shells)
      for (let s = 0; s < 3; s++) {
        // Red shell plastic casing
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(6 + s * 5.2, 12, 3.6, 2.4);
        // Brass base rim
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(6 + s * 5.2, 13.6, 3.6, 1.2);
        // Primer dot
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(7.2 + s * 5.2, 14.4, 1.2, 0.6);
      }

      // 6. Amber Hazard LED Heat Bar
      ctx.fillStyle = '#ff9500';
      ctx.shadowColor = '#ff9500';
      ctx.shadowBlur = isFiring ? 12 : 5;
      ctx.fillRect(8, 6.8, 13, 1.8);
      ctx.shadowBlur = 0;

      // Mechanical Pivot Screws
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(6, 6, 1.0, 0, Math.PI * 2);
      ctx.arc(23, 6, 1.0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'smg': {
      // --- VIPER-X DUAL SMG (HIGH-RPM COMPACT PDW) ---
      // 1. Sleek Aerodynamic Frame / Carbon Receiver
      const smgGrad = ctx.createLinearGradient(4, 3, 4, 12);
      smgGrad.addColorStop(0, '#1e293b');
      smgGrad.addColorStop(0.5, '#0f172a');
      smgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = smgGrad;
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.lineTo(24, 4);
      ctx.lineTo(26, 7);
      ctx.lineTo(24, 11);
      ctx.lineTo(4, 11);
      ctx.closePath();
      ctx.fill();

      // Top Reflex Holo Sight Module
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 2.5, 9, 2.2);
      // Holo Lens Glass
      ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
      ctx.fillRect(11, 2.8, 4, 1.6);
      // Reticle Dot
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 6;
      ctx.fillRect(12.5, 3.2, 1.2, 0.8);
      ctx.shadowBlur = 0;

      // 2. Ported Muzzle Compensator / Suppressor
      ctx.fillStyle = '#334155';
      ctx.fillRect(25, 5.5, 8, 4.2);
      // Gas escape slots
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(27, 5.2, 1.2, 4.8);
      ctx.fillRect(30, 5.2, 1.2, 4.8);

      // Dark Muzzle Bore
      ctx.fillStyle = '#000000';
      ctx.fillRect(32.5, 6.6, 1.0, 2.0);

      // 3. Curved Extended Magazine with Translucent Ammo Window
      ctx.save();
      ctx.translate(13, 10);
      ctx.rotate(0.22);
      // Mag Casing
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, 4.5, 10);
      // Neon Green Bullet Window
      ctx.fillStyle = 'rgba(57, 255, 20, 0.85)';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 4;
      ctx.fillRect(1.0, 1.5, 2.5, 7);
      ctx.shadowBlur = 0;
      // Mag Baseplate
      ctx.fillStyle = '#374151';
      ctx.fillRect(-0.5, 9.5, 5.5, 1.8);
      ctx.restore();

      // 4. Lime Accent Glow Rail
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = isFiring ? 10 : 5;
      ctx.fillRect(8, 7.5, 14, 1.5);
      ctx.shadowBlur = 0;

      // Side ejection port
      ctx.fillStyle = '#475569';
      ctx.fillRect(15, 5.2, 5, 1.8);
      break;
    }

    case 'railgun': {
      // --- VORTEX-50 RAILGUN (ELECTROMAGNETIC PIERCING SNIPER) ---
      // 1. Heavy Titanium Chassis & Stock Mount
      const railBaseGrad = ctx.createLinearGradient(0, 4, 0, 12);
      railBaseGrad.addColorStop(0, '#2d1b4e');
      railBaseGrad.addColorStop(0.5, '#130d24');
      railBaseGrad.addColorStop(1, '#07050d');
      ctx.fillStyle = railBaseGrad;
      ctx.beginPath();
      ctx.roundRect(0, 4, 28, 8, 2);
      ctx.fill();

      // 2. Twin Supersonic Magnetic Rails (Top & Bottom Rails with Air Gap)
      const railMetalGrad = ctx.createLinearGradient(26, 4, 26, 12);
      railMetalGrad.addColorStop(0, '#c084fc');
      railMetalGrad.addColorStop(0.5, '#4c1d95');
      railMetalGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = railMetalGrad;
      ctx.fillRect(26, 4.6, 24, 2.6); // Upper Rail
      ctx.fillRect(26, 8.8, 24, 2.6); // Lower Rail

      // Center Magnetic Induction Void (Glowing Violet Beam Channel)
      ctx.fillStyle = 'rgba(176, 38, 255, 0.45)';
      ctx.shadowColor = '#b026ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(26, 7.2, 24, 1.6);
      ctx.shadowBlur = 0;

      // 3. Four Supercharged Electromagnetic Induction Coils
      for (let c = 0; c < 4; c++) {
        const coilX = 14 + c * 8;
        // Coil Outer Frame
        ctx.fillStyle = '#1e1035';
        ctx.fillRect(coilX - 1.5, 1.5, 5, 13);
        // Inner Glowing Superconductor Core
        ctx.fillStyle = (c % 2 === 0) ? '#d946ef' : '#a855f7';
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 8 + pulse * 4;
        ctx.fillRect(coilX - 0.5, 2.2, 3, 11.6);
        ctx.shadowBlur = 0;
      }

      // Miniature Electrical Sparks between Rails
      if (Math.random() < 0.45 || isFiring) {
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const sx = 28 + Math.random() * 18;
        ctx.moveTo(sx, 5.5);
        ctx.lineTo(sx + (Math.random() - 0.5) * 4, 8);
        ctx.lineTo(sx + (Math.random() - 0.5) * 4, 10.5);
        ctx.stroke();
      }

      // 4. Large Sniper Scope Module with Optical Lenses
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, 0.5, 18, 4);
      // Objective lens housing (Front)
      ctx.fillStyle = '#334155';
      ctx.fillRect(21, 0.2, 3.5, 4.6);
      // Lens Violet Reflection
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 6;
      ctx.fillRect(23.5, 0.8, 1.2, 3.4);
      ctx.shadowBlur = 0;
      // Ocular lens housing (Rear)
      ctx.fillStyle = '#334155';
      ctx.fillRect(5, 0.6, 2.5, 3.8);

      // Rear Capacitor Battery
      ctx.fillStyle = '#581c87';
      ctx.fillRect(2, 6, 4, 4);
      break;
    }

    case 'cannon': {
      // --- PLASMA DEVASTATOR CANNON ---
      // Heavy Reinforced Receiver
      ctx.fillStyle = '#1e101a';
      ctx.beginPath();
      ctx.roundRect(2, 1.5, 28, 13, 3);
      ctx.fill();

      // Flared Plasma Muzzle Shroud
      const shroudGrad = ctx.createLinearGradient(28, 1, 28, 15);
      shroudGrad.addColorStop(0, '#881337');
      shroudGrad.addColorStop(0.5, '#4c0519');
      shroudGrad.addColorStop(1, '#2a0410');
      ctx.fillStyle = shroudGrad;
      ctx.fillRect(28, 2.5, 8, 11);

      // Large Hexagonal Barrel Aperture
      ctx.fillStyle = '#110206';
      ctx.fillRect(35, 3.8, 2.5, 8.4);

      // Swirling Plasma Reactor Chamber (Glass Cylinder Core)
      ctx.fillStyle = '#0f050c';
      ctx.fillRect(8, 3.5, 16, 9);
      // Molten Plasma Core Fill
      const plasmaGrad = ctx.createRadialGradient(16, 8, 1, 16, 8, 8);
      plasmaGrad.addColorStop(0, '#ffffff');
      plasmaGrad.addColorStop(0.4, '#ff2a5f');
      plasmaGrad.addColorStop(1, '#9f1239');
      ctx.fillStyle = plasmaGrad;
      ctx.shadowColor = '#ff2a5f';
      ctx.shadowBlur = 12 + pulse * 6;
      ctx.beginPath();
      ctx.ellipse(16, 8, 6.5, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Heavy Reinforcement Struts
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(8, 3.5, 16, 9);

      // Underslung Heavy Battery Pod
      ctx.fillStyle = '#4c0519';
      ctx.fillRect(10, 13, 11, 4.5);
      ctx.fillStyle = '#ff2a5f';
      ctx.fillRect(12, 14.5, 7, 1.5);
      break;
    }

    case 'rifle':
    default: {
      // --- ARC-9 PULSE RIFLE (TACTICAL ENERGY RIFLE) ---
      // 1. Carbon-Polymer Receiver Frame with Angles
      const rifleGrad = ctx.createLinearGradient(4, 3, 4, 13);
      rifleGrad.addColorStop(0, '#2a3447');
      rifleGrad.addColorStop(0.4, '#151d28');
      rifleGrad.addColorStop(1, '#0a0f16');
      ctx.fillStyle = rifleGrad;
      ctx.beginPath();
      ctx.moveTo(3, 5);
      ctx.lineTo(32, 4.5);
      ctx.lineTo(34, 7.5);
      ctx.lineTo(32, 11);
      ctx.lineTo(3, 11);
      ctx.closePath();
      ctx.fill();

      // Top Picatinny Rail
      ctx.fillStyle = '#374151';
      ctx.fillRect(6, 3.2, 22, 1.6);
      for (let t = 0; t < 5; t++) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(8 + t * 4, 3.2, 1.2, 1.6);
      }

      // Reflex Holo Sight on Top Rail
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(11, 1.4, 8, 2.2);
      // Holo Sight Glass Lens
      ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.fillRect(13, 1.6, 4, 1.8);
      // Floating Holographic Red/Cyan Aim Dot
      ctx.fillStyle = themeCol;
      ctx.shadowColor = themeCol;
      ctx.shadowBlur = 6;
      ctx.fillRect(14.5, 2.1, 1.2, 0.8);
      ctx.shadowBlur = 0;

      // 2. Tactical Fluted Outer Barrel
      const barrelG = ctx.createLinearGradient(32, 5, 32, 10);
      barrelG.addColorStop(0, '#64748b');
      barrelG.addColorStop(0.5, '#334155');
      barrelG.addColorStop(1, '#1e293b');
      ctx.fillStyle = barrelG;
      ctx.fillRect(32, 5.8, 9, 3.4);

      // Dual-Port Muzzle Brake
      ctx.fillStyle = '#475569';
      ctx.fillRect(40, 5.2, 3.5, 4.6);
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(42.5, 6.2, 1.2, 2.6);

      // Barrel Cooling Vents
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(25, 5.0, 1.5, 5.0);
      ctx.fillRect(28, 5.0, 1.5, 5.0);

      // 3. Ergonomic Angled Foregrip (under barrel)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(22, 11);
      ctx.lineTo(26, 11);
      ctx.lineTo(24, 14.5);
      ctx.lineTo(21, 14.5);
      ctx.closePath();
      ctx.fill();

      // 4. Curved Plasma Magazine with LED Fuel Level
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, 10.5, 5, 6.5);
      // Magazine Power Cell Light
      ctx.fillStyle = themeCol;
      ctx.shadowColor = themeCol;
      ctx.shadowBlur = 4;
      ctx.fillRect(11.5, 11.5, 2.0, 4.5);
      ctx.shadowBlur = 0;

      // 5. High-Intensity Pulse Line (Glows along the rifle spine)
      ctx.fillStyle = themeCol;
      ctx.shadowColor = themeCol;
      ctx.shadowBlur = isFiring ? 12 : (6 + pulse * 3);
      ctx.fillRect(10, 5.0, 15, 1.5);
      ctx.shadowBlur = 0;

      // Receiver Pivot Screws
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(6, 7.5, 0.8, 0, Math.PI * 2);
      ctx.arc(20, 7.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

class Player {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.id = options.id || null;
    this.name = options.name || 'OPERATIVE';
    
    // Skin & Palette initialization
    const skins = (typeof window !== 'undefined' && window.OPERATIVE_SKINS) || null;
    const requestedSkinId = options.skinId || options.skin;
    this.skin = (skins && skins[requestedSkinId]) || (skins && skins.spectre) || null;
    this.color = options.color || (this.skin ? this.skin.color : '#00f0ff');
    this.modelType = options.modelType || (this.skin && this.skin.modelType) || 'commando';
    this.skinColor = this.color;
    this.acidTimer = 0;
    this.acidDPS = 3;
    this.acidTickTimer = 0;

    this.isRemote = !!options.isRemote;
    this.radius = 20; // Collision circle
    this.angle = 0; // Look angle towards mouse

    // Movement Physics
    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 260;
    this.currentSpeed = this.baseSpeed;
    this.accel = 1800;
    this.friction = 1400;

    // Safe Ground Tracking & Unstuck Failsafe
    this.lastSafeX = x;
    this.lastSafeY = y;
    this.stuckTimer = 0;

    // Health & Stats
    this.maxHp = 100;
    this.hp = 100;
    this.invulnerableTime = 1.0; // grace period on spawn
    this.alive = true;

    // Tactical Dash (Space)
    this.dashSpeed = 750;
    this.dashDuration = 0.18;
    this.dashTimer = 0;
    this.dashCooldown = 1.8;
    this.dashCooldownTimer = 0;
    this.isDashing = false;
    this.dashAngle = 0;
    this.ghostTrails = []; // Dash after-images

    // Arsenal & Weapon Inventory System (5 distinct weapons)
    this.inventory = new WeaponInventory();
    this.fireTimer = 0;

    // Visual Animation States
    this.walkCycle = 0;
    this.isMoving = false;
    this.recoilOffset = 0; // Kickback distance
    this.muzzleFlashTimer = 0;
    this.hurtTimer = 0;

    // Expressive Character Animations (Fun & Living Hero)
    this.animTimer = Math.random() * 10;
    this.blinkTimer = 2.0 + Math.random() * 2.0;
    this.isBlinking = false;
  }

  // --- Convenience Getters & Setters for Active Weapon ---
  get currentWeapon() { return this.inventory.current; }
  get currentWeaponId() { return this.inventory.currentId; }
  get ammo() { return this.inventory.current.ammo; }
  set ammo(v) { this.inventory.current.ammo = v; }
  get magSize() { return this.inventory.current.magSize; }
  get isReloading() { return this.inventory.current.isReloading; }
  set isReloading(v) { this.inventory.current.isReloading = v; }
  get reloadTimer() { return this.inventory.current.reloadTimer; }
  set reloadTimer(v) { this.inventory.current.reloadTimer = v; }
  get reloadDuration() { return this.inventory.current.reloadDuration; }

  setSkin(skinId, color = null) {
    const skins = (typeof window !== 'undefined' && window.OPERATIVE_SKINS) || null;
    if (skins && skins[skinId]) {
      this.skin = skins[skinId];
      if (color) {
        this.color = color;
        this.skinColor = color;
      } else if (!this.customColorChosen) {
        this.color = this.skin.color;
        this.skinColor = this.skin.color;
      }
      return true;
    }
    return false;
  }

  setModel(modelType) {
    this.modelType = modelType || 'commando';
  }

  setColor(color) {
    if (color) {
      this.color = color;
      this.skinColor = color;
      this.customColorChosen = true;
    }
  }

  applyAcidDoT(duration = 0, dps = 0) {
    this.acidTimer = 0;
  }

  respawn(x = 1200, y = 1200) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.invulnerableTime = 2.5; // Shield force field on redeploy
    this.hurtTimer = 0;
    this.ghostTrails = [];
    this.refillAllAmmo();
    if (window.gameInstance) {
      window.gameInstance.updateHUD();
      window.gameInstance.updateAmmoUI();
      window.gameInstance.updateWeaponUI();
    }
  }

  equipWeapon(id) {
    if (this.inventory.equip(id)) {
      if (window.gameInstance) {
        window.gameInstance.updateAmmoUI();
        window.gameInstance.updateWeaponUI();
      }
      return true;
    }
    return false;
  }

  equipByIndex(index) {
    if (this.inventory.equipByIndex(index)) {
      if (window.gameInstance) {
        window.gameInstance.updateAmmoUI();
        window.gameInstance.updateWeaponUI();
      }
      return true;
    }
    return false;
  }

  nextWeapon() {
    if (this.inventory.next()) {
      if (window.gameInstance) {
        window.gameInstance.updateAmmoUI();
        window.gameInstance.updateWeaponUI();
      }
      return true;
    }
    return false;
  }

  previousWeapon() {
    if (this.inventory.previous()) {
      if (window.gameInstance) {
        window.gameInstance.updateAmmoUI();
        window.gameInstance.updateWeaponUI();
      }
      return true;
    }
    return false;
  }

  quickSwitchWeapon() {
    if (this.inventory.quickSwitch()) {
      if (window.gameInstance) {
        window.gameInstance.updateAmmoUI();
        window.gameInstance.updateWeaponUI();
      }
      return true;
    }
    return false;
  }

  getDamageMultiplier() {
    const wave = (this.game && this.game.wave) ? this.game.wave : (window.gameInstance && window.gameInstance.wave ? window.gameInstance.wave : 1);
    // Steady progressive damage scaling (+10% per wave):
    // Wave 1: 1.0x, Wave 2: 1.1x, Wave 3: 1.2x, Wave 5: 1.4x, Wave 10: 1.9x
    return 1.0 + Math.max(0, wave - 1) * 0.10;
  }

  refillAllAmmo() {
    this.inventory.refillAll();
  }

  update(dt, input, map, game) {
    if (!this.alive) return;

    // 1. Aim Direction (Mouse in World Coordinates)
    const aimWorldX = input.mouse.x + game.camera.x;
    const aimWorldY = input.mouse.y + game.camera.y;
    this.angle = Math.atan2(aimWorldY - this.y, aimWorldX - this.x);

    // 2. Dash Cooldown & Timer
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= dt;
    }
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= dt;
    }
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
    }

    // Acid Damage over Time (DoT): 3 seconds duration, 3 damage per second
    if (this.acidTimer > 0) {
      this.acidTimer -= dt;
      this.acidTickTimer = (this.acidTickTimer || 0) + dt;

      if (Math.random() < 0.35 && window.particleSystem) {
        window.particleSystem.emit(this.x + (Math.random() - 0.5) * 18, this.y + (Math.random() - 0.5) * 18, 1, {
          speed: 25,
          color: '#39ff14',
          life: 0.35,
          size: 2.5
        });
      }

      if (this.acidTickTimer >= 1.0) {
        this.acidTickTimer -= 1.0;
        this.hp = Math.max(0, this.hp - (this.acidDPS || 3));
        this.hurtTimer = 0.2;
        if (window.soundSystem && window.soundSystem.playPlayerHurt) {
          window.soundSystem.playPlayerHurt();
        }
        if (window.particleSystem) {
          window.particleSystem.emitDamageNumber(this.x, this.y - 14, `-${this.acidDPS || 3}`, false, '#39ff14');
          window.particleSystem.emit(this.x, this.y, 7, {
            speed: 65,
            color: '#39ff14',
            life: 0.35
          });
        }
        if (game && game.updateHUD) game.updateHUD();

        if (this.hp <= 0 && this.alive) {
          if (game && game.handlePlayerDeath) {
            game.handlePlayerDeath('ACID_POISON');
          } else {
            this.alive = false;
          }
        }
      }
    }

    // Update Expressive Hero Animation Timers
    this.animTimer = (this.animTimer || 0) + dt;
    this.blinkTimer = (this.blinkTimer || 2.5) - dt;
    if (this.blinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.blinkTimer = 2.5 + Math.random() * 2.5;
      } else {
        this.isBlinking = true;
        this.blinkTimer = 0.14; // Quick cute natural blink
      }
    }

    if (this.isDashing) {
      this.dashTimer -= dt;

      // Sub-stepped dash movement (max 8px per step) to strictly prevent tunneling through thin walls
      const totalDashDist = this.dashSpeed * dt;
      const stepDist = 8;
      const steps = Math.max(1, Math.ceil(totalDashDist / stepDist));
      const stepX = (Math.cos(this.dashAngle) * totalDashDist) / steps;
      const stepY = (Math.sin(this.dashAngle) * totalDashDist) / steps;

      for (let s = 0; s < steps; s++) {
        this.x += stepX;
        map.resolveCircleCollision(this);
        this.y += stepY;
        map.resolveCircleCollision(this);
      }

      // Spawn Ghost Trail
      if (Math.random() > 0.3) {
        this.ghostTrails.push({
          x: this.x,
          y: this.y,
          angle: this.angle,
          alpha: 0.6,
          life: 0.25
        });
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Normal Omni-Directional Movement (WASD)
      let moveX = 0;
      let moveY = 0;
      if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

      // Normalize diagonal speed
      if (moveX !== 0 && moveY !== 0) {
        const invLen = 1 / Math.SQRT2;
        moveX *= invLen;
        moveY *= invLen;
      }

      this.isMoving = moveX !== 0 || moveY !== 0;

      // Accelerate / Friction
      if (this.isMoving) {
        this.vx += moveX * this.accel * dt;
        this.vy += moveY * this.accel * dt;
        const currentSpd = Math.hypot(this.vx, this.vy);
        if (currentSpd > this.baseSpeed) {
          this.vx = (this.vx / currentSpd) * this.baseSpeed;
          this.vy = (this.vy / currentSpd) * this.baseSpeed;
        }
        this.walkCycle += dt * 14;
      } else {
        const currentSpd = Math.hypot(this.vx, this.vy);
        if (currentSpd > 0) {
          const drop = this.friction * dt;
          const newSpd = Math.max(0, currentSpd - drop);
          this.vx = (this.vx / currentSpd) * newSpd;
          this.vy = (this.vy / currentSpd) * newSpd;
        }
      }

      // Check Dash Input (Space)
      if (input.keys['Space'] && this.dashCooldownTimer <= 0 && this.isMoving) {
        this.startDash(Math.atan2(this.vy, this.vx));
      }

      // Axis-Decoupled Movement with wall sliding (prevents corner traps and sticky geometry)
      this.x += this.vx * dt;
      if (map.resolveCircleCollision(this)) {
        this.vx *= 0.1;
      }

      this.y += this.vy * dt;
      if (map.resolveCircleCollision(this)) {
        this.vy *= 0.1;
      }
    }

    // Resolve Solid Body Collisions against Alive Enemies (distributed pushback)
    if (game && game.enemies) {
      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const edist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
        const minDist = this.radius + enemy.radius;
        if (edist < minDist && edist > 0.0001) {
          const push = minDist - edist;
          const nx = (this.x - enemy.x) / edist;
          const ny = (this.y - enemy.y) / edist;

          // Repel both player and enemy mutually so player isn't crushed through walls
          this.x += nx * (push * 0.5);
          this.y += ny * (push * 0.5);
          enemy.x -= nx * (push * 0.5);
          enemy.y -= ny * (push * 0.5);
          map.resolveCircleCollision(enemy);
        }
      }
      map.resolveCircleCollision(this);
    }

    // Fail-safe Ground Check & Auto-Unstuck Recovery
    if (!map.isColliding(this.x, this.y, this.radius)) {
      this.lastSafeX = this.x;
      this.lastSafeY = this.y;
      this.stuckTimer = 0;
    } else {
      this.stuckTimer = (this.stuckTimer || 0) + dt;
      if (this.stuckTimer > 0.05) {
        // Automatically rescue player out of obstacle
        map.unstuckEntity(this);
        this.stuckTimer = 0;
      }
    }

    // 3. Update Dash Ghost Trails
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      const g = this.ghostTrails[i];
      g.life -= dt;
      g.alpha = Math.max(0, g.life / 0.25);
      if (g.life <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }

    // 4. Weapon Timers & Inventory Reloads
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= dt;

    // Recoil recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dt * 48);
    }

    // Reload handling through inventory
    this.inventory.update(dt, () => {
      game.updateAmmoUI();
      game.updateWeaponUI();
    });

    // Auto-reload immediately when weapon clip is empty without needing to shoot again
    if (this.currentWeapon.ammo <= 0 && !this.currentWeapon.isReloading) {
      this.startReload();
    }

    // Manual reload on R key
    if (input.keys['KeyR'] && this.ammo < this.magSize && !this.isReloading) {
      this.startReload();
    }

    // Shooting Action (Left Mouse)
    if (input.mouse.down && !this.isDashing) {
      this.shoot(game);
    }
  }

  startDash(angle) {
    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;
    this.invulnerableTime = this.dashDuration + 0.05;
    this.dashAngle = angle;
    window.soundSystem.playDash();
    window.particleSystem.emit(this.x, this.y, 12, {
      angle: angle + Math.PI,
      spread: 0.8,
      speed: 160,
      color: '#00f0ff',
      life: 0.25
    });
  }

  startReload() {
    if (this.inventory.startReload()) {
      if (window.gameInstance) {
        window.gameInstance.updateAmmoUI();
        window.gameInstance.updateWeaponUI();
      }
    }
  }

  shoot(game) {
    if (this.fireTimer > 0) return;
    const w = this.inventory.current;

    if (w.ammo <= 0) {
      if (!w.isReloading) {
        this.startReload();
      } else {
        window.soundSystem.playDryFire();
        this.fireTimer = 0.25;
      }
      return;
    }

    // Consume ammo
    w.ammo--;
    this.fireTimer = w.fireRate;
    this.muzzleFlashTimer = 0.06;
    this.recoilOffset = w.recoil;

    // Immediately trigger auto-reload when the last bullet is fired
    if (w.ammo === 0 && !w.isReloading) {
      this.startReload();
    }

    // Dynamic gun forward offset based on weapon profile
    let gunForward = 36;
    let gunRight = 8;
    if (w.id === 'railgun') gunForward = 50;
    else if (w.id === 'smg') gunForward = 32;

    const muzzleX = this.x + Math.cos(this.angle) * gunForward - Math.sin(this.angle) * gunRight;
    const muzzleY = this.y + Math.sin(this.angle) * gunForward + Math.cos(this.angle) * gunRight;

    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const spread = (Math.random() - 0.5) * (w.spread || 0.04) * 2;
      const fireAngle = this.angle + spread;

      // In multiplayer, weapon styling is kept, but each operative fires bullets matching their own chosen color!
      const isMultiplayer = game && game.gameMode === 'multiplayer';
      const bulletColor = isMultiplayer ? (this.color || (this.skin && this.skin.color) || w.color) : w.color;
      const bulletGlow = isMultiplayer ? bulletColor : (w.glowColor || w.color);

      const dmgMult = this.getDamageMultiplier();
      const scaledDamage = Math.round(w.damage * dmgMult);
      const scaledSplash = w.splashDamage ? Math.round(w.splashDamage * dmgMult) : 0;

      const bullet = new Bullet(muzzleX, muzzleY, fireAngle, {
        speed: w.speed,
        damage: scaledDamage,
        range: w.range,
        radius: w.bulletRadius,
        color: bulletColor,
        glowColor: bulletGlow,
        weaponType: w.id,
        penetrating: w.penetrating,
        maxPenetrations: w.maxPenetrations,
        explosive: w.explosive,
        splashDamage: scaledSplash,
        blastRadius: w.blastRadius,
        screenShake: w.screenShake,
        shooterId: game.localPlayerId || null,
        shooterTeam: this.team || (game.network ? game.network.myTeam : null)
      });
      bullet.shooterTeam = this.team || (game.network ? game.network.myTeam : null);

      game.bullets.push(bullet);

      // Network emit for projectile
      if (game.network) {
        game.network.emitShoot(
          muzzleX,
          muzzleY,
          fireAngle,
          bullet.isCritical,
          bullet.damage,
          bulletColor,
          w.id,
          w.speed,
          w.range,
          w.bulletRadius,
          w.penetrating,
          w.explosive,
          w.splashDamage,
          w.blastRadius
        );
      }
    }

    game.shotsFired++;

    // Audio & FX
    const isMultiplayer = game && game.gameMode === 'multiplayer';
    const flashColor = isMultiplayer ? (this.color || w.color) : w.color;
    window.soundSystem.playWeaponShoot(w.id);
    window.particleSystem.emitMuzzleFlash(muzzleX, muzzleY, this.angle, flashColor);
    window.particleSystem.ejectShell(this.x, this.y, this.angle);
    game.addScreenShake(w.screenShake);

    game.updateAmmoUI();
    game.updateWeaponUI();
  }

  takeDamage(amount, game = window.gameInstance || window.gameEngine, source = 'COMBAT') {
    if (this.invulnerableTime > 0 || !this.alive) return;

    // Vulcan skin passive perk: 30% blast damage reduction
    if (this.skin && this.skin.id === 'vulcan' && (source === 'SELF-ORDNANCE' || source === 'EXPLOSIVE')) {
      amount = Math.round(amount * 0.7);
    }

    this.hp -= amount;
    this.invulnerableTime = 0.35;
    this.hurtTimer = 0.25;
    window.soundSystem.playPlayerHurt();
    window.particleSystem.emitBlood(this.x, this.y, this.angle + Math.PI, 14);

    const activeGame = game || window.gameInstance || window.gameEngine;

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      if (activeGame && typeof activeGame.handlePlayerDeath === 'function') {
        activeGame.handlePlayerDeath(source);
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();

    // 1. Draw Dash Ghost Trails
    for (const g of this.ghostTrails) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.globalAlpha = g.alpha * 0.45;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Position & Rotation for Player Entity
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Hurt flash indicator (flashes red/white)
    if (this.hurtTimer > 0) {
      ctx.shadowColor = '#ff1a40';
      ctx.shadowBlur = 22;
    }

    const activeW = this.inventory.current;

    // 3. Render the High-Fidelity Living Operative Character
    drawOperativeModel(ctx, this.skin, activeW.id, 0, 1.0, {
      animTimer: this.animTimer,
      isMoving: this.isMoving,
      walkCycle: this.walkCycle,
      isShooting: this.fireTimer > 0 || this.muzzleFlashTimer > 0,
      isReloading: this.isReloading,
      isHurt: this.hurtTimer > 0,
      isBlinking: this.isBlinking,
      recoilOffset: this.recoilOffset,
      modelType: this.modelType || (this.skin && this.skin.modelType) || 'commando',
      color: this.color
    });

    // Acid Biohazard Aura if suffering from toxic burn
    if (this.acidTimer > 0) {
      ctx.save();
      const acidPulse = Math.sin(Date.now() * 0.012) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(57, 255, 20, ${0.4 + acidPulse * 0.4})`;
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 10 * acidPulse;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Laser Sight Projector (Color tailored to active weapon)
    ctx.save();
    ctx.strokeStyle = activeW.color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = activeW.id === 'railgun' ? 1.5 : 1;
    ctx.setLineDash(activeW.id === 'railgun' ? [6, 2] : [4, 4]);
    ctx.beginPath();
    const laserStart = activeW.id === 'railgun' ? 50 : 38;
    const laserLength = activeW.id === 'railgun' ? 620 : (activeW.id === 'shotgun' ? 240 : 420);
    ctx.moveTo(laserStart, 8);
    ctx.lineTo(laserLength, 8);
    ctx.stroke();
    ctx.restore();

    // 5. Muzzle Flash Flare
    if (this.muzzleFlashTimer > 0) {
      ctx.save();
      const flashX = activeW.id === 'railgun' ? 52 : (activeW.id === 'smg' ? 34 : 40);
      ctx.translate(flashX, 8);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = activeW.color;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, activeW.id === 'shotgun' ? 14 : 10, 0, Math.PI * 2);
      ctx.fill();

      // Starburst rays
      ctx.strokeStyle = activeW.color;
      ctx.lineWidth = 2.5;
      const rayCount = activeW.id === 'shotgun' ? 6 : 4;
      for (let i = 0; i < rayCount; i++) {
        const a = (i * Math.PI) / (rayCount / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * (activeW.id === 'shotgun' ? 24 : 18), Math.sin(a) * (activeW.id === 'shotgun' ? 24 : 18));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Force Field Shield (Invulnerability grace on spawn/respawn)
    if (this.invulnerableTime > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.06;
      const visorCol = (this.skin && this.skin.visorColor) || this.color;
      ctx.strokeStyle = visorCol;
      ctx.shadowColor = visorCol;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, (this.radius + 6) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}

// Master Operative Visual Model Dispatcher (Swappable Chassis & Silhouette Skins)
function drawOperativeModel(ctx, skin, weaponId = 'rifle', angle = 0, scale = 1.0, options = {}) {
  const modelType = (options && options.modelType) || (skin && (skin.modelType || skin.id)) || 'commando';
  if (modelType === 'wheel' || modelType === 'cyborg' || modelType === 'vulcan') {
    return drawOperativeWheel(ctx, skin, weaponId, angle, scale, options);
  } else if (modelType === 'blade' || modelType === 'triangle' || modelType === 'venom') {
    return drawOperativeHoverBlade(ctx, skin, weaponId, angle, scale, options);
  } else if (modelType === 'phantom' || modelType === 'ghost' || modelType === 'vortex') {
    return drawOperativePhantom(ctx, skin, weaponId, angle, scale, options);
  } else {
    return drawOperativeCommando(ctx, skin, weaponId, angle, scale, options);
  }
}

window.drawTacticalWeapon = drawTacticalWeapon;
window.drawOperativeModel = drawOperativeModel;
window.drawOperativeWheel = drawOperativeWheel;
window.drawOperativeCommando = drawOperativeCommando;
window.drawOperativeHoverBlade = drawOperativeHoverBlade;
window.drawOperativePhantom = drawOperativePhantom;
window.Player = Player;


function drawOperativeWheel(ctx, skin, weaponId = 'rifle', angle = 0, scale = 1.0, options = {}) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(angle);

  const t = (options && options.animTimer !== undefined) ? options.animTimer : (performance.now() * 0.001);
  const isMoving = !!(options && options.isMoving);
  const walkCycle = (options && options.walkCycle !== undefined) ? options.walkCycle : 0;
  const isShooting = !!(options && options.isShooting);
  const isReloading = !!(options && options.isReloading);
  const isHurt = !!(options && options.isHurt);
  const recoilOffset = (options && options.recoilOffset !== undefined) ? options.recoilOffset : 0;

  const pCol = (options && options.color) || (skin && skin.color) || '#00f0ff';
  const suitCol = '#0d131f';
  const armorCol = '#1e293b';
  const metalCol = '#334155';
  const visorCol = (options && options.color) || (skin && skin.visorColor) || pCol;

  // ۱. سایه زیر چرخ متحرک
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ۲. سیستم چرخ جنگی سایبرنتیک (متحرک و دارای پره‌های چرخان در هنگام حرکت)
  ctx.save();
  ctx.translate(-4, 0); // قرارگیری در زیر بدنه

  // بازوی اتصال چرخ به بدنه
  ctx.fillStyle = metalCol;
  ctx.fillRect(-4, -5, 8, 10);

  // بدنه اصلی چرخ (Omni-Wheel / Combat Roller)
  const wheelGrad = ctx.createLinearGradient(-8, -12, 8, 12);
  wheelGrad.addColorStop(0, '#475569');
  wheelGrad.addColorStop(0.5, '#1e293b');
  wheelGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = wheelGrad;
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 28, 8);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // پره‌های داخلی چرخ که هنگام حرکت با walkCycle می‌چرخند
  ctx.save();
  if (isMoving) {
    ctx.rotate(walkCycle * 2.5);
  }
  ctx.strokeStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const angleOffset = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, angleOffset, angleOffset + 0.8);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // هسته مرکزی چرخ و هاله نورانی کف
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore(); // پایان چرخ

  // ۳. اعمال لگد شلیک (Recoil) روی نیم‌تنه بالا
  ctx.save();
  ctx.translate(-recoilOffset, 0);

  // ۴. کوله‌پشتی موتور جت پلاسمایی با هیت‌سینک‌های دوقلو
  ctx.save();
  ctx.translate(-15, 0);
  
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-6, -11, 10, 22, 3);
  ctx.fill();
  ctx.strokeStyle = metalCol;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 8;
  ctx.fillRect(-7, -8, 2, 4);
  ctx.fillRect(-7, 4, 2, 4);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-6, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore(); // پایان موتور جت

  // ۵. رندر سلاح تاکتیکی
  drawTacticalWeapon(ctx, weaponId, pCol, false, {
    animTimer: t,
    isFiring: isShooting,
    isReloading: isReloading
  });

  // ۶. بازوهای مکانیکی مفصلی با شانه‌های هیت‌سینک‌دار
  ctx.fillStyle = metalCol;
  ctx.beginPath();
  ctx.roundRect(6, -13, 11, 6, 2);
  ctx.roundRect(8, 7, 11, 6, 2);
  ctx.fill();

  ctx.fillStyle = armorCol;
  ctx.fillRect(13, 8, 7, 5);
  ctx.fillRect(11, -11, 7, 5);

  // ۷. بدنه زرهی اصلی هشت‌ضلعی (Modular Exo-Chassis Core)
  const bodyGrad = ctx.createLinearGradient(-14, -14, 14, 14);
  bodyGrad.addColorStop(0, '#2b394f');
  bodyGrad.addColorStop(0.5, suitCol);
  bodyGrad.addColorStop(1, '#090e17');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(-6, -14);
  ctx.lineTo(8, -14);
  ctx.lineTo(14, -6);
  ctx.lineTo(14, 6);
  ctx.lineTo(8, 14);
  ctx.lineTo(-6, 14);
  ctx.lineTo(-14, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = metalCol;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // راکتور اتمی مرکزی با پالس نئونی
  const corePulse = Math.sin(t * 6) * 4 + 8;
  ctx.fillStyle = '#090e17';
  ctx.beginPath();
  ctx.arc(-2, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = corePulse;
  ctx.beginPath();
  ctx.arc(-2, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ۸. کلاه‌خود خلبانی پیشرفته با رینگ هولوگرافیک و گوی شیشه‌ای متحرک
  ctx.save();
  ctx.translate(-1, 0);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = metalCol;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // رینگ هولوگرافیک دور کلاه (چرخان)
  ctx.save();
  ctx.rotate(t * 2);
  ctx.strokeStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(2, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // ۹. سیستم چشم‌ها و واکنش‌های دیجیتالی خلبان داخل گوی
  ctx.save();
  ctx.fillStyle = visorCol;
  ctx.shadowColor = visorCol;
  ctx.shadowBlur = 12;

  if (isHurt) {
    ctx.strokeStyle = visorCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -3); ctx.lineTo(4, 1);
    ctx.moveTo(4, -3); ctx.lineTo(0, 1);
    ctx.stroke();
  } else if (isReloading) {
    ctx.save();
    ctx.translate(2, 0);
    ctx.rotate(t * 15);
    ctx.strokeStyle = visorCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  } else if (isShooting) {
    ctx.fillRect(-1, -2.5, 6, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, -2, 2, 1);
  } else {
    ctx.beginPath();
    ctx.arc(2, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, -0.8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // پایان چشم‌ها
  ctx.restore(); // پایان کلاه‌‌خود

  ctx.restore(); // پایان لگد شلیک
  ctx.restore(); // پایان ریشه مدل
}

function drawOperativeCommando(ctx, skin, weaponId = 'rifle', angle = 0, scale = 1.0, options = {}) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(angle);

  const t = (options && options.animTimer !== undefined) ? options.animTimer : (performance.now() * 0.001);
  const isMoving = !!(options && options.isMoving);
  const walkCycle = (options && options.walkCycle !== undefined) ? options.walkCycle : 0;
  const isShooting = !!(options && options.isShooting);
  const isReloading = !!(options && options.isReloading);
  const isHurt = !!(options && options.isHurt);
  const isBlinking = !!(options && options.isBlinking);
  const recoilOffset = (options && options.recoilOffset !== undefined) ? options.recoilOffset : 0;

  // Colors with robust skin defaults
  const pCol = (options && options.color) || (skin && skin.color) || '#00f0ff';
  const suitCol = (skin && skin.suitColor) || '#1d2836';
  const armorCol = (skin && skin.armorColor) || '#2d3d52';
  const trimCol = (skin && skin.trimColor) || '#0f1722';
  const helmetCol = (skin && skin.helmetColor) || '#0f1724';
  const visorCol = (options && options.color) || (skin && skin.visorColor) || pCol;
  const visorShape = (skin && skin.visorShape) || 'visor';

  // Idle Breath & Head Bob
  const breath = Math.sin(t * 3.2) * 0.035;
  const headBob = Math.sin(t * 3.2) * 0.5;

  // 1. Drop Shadow (Soft ambient contact shadow)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 16.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. چرخ جنگی سایبرنتیک جایگزین پاها (Combat Roller Wheel)
  ctx.save();
  ctx.translate(-4, 0);

  // بازوی اتصال چرخ به بدنه
  ctx.fillStyle = '#334155';
  ctx.fillRect(-4, -5, 8, 10);

  // بدنه اصلی چرخ
  const wheelGrad = ctx.createLinearGradient(-8, -12, 8, 12);
  wheelGrad.addColorStop(0, '#475569');
  wheelGrad.addColorStop(0.5, '#1e293b');
  wheelGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = wheelGrad;
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 28, 8);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // پره‌های داخلی چرخ که هنگام حرکت می‌چرخند
  ctx.save();
  if (isMoving) {
    ctx.rotate(walkCycle * 2.5);
  }
  ctx.strokeStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const angleOffset = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, angleOffset, angleOffset + 0.8);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // هسته مرکزی و هاله نورانی دور چرخ
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore(); // پایان چرخ

  // Apply Recoil translation for upper body and weapon
  ctx.save();
  ctx.translate(-recoilOffset, 0);

  // 3. Cute Chibi Tech-Backpack & Reactor Pod (Attached to back)
  ctx.save();
  ctx.translate(-13, 0);

  // Backpack Shell
  const bpGrad = ctx.createLinearGradient(-7, -9, 4, 9);
  bpGrad.addColorStop(0, '#1f2937');
  bpGrad.addColorStop(0.6, '#111827');
  bpGrad.addColorStop(1, '#030712');
  ctx.fillStyle = bpGrad;
  ctx.beginPath();
  ctx.roundRect(-6, -8, 9, 16, 3);
  ctx.fill();

  // Backpack Trim / Rim
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Micro Thruster Nozzles on top and bottom of backpack
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(-8.5, -6.5, 3, 3.2);
  ctx.fillRect(-8.5, 3.3, 3, 3.2);
  ctx.fillStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 4;
  ctx.fillRect(-9, -5.5, 1.2, 1.4);
  ctx.fillRect(-9, 4.3, 1.2, 1.4);
  ctx.shadowBlur = 0;

  // Luminous Battery Gauge
  for (let b = 0; b < 3; b++) {
    ctx.fillStyle = pCol;
    ctx.shadowColor = pCol;
    ctx.shadowBlur = 4;
    ctx.fillRect(-3, -5 + b * 4, 3.5, 2.2);
  }
  ctx.shadowBlur = 0;

  // Wobbly Spring Antenna with glowing tip
  const antennaWobble = Math.sin(walkCycle * 0.9 + t * 4) * 0.28 + (isShooting ? (Math.random() - 0.5) * 0.4 : 0);
  ctx.save();
  ctx.translate(-3, -7);
  ctx.rotate(-0.4 + antennaWobble);
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-2, -5, -4, -11);
  ctx.stroke();
  const orbBlink = Math.sin(t * 8) > 0;
  ctx.fillStyle = orbBlink ? '#ffffff' : pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(-4, -11, 2.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.restore(); // end backpack

  // 4. Stylized Tactical Weapon
  drawTacticalWeapon(ctx, weaponId, pCol, false, {
    animTimer: t,
    isFiring: isShooting,
    isReloading: isReloading
  });

  // 5. Stylized Chunky Arms and Padded Gloves
  ctx.fillStyle = suitCol;
  ctx.beginPath();
  ctx.ellipse(14, 8, 8, 5.2, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(8, -6, 8, 5.5, 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = trimCol;
  ctx.beginPath();
  ctx.roundRect(19, 5.5, 6.5, 6, 2.5);
  ctx.fill();
  ctx.fillStyle = armorCol;
  ctx.fillRect(20, 6.5, 2.2, 4);

  ctx.fillStyle = trimCol;
  ctx.beginPath();
  ctx.roundRect(15, -6.5, 6.5, 6, 2.5);
  ctx.fill();
  ctx.fillStyle = armorCol;
  ctx.fillRect(16, -5.5, 2.2, 4);

  ctx.fillStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 5;
  ctx.fillRect(12, -7.5, 2.5, 1.4);
  ctx.shadowBlur = 0;

  // 6. Streetwear Cyber Bomber Jacket
  ctx.save();
  ctx.scale(1.0 + breath, 1.0 + breath * 0.5);

  const jacketGrad = ctx.createRadialGradient(-2, 0, 4, -2, 0, 16);
  jacketGrad.addColorStop(0, armorCol);
  jacketGrad.addColorStop(0.7, suitCol);
  jacketGrad.addColorStop(1, trimCol);
  ctx.fillStyle = jacketGrad;
  ctx.beginPath();
  ctx.ellipse(-2, 0, 15.5, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = armorCol;
  ctx.beginPath();
  ctx.arc(-5, 0, 10, -Math.PI / 1.8, Math.PI / 1.8);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = suitCol;
  ctx.stroke();

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-1, -8);
  ctx.lineTo(6, -4);
  ctx.stroke();

  ctx.fillStyle = trimCol;
  ctx.beginPath();
  ctx.roundRect(-4, -12, 6, 3.5, 1.2);
  ctx.roundRect(-4, 8.5, 6, 3.5, 1.2);
  ctx.fill();

  ctx.fillStyle = pCol;
  ctx.fillRect(-2, -11.5, 2, 1);
  ctx.fillRect(-2, 9.5, 2, 1);

  ctx.restore(); // end jacket scale

  // 7. Oversized Gamer / Cyber Headset Ear Cups
  const drawEarCup = (cupY) => {
    ctx.save();
    ctx.translate(-2, cupY);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-3.5, -2.5, 7, 5, 2);
    ctx.fill();
    ctx.strokeStyle = pCol;
    ctx.shadowColor = pCol;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-2.5, -1.8, 5, 3.6);
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  drawEarCup(-10);
  drawEarCup(10);

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, 9);
  ctx.quadraticCurveTo(4, 9, 6, 5);
  ctx.stroke();
  ctx.fillStyle = pCol;
  ctx.beginPath();
  ctx.arc(6, 5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // 8. Head / Cyber Cap Base
  ctx.save();
  ctx.translate(-2 + headBob * 0.3, 0);

  const headGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 9);
  headGrad.addColorStop(0, '#1e293b');
  headGrad.addColorStop(0.8, helmetCol);
  headGrad.addColorStop(1, '#020617');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 9.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0b0f19';
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, -Math.PI / 3, Math.PI / 3);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fill();

  // 9. LIVING EXPRESSIVE DIGITAL FACE / VISOR
  const visorGrad = ctx.createLinearGradient(1, -6, 8, 6);
  visorGrad.addColorStop(0, '#0a101d');
  visorGrad.addColorStop(0.5, '#050811');
  visorGrad.addColorStop(1, '#020408');
  ctx.fillStyle = visorGrad;
  ctx.beginPath();
  ctx.arc(2, 0, 6.8, -Math.PI / 2.3, Math.PI / 2.3);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(2, 0, 5.8, -Math.PI / 3, -Math.PI / 8);
  ctx.stroke();

  // --- Dynamic Expressive Eyes Rendering ---
  ctx.save();
  ctx.fillStyle = visorCol;
  ctx.shadowColor = visorCol;
  ctx.shadowBlur = 8;

  if (isHurt) {
    ctx.strokeStyle = visorCol;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, -4); ctx.lineTo(6, -2.5); ctx.lineTo(3, -1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, 1); ctx.lineTo(6, 2.5); ctx.lineTo(3, 4);
    ctx.stroke();
  } else if (isBlinking) {
    ctx.fillRect(3.5, -3.8, 4, 1.2);
    ctx.fillRect(3.5, 2.6, 4, 1.2);
  } else if (isReloading) {
    const spinA = t * 12;
    ctx.save();
    ctx.translate(5, -2);
    ctx.rotate(spinA);
    ctx.strokeStyle = visorCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(5, 2);
    ctx.rotate(-spinA);
    ctx.strokeStyle = visorCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  } else if (isShooting) {
    ctx.beginPath();
    ctx.moveTo(3, -4.2); ctx.lineTo(7, -2.5); ctx.lineTo(4, -1.8); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 4.2); ctx.lineTo(7, 2.5); ctx.lineTo(4, 1.8); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5.5, -2.8, 1.2, 1.2);
    ctx.fillRect(5.5, 1.6, 1.2, 1.2);
  } else {
    if (visorShape === 'cyclops') {
      ctx.beginPath();
      ctx.arc(5, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, -0.6, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(5, -2.8, 2.2, 2.8, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, 2.8, 2.2, 2.8, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5.8, -3.4, 1.1, 0, Math.PI * 2);
      ctx.arc(5.8, 2.2, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end eyes
  ctx.restore(); // end head

  ctx.restore(); // end recoil translate
  ctx.restore(); // end model root save
}

function drawOperativeHoverBlade(ctx, skin, weaponId = 'rifle', angle = 0, scale = 1.0, options = {}) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(angle);

  const t = (options && options.animTimer !== undefined) ? options.animTimer : (performance.now() * 0.001);
  const isMoving = !!(options && options.isMoving);
  const walkCycle = (options && options.walkCycle !== undefined) ? options.walkCycle : 0;
  const isShooting = !!(options && options.isShooting);
  const isReloading = !!(options && options.isReloading);
  const isHurt = !!(options && options.isHurt);
  const recoilOffset = (options && options.recoilOffset !== undefined) ? options.recoilOffset : 0;

  const pCol = (options && options.color) || (skin && skin.color) || '#00f0ff';
  const armorCol = '#151922';
  const trimCol = '#0a0d14';
  const visorCol = (options && options.color) || (skin && skin.visorColor) || pCol;

  // ۱. سایه تیز زیرپایی متناسب با هندسه جدید
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ۲. پایه‌های هاور-تیغه ای تیز (Hover-Blades) به جای پاها و چرخ
  ctx.save();
  const bladeSway = isMoving ? Math.sin(walkCycle * 2.5) * 5 : 0;
  ctx.fillStyle = '#1e232d';
  ctx.strokeStyle = pCol;
  ctx.lineWidth = 1.5;

  // تیغه چپ
  ctx.save();
  ctx.translate(-4, -13 + bladeSway);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(14, -5); ctx.lineTo(5, 5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // تیغه راست
  ctx.save();
  ctx.translate(-4, 13 - bladeSway);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(14, 5); ctx.lineTo(5, -5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.restore(); // پایان تیغه‌های حرکتی

  // ۳. اعمال لگد شلیک (Recoil) روی بالاتنه
  ctx.save();
  ctx.translate(-recoilOffset, 0);

  // ۴. کوله‌پشتی مثلثی و تیز (Blade Wings)
  ctx.save();
  ctx.translate(-15, 0);
  ctx.fillStyle = trimCol;
  ctx.beginPath();
  ctx.moveTo(0, -11); ctx.lineTo(-9, 0); ctx.lineTo(0, 11); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pCol;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ۵. رندر سلاح تاکتیکی
  drawTacticalWeapon(ctx, weaponId, pCol, false, {
    animTimer: t,
    isFiring: isShooting,
    isReloading: isReloading
  });

  // ۶. بازوهای هندسی زاویه‌دار و تیز
  ctx.fillStyle = '#222836';
  ctx.beginPath();
  ctx.moveTo(8, -15); ctx.lineTo(19, -10); ctx.lineTo(15, -5); ctx.closePath();
  ctx.moveTo(8, 15); ctx.lineTo(19, 10); ctx.lineTo(15, 5); ctx.closePath();
  ctx.fill();

  // ۷. بدنه اصلی (Core Armor - هندسه لوزی‌شکل و زاویه‌دار تهاجمی)
  const bodyGrad = ctx.createLinearGradient(-16, -14, 16, 14);
  bodyGrad.addColorStop(0, '#252e3f');
  bodyGrad.addColorStop(0.5, armorCol);
  bodyGrad.addColorStop(1, trimCol);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-17, 0);
  ctx.lineTo(0, -13);
  ctx.lineTo(17, 0);
  ctx.lineTo(0, 13);
  ctx.closePath();
  ctx.fill();
  
  // لبه‌های نورانی بدنه
  ctx.strokeStyle = pCol;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // هسته مرکزی لوزی‌شکل درخشان
  ctx.fillStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(2, -4.5); ctx.lineTo(2, 4.5); ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // ۸. کلاه‌خود زاویه‌دار و تیز (Shard Helmet)
  ctx.save();
  ctx.translate(-2, 0);
  ctx.fillStyle = '#0b0f17';
  ctx.beginPath();
  ctx.moveTo(-11, -9);
  ctx.lineTo(5, -12);
  ctx.lineTo(13, 0);
  ctx.lineTo(5, 12);
  ctx.lineTo(-11, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#333d52';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // وایزور خطی بسیار باریک و تهاجمی (Laser Slit Visor)
  ctx.fillStyle = visorCol;
  ctx.shadowColor = visorCol;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(5, -5.5);
  ctx.lineTo(11, -1.5);
  ctx.lineTo(11, 1.5);
  ctx.lineTo(5, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // ۹. واکنش‌های چهره درون وایزور تیز
  ctx.save();
  ctx.fillStyle = '#ffffff';

  if (isHurt) {
    // دمیج: خط عمودی درد
    ctx.fillRect(7, -3.5, 2, 7);
  } else if (isReloading) {
    // ریلود: اسکنر نوری متحرک
    const scanOffset = Math.sin(t * 18) * 1.5;
    ctx.fillRect(7 + scanOffset, -3, 2, 6);
  } else if (isShooting) {
    // شلیک: تمرکز تهاجمی
    ctx.fillRect(8, -2.5, 2, 5);
  } else {
    // حالت عادی: دیده‌بان تیزبین
    ctx.fillRect(7.5, -2, 2, 4);
  }

  ctx.restore(); // پایان بخش چشم‌ها
  ctx.restore(); // پایان کلاه‌خود

  ctx.restore(); // پایان لگد شلیک
  ctx.restore(); // پایان ریشه مدل
}


function drawOperativePhantom(ctx, skin, weaponId = 'rifle', angle = 0, scale = 1.0, options = {}) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(angle);

  const t = (options && options.animTimer !== undefined) ? options.animTimer : (performance.now() * 0.001);
  const isMoving = !!(options && options.isMoving);
  const walkCycle = (options && options.walkCycle !== undefined) ? options.walkCycle : 0;
  const isShooting = !!(options && options.isShooting);
  const isReloading = !!(options && options.isReloading);
  const isHurt = !!(options && options.isHurt);
  const recoilOffset = (options && options.recoilOffset !== undefined) ? options.recoilOffset : 0;

  const pCol = (options && options.color) || (skin && skin.color) || '#00f0ff';
  const visorCol = (options && options.color) || (skin && skin.visorColor) || pCol;

  // نوسان شناور و آرام در هوا (حالت روح‌گونه)
  const floatWave = Math.sin(t * 3) * 4;

  // ۱. هاله نورانی زیرین (حس حضور روح در فضا)
  ctx.save();
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 25;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ۲. رشته‌های انرژی پلاسما و ذرات محو شونده پایین بدن (Ghost Tail / Wisp)
  ctx.save();
  ctx.translate(-8, floatWave * 0.5);
  const wispGrad = ctx.createLinearGradient(-12, 0, 18, 0);
  wispGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  wispGrad.addColorStop(0.4, pCol);
  wispGrad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');

  ctx.fillStyle = wispGrad;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  // موج‌های سیال شبح‌وار
  ctx.bezierCurveTo(-10, -10 + Math.sin(t * 6) * 5, -25, -5 + Math.cos(t * 5) * 4, -30, 0);
  ctx.bezierCurveTo(-25, 5 + Math.sin(t * 5) * 4, -10, 10 + Math.cos(t * 6) * 5, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // اعمال لگد شلیک (Recoil) و شناوری روی بالاتنه
  ctx.save();
  ctx.translate(-recoilOffset, floatWave);

  // ۳. رندر سلاح با افکت نیمه‌شفاف و هاله انرژی شبح‌وار
  ctx.save();
  ctx.globalAlpha = 0.88;
  drawTacticalWeapon(ctx, weaponId, pCol, false, {
    animTimer: t,
    isFiring: isShooting,
    isReloading: isReloading
  });
  ctx.restore();

  // ۴. بازوهای هولوگرافیک و سیال (بدون زره یا فلز سنگین)
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = pCol;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  // بازوی راست (به سمت اسلحه)
  ctx.beginPath();
  ctx.moveTo(2, -4);
  ctx.quadraticCurveTo(8, 2, 14, 6);
  ctx.stroke();
  // بازوی چپ
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.quadraticCurveTo(8, -2, 12, -6);
  ctx.stroke();
  ctx.restore();

  // ۵. بدنه مرکزی روح (Core Aura - فرم ابری و انرژی‌محور بدون لبه‌های رباتیک)
  ctx.save();
  ctx.globalAlpha = 0.75;
  const coreGrad = ctx.createRadialGradient(-2, 0, 2, -2, 0, 16);
  coreGrad.addColorStop(0, pCol);
  coreGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.85)');
  coreGrad.addColorStop(1, 'rgba(2, 6, 23, 0.2)');
  ctx.fillStyle = coreGrad;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.ellipse(-2, 0, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // هسته درخشان مرکزی روح (قلب انرژی)
  const coreHeart = Math.sin(t * 5) * 6 + 10;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = pCol;
  ctx.shadowBlur = coreHeart;
  ctx.beginPath();
  ctx.arc(-2, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ۶. سر و صورت اتریومی (فقط هاله سر و ماسک نوری معلق بدون کلاه‌خود فیزیکی)
  ctx.save();
  ctx.translate(-1, 0);

  // هاله دور سر (Crown Aura)
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = pCol;
  ctx.shadowColor = pCol;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(1, 0, 8.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ۷. چشم‌ها و چهره شبح‌وار (شعله‌های نوری معلق در فضای تاریک)
  ctx.save();
  ctx.fillStyle = visorCol;
  ctx.shadowColor = visorCol;
  ctx.shadowBlur = 16;

  if (isHurt) {
    // حالت آسیب‌دیدگی روح: ارتعاش خطی نور
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -3); ctx.lineTo(7, 0); ctx.lineTo(2, 3);
    ctx.stroke();
  } else if (isReloading) {
    // حالت ریلود روح: حرکت رفت و برگشت ذرات نور
    const pX = Math.sin(t * 20) * 3 + 4;
    ctx.beginPath();
    ctx.arc(pX, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (isShooting) {
    // حالت شلیک: شعله‌های چشم تهاجمی کشیده
    ctx.beginPath();
    ctx.moveTo(3, -4.5); ctx.lineTo(8, -2); ctx.lineTo(4, -0.5); ctx.closePath();
    ctx.moveTo(3, 4.5); ctx.lineTo(8, 2); ctx.lineTo(4, 0.5); ctx.closePath();
    ctx.fill();
  } else {
    // حالت عادی (Idle): دو گوی نورانی معلق به عنوان چشم‌های روح
    ctx.beginPath();
    ctx.arc(5, -2.5, 2.0, 0, Math.PI * 2);
    ctx.arc(5, 2.5, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // هسته سفید چشم‌ها
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5.5, -2.5, 0.9, 0, Math.PI * 2);
    ctx.arc(5.5, 2.5, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // پایان چشم‌ها
  ctx.restore(); // پایان سر و هاله

  ctx.restore(); // پایان ترنسلیت لگد و شناوری
  ctx.restore(); // پایان ریشه مدل
}

