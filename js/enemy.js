/**
 * CYBER STRIKE // ENEMY HIERARCHY & AI
 * 3 distinct enemy archetypes:
 * 1. Normal Cyborg Soldier (Balanced)
 * 2. Fast Stalker (Agile Hunter)
 * 3. Armored Juggernaut (Devastating Tank)
 */

class Enemy {
  constructor(x, y, type = 'normal', id = null) {
    this.id = id || 'e_' + Math.random().toString(36).substring(2, 9);
    this.x = x;
    this.y = y;
    this.type = type;
    this.angle = 0;
    this.alive = true;

    // Type Configurations
    if (type === 'fast') {
      this.radius = 16;
      this.maxHp = 45;
      this.hp = this.maxHp;
      this.speed = 240;
      this.damage = 12;
      this.scoreValue = 150;
      this.color = '#00f0ff';
      this.attackRange = 26;
      this.attackCooldown = 0.6;
    } else if (type === 'tank') {
      this.radius = 34;
      this.maxHp = 350;
      this.hp = this.maxHp;
      this.speed = 85;
      this.damage = 38;
      this.scoreValue = 400;
      this.color = '#ff3366';
      this.attackRange = 46;
      this.attackCooldown = 1.2;
    } else { // normal
      this.radius = 22;
      this.maxHp = 90;
      this.hp = this.maxHp;
      this.speed = 155;
      this.damage = 20;
      this.scoreValue = 100;
      this.color = '#00ff88';
      this.attackRange = 32;
      this.attackCooldown = 0.85;
    }

    this.attackTimer = 0;
    this.hitFlashTimer = 0;
    this.animTimer = Math.random() * 10;
    this.steerAngle = 0;
  }

  update(dt, player, map, allEnemies, game) {
    if (!this.alive) return;

    this.animTimer += dt * (this.type === 'fast' ? 14 : 7);
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // Vector to Player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);

    // Target direction angle
    let targetAngle = Math.atan2(dy, dx);

    // 1. Intelligent Obstacle Avoidance & Steering
    // Probe ahead for obstacles
    const probeDist = this.radius * 2.2;
    const probeX = this.x + Math.cos(targetAngle) * probeDist;
    const probeY = this.y + Math.sin(targetAngle) * probeDist;

    if (map.isColliding(probeX, probeY, this.radius)) {
      // Check left and right 45-degree feelers
      const leftAngle = targetAngle - Math.PI / 3;
      const rightAngle = targetAngle + Math.PI / 3;
      const leftClear = !map.isColliding(this.x + Math.cos(leftAngle) * probeDist, this.y + Math.sin(leftAngle) * probeDist, this.radius);
      const rightClear = !map.isColliding(this.x + Math.cos(rightAngle) * probeDist, this.y + Math.sin(rightAngle) * probeDist, this.radius);

      if (leftClear) {
        targetAngle = leftAngle;
      } else if (rightClear) {
        targetAngle = rightAngle;
      } else {
        // Wall directly ahead, slide sideways
        targetAngle += Math.PI / 2;
      }
    }

    // 2. Flocking / Separation from other enemies
    let sepX = 0;
    let sepY = 0;
    let neighborCount = 0;
    for (const other of allEnemies) {
      if (other === this || !other.alive) continue;
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const odist = Math.hypot(ox, oy);
      const minDist = this.radius + other.radius + 6;
      if (odist < minDist && odist > 0) {
        sepX += (ox / odist) * (minDist - odist);
        sepY += (oy / odist) * (minDist - odist);
        neighborCount++;
      }
    }

    // Smooth rotation towards target
    this.angle = targetAngle;

    // Calculate velocity
    let moveVx = Math.cos(this.angle) * this.speed;
    let moveVy = Math.sin(this.angle) * this.speed;

    if (neighborCount > 0) {
      moveVx += sepX * 6;
      moveVy += sepY * 6;
    }

    // Move
    this.x += moveVx * dt;
    this.y += moveVy * dt;

    // Resolve wall collision
    map.resolveCircleCollision(this);

    // 3. Melee Attack Check on Player
    if (distToPlayer <= this.attackRange && this.attackTimer <= 0) {
      this.attack(player, game);
    }
  }

  attack(player, game) {
    this.attackTimer = this.attackCooldown;
    player.takeDamage(this.damage);
    game.addScreenShake(this.type === 'tank' ? 8 : 4);
    
    // Attack particle burst
    window.particleSystem.emit(player.x, player.y, 8, {
      speed: 120,
      color: this.color,
      life: 0.15
    });
  }

