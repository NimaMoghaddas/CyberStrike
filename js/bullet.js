/**
 * CYBER STRIKE // BULLET SYSTEM
 * Projectiles with luminous tracer tails, collision physics, piercing ballistics,
 * explosive area-of-effect detonations, and weapon-specific visual styling.
 */

class Bullet {
  constructor(x, y, angle, options = {}) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = options.speed || 1100;
    this.damage = options.damage || 28;
    this.weaponType = options.weaponType || 'rifle';
    
    // Critical hit chance (18% base, railgun has 28% crit)
    const critChance = this.weaponType === 'railgun' ? 0.28 : 0.18;
    this.isCritical = Math.random() < critChance;
    if (this.isCritical) this.damage = Math.round(this.damage * 1.75);

    this.shooterId = options.shooterId || null;
    this.color = options.color || '#00f0ff';
    this.glowColor = options.glowColor || this.color;

    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.radius = options.radius || 4;
    this.maxDistance = options.range || 1400;
    this.distanceTraveled = 0;
    this.active = true;

    // Piercing / Railgun ballistics
    this.penetrating = !!options.penetrating;
    this.maxPenetrations = options.maxPenetrations || 4;
    this.penetrations = 0;
    this.hitTargets = new Set();

    // Explosive / Nova Cannon ballistics
    this.explosive = !!options.explosive;
    this.splashDamage = options.splashDamage || 95;
    this.blastRadius = options.blastRadius || 125;
    this.screenShake = options.screenShake || 6.5;

