/**
 * CYBER STRIKE // BULLET SYSTEM
 * Projectiles with luminous tracer tails, collision physics, and impact mechanics.
 */

class Bullet {
  constructor(x, y, angle, options = {}) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = options.speed || 1100;
    this.damage = options.damage || 28;
    this.isCritical = Math.random() < 0.18; // 18% crit chance
    if (this.isCritical) this.damage = Math.round(this.damage * 1.75);
    this.shooterId = options.shooterId || null;

    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.radius = 4;
    this.maxDistance = options.range || 1400;
    this.distanceTraveled = 0;
    this.active = true;

    // Trail history for high-speed plasma tracer look
    this.trail = [];
    this.maxTrail = 6;
  }

  update(dt, map, enemies, barrels, game) {
    if (!this.active) return;

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
      this.active = false;
      return;
    }

    // 1. Collision with Map Obstacles (Walls, Pillars)
    if (map.isColliding(this.x, this.y, this.radius)) {
      this.active = false;
      window.particleSystem.emit(this.x, this.y, 8, {
        angle: this.angle + Math.PI,
        spread: 0.6,
        speed: 180,
        color: '#ffdd66',
        life: 0.15
      });
      window.soundSystem.playWallHit();
      return;
    }

    // 2. Collision with Explosive Barrels
    for (const barrel of barrels) {
      if (barrel.exploded) continue;
      const bDistSq = (this.x - barrel.x) ** 2 + (this.y - barrel.y) ** 2;
      if (bDistSq < (this.radius + barrel.radius) ** 2) {
        this.active = false;
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
        return;
      }
    }

    // 3. Collision with Enemies (PvE)
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const distSq = (this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2;
      if (distSq < (this.radius + enemy.radius) ** 2) {
        this.active = false;
        
        // Damage enemy
        enemy.takeDamage(this.damage, this.x, this.y, this.angle, this.isCritical);
        game.recordHit();

        // Network report if local player's bullet
        if (game && game.network && (!this.shooterId || this.shooterId === game.localPlayerId)) {
          game.network.reportEnemyHit(enemy.id, this.damage, this.isCritical, this.x, this.y);
        }
        return;
      }
    }

    // 4. Collision with Other Players (PvP / Friendly Fire)
    if (game && game.network) {
      const isMyBullet = !this.shooterId || this.shooterId === game.localPlayerId;

      if (isMyBullet) {
        // Check if our bullet hits any remote player
        for (const rId in game.network.remotePlayers) {
          const rp = game.network.remotePlayers[rId];
          if (!rp.alive || (rp.invulnerableTimer && rp.invulnerableTimer > 0)) continue;

          const distSq = (this.x - rp.x) ** 2 + (this.y - rp.y) ** 2;
          if (distSq < (this.radius + rp.radius) ** 2) {
            this.active = false;
            game.recordHit();

            // Emit PvP hit to server
            game.network.reportPlayerHit(rId, this.damage, this.isCritical, this.x, this.y);

            window.particleSystem.emitBlood(this.x, this.y, this.angle, 14);
            window.soundSystem.playPlayerHurt();
            return;
          }
        }
      } else {
        // Bullet was fired by a remote player: check if it hits local player
        if (game.player && game.player.alive && game.player.invulnerableTime <= 0) {
          const distSq = (this.x - game.player.x) ** 2 + (this.y - game.player.y) ** 2;
          if (distSq < (this.radius + game.player.radius) ** 2) {
            this.active = false;
            window.particleSystem.emitBlood(this.x, this.y, this.angle, 14);
            return;
          }
        }
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();

    // 1. Glowing Tracer Trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      for (let i = 0; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.isCritical ? '#ffb703' : '#00f0ff';
      ctx.lineWidth = this.isCritical ? 4 : 3;
      ctx.shadowColor = this.isCritical ? '#ffb703' : '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.8;
      ctx.stroke();
    }

    // 2. High-intensity Bullet Head
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.isCritical ? '#ffb703' : '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.restore();
  }
}

window.Bullet = Bullet;