  takeDamage(amount, hitX, hitY, bulletAngle = 0, isCritical = false) {
    this.hp -= amount;
    this.hitFlashTimer = 0.12;

    // Audio & Damage Number
    window.soundSystem.playHit();
    window.particleSystem.addDamageNumber(this.x, this.y, amount, isCritical);
    window.particleSystem.emitBlood(hitX || this.x, hitY || this.y, bulletAngle, 6);

    // Death check
    if (this.hp <= 0 && this.alive) {
      this.die();
    }
  }

  die() {
    this.alive = false;
    const isTank = this.type === 'tank';

    window.soundSystem.playEnemyDeath(isTank);
    window.particleSystem.emitBlood(this.x, this.y, 0, isTank ? 30 : 16, true);

    if (isTank) {
      window.particleSystem.emitExplosion(this.x, this.y, 70);
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Hit Flash (render white glow)
    const isHit = this.hitFlashTimer > 0;
    if (isHit) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
    }

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 1.1, this.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Specific Rendering for Each Enemy Archetype
    if (this.type === 'fast') {
      this.drawFastHunter(ctx, isHit);
    } else if (this.type === 'tank') {
      this.drawTankJuggernaut(ctx, isHit);
    } else {
      this.drawNormalCyborg(ctx, isHit);
    }

    // Health Bar (above enemy head, if damaged)
    if (this.hp < this.maxHp) {
      ctx.restore(); // restore rotation for billboard health bar
      ctx.save();
      ctx.translate(this.x, this.y - this.radius - 12);

      const barW = this.radius * 2;
      const barH = 4;
      const pct = Math.max(0, this.hp / this.maxHp);

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2, 0, barW, barH);

      // Fill
      ctx.fillStyle = pct > 0.5 ? '#00ff88' : pct > 0.25 ? '#ffb703' : '#ff3366';
      ctx.fillRect(-barW / 2, 0, barW * pct, barH);

      ctx.restore();
      return;
    }

    ctx.restore();
  }

  // --- Normal Cyborg Trooper Model ---
  drawNormalCyborg(ctx, isHit) {
    const limbSway = Math.sin(this.animTimer) * 5;

    // Biomechanical legs
    ctx.fillStyle = isHit ? '#fff' : '#1e2820';
    ctx.fillRect(-10, -11 + limbSway, 10, 5);
    ctx.fillRect(-10, 6 - limbSway, 10, 5);

    // Claws / Scythe Arms reaching forward
    ctx.fillStyle = isHit ? '#fff' : '#2d3d2c';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(16, -12);
    ctx.lineTo(20, -6);
    ctx.lineTo(6, -6);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(16, 12);
    ctx.lineTo(20, 6);
    ctx.lineTo(6, 6);
    ctx.fill();

    // Heavy Torso
    ctx.fillStyle = isHit ? '#fff' : '#233324';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spine Plates
    ctx.fillStyle = '#0f1710';
    ctx.fillRect(-8, -4, 4, 8);
    ctx.fillRect(-3, -3, 3, 6);

    // Glowing Neon-Green Core / Optics
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
    ctx.arc(6, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // --- Fast Hunter Stalker Model ---
  drawFastHunter(ctx, isHit) {
    const clawSway = Math.sin(this.animTimer * 1.5) * 8;

    // Sleek streamlined body
    ctx.fillStyle = isHit ? '#fff' : '#14252e';
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(12, -8);
    ctx.lineTo(16, 0);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();

    // Twin Plasma Claws
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.lineTo(22 + clawSway * 0.3, -12);
    ctx.lineTo(18, -4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(22 - clawSway * 0.3, 12);
    ctx.lineTo(18, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Tri-Optics
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(10, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Tank Armored Juggernaut Model ---
  drawTankJuggernaut(ctx, isHit) {
    const stomp = Math.sin(this.animTimer * 0.6) * 4;

    // Heavy Treads / Massive armored stompers
    ctx.fillStyle = isHit ? '#fff' : '#221518';
    ctx.fillRect(-22, -26 + stomp, 20, 10);
    ctx.fillRect(-22, 16 - stomp, 20, 10);

    // Massive Plated Carapace
    ctx.fillStyle = isHit ? '#fff' : '#331c21';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    // Armored Shoulder Guards
    ctx.fillStyle = isHit ? '#fff' : '#4d2028';
    ctx.fillRect(-10, -28, 22, 12);
    ctx.fillRect(-10, 16, 22, 12);

    // Hazard Stripes on Armor Plating
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -26); ctx.lineTo(0, -18);
    ctx.moveTo(2, -26); ctx.lineTo(8, -18);
    ctx.stroke();

    // Heavy Front Ram / Battering Piston
    ctx.fillStyle = isHit ? '#fff' : '#1a1013';
    ctx.fillRect(16, -10, 14, 20);

    // Crimson Reactor Core
    ctx.fillStyle = '#ff3366';
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(4, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

window.Enemy = Enemy;
