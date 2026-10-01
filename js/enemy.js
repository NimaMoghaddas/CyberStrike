/**
 * CYBER STRIKE // ENEMY HIERARCHY & AI
 * 3 distinct enemy archetypes:
 * 1. Normal Cyborg Soldier (Balanced Bio-Spitter Grunt)
 * 2. Fast Stalker (Agile Bio-Mantis)
 * 3. Armored Juggernaut (Devastating Goliath Behemoth)
 */

class AcidSpit {
  constructor(x, y, angle, speed = 460, damage = 16, color = '#39ff14', ignoreWalls = false) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.color = color;
    this.ignoreWalls = ignoreWalls || (color === '#b026ff');
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = color === '#b026ff' ? 4.5 : 5.5;
    this.maxDistance = color === '#b026ff' ? 1400 : 560;
    this.distanceTraveled = 0;
    this.active = true;
    this.trail = [];
    this.animTimer = 0;
  }
  
  update(dt, map, player, game) {
    if (!this.active) return;
    this.animTimer += dt * 14;

    this.trail.unshift({ x: this.x, y: this.y, r: this.radius });
    if (this.trail.length > 7) this.trail.pop();

    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    this.x += stepX;
    this.y += stepY;
    this.distanceTraveled += Math.hypot(stepX, stepY);

    if (Math.random() < 0.45 && window.particleSystem) {
      window.particleSystem.emit(this.x, this.y, 1, {
        speed: 35,
        color: this.color === '#b026ff' ? '#b026ff' : '#39ff14',
        life: 0.2,
        size: 2
      });
    }

    if (this.distanceTraveled >= this.maxDistance) {
      this.explode(game);
      return;
    }

    // All enemy projectiles collide with and are stopped by obstacles/walls
    if (this.distanceTraveled > 20 && map && map.isColliding(this.x, this.y, this.radius)) {
      this.explode(game);
      return;
    }

    // Check collision with local player and remote players
    const targets = [];
    if (player && player.alive) targets.push(player);
    if (game && game.network && game.network.remotePlayers) {
      for (const rId in game.network.remotePlayers) {
        const rp = game.network.remotePlayers[rId];
        if (rp && rp.alive) targets.push(rp);
      }
    }

    for (let i = 0; i < targets.length; i++) {
      const targetP = targets[i];
      const dist = Math.hypot(this.x - targetP.x, this.y - targetP.y);
      if (dist <= this.radius + targetP.radius) {
        if (targetP.takeDamage) targetP.takeDamage(this.damage);
        if (game) game.addScreenShake(5);
        this.explode(game);
        return;
      }
    }
  }

  explode(game) {
    this.active = false;
    if (window.particleSystem) {
      window.particleSystem.emit(this.x, this.y, 11, {
        speed: 130,
        color: '#00ff88',
        life: 0.3,
        size: 3
      });
      window.particleSystem.emit(this.x, this.y, 6, {
        speed: 80,
        color: '#39ff14',
        life: 0.4,
        size: 3.5
      });
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();

    // 1. Toxic Slime Trail
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const p1 = this.trail[i - 1];
        const p2 = this.trail[i];
        const alpha = (1 - i / this.trail.length) * 0.75;
        const width = Math.max(1.5, this.radius * (1 - i / this.trail.length) * 1.5);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // 2. Glowing Outer Aura
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.25;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.globalAlpha = 1;

    // 3. Molten Globule Core
    const pulse = Math.sin(this.animTimer) * 1.0;
    const grad = ctx.createRadialGradient(this.x - 1, this.y - 1, 1, this.x, this.y, this.radius + pulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, this.color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }
}
window.AcidSpit = AcidSpit;

class Enemy {
  constructor(x, y, type = 'normal', id = null, generation = 0) {
    if (typeof id === 'number') {
      generation = id;
      id = null;
    }
    this.id = id || 'e_' + Math.random().toString(36).substring(2, 9);
    this.x = x;
    this.y = y;
    this.type = type;
    this.angle = 0;
    this.alive = true;
    this.generation = typeof generation === 'number' ? generation : 0;

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
      this.radius = 24;
      this.maxHp = 180;
      this.hp = this.maxHp;
      this.speed = 95;
      this.damage = 30;
      this.scoreValue = 350;
      this.color = '#ff3366';
      this.attackRange = 36;
      this.attackCooldown = 1.1;
    } else if (type === 'shielded') {
      this.radius = 24;
      this.maxHp = 160;
      this.hp = this.maxHp;
      this.speed = 130;
      this.damage = 22;
      this.scoreValue = 250;
      this.color = '#00d4ff';
      this.attackRange = 45;
      this.attackCooldown = 0.9;
    } else if (type === 'sniper') {
      this.radius = 20;
      this.maxHp = 75;
      this.hp = this.maxHp;
      this.speed = 115;
      this.damage = 28;
      this.scoreValue = 300;
      this.color = '#b026ff';
      this.attackRange = 40;
      this.attackCooldown = 1.0;
      this.sniperTimer = 2.0;
      this.sniperAimTimer = 0;
    } else if (type === 'bomber') {
      this.radius = 18;
      this.maxHp = 60;
      this.hp = this.maxHp;
      this.speed = 210;
      this.damage = 50;
      this.scoreValue = 200;
      this.color = '#ff7700';
      this.attackRange = 36;
      this.attackCooldown = 0.5;
      this.fuseTimer = 0;
    } else if (type === 'splitter') {
      const gen = this.generation || 0;
      if (gen === 0) {
        this.radius = 26;
        this.maxHp = 120;
        this.speed = 120;
        this.damage = 14;
        this.splits = 2;
        this.scoreValue = 200;
        this.colors = {
          dark: '#031a0e',
          mid: '#0a2c17',
          light: '#144e2b',
          glow: '#00ff88'
        };
        this.color = '#00ff88';
      } else if (gen === 1) {
        this.radius = 17;
        this.maxHp = 55;
        this.speed = 155;
        this.damage = 10;
        this.splits = 2;
        this.scoreValue = 100;
        this.colors = {
          dark: '#041d10',
          mid: '#0f3d1e',
          light: '#1a5c2c',
          glow: '#39ff14'
        };
        this.color = '#39ff14';
      } else { // gen >= 2
        this.radius = 11;
        this.maxHp = 22;
        this.speed = 190;
        this.damage = 6;
        this.splits = 0;
        this.scoreValue = 50;
        this.colors = {
          dark: '#062015',
          mid: '#134a25',
          light: '#1f6632',
          glow: '#88ff99'
        };
        this.color = '#88ff99';
      }
      this.hp = this.maxHp;
      this.attackRange = this.radius + 14;
      this.attackCooldown = 0.75;
    } else { // normal
      this.radius = 22;
      this.maxHp = 90;
      this.hp = this.maxHp;
      this.speed = 155;
      this.damage = 20;
      this.scoreValue = 100;
      this.color = '#00ff88';
      this.attackRange = 48;
      this.attackCooldown = 0.85;
      this.spitCooldown = 3.2;
      this.spitTimer = 1.2 + Math.random() * 2.0;
      this.spitWindupTimer = 0;
    }

    this.attackTimer = 0;
    this.hitFlashTimer = 0;
    this.animTimer = Math.random() * 10;
    this.steerAngle = 0;

    // Intelligent Unstuck & Wall-Nav State
    this.stuckCheckTimer = 0;
    this.stuckAccumTime = 0;
    this.lastCheckX = this.x;
    this.lastCheckY = this.y;
    this.detourTimer = 0;
    this.detourSign = Math.random() < 0.5 ? 1 : -1;
  }

  update(dt, player, map, allEnemies, game) {
    if (!this.alive) return;

    this.animTimer += dt * (this.type === 'fast' ? 1.5 : this.type === 'tank' ? 0.8 : 1.0);
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // Vector to Player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);
    const minDistanceToPlayer = this.radius + player.radius;

    // Target direction angle
    let targetAngle = Math.atan2(dy, dx);

    // 1. 5-Second Stuck Detection: If stalled in one spot for 5s against a wall, force a detour
    this.stuckCheckTimer = (this.stuckCheckTimer || 0) + dt;
    if (this.detourTimer > 0) this.detourTimer -= dt;

    // Reset detour when arriving near player so enemy directly engages without circling
    if (distToPlayer <= minDistanceToPlayer + 25) {
      this.detourTimer = 0;
      this.stuckAccumTime = 0;
    }

    if (this.stuckCheckTimer >= 0.5) {
      const movedDist = Math.hypot(this.x - (this.lastCheckX || this.x), this.y - (this.lastCheckY || this.y));
      this.lastCheckX = this.x;
      this.lastCheckY = this.y;
      this.stuckCheckTimer = 0;

      // Only accumulate stuck time if barely moved (< 12px in 0.5s) and far from player
      if (movedDist < 12 && distToPlayer > minDistanceToPlayer + 35) {
        this.stuckAccumTime = (this.stuckAccumTime || 0) + 0.5;
        if (this.stuckAccumTime >= 5.0) { // Exactly 5 seconds threshold
          this.detourTimer = 1.8;
          this.detourSign = Math.random() < 0.5 ? 1 : -1;
          this.stuckAccumTime = 0;
        }
      } else {
        this.stuckAccumTime = Math.max(0, (this.stuckAccumTime || 0) - 0.5);
      }
    }

    // 2. Obstacle Avoidance & Steering Feelers (Only when blocked by a wall)
    const probeDist = Math.min(distToPlayer, this.radius * 2.2);
    const probeX = this.x + Math.cos(targetAngle) * probeDist;
    const probeY = this.y + Math.sin(targetAngle) * probeDist;
    const pathBlocked = map.isColliding(probeX, probeY, this.radius);

    if ((pathBlocked || this.detourTimer > 0) && distToPlayer > minDistanceToPlayer + 20) {
      const sign = this.detourSign || 1;
      const offsets = [
        sign * (Math.PI / 4),
        sign * (Math.PI / 2),
        -sign * (Math.PI / 4),
        -sign * (Math.PI / 2),
        sign * (Math.PI * 0.75),
        -sign * (Math.PI * 0.75)
      ];

      for (const off of offsets) {
        const testA = targetAngle + off;
        const tx = this.x + Math.cos(testA) * probeDist;
        const ty = this.y + Math.sin(testA) * probeDist;

        if (!map.isColliding(tx, ty, this.radius)) {
          targetAngle = testA;
          break;
        }
      }
    }

    // 3. Flocking / Separation from other enemies
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

    // Smooth rotation towards target (eliminates jittery direction changes)
    let angleDiff = targetAngle - this.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 9.0 * dt);

    // Calculate velocity
    let moveVx = Math.cos(this.angle) * this.speed;
    let moveVy = Math.sin(this.angle) * this.speed;

    if (neighborCount > 0) {
      moveVx += sepX * 6;
      moveVy += sepY * 6;
    }

    // Stop forward velocity into player when already touching player's body
    if (distToPlayer <= minDistanceToPlayer + 4 && distToPlayer > 0.001) {
      const toPx = (player.x - this.x) / distToPlayer;
      const toPy = (player.y - this.y) / distToPlayer;
      const dot = moveVx * toPx + moveVy * toPy;
      if (dot > 0) {
        moveVx -= toPx * dot;
        moveVy -= toPy * dot;
      }
    }

    // Move with Axis-independent wall sliding
    this.x += moveVx * dt;
    map.resolveCircleCollision(this);
    this.y += moveVy * dt;
    map.resolveCircleCollision(this);

    // Solid Player Collision Resolution (Never allow enemy to enter inside player's body)
    const afterDist = Math.hypot(this.x - player.x, this.y - player.y);
    if (afterDist < minDistanceToPlayer && afterDist > 0.0001) {
      const pushOut = minDistanceToPlayer - afterDist;
      const nx = (this.x - player.x) / afterDist;
      const ny = (this.y - player.y) / afterDist;
      this.x += nx * pushOut;
      this.y += ny * pushOut;
      map.resolveCircleCollision(this);
    }

    if (map && map.isColliding(this.x, this.y, this.radius)) {
      map.unstuckEntity(this);
    }

    // Normal Bio-Grunt (Green Enemy) Periodic Acid Spit Attack (Every 5 seconds unconditionally)
    if (this.type === 'normal') {
      if (this.spitWindupTimer > 0) {
        this.spitWindupTimer -= dt;
        if (player && player.alive) {
          this.angle = Math.atan2(dy, dx);
        }
        moveVx *= 0.12;
        moveVy *= 0.12;

        if (Math.random() < 0.65 && window.particleSystem) {
          const mouthX = this.x + Math.cos(this.angle) * (this.radius + 3);
          const mouthY = this.y + Math.sin(this.angle) * (this.radius + 3);
          window.particleSystem.emit(mouthX, mouthY, 1, {
            speed: 35,
            color: '#39ff14',
            life: 0.18,
            size: 2.2
          });
        }

        if (this.spitWindupTimer <= 0) {
          this.spitWindupTimer = 0;
          const mouthX = this.x + Math.cos(this.angle) * (this.radius + 8);
          const mouthY = this.y + Math.sin(this.angle) * (this.radius + 8);
          if (game && game.spawnAcidSpit) {
            game.spawnAcidSpit(mouthX, mouthY, this.angle, 460, 16);
          }
        }
      } else {
        if (this.spitTimer > 0) this.spitTimer -= dt;
        if (this.spitTimer <= 0) {
          this.spitWindupTimer = 0.35;
          this.spitTimer = 5.0; // Shoot every 5 seconds unconditionally wherever they are!
        }
      }
    }

    // Phantom Sniper AI: Standoff laser targeting for 1.0s and high-velocity wall-piercing sniper beam
    if (this.type === 'sniper' && player && player.alive) {
      this.sniperTimer = (this.sniperTimer !== undefined ? this.sniperTimer : 3.5) - dt;
      if (this.sniperTimer <= 0 && distToPlayer <= 900) {
        this.sniperAimTimer = (this.sniperAimTimer || 0) + dt;
        this.angle = Math.atan2(dy, dx);
        if (this.sniperAimTimer >= 1.0) { // Exactly 1.0 second of laser telegraph
          this.sniperTimer = 5.0;
          this.sniperAimTimer = 0;
          if (game && game.spawnAcidSpit) {
            game.spawnAcidSpit(this.x, this.y, this.angle, 820, 28, '#b026ff', false);
          }
          if (window.soundSystem) {
            window.soundSystem.playWeaponShoot('railgun');
          }
        }
      }
    }

    // Kamikaze Bomber AI: Rapid fuse and detonation when touching player
    if (this.type === 'bomber' && player && player.alive) {
      if (distToPlayer <= 48) {
        this.fuseTimer = (this.fuseTimer || 0) + dt;
        if (this.fuseTimer >= 0.38) {
          this.die();
          return;
        }
      }
    }

    // 4. Melee Attack Check on Player (Reliable reach when reaching/touching player)
    const currentDist = Math.hypot(this.x - player.x, this.y - player.y);
    const attackReach = this.radius + player.radius + 12;
    if (currentDist <= attackReach && this.attackTimer <= 0 && player.alive) {
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

  takeDamage(amount, hitX, hitY, bulletAngle = 0, isCritical = false, weaponType = 'rifle') {
    // Shield Enforcer: 75% front shield deflection unless hit with railgun or explosive cannon
    if (this.type === 'shielded' && weaponType !== 'railgun' && weaponType !== 'cannon') {
      let relAngle = bulletAngle - (this.angle + Math.PI);
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      if (Math.abs(relAngle) < Math.PI * 0.45) {
        amount = Math.max(1, Math.round(amount * 0.25));
        if (window.soundSystem) window.soundSystem.playWallHit();
        if (window.particleSystem) {
          window.particleSystem.emit(hitX || this.x, hitY || this.y, 8, {
            speed: 180,
            color: '#00d4ff',
            life: 0.18
          });
        }
      }
    }

    this.hp -= amount;
    this.hitFlashTimer = 0.12;

    // Audio & Damage Number
    window.soundSystem.playHit();
    window.particleSystem.addDamageNumber(this.x, this.y, amount, isCritical);
    window.particleSystem.emitBlood(hitX || this.x, hitY || this.y, bulletAngle, 6);

    // Death check
    if (this.hp <= 0 && this.alive) {
      if (window.gameInstance && window.gameInstance.gameMode === 'multiplayer') {
        this.hp = 0;
        // In multiplayer, keep locally until server sync/kill confirms
      } else {
        this.die();
      }
    }
  }

  die(game = window.gameInstance || window.gameEngine) {
    if (!this.alive) return;
    this.alive = false;
    const isTank = this.type === 'tank';
    const isBomber = this.type === 'bomber';

    window.soundSystem.playEnemyDeath(isTank || isBomber);
    window.particleSystem.emitBlood(this.x, this.y, 0, isTank ? 30 : 16, true);

    if (this.type === 'splitter') {
      if (window.particleSystem) {
        window.particleSystem.emit(this.x, this.y, 16, {
          speed: 150,
          color: this.color || '#00ff88',
          life: 0.35,
          size: 2.8
        });
      }

      if (this.generation < 2) {
        const nextGen = this.generation + 1;
        const gameRef = game || window.gameInstance || window.gameEngine;
        if (gameRef && gameRef.enemies) {
          const childRadius = nextGen === 1 ? 17 : 11;
          const spawnDist = this.radius * 0.65 + childRadius + 4;
          const baseAngle = this.angle || 0;
          const spreadOffset = Math.PI * 0.42;
          const spreadAngles = [
            baseAngle + spreadOffset + (Math.random() - 0.5) * 0.15,
            baseAngle - spreadOffset + (Math.random() - 0.5) * 0.15
          ];

          for (let i = 0; i < 2; i++) {
            const ang = spreadAngles[i];
            let cx = this.x + Math.cos(ang) * spawnDist;
            let cy = this.y + Math.sin(ang) * spawnDist;

            if (gameRef.map) {
              cx = Math.max(30, Math.min(gameRef.map.width - 30, cx));
              cy = Math.max(30, Math.min(gameRef.map.height - 30, cy));
            }

            const child = new Enemy(cx, cy, 'splitter', null, nextGen);
            child.angle = ang;

            if (gameRef.map && gameRef.map.isColliding(child.x, child.y, child.radius)) {
              gameRef.map.unstuckEntity(child);
            }

            gameRef.enemies.push(child);

            if (window.particleSystem) {
              window.particleSystem.emit(child.x, child.y, 12, {
                speed: 100,
                color: child.color,
                life: 0.28,
                size: 2.2
              });
            }
          }
        }
      }
    }

    if (isTank || isBomber) {
      const radius = isBomber ? 140 : 70;
      window.particleSystem.emitExplosion(this.x, this.y, radius);
      if (window.soundSystem && window.soundSystem.playExplosion) {
        window.soundSystem.playExplosion();
      }
      if (isBomber) {
        const game = window.gameInstance;
        const blastRadius = 160;
        // 1. Damage player
        if (game && game.player && game.player.alive) {
          const d = Math.hypot(game.player.x - this.x, game.player.y - this.y);
          if (d < blastRadius) {
            const dmg = Math.round(55 * (1 - d / blastRadius));
            game.player.takeDamage(dmg, game, 'EXPLOSIVE');
          }
        }
        // 2. Damage SURROUNDING ENEMIES (Explosive chain reaction!)
        if (game && game.enemies) {
          for (let i = 0; i < game.enemies.length; i++) {
            const other = game.enemies[i];
            if (other === this || !other.alive) continue;
            const ed = Math.hypot(other.x - this.x, other.y - this.y);
            if (ed < blastRadius) {
              const blastDmg = Math.round(90 * (1 - ed / blastRadius));
              other.takeDamage(blastDmg, other.x, other.y, 0, false, 'cannon');
              if (window.particleSystem && window.particleSystem.addDamageNumber) {
                window.particleSystem.addDamageNumber(other.x, other.y - 14, blastDmg, true);
              }
            }
          }
        }
      }
    }
  }

  draw(ctx) {
    if (this.hp > 0) {
      this.alive = true; // Guarantees enemies with positive health are never rendered invisible
    }
    if (!this.alive) return;

    // Self-driving frame-rate independent animation timer guarantee (1.0x real time)
    const now = performance.now() * 0.001;
    if (!this._lastRenderTime) this._lastRenderTime = now;
    const frameDt = Math.min(0.08, Math.max(0.001, now - this._lastRenderTime));
    this._lastRenderTime = now;
    this.animTimer = (this.animTimer || 0) + frameDt * (this.type === 'fast' ? 1.5 : this.type === 'tank' ? 0.8 : 1.0);
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= frameDt;

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
    } else if (this.type === 'shielded') {
      this.drawShieldEnforcer(ctx, isHit);
    } else if (this.type === 'sniper') {
      this.drawPhantomSniper(ctx, isHit);
    } else if (this.type === 'bomber') {
      this.drawKamikazeBomber(ctx, isHit);
    } else if (this.type === 'splitter') {
      this.drawSplitter(ctx, isHit);
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

  // --- Bio-Spitter Organism: Splitter (Multi-Generational Swarm Bio-Hostile) ---
  drawSplitter(ctx, isHit) {
    const t = this.animTimer || 0;
    const R = this.radius;

    // Generation-tailored bio-palette
    const colors = this.colors || (
      this.generation === 0
        ? { dark: '#031a0e', mid: '#0a2c17', light: '#144e2b', glow: '#00ff88' }
        : this.generation === 1
        ? { dark: '#041d10', mid: '#0f3d1e', light: '#1a5c2c', glow: '#39ff14' }
        : { dark: '#062015', mid: '#134a25', light: '#1f6632', glow: '#88ff99' }
    );

    const cDark = isHit ? '#d0d0d0' : colors.dark;
    const cMid = isHit ? '#e2e2e2' : colors.mid;
    const cLight = isHit ? '#ffffff' : colors.light;
    const cGlow = isHit ? '#ffffff' : colors.glow;

    // Animation variables
    const walkFreq = (this.speed || 120) * 0.07;
    const walkPhase = t * walkFreq;
    const breath = Math.sin(t * 2.8) * 0.055; // Gentle bio-sinusoidal breathing expansion
    const pulse = 0.5 + 0.5 * Math.sin(t * 5.2); // Core pulsation (0 to 1)

    ctx.save();

    // 1. Soft Ground Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 2, R * 1.15, R * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. 4 Short Organic Legs Under Body (with Scuttling Step Animation)
    const drawShortLeg = (hipX, hipY, reachX, reachY, phase, isUpper) => {
      const stepProg = Math.sin(phase);
      const lift = Math.max(0, -Math.cos(phase)) * (R * 0.22);
      const footX = hipX + reachX + stepProg * (R * 0.28);
      const footY = hipY + reachY + (isUpper ? -lift : lift) * 0.6;
      const kneeX = (hipX + footX) * 0.5 + (isUpper ? -1 : 1) * (R * 0.15);
      const kneeY = (hipY + footY) * 0.5 + (isUpper ? -lift : lift) * 0.3;

      // Femur & Tibia
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
      ctx.strokeStyle = cMid;
      ctx.lineWidth = Math.max(1.8, R * 0.14);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Sharp Claw/Foot Tip
      ctx.beginPath();
      ctx.arc(footX, footY, Math.max(1.2, R * 0.08), 0, Math.PI * 2);
      ctx.fillStyle = isHit ? '#ffffff' : cGlow;
      ctx.fill();
    };

    // Front Legs (Phase A & B)
    drawShortLeg(R * 0.22, -R * 0.48, R * 0.32, -R * 0.48, walkPhase, true);
    drawShortLeg(R * 0.22, R * 0.48, R * 0.32, R * 0.48, walkPhase + Math.PI, false);

    // Rear Legs (Phase B & A)
    drawShortLeg(-R * 0.35, -R * 0.45, -R * 0.32, -R * 0.45, walkPhase + Math.PI, true);
    drawShortLeg(-R * 0.35, R * 0.45, -R * 0.32, R * 0.45, walkPhase, false);

    // 3. 2 Front Antennae with Gentle Wiggle
    const antWiggle1 = Math.sin(t * 3.6) * (R * 0.18);
    const antWiggle2 = Math.sin(t * 3.6 + 1.4) * (R * 0.18);

    const drawAntenna = (baseY, wiggle, isUpper) => {
      const startX = R * 0.72;
      const startY = baseY;
      const tipX = R * 1.38;
      const tipY = baseY + (isUpper ? -R * 0.38 : R * 0.38) + wiggle;
      const ctrlX = R * 1.05;
      const ctrlY = baseY + (isUpper ? -R * 0.12 : R * 0.12) - wiggle * 0.4;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.strokeStyle = cMid;
      ctx.lineWidth = Math.max(1.3, R * 0.075);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glowing Antenna Tip
      ctx.beginPath();
      ctx.arc(tipX, tipY, Math.max(1.6, R * 0.1), 0, Math.PI * 2);
      ctx.fillStyle = isHit ? '#ffffff' : cGlow;
      ctx.shadowColor = cGlow;
      ctx.shadowBlur = isHit ? 10 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    drawAntenna(-R * 0.22, antWiggle1, true);
    drawAntenna(R * 0.22, antWiggle2, false);

    // 4. Organic Bubble/Oval Body with Breathing Animation & Internal Gradient
    ctx.save();
    const scaleX = (1.0 + breath) * R;
    const scaleY = (0.88 - breath * 0.45) * R;

    // Posterior secondary bubble (organic depth)
    const rearR = R * 0.62 * (1.0 + breath * 0.6);
    ctx.beginPath();
    ctx.ellipse(-R * 0.34, 0, rearR, rearR * 0.85, 0, 0, Math.PI * 2);
    const rearGrad = ctx.createRadialGradient(-R * 0.25, 0, 1, -R * 0.34, 0, rearR);
    rearGrad.addColorStop(0, cLight);
    rearGrad.addColorStop(0.5, cMid);
    rearGrad.addColorStop(1, cDark);
    ctx.fillStyle = rearGrad;
    ctx.fill();
    ctx.strokeStyle = cGlow;
    ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.globalAlpha = isHit ? 1.0 : 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Main Oval Cephalothorax Bubble
    ctx.beginPath();
    ctx.ellipse(R * 0.08, 0, scaleX * 0.88, scaleY, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(R * 0.2, -R * 0.1, R * 0.1, R * 0.08, 0, R * 0.98);
    bodyGrad.addColorStop(0, cLight);
    bodyGrad.addColorStop(0.55, cMid);
    bodyGrad.addColorStop(1, cDark);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Bio-rim edge glow
    ctx.strokeStyle = cGlow;
    ctx.lineWidth = Math.max(1.3, R * 0.08);
    ctx.shadowColor = cGlow;
    ctx.shadowBlur = isHit ? 16 : 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 5. Pulsating Glowing Bio-Core in Body Center
    ctx.save();
    const coreRadius = R * (0.28 + pulse * 0.08);

    // Soft outer core radial aura
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius * 1.6, 0, Math.PI * 2);
    const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius * 1.6);
    auraGrad.addColorStop(0, cGlow);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.globalAlpha = isHit ? 1.0 : (0.55 + pulse * 0.35);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Inner vibrant core
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.45, cGlow);
    coreGrad.addColorStop(1, cMid);
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = cGlow;
    ctx.shadowBlur = isHit ? 16 : (10 + pulse * 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Core bright nucleus highlight
    ctx.beginPath();
    ctx.arc(-coreRadius * 0.22, -coreRadius * 0.22, Math.max(1, coreRadius * 0.32), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = isHit ? 1.0 : 0.85;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // 6. Front Sensor Eye
    ctx.save();
    const eyeX = R * 0.72;
    const eyeY = 0;
    const eyeR = Math.max(2.2, R * 0.16);

    // Sensor casing
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR + 1.2, 0, Math.PI * 2);
    ctx.fillStyle = cDark;
    ctx.fill();
    ctx.strokeStyle = cMid;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glowing Sensor Lens
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    const eyeGrad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeR);
    eyeGrad.addColorStop(0, '#ffffff');
    eyeGrad.addColorStop(0.5, cGlow);
    eyeGrad.addColorStop(1, cMid);
    ctx.fillStyle = eyeGrad;
    ctx.shadowColor = cGlow;
    ctx.shadowBlur = isHit ? 14 : 9;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.restore();
  }

  // --- Simplified Bio-Spitter Grunt (Clean, Balanced & Menacing) ---
  drawNormalCyborg(ctx, isHit) {
    this.drawBioSpitterGrunt(ctx, isHit);
  }

  // --- Simplified Bio-Spitter Grunt (Clean, Balanced & Menacing) ---
  drawBioSpitterGrunt(ctx, isHit) {
    const t = this.animTimer;

    // Locomotion & Body animation parameters
    const walkFreq = 10.5; // Synchronized to 155 px/sec movement
    const walkPhase = t * walkFreq;
    const isCharging = (this.spitWindupTimer || 0) > 0;
    const mouthTremble = isCharging ? Math.sin(t * 40) * 0.1 : 0;
    const mandibleFlare = isCharging ? 0.38 + mouthTremble : Math.sin(t * 2.8) * 0.08;
    const breath = Math.sin(t * 2.2) * 0.035;

    // Color definitions
    const cChitinDark = isHit ? '#d8d8d8' : '#03140a';
    const cChitinMid = isHit ? '#e8e8e8' : '#0a2c17';
    const cChitinLight = isHit ? '#ffffff' : '#144e2b';
    const cChitinRim = isHit ? '#ffffff' : '#00ff88';
    const cAcidGlow = isHit ? '#ffffff' : '#39ff14';

    ctx.save();

    // 1. Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 4 Articulated Scuttling Crawler Legs (Symmetric & Clean)
    // Left Front & Right Rear (Phase A); Right Front & Left Rear (Phase B)
    const drawLeg = (hipX, hipY, kneeReachX, kneeReachY, footReachX, footReachY, phase, isUpper) => {
      const stepProg = Math.sin(phase);
      const lift = Math.max(0, -Math.cos(phase)) * 4.5;
      const kneeX = hipX + kneeReachX + stepProg * 4;
      const kneeY = hipY + kneeReachY + (isUpper ? -1 : 1) * (stepProg * 2.5) - (isUpper ? lift : -lift) * 0.4;
      const footX = hipX + footReachX + stepProg * 7.5;
      const footY = hipY + footReachY - (isUpper ? lift : -lift);

      // Upper Segment (Femur)
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo((hipX + kneeX) * 0.5, (hipY + kneeY) * 0.5 + (isUpper ? -3 : 3), kneeX, kneeY);
      ctx.strokeStyle = cChitinDark;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Lower Segment (Tibia & Claw)
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY);
      ctx.quadraticCurveTo((kneeX + footX) * 0.5, (kneeY + footY) * 0.5 + (isUpper ? -2 : 2), footX, footY);
      ctx.strokeStyle = cChitinMid;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Sharp Claw Tip
      ctx.beginPath();
      ctx.arc(footX, footY, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = cChitinRim;
      ctx.fill();

      // Knee Joint Node
      ctx.beginPath();
      ctx.arc(kneeX, kneeY, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? '#ffffff' : '#00aa55';
      ctx.fill();
    };

    // Front Legs (reach forward-outward)
    drawLeg(4, -8, 8, -12, 14, -16, walkPhase, true);
    drawLeg(4, 8, 8, 12, 14, 16, walkPhase + Math.PI, false);

    // Rear Legs (reach backward-outward)
    drawLeg(-6, -9, -10, -11, -16, -14, walkPhase + Math.PI, true);
    drawLeg(-6, 9, -10, 11, -16, 14, walkPhase, false);

    // 3. Abdomen / Tail Plates (Tapered segmented rear shell)
    // Posterior segment
    ctx.save();
    ctx.translate(-14, 0);
    ctx.scale(1.0 + breath, 1.0 + breath);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(-10, -4, -12, 0);
    ctx.quadraticCurveTo(-10, 4, 0, 6);
    ctx.closePath();
    const gradTail = ctx.createLinearGradient(-12, 0, 0, 0);
    gradTail.addColorStop(0, cChitinDark);
    gradTail.addColorStop(1, cChitinMid);
    ctx.fillStyle = gradTail;
    ctx.fill();
    ctx.strokeStyle = cChitinRim;
    ctx.lineWidth = 1;
    ctx.globalAlpha = isHit ? 1.0 : 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // Mid abdominal plate
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.quadraticCurveTo(-14, -8, -15, 0);
    ctx.quadraticCurveTo(-14, 8, -6, 10);
    ctx.closePath();
    ctx.fillStyle = cChitinMid;
    ctx.fill();
    ctx.strokeStyle = cChitinRim;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = isHit ? 1.0 : 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 4. Main Cephalothorax Shield (Aerodynamic Chitin Dome)
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.quadraticCurveTo(11, -12, 0, -13);
    ctx.quadraticCurveTo(-8, -11, -8, 0);
    ctx.quadraticCurveTo(-8, 11, 0, 13);
    ctx.quadraticCurveTo(11, 12, 13, 0);
    ctx.closePath();

    const gradBody = ctx.createRadialGradient(2, -2, 2, 0, 0, 16);
    gradBody.addColorStop(0, cChitinLight);
    gradBody.addColorStop(0.5, cChitinMid);
    gradBody.addColorStop(1, cChitinDark);
    ctx.fillStyle = gradBody;
    ctx.fill();

    // Sleek Edge Bevel
    ctx.strokeStyle = cChitinRim;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = cChitinRim;
    ctx.shadowBlur = isHit ? 12 : 5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dorsal Carapace Spine & Seams
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(8, 0);
    ctx.strokeStyle = cChitinRim;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = isHit ? 1.0 : 0.65;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 5. Dual Front Mandibles / Pincers (Symmetric raptorial cutters)
    const drawMandible = (side) => {
      const isUp = side === 'top';
      const dir = isUp ? -1 : 1;
      const flare = mandibleFlare * dir;

      ctx.save();
      ctx.translate(10, dir * 4);
      ctx.rotate(flare);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(8, dir * 4, 15, dir * 2);
      ctx.quadraticCurveTo(8, dir * 0.5, 0, dir * -1.5);
      ctx.closePath();

      ctx.fillStyle = cChitinMid;
      ctx.fill();

      // Sharp inner cutting edge highlight
      ctx.beginPath();
      ctx.moveTo(0, dir * -1.5);
      ctx.quadraticCurveTo(8, dir * 0.5, 15, dir * 2);
      ctx.strokeStyle = isHit ? '#ffffff' : '#39ff14';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.restore();
    };

    drawMandible('top');
    drawMandible('bottom');

    // 6. The Acid Gland / Maw (Attack Indicator)
    ctx.save();
    ctx.translate(11, 0);

    const baseSacR = isCharging ? 5.5 + Math.sin(t * 30) * 1.0 : 3.0 + Math.sin(t * 3.0) * 0.4;
    const sacGrad = ctx.createRadialGradient(0, 0, 0.5, 0, 0, baseSacR);
    sacGrad.addColorStop(0, '#ffffff');
    sacGrad.addColorStop(0.4, isCharging ? '#39ff14' : '#00ff88');
    sacGrad.addColorStop(1, isCharging ? 'rgba(57, 255, 20, 0.2)' : 'rgba(0, 255, 136, 0.1)');

    ctx.shadowColor = isCharging ? '#39ff14' : '#00ff88';
    ctx.shadowBlur = isCharging ? 18 : 8;

    ctx.beginPath();
    ctx.arc(0, 0, baseSacR, 0, Math.PI * 2);
    ctx.fillStyle = sacGrad;
    ctx.fill();
    ctx.restore();

    // 7. Cyclopean Sensor Visor (Luminous horizontal optics)
    ctx.save();
    ctx.translate(6, 0);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(3, 0, 0, 6);
    ctx.strokeStyle = isHit ? '#ffffff' : '#00ff88';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Central optical iris point
    ctx.beginPath();
    ctx.arc(1.5, 0, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // --- Fast Hunter Stalker Model (Agile Bio-Mantis Predator) ---
  drawFastHunter(ctx, isHit) {
    const t = this.animTimer;

    // Locomotion & animation drivers (calibrated for 240 px/sec rapid agile sprint)
    const sprintFreq = 15.0; // Rapid tripod insectoid sprint
    const flexFreq = 2.2;   // Sleek predatory mantis weapon flex
    const breathFreq = 2.0;

    // Body sprint rocking & aerodynamic breathing
    const bodyRock = Math.sin(t * (sprintFreq * 0.5)) * 0.05;
    const bodyBob = Math.abs(Math.sin(t * sprintFreq)) * 0.6;
    const breathScale = 1.0 + Math.sin(t * breathFreq) * 0.03;

    // Color definitions (Cyan bioluminescent predator)
    const cDeep = isHit ? '#d5e2e6' : '#081217';
    const cBase = isHit ? '#e6f2f5' : '#0e1f26';
    const cMid = isHit ? '#ffffff' : '#16333e';
    const cHigh = isHit ? '#ffffff' : '#224f60';
    const cSpur = isHit ? '#ffffff' : '#1d5568';
    const cCyanGlow = isHit ? '#ffffff' : '#00f0ff';
    const cHighlight = isHit ? '#ffffff' : 'rgba(0, 240, 255, 0.75)';
    const cGlint = isHit ? '#ffffff' : 'rgba(210, 255, 255, 0.95)';

    ctx.save();
    ctx.rotate(bodyRock);
    ctx.translate(0, bodyBob);
    ctx.scale(breathScale, 1.0 / breathScale);

    // ============================================================
    // 1. SIX RAPID TRIPOD CRAWLER LEGS (Agile Needle Appendages)
    // Tripod gait: L1, L3, R2 alternate with L2, R1, R3
    // ============================================================
    const drawFastLeg = (rootX, rootY, phase, defKneeX, defKneeY, defFootX, defFootY, isLeft) => {
      const pSin = Math.sin(phase);
      const pCos = Math.cos(phase);
      const lift = Math.max(0, pSin) * 4.5;
      const reach = pCos * 6.5;

      const kneeX = defKneeX + reach * 0.45;
      const kneeY = defKneeY + (isLeft ? -lift * 0.6 : lift * 0.6);
      const footX = defFootX + reach;
      const footY = defFootY + (isLeft ? -lift : lift);

      // Thigh
      ctx.strokeStyle = cBase;
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.lineTo(kneeX, kneeY);
      ctx.stroke();

      // Shin & needle tarsus
      ctx.strokeStyle = cHigh;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Tarsal needle tip
      ctx.strokeStyle = cCyanGlow;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(footX, footY);
      ctx.lineTo(footX + (isLeft ? -2 : 2), footY + (isLeft ? -2 : 2));
      ctx.stroke();
    };

    // Alternating Tripod Gait Phases
    const phA = t * sprintFreq;
    const phB = t * sprintFreq + Math.PI;

    // Left Flank (3 legs)
    drawFastLeg(-8, -4, phA, -13, -11, -19, -15, true);   // L1 (Rear)
    drawFastLeg(0, -6, phB, 1, -13, 3, -18, true);         // L2 (Mid)
    drawFastLeg(7, -5, phA, 11, -12, 16, -16, true);       // L3 (Front)

    // Right Flank (3 legs, counter-phase)
    drawFastLeg(-8, 4, phB, -13, 11, -19, 15, false);     // R1 (Rear)
    drawFastLeg(0, 6, phA, 1, 13, 3, 18, false);          // R2 (Mid)
    drawFastLeg(7, 5, phB, 11, 12, 16, 16, false);        // R3 (Front)

    // ============================================================
    // 2. AERODYNAMIC CAUDAL TERGITES & STINGER WHIP (Rear Body)
    // ============================================================
    const tailWhip = Math.sin(t * 3.5) * 2.5;

    // Tapered abdomen plates
    ctx.fillStyle = cBase;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.bezierCurveTo(-12, -5, -16, -3 + tailWhip * 0.4, -20, tailWhip);
    ctx.bezierCurveTo(-16, 3 + tailWhip * 0.4, -12, 5, -6, 4);
    ctx.closePath();
    ctx.fill();

    // Needle Stinger Barb
    ctx.fillStyle = cCyanGlow;
    ctx.beginPath();
    ctx.moveTo(-18, tailWhip * 0.8);
    ctx.lineTo(-24, tailWhip * 1.2);
    ctx.lineTo(-19, tailWhip * 0.6 + 1.2);
    ctx.closePath();
    ctx.fill();

    // Abdominal dorsal crest
    ctx.fillStyle = cMid;
    ctx.beginPath();
    ctx.moveTo(-4, -2.5);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-4, 2.5);
    ctx.closePath();
    ctx.fill();

    // ============================================================
    // 3. MAIN AERODYNAMIC CEPHALOTHORAX & SHOULDER BULWARKS
    // ============================================================
    ctx.fillStyle = cMid;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.bezierCurveTo(11, -7, 4, -9, -4, -7);
    ctx.bezierCurveTo(-8, -6, -8, 6, -4, 7);
    ctx.bezierCurveTo(4, 9, 11, 7, 14, 0);
    ctx.closePath();
    ctx.fill();

    // Elevated Dorsal Armor Crest
    ctx.fillStyle = cHigh;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.bezierCurveTo(8, -4, 2, -5, -2, -4);
    ctx.lineTo(-2, 4);
    ctx.bezierCurveTo(2, 5, 8, 4, 11, 0);
    ctx.closePath();
    ctx.fill();

    // Sharp aerodynamic spine highlights
    ctx.strokeStyle = cHighlight;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, -7.5);
    ctx.bezierCurveTo(4, -8, 9, -5, 13, 0);
    ctx.bezierCurveTo(9, 5, 4, 8, -3, 7.5);
    ctx.stroke();

    ctx.strokeStyle = cGlint;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(5, -6);
    ctx.lineTo(12, 0);
    ctx.lineTo(5, 6);
    ctx.stroke();

    // ============================================================
    // 4. TWIN FOLDING MANTIS SCYTHES (Razor Front Weapons)
    // ============================================================
    const clawFlex = Math.sin(t * flexFreq) * 2.5;

    const drawMantisScissor = (sideY, isUpper) => {
      ctx.save();
      ctx.translate(5, sideY);
      const sign = isUpper ? -1 : 1;
      const flexAngle = clawFlex * 0.08 * sign;
      ctx.rotate(flexAngle);

      // Coxa
      ctx.fillStyle = cBase;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(7, sign * 3);
      ctx.lineTo(5, sign * 6);
      ctx.lineTo(-1, sign * 2);
      ctx.closePath();
      ctx.fill();

      // Sickle Blade (razor curved scythe extending forward)
      const bladeTipX = 19 + clawFlex * 0.8;
      const bladeTipY = sign * (1 + clawFlex * 0.3);

      ctx.fillStyle = cHigh;
      ctx.beginPath();
      ctx.moveTo(6, sign * 4);
      ctx.bezierCurveTo(11, sign * 7, bladeTipX - 3, sign * 5, bladeTipX, bladeTipY);
      ctx.lineTo(bladeTipX - 2, bladeTipY - sign * 1.5);
      ctx.quadraticCurveTo(bladeTipX - 6, sign * 1, 5, sign * 2);
      ctx.closePath();
      ctx.fill();

      // Luminous Cyan Blade Edge
      ctx.strokeStyle = cCyanGlow;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(6, sign * 4);
      ctx.bezierCurveTo(11, sign * 7, bladeTipX - 3, sign * 5, bladeTipX, bladeTipY);
      ctx.stroke();

      // Specular glint on tip
      ctx.strokeStyle = cGlint;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(bladeTipX - 4, bladeTipY + sign * 1);
      ctx.lineTo(bladeTipX, bladeTipY);
      ctx.stroke();

      ctx.restore();
    };

    drawMantisScissor(-4, true);
    drawMantisScissor(4, false);

    // ============================================================
    // 5. COMPOUND OPTICS & PULSING CYAN BIO-CORE
    // ============================================================
    // Twin Angled Predatory Cyan Compound Eyes
    const eyeLook = Math.sin(t * 1.5) * 0.5;
    ctx.fillStyle = isHit ? '#ffffff' : '#041014';
    ctx.beginPath();
    ctx.ellipse(10, -3.2, 3.0, 1.8, 0.4, 0, Math.PI * 2);
    ctx.ellipse(10, 3.2, 3.0, 1.8, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Eye aura glow
    if (!isHit) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = cCyanGlow;
    ctx.beginPath();
    ctx.ellipse(10.5 + eyeLook * 0.3, -3.2, 2.0, 1.0, 0.4, 0, Math.PI * 2);
    ctx.ellipse(10.5 + eyeLook * 0.3, 3.2, 2.0, 1.0, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Specular corneal dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(9.8, -3.8, 0.6, 0, Math.PI * 2);
    ctx.arc(9.8, 2.6, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Dorsal Diamond Respiration Core
    const corePulse = 0.85 + 0.25 * Math.sin(t * breathFreq);
    ctx.fillStyle = isHit ? '#ffffff' : `rgba(0, 240, 255, ${0.45 + corePulse * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(3 + corePulse, 0);
    ctx.lineTo(0, -2 * corePulse);
    ctx.lineTo(-3, 0);
    ctx.lineTo(0, 2 * corePulse);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // --- Tank Armored Juggernaut Model (Colossal Armored Bio-Behemoth) ---
  drawTankJuggernaut(ctx, isHit) {
    const t = this.animTimer;

    // Locomotion & colossal animation drivers (calibrated for 85 px/sec crushing siege crawl)
    const stompFreq = 4.8;  // Heavy colossal ground stomp cadence
    const breathFreq = 1.4; // Slow deep bio-hearth respiration
    const ramFreq = 1.1;    // Slow hydraulic crushing shear motion

    // Heavy ground-shaking roll & bob
    const bodyRock = Math.sin(t * (stompFreq * 0.5)) * 0.035;
    const bodyBob = Math.abs(Math.sin(t * stompFreq)) * 1.2;
    const breathScale = 1.0 + Math.sin(t * breathFreq) * 0.03;

    // Color definitions (Crimson volcanic chitin & magma bio-furnace)
    const cDeep = isHit ? '#dad2d4' : '#10080c';
    const cBase = isHit ? '#ebdce0' : '#1c0e14';
    const cMid = isHit ? '#ffffff' : '#2d151e';
    const cHigh = isHit ? '#ffffff' : '#451e2b';
    const cSpur = isHit ? '#ffffff' : '#5c2234';
    const cMagma = isHit ? '#ffffff' : '#ff3366';
    const cOrange = isHit ? '#ffffff' : '#ff8844';
    const cHighlight = isHit ? '#ffffff' : 'rgba(255, 75, 110, 0.8)';
    const cGlint = isHit ? '#ffffff' : 'rgba(255, 210, 220, 0.95)';

    ctx.save();
    const tankScale = (this.radius || 24) / 34;
    ctx.rotate(bodyRock);
    ctx.translate(0, bodyBob);
    ctx.scale(tankScale * breathScale, (tankScale / breathScale));

    // ============================================================
    // 1. FOUR MASSIVE ARMORED STOMPER PILLARS (Goliath Cleats)
    // 4-corner heavy hydraulic crushing stompers
    // ============================================================
    const drawTankStomper = (rootX, rootY, phase, defKneeX, defKneeY, defFootX, defFootY, isUpper) => {
      const pSin = Math.sin(phase);
      const pCos = Math.cos(phase);
      const lift = Math.max(0, pSin) * 5.0;
      const reach = pCos * 5.5;

      const kneeX = defKneeX + reach * 0.4;
      const kneeY = defKneeY + (isUpper ? -lift * 0.5 : lift * 0.5);
      const footX = defFootX + reach;
      const footY = defFootY + (isUpper ? -lift : lift);

      // Hydraulic Sinew Core
      ctx.strokeStyle = '#18080d';
      ctx.lineWidth = 6.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.lineTo(kneeX, kneeY);
      ctx.stroke();

      // Armored Knee Cowl (Massive chitin plate)
      ctx.fillStyle = cMid;
      ctx.beginPath();
      ctx.arc(kneeX, kneeY, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Lower Column
      ctx.strokeStyle = cBase;
      ctx.lineWidth = 5.0;
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Heavy Ground-Cracking Spiked Cleat (Foot Pad)
      ctx.fillStyle = cHigh;
      ctx.beginPath();
      ctx.moveTo(footX - 7, footY + (isUpper ? -1 : 1));
      ctx.lineTo(footX + 7, footY + (isUpper ? -1 : 1));
      ctx.lineTo(footX + 9, footY + (isUpper ? -6 : 6));
      ctx.lineTo(footX - 9, footY + (isUpper ? -6 : 6));
      ctx.closePath();
      ctx.fill();

      // Cleat ground spikes
      ctx.fillStyle = cSpur;
      ctx.beginPath();
      ctx.moveTo(footX - 8, footY + (isUpper ? -6 : 6));
      ctx.lineTo(footX - 5, footY + (isUpper ? -9 : 9));
      ctx.lineTo(footX - 2, footY + (isUpper ? -6 : 6));
      ctx.lineTo(footX + 2, footY + (isUpper ? -6 : 6));
      ctx.lineTo(footX + 5, footY + (isUpper ? -9 : 9));
      ctx.lineTo(footX + 8, footY + (isUpper ? -6 : 6));
      ctx.fill();
    };

    // Stomper Phases (Heavy alternating gait)
    const stA = t * stompFreq;
    const stB = t * stompFreq + Math.PI;
    const stC = t * stompFreq + Math.PI * 0.5;
    const stD = t * stompFreq + Math.PI * 1.5;

    // Rear Stompers
    drawTankStomper(-12, -14, stA, -18, -22, -22, -28, true);   // Rear-Left
    drawTankStomper(-12, 14, stB, -18, 22, -22, 28, false);    // Rear-Right

    // Front Stompers
    drawTankStomper(10, -16, stC, 16, -24, 20, -30, true);     // Front-Left
    drawTankStomper(10, 16, stD, 16, 24, 20, 30, false);       // Front-Right

    // ============================================================
    // 2. MASSIVE TECTONIC DORSAL CARAPACE (4 Layered Armor Tergites)
    // ============================================================
    // Layer 1: Posterior Tergite Bulb & Spine Barbs
    ctx.fillStyle = cBase;
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.bezierCurveTo(-26, -18, -32, -10, -34, 0);
    ctx.bezierCurveTo(-32, 10, -26, 18, -16, 16);
    ctx.closePath();
    ctx.fill();

    // Heavy posterior defensive horns
    ctx.fillStyle = cSpur;
    ctx.beginPath();
    ctx.moveTo(-28, -8); ctx.lineTo(-38, -12); ctx.lineTo(-30, -3); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-31, -2); ctx.lineTo(-40, 0); ctx.lineTo(-31, 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-28, 8); ctx.lineTo(-38, 12); ctx.lineTo(-30, 3); ctx.fill();

    // Layer 2: Main Heavy Thoracic Shield
    ctx.fillStyle = cMid;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.bezierCurveTo(18, -22, 2, -26, -14, -22);
    ctx.bezierCurveTo(-24, -18, -24, 18, -14, 22);
    ctx.bezierCurveTo(2, 26, 18, 22, 18, 0);
    ctx.closePath();
    ctx.fill();

    // Layer 3: Armored Shoulder Bulwarks (Protecting leg sockets)
    ctx.fillStyle = cHigh;
    ctx.beginPath();
    // Left shoulder plate
    ctx.moveTo(14, -14);
    ctx.bezierCurveTo(10, -28, -8, -30, -16, -20);
    ctx.lineTo(-4, -12);
    ctx.closePath();
    ctx.fill();

    // Right shoulder plate
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.bezierCurveTo(10, 28, -8, 30, -16, 20);
    ctx.lineTo(-4, 12);
    ctx.closePath();
    ctx.fill();

    // Hazard Armor Ridges on Shoulder Plates
    ctx.strokeStyle = isHit ? '#ffffff' : '#ffb703';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(6, -25); ctx.lineTo(12, -18);
    ctx.moveTo(-2, -26); ctx.lineTo(4, -19);
    ctx.moveTo(6, 25); ctx.lineTo(12, 18);
    ctx.moveTo(-2, 26); ctx.lineTo(4, 19);
    ctx.stroke();

    // Heavy Chitin Carapace Highlight Crest
    ctx.strokeStyle = cHighlight;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-18, -20);
    ctx.bezierCurveTo(0, -25, 14, -19, 17, 0);
    ctx.bezierCurveTo(14, 19, 0, 25, -18, 20);
    ctx.stroke();

    ctx.strokeStyle = cGlint;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.bezierCurveTo(4, -22, 12, -15, 15, 0);
    ctx.stroke();

    // ============================================================
    // 3. TWIN VOLCANIC EXHAUST CHIMNEYS (Bio-Steam Vents)
    // ============================================================
    const ventPulse = Math.abs(Math.sin(t * breathFreq));
    const drawChimney = (vy) => {
      ctx.fillStyle = '#12070a';
      ctx.beginPath();
      ctx.ellipse(-10, vy, 4.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vent interior molten ember
      if (!isHit) {
        ctx.fillStyle = `rgba(255, 60, 90, ${0.4 + ventPulse * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(-10, vy, 2.8, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawChimney(-14);
    drawChimney(14);

    // ============================================================
    // 4. PULSING MAGMA BIO-REACTOR (Central Hearth Core)
    // ============================================================
    const corePulse = 0.85 + 0.22 * Math.sin(t * breathFreq);
    const coreX = 0;
    const coreY = 0;

    // Recessed furnace cavity
    ctx.fillStyle = '#080204';
    ctx.beginPath();
    ctx.arc(coreX, coreY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Magma Radial Glow
    if (!isHit) {
      const mGrad = ctx.createRadialGradient(coreX, coreY, 1, coreX, coreY, 18 * corePulse);
      mGrad.addColorStop(0, 'rgba(255, 51, 102, 0.7)');
      mGrad.addColorStop(0.5, 'rgba(255, 120, 50, 0.35)');
      mGrad.addColorStop(1, 'rgba(100, 20, 30, 0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, 18 * corePulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Concentric Molten Core Plates
    ctx.fillStyle = isHit ? '#ffffff' : cMagma;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 7.5 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isHit ? '#ffffff' : cOrange;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 4.2 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(coreX - 1.5, coreY - 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Interlocking Protective Carapace Ribs over Core
    ctx.strokeStyle = cMid;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(coreX - 9, -5); ctx.lineTo(coreX + 9, -5);
    ctx.moveTo(coreX - 10, 0); ctx.lineTo(coreX + 10, 0);
    ctx.moveTo(coreX - 9, 5); ctx.lineTo(coreX + 9, 5);
    ctx.stroke();

    // ============================================================
    // 5. TWIN COLOSSAL BATTERING CRUSHERS (Hydraulic Front Rams)
    // ============================================================
    const ramFlex = Math.sin(t * ramFreq) * 3.5;

    const drawRamMandible = (sign) => {
      ctx.save();
      ctx.translate(14, sign * 8);
      ctx.rotate(ramFlex * 0.05 * sign);

      // Heavy Piston Base
      ctx.fillStyle = cBase;
      ctx.fillRect(0, sign * -4, 9, 8);

      // Serrated Crushing Behemoth Tusk
      const ramTipX = 22 + ramFlex * 0.6;
      const ramTipY = sign * (12 - ramFlex * 0.4);

      ctx.fillStyle = cHigh;
      ctx.beginPath();
      ctx.moveTo(7, sign * -4);
      ctx.lineTo(ramTipX, ramTipY);
      ctx.lineTo(ramTipX - 4, ramTipY + sign * 4);
      ctx.lineTo(5, sign * 5);
      ctx.closePath();
      ctx.fill();

      // Heavy serrated inner crush teeth
      ctx.fillStyle = cSpur;
      ctx.beginPath();
      ctx.moveTo(11, sign * 2); ctx.lineTo(14, sign * -1); ctx.lineTo(13, sign * 4); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(16, sign * 4); ctx.lineTo(19, sign * 1); ctx.lineTo(18, sign * 6); ctx.fill();

      // Convex Battering Edge Highlight
      ctx.strokeStyle = cHighlight;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(7, sign * -4);
      ctx.lineTo(ramTipX, ramTipY);
      ctx.stroke();

      // Tip glint
      ctx.strokeStyle = cGlint;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ramTipX - 5, ramTipY - sign * 2);
      ctx.lineTo(ramTipX, ramTipY);
      ctx.stroke();

      ctx.restore();
    };

    drawRamMandible(-1);
    drawRamMandible(1);

    // ============================================================
    // 6. ARMORED BROW & TRIPLE CRIMSON VISOR SLITS
    // ============================================================
    // Armored Brow Plate
    ctx.fillStyle = cBase;
    ctx.beginPath();
    ctx.moveTo(15, -7);
    ctx.lineTo(21, -3);
    ctx.lineTo(22, 0);
    ctx.lineTo(21, 3);
    ctx.lineTo(15, 7);
    ctx.closePath();
    ctx.fill();

    // Triple Recessed Crimson Eye Slits
    const drawVisorSlit = (vx, vy, vAngle) => {
      ctx.fillStyle = '#060102';
      ctx.beginPath();
      ctx.ellipse(vx, vy, 3.2, 1.4, vAngle, 0, Math.PI * 2);
      ctx.fill();

      if (!isHit) {
        ctx.fillStyle = cMagma;
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.beginPath();
      ctx.ellipse(vx, vy, 2.0, 0.8, vAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    drawVisorSlit(18, -3.2, 0.3);
    drawVisorSlit(19, 0, 0);
    drawVisorSlit(18, 3.2, -0.3);

    ctx.restore();
  }

  // =========================================================================
  // 4. SHIELD ENFORCER // HEAVY FRONTAL DEFLECTOR DRONE
  // =========================================================================
  drawShieldEnforcer(ctx, isHit) {
    ctx.save();
    const cArmor = isHit ? '#ffffff' : '#0c1626';
    const cAccent = isHit ? '#ffffff' : '#00d4ff';

    // Armored Main Hull
    ctx.fillStyle = cArmor;
    ctx.strokeStyle = cAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shoulder Plating
    ctx.fillStyle = '#162840';
    ctx.fillRect(-10, -22, 14, 8);
    ctx.fillRect(-10, 14, 14, 8);

    // Frontal Projected Energy Shield Arc
    ctx.save();
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(8, 0, 26, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    // Secondary energy field ripple
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(10, 0, 30, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
    ctx.restore();

    // Dual Optic Sensors
    ctx.fillStyle = cAccent;
    ctx.shadowColor = cAccent;
    ctx.shadowBlur = 6;
    ctx.fillRect(10, -5, 4, 3);
    ctx.fillRect(10, 2, 4, 3);
    ctx.restore();
  }

  // =========================================================================
  // 5. PHANTOM SNIPER // ELITE HIGH-TECH CYBERNETIC MARKSMAN ASSASSIN
  // =========================================================================
  drawPhantomSniper(ctx, isHit) {
    const t = this.animTimer || 0;
    const isAiming = this.sniperAimTimer && this.sniperAimTimer > 0;
    const breath = Math.sin(t * 2.4) * 0.04;
    const floatBob = Math.sin(t * 3.2) * 1.5;

    // Palette: Obsidian, Deep Void Purple, Radiant Psionic Violet & Pure Neon Pink
    const cObsidian = isHit ? '#ffffff' : '#0e0717';
    const cArmor = isHit ? '#e2d9f3' : '#1c0f2e';
    const cArmorLight = isHit ? '#ffffff' : '#2d1847';
    const cNeonViolet = isHit ? '#ffffff' : '#b026ff';
    const cPlasmaGlow = isHit ? '#ffffff' : '#d946ef';

    ctx.save();
    ctx.translate(0, floatBob);

    // 1. Soft Under-Chassis Psionic Shadow & Hover Distortion
    ctx.save();
    ctx.fillStyle = isHit ? 'rgba(255, 255, 255, 0.2)' : 'rgba(176, 38, 255, 0.15)';
    ctx.shadowColor = cNeonViolet;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Targeting Laser Telegraph & Holographic Reticle when Aiming
    if (isAiming) {
      const aimProg = Math.min(1.0, this.sniperAimTimer / 1.1);
      ctx.save();
      ctx.strokeStyle = `rgba(217, 70, 239, ${0.4 + aimProg * 0.55})`;
      ctx.lineWidth = 1.6 + aimProg * 0.8;
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 12 * aimProg;
      ctx.setLineDash([10, 4]);
      ctx.beginPath();
      ctx.moveTo(38, 0);
      ctx.lineTo(850, 0);
      ctx.stroke();

      // Pulsing crosshair at barrel tip
      ctx.strokeStyle = cPlasmaGlow;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(38, 0, 5 + Math.sin(t * 20) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Dual Rear Plasma Ion Thruster Exhausts
    const thrusterPulse = 0.7 + 0.3 * Math.sin(t * 16);
    const drawThruster = (ty) => {
      ctx.save();
      ctx.translate(-16, ty);
      // Thruster Cowling
      ctx.fillStyle = '#12081f';
      ctx.strokeStyle = cNeonViolet;
      ctx.lineWidth = 1.2;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeRect(-3, -3, 6, 6);

      // Plasma Flame Core
      const flameGrad = ctx.createLinearGradient(0, 0, -10 * thrusterPulse, 0);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, cPlasmaGlow);
      flameGrad.addColorStop(1, 'rgba(176, 38, 255, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(0, -2.5);
      ctx.lineTo(-9 * thrusterPulse, 0);
      ctx.lineTo(0, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawThruster(-9);
    drawThruster(9);

    // 4. Swept-Back Stealth Aerodynamic Wings (Layered Angular Wings)
    const drawWing = (side) => {
      const dir = side === 'top' ? -1 : 1;
      ctx.save();
      // Outer Wing Blade
      ctx.beginPath();
      ctx.moveTo(-6, dir * 4);
      ctx.lineTo(-20, dir * 20);
      ctx.lineTo(-10, dir * 22);
      ctx.lineTo(4, dir * 12);
      ctx.lineTo(8, dir * 5);
      ctx.closePath();
      ctx.fillStyle = cArmor;
      ctx.fill();
      ctx.strokeStyle = cNeonViolet;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Wingtip Neon Energy Conduit
      ctx.beginPath();
      ctx.moveTo(-18, dir * 19);
      ctx.lineTo(-9, dir * 21);
      ctx.strokeStyle = cPlasmaGlow;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = cPlasmaGlow;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner Armor Flap
      ctx.beginPath();
      ctx.moveTo(-4, dir * 6);
      ctx.lineTo(-12, dir * 14);
      ctx.lineTo(-5, dir * 15);
      ctx.lineTo(2, dir * 9);
      ctx.closePath();
      ctx.fillStyle = cArmorLight;
      ctx.fill();
      ctx.restore();
    };
    drawWing('top');
    drawWing('bottom');

    // 5. Heavy Articulated Stabilizer Bipod Claws (Forward Flanking)
    const drawClaw = (side) => {
      const dir = side === 'top' ? -1 : 1;
      ctx.save();
      ctx.translate(6, dir * 10);
      const sway = Math.sin(t * 3 + (dir > 0 ? 0 : Math.PI)) * 0.08;
      ctx.rotate(sway);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(12, dir * 4);
      ctx.lineTo(8, dir * 1.5);
      ctx.lineTo(0, dir * 2);
      ctx.closePath();
      ctx.fillStyle = cObsidian;
      ctx.strokeStyle = cNeonViolet;
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      // Glowing claw joint node
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = cPlasmaGlow;
      ctx.fill();
      ctx.restore();
    };
    drawClaw('top');
    drawClaw('bottom');

    // 6. Long Rail-Accelerator Sniper Barrel (Precision Heavy Cannon)
    ctx.save();
    // Heavy Rail Receiver Mount
    ctx.fillStyle = '#11061c';
    ctx.strokeStyle = cNeonViolet;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(4, -4.5, 14, 9, 2);
    ctx.fill();
    ctx.stroke();

    // Twin Electromagnetic Accelerator Rails (extends forward to x: 38)
    const railGrad = ctx.createLinearGradient(12, 0, 36, 0);
    railGrad.addColorStop(0, '#31174d');
    railGrad.addColorStop(0.5, '#1e0e30');
    railGrad.addColorStop(1, '#441f6e');
    ctx.fillStyle = railGrad;
    ctx.fillRect(16, -2.8, 20, 5.6);

    // 3 Violet Electromagnetic Capacitor Rings along the barrel
    const ringPositions = [20, 26, 32];
    ringPositions.forEach((rx) => {
      ctx.fillStyle = isAiming ? cPlasmaGlow : cNeonViolet;
      ctx.shadowColor = cPlasmaGlow;
      ctx.shadowBlur = isAiming ? 10 : 4;
      ctx.fillRect(rx, -4, 2.5, 8);
    });
    ctx.shadowBlur = 0;

    // Vented Muzzle Compensator / Flash Suppressor Tip
    ctx.fillStyle = '#0a0312';
    ctx.fillRect(36, -3.2, 4, 6.4);
    ctx.strokeStyle = cNeonViolet;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(36, -3.2, 4, 6.4);

    // Dark Bore Hole
    ctx.fillStyle = '#000000';
    ctx.fillRect(39, -1.2, 1.2, 2.4);
    ctx.restore();

    // 7. Central Armored Carapace & Psionic Void Core
    ctx.save();
    // Segmented Hexagonal Hull Shell
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(8, -10);
    ctx.lineTo(-8, -11);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-8, 11);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fillStyle = cArmor;
    ctx.fill();
    ctx.strokeStyle = cNeonViolet;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = cNeonViolet;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner Faceted Armor Plates
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -6);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-6, 7);
    ctx.lineTo(4, 6);
    ctx.closePath();
    ctx.fillStyle = cArmorLight;
    ctx.fill();

    // Pulsating Spherical Psionic Capacitor Core
    const coreR = 4.2 + (breath * 12) + (isAiming ? Math.sin(t * 25) * 0.8 : 0);
    const coreGrad = ctx.createRadialGradient(-2, 0, 0.5, -2, 0, coreR);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, cPlasmaGlow);
    coreGrad.addColorStop(1, 'rgba(176, 38, 255, 0.2)');
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = cPlasmaGlow;
    ctx.shadowBlur = isAiming ? 18 : 10;
    ctx.beginPath();
    ctx.arc(-2, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 8. Tri-Optic Multi-Spectrum Sniper Sensor Array (Visor Head)
    ctx.save();
    ctx.translate(6, 0);

    // Primary Central Long-Range Zoom Sensor
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = cPlasmaGlow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(3.5, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Auxiliary Left & Right Sensor Nodes
    ctx.fillStyle = cNeonViolet;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(1.5, -3.8, 1.4, 0, Math.PI * 2);
    ctx.arc(1.5, 3.8, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Visor HUD Eyeline Arc
    ctx.strokeStyle = cPlasmaGlow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(1, 0, 5.5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // =========================================================================
  // 6. KAMIKAZE BOMBER // HIGH-TECH VOLATILE EXPLOSIVE DRONE
  // =========================================================================
  drawKamikazeBomber(ctx, isHit) {
    ctx.save();
    const t = (this.animTimer || 0);
    const pulse = 0.5 + 0.5 * Math.sin(t * 14);
    const fastPulse = 0.5 + 0.5 * Math.sin(t * 26);
    const isPriming = (this.fuseTimer && this.fuseTimer > 0);
    const warningPulse = isPriming ? fastPulse : pulse;

    // 1. Dual Rear Directional Thruster Jets with Animated Plasma Plumes
    const thrusterOffset = 8;
    const flameLen = 10 + warningPulse * 12 + Math.random() * 4;
    [-thrusterOffset, thrusterOffset].forEach(offsetY => {
      // Thruster Bell Housing
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-17, offsetY - 3, 5, 6);
      ctx.strokeRect(-17, offsetY - 3, 5, 6);

      // Flickering Plasma Exhaust Flame
      const flameGrad = ctx.createLinearGradient(-17, offsetY, -17 - flameLen, offsetY);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.25, '#ffaa00');
      flameGrad.addColorStop(0.7, '#ff3300');
      flameGrad.addColorStop(1, 'rgba(255, 51, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(-17, offsetY - 2.5);
      ctx.lineTo(-17 - flameLen, offsetY);
      ctx.lineTo(-17, offsetY + 2.5);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.fill();
    });

    // 2. Lateral Volatile Payload Canisters (Left & Right Nitro-Glycerin Plasma Vials)
    [-13, 13].forEach(offsetY => {
      // Metallic Mount Strut
      ctx.fillStyle = '#292524';
      ctx.fillRect(-6, offsetY > 0 ? 9 : -12, 12, 3);

      // Glass Payload Tube
      ctx.fillStyle = '#0c0a09';
      ctx.strokeStyle = warningPulse > 0.5 ? '#ff7700' : '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-8, offsetY - 3.5, 16, 7, 2) : ctx.rect(-8, offsetY - 3.5, 16, 7);
      ctx.fill();
      ctx.stroke();

      // Glowing Volatile Plasma Fluid Inside Canister
      const fluidGrad = ctx.createLinearGradient(-7, offsetY, 7, offsetY);
      fluidGrad.addColorStop(0, '#ff3300');
      fluidGrad.addColorStop(0.5, '#ffcc00');
      fluidGrad.addColorStop(1, '#ff5500');
      ctx.fillStyle = isHit ? '#ffffff' : fluidGrad;
      ctx.fillRect(-6, offsetY - 2, 12, 4);

      // Hazard tick marks on vial
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-2, offsetY - 2.5, 1, 5);
      ctx.fillRect(2, offsetY - 2.5, 1, 5);
    });

    // 3. Swept Aerodynamic Stabilizer Wings & Hazard Chevron Fins
    ctx.fillStyle = isHit ? '#ffffff' : '#1c1917';
    ctx.strokeStyle = isHit ? '#ffffff' : '#ea580c';
    ctx.lineWidth = 1.5;

    // Upper Wing
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(-16, -18);
    ctx.lineTo(-8, -18);
    ctx.lineTo(6, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower Wing
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-16, 18);
    ctx.lineTo(-8, 18);
    ctx.lineTo(6, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hazard Stripes on Wings (Yellow/Orange diagonal slashes)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-13, -17); ctx.lineTo(-9, -13);
    ctx.moveTo(-9, -17); ctx.lineTo(-5, -13);
    ctx.moveTo(-13, 17); ctx.lineTo(-9, 13);
    ctx.moveTo(-9, 17); ctx.lineTo(-5, 13);
    ctx.stroke();

    // 4. Main Armored Hexagonal Hull Chassis
    ctx.beginPath();
    const hexR = 15;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const hx = Math.cos(a) * hexR;
      const hy = Math.sin(a) * hexR;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    // Carbon-fiber / dark titanium body
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, hexR);
    if (isHit) {
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(1, '#93c5fd');
    } else {
      bodyGrad.addColorStop(0, '#44403c');
      bodyGrad.addColorStop(0.6, '#292524');
      bodyGrad.addColorStop(1, '#0c0a09');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = isHit ? '#ffffff' : (isPriming ? '#ef4444' : '#f97316');
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rivet studs around hull vertices
    ctx.fillStyle = '#78716c';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rx = Math.cos(a) * (hexR - 2.5);
      const ry = Math.sin(a) * (hexR - 2.5);
      ctx.beginPath();
      ctx.arc(rx, ry, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Rotating Magnetic Containment Iris Ring
    ctx.save();
    ctx.rotate(t * 3.5);
    ctx.strokeStyle = isHit ? '#ffffff' : 'rgba(255, 115, 0, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 6. Volatile Superheated Plasma Reactor Core
    const coreR = 6.5 + warningPulse * 2.5;
    const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, coreR);
    if (isHit) {
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(1, '#60a5fa');
    } else if (isPriming) {
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#ff2200');
      coreGrad.addColorStop(1, '#7f1d1d');
    } else {
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.35, '#ffaa00');
      coreGrad.addColorStop(0.8, '#ff3300');
      coreGrad.addColorStop(1, 'rgba(185, 28, 28, 0.9)');
    }

    ctx.save();
    ctx.shadowColor = isPriming ? '#ff0000' : '#ff5500';
    ctx.shadowBlur = 14 + warningPulse * 12;
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    // Arcing electric discharge sparks over core
    if (warningPulse > 0.4) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const sparkA = t * 18;
      ctx.moveTo(Math.cos(sparkA) * 3, Math.sin(sparkA) * 3);
      ctx.lineTo(Math.cos(sparkA + 1.2) * (coreR - 1), Math.sin(sparkA + 1.2) * (coreR - 1));
      ctx.stroke();
    }
    ctx.restore();

    // 7. Forward Optical Cyclops Eye & Targeting Laser Diode
    const eyeX = 11;
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(eyeX - 1, -3, 3, 6);
    ctx.fillStyle = isHit ? '#ffffff' : (warningPulse > 0.5 ? '#ff0033' : '#ff5500');
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(eyeX + 1.5, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Forward Laser Rangefinder Target Tick
    if (!isHit) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(eyeX + 4, 0);
      ctx.lineTo(eyeX + 14, 0);
      ctx.stroke();
    }

    // 8. Warning Strobe Beacon on top of chassis
    const strobeAlpha = fastPulse > 0.6 ? 1.0 : 0.15;
    ctx.fillStyle = `rgba(255, 30, 0, ${strobeAlpha})`;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = fastPulse > 0.6 ? 12 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.Enemy = Enemy;
