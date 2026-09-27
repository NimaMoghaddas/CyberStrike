/**
 * CYBER STRIKE // PLAYER OPERATIVE
 * Detailed top-down tactical character with helmet, tactical rig,
 * laser aim sight, walking kinematics, recoil kick, and tactical dash.
 */

class Player {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.id = options.id || null;
    this.name = options.name || 'OPERATIVE';
    this.color = options.color || '#00f0ff';
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

    // Weapon & Ammo (ARC-9 Pulse Rifle)
    this.magSize = 30;
    this.ammo = 30;
    this.fireRate = 0.11; // ~9 rounds/sec
    this.fireTimer = 0;
    this.isReloading = false;
    this.reloadDuration = 1.25;
    this.reloadTimer = 0;

    // Visual Animation States
    this.walkCycle = 0;
    this.isMoving = false;
    this.recoilOffset = 0; // Kickback distance
    this.muzzleFlashTimer = 0;
    this.hurtTimer = 0;
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

    // 3. Update Dash Ghost Trails
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      const g = this.ghostTrails[i];
      g.life -= dt;
      g.alpha = Math.max(0, g.life / 0.25);
      if (g.life <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }

    // 4. Weapon Timers
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= dt;

    // Recoil recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dt * 45);
    }

    // Reload Handling
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.ammo = this.magSize;
        this.isReloading = false;
        game.updateAmmoUI();
      }
    } else {
      // Manual reload on R key or auto-reload on empty clip
      if (input.keys['KeyR'] && this.ammo < this.magSize) {
        this.startReload();
      }
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
    if (this.isReloading || this.ammo === this.magSize) return;
    this.isReloading = true;
    this.reloadTimer = this.reloadDuration;
    window.soundSystem.playReload();
  }

  shoot(game) {
    if (this.fireTimer > 0) return;

    if (this.ammo <= 0) {
      if (!this.isReloading) {
        this.startReload();
      } else {
        window.soundSystem.playDryFire();
        this.fireTimer = 0.25;
      }
      return;
    }

    // Consume bullet
    this.ammo--;
    this.fireTimer = this.fireRate;
    this.muzzleFlashTimer = 0.06;
    this.recoilOffset = 6; // visual kickback

    // Rifle muzzle position calculation
    const gunForward = 34; // distance forward from player center
    const gunRight = 10;   // offset to the right hand
    const muzzleX = this.x + Math.cos(this.angle) * gunForward - Math.sin(this.angle) * gunRight;
    const muzzleY = this.y + Math.sin(this.angle) * gunForward + Math.cos(this.angle) * gunRight;

    // Small spread for realistic tactical recoil
    const spread = (Math.random() - 0.5) * 0.05;
    const fireAngle = this.angle + spread;

    // Spawn Bullet
    const bullet = new Bullet(muzzleX, muzzleY, fireAngle);
    bullet.shooterId = game.localPlayerId || null;
    game.bullets.push(bullet);
    game.shotsFired++;

    // Audio & FX
    window.soundSystem.playShoot();
    window.particleSystem.emitMuzzleFlash(muzzleX, muzzleY, fireAngle);
    window.particleSystem.ejectShell(this.x, this.y, this.angle);
    game.addScreenShake(2.5);

    // Network emit to other players
    if (game.network) {
      game.network.emitShoot(muzzleX, muzzleY, fireAngle, bullet.isCritical, bullet.damage);
    }

    game.updateAmmoUI();
  }

  takeDamage(amount) {
    if (this.invulnerableTime > 0 || !this.alive) return;

    this.hp -= amount;
    this.invulnerableTime = 0.35;
    this.hurtTimer = 0.25;
    window.soundSystem.playPlayerHurt();
    window.particleSystem.emitBlood(this.x, this.y, this.angle + Math.PI, 14);

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
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
    ctx.fillStyle = '#1c2430'; // Dark tactical combat boots
    ctx.fillRect(-12, -10 + legSway, 12, 6);
    ctx.fillRect(-12, 4 - legSway, 12, 6);

    // 5. Tactical Rifle (Held forward in right hands)
    ctx.fillStyle = '#111824'; // Rifle stock and body
    ctx.fillRect(4, 5, 28, 6);

    // Rifle Barrel & Muzzle
    ctx.fillStyle = '#374151';
    ctx.fillRect(32, 6.5, 8, 3);

    // Weapon Accents / LED Rail in player color
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(12, 4.5, 12, 1.5);
    ctx.shadowBlur = 0;

    // 6. Arms and Hands
    ctx.fillStyle = '#2b394a'; // Tactical sleeve
    ctx.beginPath();
    // Left arm reaching for rifle foregrip
    ctx.ellipse(8, -6, 7, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Right arm on rifle grip
    ctx.beginPath();
    ctx.ellipse(14, 8, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Hands / Tactical Gloves
    ctx.fillStyle = '#151c24';
    ctx.beginPath();
    ctx.arc(22, 7, 3.5, 0, Math.PI * 2); // Right hand
    ctx.arc(16, -3, 3.5, 0, Math.PI * 2); // Left hand
    ctx.fill();

    // 7. Tactical Torso & Armor Vest
    ctx.fillStyle = '#1d2836';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic Plate Armor overlay
    ctx.fillStyle = '#2d3d52';
    ctx.beginPath();
    ctx.ellipse(-1, 0, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vest Straps
    ctx.fillStyle = '#0f1722';
    ctx.fillRect(-6, -7, 10, 2.5);
    ctx.fillRect(-6, 4.5, 10, 2.5);

    // 8. Tactical Helmet & Visor
    ctx.fillStyle = '#0f1724'; // Helmet outer shell
    ctx.beginPath();
    ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Cyber Visor (Glows with player's color)
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(3, 0, 5, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.lineTo(2, 0);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 9. Laser Sight Projector (Tactical beam in player color)
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(38, 8);
    ctx.lineTo(400, 8);
    ctx.stroke();
    ctx.restore();

    // 10. Muzzle Flash Flare
    if (this.muzzleFlashTimer > 0) {
      ctx.save();
      ctx.translate(40, 8);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // Starburst rays
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();

    // 11. Force Shield when Invulnerable
    if (this.invulnerableTime > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
      const sRad = (this.radius + 12) * pulse;
      ctx.strokeStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(0, 0, sRad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }
}

window.Player = Player;