    // Trail history for high-speed plasma tracer look
    this.trail = [];
    this.maxTrail = options.maxTrail || (this.weaponType === 'railgun' ? 10 : (this.weaponType === 'cannon' ? 8 : 6));
    this.pulseAnim = Math.random() * Math.PI * 2;
  }

  update(dt, map, enemies, barrels, game) {
    if (!this.active) return;

    this.pulseAnim += dt * 16;

    // Record trail point
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.pop();
    }

    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    const stepDist = Math.hypot(stepX, stepY);

    this.x += stepX;
    this.y += stepY;
    this.distanceTraveled += stepDist;

    // Range expiry
    if (this.distanceTraveled >= this.maxDistance) {
      if (this.explosive) {
        this.detonate(map, enemies, barrels, game);
      } else {
        this.active = false;
      }
      return;
    }

    // 1. Collision with Map Obstacles (Walls, Pillars)
    if (map.isColliding(this.x, this.y, this.radius)) {
      if (this.explosive) {
        this.detonate(map, enemies, barrels, game);
      } else {
        this.active = false;
        window.particleSystem.emit(this.x, this.y, 8, {
          angle: this.angle + Math.PI,
          spread: 0.6,
          speed: 180,
          color: this.glowColor || this.color || '#ffdd66',
          life: 0.15
        });
        window.soundSystem.playWallHit();
      }
      return;
    }

    // 2. Collision with Explosive Barrels
    for (const barrel of barrels) {
      if (barrel.exploded) continue;
      const bDistSq = (this.x - barrel.x) ** 2 + (this.y - barrel.y) ** 2;
      if (bDistSq < (this.radius + barrel.radius) ** 2) {
        if (this.explosive) {
          this.detonate(map, enemies, barrels, game);
          return;
        }

        barrel.hp -= this.damage;
        window.particleSystem.emit(this.x, this.y, 10, {
          angle: this.angle + Math.PI,
          spread: 0.8,
          speed: 220,
          color: '#ff5500',
          life: 0.2
        });
        window.soundSystem.playWallHit();

        if (game && game.network) {
          game.network.reportBarrelHit(barrel.id, this.damage);
        }

        if (barrel.hp <= 0 && (!game || !game.network || !game.network.connected)) {
          map.triggerBarrelExplosion(barrel, game);
        }

        if (!this.penetrating) {
          this.active = false;
          return;
        }
      }
    }

    // 3. Collision with Enemies (PvE)
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const distSq = (this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2;
      if (distSq < (this.radius + enemy.radius) ** 2) {
        if (this.explosive) {
          this.detonate(map, enemies, barrels, game);
          return;
        }

        if (this.penetrating) {
          if (!this.hitTargets.has(enemy.id)) {
            this.hitTargets.add(enemy.id);
            this.penetrations++;

            // Damage enemy
            enemy.takeDamage(this.damage, this.x, this.y, this.angle, this.isCritical, this.weaponType);
            game.recordHit();

            // Ionization burst particles
            window.particleSystem.emit(this.x, this.y, 12, {
              angle: this.angle,
              spread: 1.2,
              speed: 280,
              color: '#d946ef',
              life: 0.22
            });

            if (game && game.network && (!this.shooterId || this.shooterId === game.localPlayerId)) {
              game.network.reportEnemyHit(enemy.id, this.damage, this.isCritical, this.x, this.y);
            }

            if (this.penetrations >= this.maxPenetrations) {
              this.active = false;
              return;
            }
          }
        } else {
          this.active = false;
          
          // Damage enemy
          enemy.takeDamage(this.damage, this.x, this.y, this.angle, this.isCritical, this.weaponType);
          game.recordHit();

          // Network report if local player's bullet
          if (game && game.network && (!this.shooterId || this.shooterId === game.localPlayerId)) {
            game.network.reportEnemyHit(enemy.id, this.damage, this.isCritical, this.x, this.y);
          }
          return;
        }
      }
    }

    // 4. Collision with Other Players (PvP / Friendly Fire)
    if (game && game.network) {
      const isMyBullet = !this.shooterId || this.shooterId === game.localPlayerId;

      if (isMyBullet) {
        for (const rId in game.network.remotePlayers) {
          const rp = game.network.remotePlayers[rId];
          if (!rp.alive || (rp.invulnerableTimer && rp.invulnerableTimer > 0)) continue;
          if (game.player && game.player.team && rp.team && game.player.team === rp.team) continue;

          const distSq = (this.x - rp.x) ** 2 + (this.y - rp.y) ** 2;
          if (distSq < (this.radius + rp.radius) ** 2) {
            if (this.explosive) {
              this.detonate(map, enemies, barrels, game);
              return;
            }

            if (this.penetrating) {
              if (!this.hitTargets.has(rId)) {
                this.hitTargets.add(rId);
                this.penetrations++;
                game.recordHit();
                game.network.reportPlayerHit(rId, this.damage, this.isCritical, this.x, this.y);
                window.particleSystem.emitBlood(this.x, this.y, this.angle, 14);
                window.soundSystem.playPlayerHurt();
                if (this.penetrations >= this.maxPenetrations) {
                  this.active = false;
                  return;
                }
              }
            } else {
              this.active = false;
              game.recordHit();
              game.network.reportPlayerHit(rId, this.damage, this.isCritical, this.x, this.y);
              window.particleSystem.emitBlood(this.x, this.y, this.angle, 14);
              window.soundSystem.playPlayerHurt();
              return;
            }
          }
        }
      } else {
        // Bullet was fired by a remote player: check if it hits local player
        if (game.player && game.player.alive && game.player.invulnerableTime <= 0) {
          const distSq = (this.x - game.player.x) ** 2 + (this.y - game.player.y) ** 2;
          if (distSq < (this.radius + game.player.radius) ** 2) {
            if (this.explosive) {
              this.detonate(map, enemies, barrels, game);
              return;
            }
            this.active = false;
            window.particleSystem.emitBlood(this.x, this.y, this.angle, 14);
            return;
          }
        }
      }
    }
  }

  // --- Area-of-Effect Explosive Detonation ---
  detonate(map, enemies, barrels, game) {
    if (!this.active) return;
    this.active = false;

    // Visual & Audio Explosion
    window.particleSystem.emitExplosion(this.x, this.y, this.blastRadius);
    window.soundSystem.playExplosion();
    if (game && typeof game.addScreenShake === 'function') {
      game.addScreenShake(this.screenShake);
    }

    const isMyBullet = !this.shooterId || (game && this.shooterId === game.localPlayerId);

    // 1. Splash Damage to Enemies
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const d = Math.hypot(this.x - enemy.x, this.y - enemy.y);
      if (d <= this.blastRadius + enemy.radius) {
        const falloff = Math.max(0.35, 1 - (d / (this.blastRadius + enemy.radius)) * 0.65);
        const splash = Math.round(this.splashDamage * falloff);
        const blastAngle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.takeDamage(splash, enemy.x, enemy.y, blastAngle, this.isCritical);
        if (game && typeof game.recordHit === 'function') game.recordHit();

        if (game && game.network && isMyBullet) {
          game.network.reportEnemyHit(enemy.id, splash, this.isCritical, enemy.x, enemy.y);
        }
      }
    }

    // 2. Splash Damage to Explosive Barrels
    for (const barrel of barrels) {
      if (barrel.exploded) continue;
      const d = Math.hypot(this.x - barrel.x, this.y - barrel.y);
      if (d <= this.blastRadius + barrel.radius) {
        barrel.hp -= this.splashDamage;
        if (game && game.network) {
          game.network.reportBarrelHit(barrel.id, this.splashDamage);
        }
        if (barrel.hp <= 0 && (!game || !game.network || !game.network.connected)) {
          map.triggerBarrelExplosion(barrel, game);
        }
      }
    }

    // 3. Splash Damage to Remote Players in PvP
    if (game && game.network && isMyBullet) {
      for (const rId in game.network.remotePlayers) {
        const rp = game.network.remotePlayers[rId];
        if (!rp.alive || (rp.invulnerableTimer && rp.invulnerableTimer > 0)) continue;
        const d = Math.hypot(this.x - rp.x, this.y - rp.y);
        if (d <= this.blastRadius + rp.radius) {
          const falloff = Math.max(0.35, 1 - (d / (this.blastRadius + rp.radius)) * 0.65);
          const splash = Math.round(this.splashDamage * falloff);
          game.recordHit();
          game.network.reportPlayerHit(rId, splash, this.isCritical, rp.x, rp.y);
          window.particleSystem.emitBlood(rp.x, rp.y, Math.atan2(rp.y - this.y, rp.x - this.x), 16);
        }
      }
    }

    // 4. Splash Damage to Local Player if near blast
    if (game && game.player && game.player.alive && game.player.invulnerableTime <= 0) {
      const d = Math.hypot(this.x - game.player.x, this.y - game.player.y);
      if (d <= this.blastRadius * 0.75 + game.player.radius) {
        const splash = Math.round(this.splashDamage * 0.5);
        game.player.takeDamage(splash);
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();

    const bulletColor = this.color || '#00f0ff';
    const glowColor = this.isCritical ? '#ffb703' : (this.glowColor || bulletColor);

    // 1. Weapon-Specific Projectile Styling
    if (this.weaponType === 'railgun') {
      // Supersonic high-energy laser beam / rail slug
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 0; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = this.isCritical ? 6 : 4.5;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 18;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.stroke();

        // Inner pure-white supersonic core
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 0; i < Math.min(this.trail.length, 5); i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

      // Rail Head
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;
      ctx.fill();

    } else if (this.weaponType === 'cannon') {
      // Glowing Heavy Plasma Orb with swirling corona
      const pulse = 1 + Math.sin(this.pulseAnim) * 0.2;
      
      // Plasma tail
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 0; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 7 * pulse;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.7;
        ctx.stroke();
      }

      // Outer Corona Aura
      ctx.beginPath();
      ctx.arc(this.x, this.y, (this.radius + 3) * pulse, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 25;
      ctx.globalAlpha = 0.6;
      ctx.fill();

      // White-hot plasma core
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 1.0;
      ctx.fill();

    } else if (this.weaponType === 'shotgun') {
      // Flechette pellet
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 0; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2.8;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.8;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff4e6';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.fill();

    } else {
      // Standard / SMG / Pulse Rifle Plasma Tracers
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 0; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = this.isCritical ? 4.5 : (this.weaponType === 'smg' ? 2.6 : 3.2);
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.85;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();
    }

    ctx.restore();
  }
}

window.Bullet = Bullet;
