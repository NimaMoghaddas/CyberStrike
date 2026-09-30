/**
 * CYBER STRIKE // PLAYER OPERATIVE
 * Detailed top-down tactical character with customizable weapon arsenal,
 * laser aim sight, walking kinematics, recoil kick, and tactical dash.
 */

// Shared Tactical Weapon Renderer (used by both local and remote players)
function drawTacticalWeapon(ctx, weaponId, color, isLocal = false) {
  switch (weaponId) {
    case 'shotgun':
      // Heavy wide double barrel & pump
      ctx.fillStyle = '#141b24';
      ctx.fillRect(4, 3, 24, 9);
      // Twin barrels
      ctx.fillStyle = '#2c3545';
      ctx.fillRect(28, 4, 10, 3.2);
      ctx.fillRect(28, 8.2, 10, 3.2);
      // Pump forearm slider
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(14, 1.8, 9, 3);
      // Heat dissipation vent slats in amber
      ctx.fillStyle = '#ff9500';
      ctx.shadowColor = '#ff9500';
      ctx.shadowBlur = 6;
      ctx.fillRect(8, 5, 12, 1.8);
      ctx.shadowBlur = 0;
      break;

    case 'smg':
      // Compact receiver & curved mag
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, 4.5, 20, 6.5);
      // Ported flash muzzle
      ctx.fillStyle = '#334155';
      ctx.fillRect(26, 6, 6, 3.5);
      // Extended magazine
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(13, 10, 4, 8);
      // High-vis lime accent rail
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 6;
      ctx.fillRect(10, 4, 12, 1.5);
      ctx.shadowBlur = 0;
      break;

    case 'railgun':
      // Elongated electromagnetic rail frame
      ctx.fillStyle = '#0a0d18';
      ctx.fillRect(2, 4.5, 30, 6.5);
      // Supersonic accelerator barrel
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(32, 6, 18, 3.5);
      // 3 Magnetic induction coil fins
      ctx.fillStyle = '#b026ff';
      ctx.shadowColor = '#b026ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(14, 2, 3, 11.5);
      ctx.fillRect(22, 2, 3, 11.5);
      ctx.fillRect(30, 2, 3, 11.5);
      ctx.shadowBlur = 0;
      // Sniper scope module
      ctx.fillStyle = '#111827';
      ctx.fillRect(6, 1, 16, 3.5);
      ctx.fillStyle = '#d946ef';
      ctx.fillRect(20, 1.5, 2, 2.5);
      break;

    case 'cannon':
      // Heavy cylinder plasma launcher
      ctx.fillStyle = '#181216';
      ctx.fillRect(4, 2.5, 26, 10.5);
      // Massive reinforced muzzle shroud
      ctx.fillStyle = '#4c0519';
      ctx.fillRect(30, 3.5, 7, 8.5);
      // Plasma containment reactor core
      ctx.fillStyle = '#ff2a5f';
      ctx.shadowColor = '#ff2a5f';
      ctx.shadowBlur = 10;
      ctx.fillRect(10, 4.5, 14, 6.5);
      ctx.shadowBlur = 0;
      // Battery canister below
      ctx.fillStyle = '#881337';
      ctx.fillRect(10, 12, 8, 4.5);
      break;

    case 'rifle':
    default:
      // Classic tactical pulse rifle
      ctx.fillStyle = '#111824';
      ctx.fillRect(4, 5, 28, 6);
      ctx.fillStyle = '#374151';
      ctx.fillRect(32, 6.5, 8, 3);
      ctx.fillStyle = color || '#00f0ff';
      ctx.shadowColor = color || '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.fillRect(12, 4.5, 12, 1.5);
      ctx.shadowBlur = 0;
      break;
  }
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

  setSkin(skinId) {
    const skins = (typeof window !== 'undefined' && window.OPERATIVE_SKINS) || null;
    if (skins && skins[skinId]) {
      this.skin = skins[skinId];
      this.color = this.skin.color;
      return true;
    }
    return false;
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

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.x += Math.cos(this.dashAngle) * this.dashSpeed * dt;
      this.y += Math.sin(this.dashAngle) * this.dashSpeed * dt;

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

      // Apply Velocity
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // Resolve Map Wall & Barrier Collisions
    map.resolveCircleCollision(this);

    // Resolve Solid Body Collisions against Alive Enemies
    if (game && game.enemies) {
      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const edist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
        const minDist = this.radius + enemy.radius;
        if (edist < minDist && edist > 0.0001) {
          const push = minDist - edist;
          this.x += ((this.x - enemy.x) / edist) * push;
          this.y += ((this.y - enemy.y) / edist) * push;
        }
      }
      map.resolveCircleCollision(this);
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

      const bullet = new Bullet(muzzleX, muzzleY, fireAngle, {
        speed: w.speed,
        damage: w.damage,
        range: w.range,
        radius: w.bulletRadius,
        color: bulletColor,
        glowColor: bulletGlow,
        weaponType: w.id,
        penetrating: w.penetrating,
        maxPenetrations: w.maxPenetrations,
        explosive: w.explosive,
        splashDamage: w.splashDamage,
        blastRadius: w.blastRadius,
        screenShake: w.screenShake,
        shooterId: game.localPlayerId || null
      });

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

    // --- KINETIC DEFENSIVE KNOCKBACK REPULSION ---
    // Push surrounding hostiles back to a safe distance so the operative has room to maneuver and maintain control
    const activeGame = game || window.gameInstance || window.gameEngine;
    if (activeGame && activeGame.enemies && this.alive) {
      const repulseRadius = 320;
      for (const enemy of activeGame.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < repulseRadius) {
          const targetDist = 240;
          const pushForce = Math.max(180, targetDist - dist);
          const angle = dist > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
          enemy.x += Math.cos(angle) * pushForce;
          enemy.y += Math.sin(angle) * pushForce;
          enemy.attackTimer = Math.max(enemy.attackTimer || 0, 0.75); // Stagger attack
          if (activeGame.map) {
            activeGame.map.resolveCircleCollision(enemy);
          }
        }
      }

      // Defensive energy shockwave ripple
      if (window.particleSystem) {
        window.particleSystem.emit(this.x, this.y, 22, {
          speed: 260,
          color: this.color || '#00f0ff',
          life: 0.35
        });
      }
    }

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
      ctx.globalAlpha = g.alpha * 0.4;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Position & Rotation for Player Entity
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Apply recoil translation along gun axis
    ctx.translate(-this.recoilOffset, 0);

    // Hurt flash indicator (flashes red/white)
    if (this.hurtTimer > 0) {
      ctx.shadowColor = '#ff1a40';
      ctx.shadowBlur = 20;
    }

    // 3. Drop Shadow under character
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Moving Legs (Animated walking sway)
    const legSway = Math.sin(this.walkCycle) * 7;
    const bootsCol = (this.skin && this.skin.bootsColor) || '#1c2430';
    ctx.fillStyle = bootsCol;
    ctx.fillRect(-12, -10 + legSway, 12, 6);
    ctx.fillRect(-12, 4 - legSway, 12, 6);

    const activeW = this.inventory.current;

    // 5. Stylized Tactical Weapon
    drawTacticalWeapon(ctx, activeW.id, activeW.color, true);

    // 6. Arms and Hands
    const sleeveCol = (this.skin && this.skin.suitColor) || '#2b394a';
    ctx.fillStyle = sleeveCol;
    ctx.beginPath();
    ctx.ellipse(8, -6, 7, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, 8, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Hands / Tactical Gloves
    ctx.fillStyle = (this.skin && this.skin.trimColor) || '#151c24';
    ctx.beginPath();
    ctx.arc(22, 7, 3.5, 0, Math.PI * 2); // Right hand
    ctx.arc(16, -3, 3.5, 0, Math.PI * 2); // Left hand
    ctx.fill();

    // 7. Tactical Torso & Custom Suit
    ctx.fillStyle = (this.skin && this.skin.suitColor) || '#1d2836';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic Armor Plate Overlay
    ctx.fillStyle = (this.skin && this.skin.armorColor) || '#2d3d52';
    ctx.beginPath();
    ctx.ellipse(-1, 0, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Armor Trim / Vest Straps
    ctx.fillStyle = (this.skin && this.skin.trimColor) || '#0f1722';
    ctx.fillRect(-6, -7, 10, 2.5);
    ctx.fillRect(-6, 4.5, 10, 2.5);

    // 8. Tactical Helmet
    ctx.fillStyle = (this.skin && this.skin.helmetColor) || '#0f1724';
    ctx.beginPath();
    ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // 9. Custom Visor Silhouette based on Operative Skin
    const visorCol = (this.skin && this.skin.visorColor) || this.color;
    const visorShape = (this.skin && this.skin.visorShape) || 'visor';

    ctx.fillStyle = visorCol;
    ctx.shadowColor = visorCol;
    ctx.shadowBlur = 10;

    if (visorShape === 'quad_sensor') {
      // Venom Quad-Optic Sensor Array
      ctx.fillRect(1, -4, 2.5, 2.5);
      ctx.fillRect(4, -3, 2.5, 2.5);
      ctx.fillRect(1, 1.5, 2.5, 2.5);
      ctx.fillRect(4, 0.5, 2.5, 2.5);
    } else if (visorShape === 'cyclops') {
      // Vortex High-Tech Horizontal Optic Slit
      ctx.fillRect(1, -2, 6, 4);
      ctx.beginPath();
      ctx.arc(4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (visorShape === 'cross') {
      // Valkyrie Apex Chevron Cross
      ctx.fillRect(1, -1.2, 6, 2.4);
      ctx.fillRect(3, -4, 2.2, 8);
    } else if (visorShape === 'heavy_mask') {
      // Vulcan Heavy Juggernaut Respirator & Narrow Slit
      ctx.fillRect(1, -1.5, 5, 3);
      ctx.fillStyle = '#ff7700';
      ctx.fillRect(0, -5, 2, 2.5);
      ctx.fillRect(0, 2.5, 2, 2.5);
    } else if (visorShape === 'split') {
      // Chrome-X Twin Vertical Slits
      ctx.fillRect(2, -4, 2, 3.2);
      ctx.fillRect(2, 0.8, 2, 3.2);
    } else {
      // Spectre Standard Visor Arc
      ctx.beginPath();
      ctx.arc(3, 0, 5, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.lineTo(2, 0);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 10. Laser Sight Projector (Color tailored to active weapon)
    ctx.save();
    ctx.strokeStyle = activeW.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = activeW.id === 'railgun' ? 1.5 : 1;
    ctx.setLineDash(activeW.id === 'railgun' ? [6, 2] : [4, 4]);
    ctx.beginPath();
    const laserStart = activeW.id === 'railgun' ? 50 : 38;
    const laserLength = activeW.id === 'railgun' ? 620 : (activeW.id === 'shotgun' ? 240 : 420);
    ctx.moveTo(laserStart, 8);
    ctx.lineTo(laserLength, 8);
    ctx.stroke();
    ctx.restore();

    // 11. Muzzle Flash Flare
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

    // 12. Force Field Shield (Invulnerability grace on spawn/respawn)
    if (this.invulnerableTime > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.06;
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

window.drawTacticalWeapon = drawTacticalWeapon;
window.drawOperativeModel = drawOperativeModel;
window.Player = Player;

function drawOperativeModel(ctx, skin, weaponId = 'rifle', angle = 0, scale = 1.0) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(angle);

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Boots
  const bootsCol = skin ? skin.bootsColor : '#1c2430';
  ctx.fillStyle = bootsCol;
  ctx.fillRect(-12, -10, 12, 6);
  ctx.fillRect(-12, 4, 12, 6);

  // Weapon
  const weaponCol = skin ? skin.color : '#00f0ff';
  drawTacticalWeapon(ctx, weaponId, weaponCol, false);

  // Arms
  const sleeveCol = skin ? skin.suitColor : '#2b394a';
  ctx.fillStyle = sleeveCol;
  ctx.beginPath();
  ctx.ellipse(8, -6, 7, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, 8, 8, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Gloves
  ctx.fillStyle = skin ? skin.trimColor : '#151c24';
  ctx.beginPath();
  ctx.arc(22, 7, 3.5, 0, Math.PI * 2);
  ctx.arc(16, -3, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.fillStyle = skin ? skin.suitColor : '#1d2836';
  ctx.beginPath();
  ctx.ellipse(-2, 0, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Armor Plate
  ctx.fillStyle = skin ? skin.armorColor : '#2d3d52';
  ctx.beginPath();
  ctx.ellipse(-1, 0, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Straps
  ctx.fillStyle = skin ? skin.trimColor : '#0f1722';
  ctx.fillRect(-6, -7, 10, 2.5);
  ctx.fillRect(-6, 4.5, 10, 2.5);

  // Helmet
  ctx.fillStyle = skin ? skin.helmetColor : '#0f1724';
  ctx.beginPath();
  ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  const visorCol = skin ? skin.visorColor : '#00f0ff';
  const visorShape = skin ? skin.visorShape : 'visor';
  ctx.fillStyle = visorCol;
  ctx.shadowColor = visorCol;
  ctx.shadowBlur = 12;

  if (visorShape === 'quad_sensor') {
    ctx.fillRect(1, -4, 2.5, 2.5);
    ctx.fillRect(4, -3, 2.5, 2.5);
    ctx.fillRect(1, 1.5, 2.5, 2.5);
    ctx.fillRect(4, 0.5, 2.5, 2.5);
  } else if (visorShape === 'cyclops') {
    ctx.fillRect(1, -2, 6, 4);
    ctx.beginPath();
    ctx.arc(4, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (visorShape === 'cross') {
    ctx.fillRect(1, -1.2, 6, 2.4);
    ctx.fillRect(3, -4, 2.2, 8);
  } else if (visorShape === 'heavy_mask') {
    ctx.fillRect(1, -1.5, 5, 3);
    ctx.fillStyle = '#ff7700';
    ctx.fillRect(0, -5, 2, 2.5);
    ctx.fillRect(0, 2.5, 2, 2.5);
  } else if (visorShape === 'split') {
    ctx.fillRect(2, -4, 2, 3.2);
    ctx.fillRect(2, 0.8, 2, 3.2);
  } else {
    ctx.beginPath();
    ctx.arc(3, 0, 5, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.lineTo(2, 0);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Laser sight
  ctx.save();
  ctx.strokeStyle = visorCol;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(38, 8);
  ctx.lineTo(160, 8);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
