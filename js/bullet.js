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
    this.radius = options.radius || (this.weaponType === 'railgun' ? 8 : 4);
    if (this.weaponType === 'railgun') {
      this.radius = Math.max(this.radius, 8);
    }
    this.maxDistance = options.range || 1400;
    this.distanceTraveled = 0;
    this.active = true;

    // Piercing / Railgun ballistics
    this.penetrating = !!options.penetrating;
    this.maxPenetrations = options.maxPenetrations || 4;
    this.penetrations = 0;
    this.hitTargets = new Set();

    // Explosive / Nova Cannon / Vortex ballistics
    this.explosive = (!!options.explosive && this.weaponType !== 'hydra') || this.weaponType === 'cannon' || this.weaponType === 'vortex';
    this.splashDamage = this.weaponType === 'hydra' ? 0 : (options.splashDamage || 95);
    this.blastRadius = this.weaponType === 'hydra' ? 0 : (options.blastRadius || 125);
    this.screenShake = options.screenShake || 6.5;

    // Smart Homing (Hydra Micro-Missile guidance)
    this.homing = !!options.homing || this.weaponType === 'hydra';
    this.homingTarget = null;
    this.initialAngle = angle;

    // Singularity Gravity Vortex
    this.isVortex = !!options.isVortex || this.weaponType === 'vortex';
    this.pullRadius = options.pullRadius || 300;

    // Tesla Chain Lightning
    this.chainTargets = options.chainTargets || 3;
    this.chainRange = options.chainRange || 220;
    this.chainDamage = options.chainDamage || 40;

    // Trail history for high-speed plasma tracer look
    this.trail = [];
    this.maxTrail = options.maxTrail || (this.weaponType === 'railgun' ? 10 : (this.weaponType === 'cannon' ? 8 : (this.weaponType === 'hydra' ? 12 : 6)));
    this.pulseAnim = Math.random() * Math.PI * 2;
  }

  // Swept line-segment vs circle Continuous Collision Detection (CCD)
  // Tests if the line segment from (x0, y0) to (x1, y1) intersects a circle at (cx, cy) with radius totalRadius.
  // Returns { hit: true, t: entryParam, hitX, hitY } or null.
  checkSegmentCircle(x0, y0, x1, y1, cx, cy, totalRadius) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;

    if (lenSq < 0.00001) {
      const dSq = (x0 - cx) ** 2 + (y0 - cy) ** 2;
      if (dSq <= totalRadius * totalRadius) {
        return { hit: true, t: 0, hitX: x0, hitY: y0 };
      }
      return null;
    }

    const wx = cx - x0;
    const wy = cy - y0;
    const proj = wx * dx + wy * dy;
    const tClamped = Math.max(0, Math.min(1, proj / lenSq));
    const closestX = x0 + tClamped * dx;
    const closestY = y0 + tClamped * dy;
    const distSq = (closestX - cx) ** 2 + (closestY - cy) ** 2;

    if (distSq <= totalRadius * totalRadius) {
      // Find exact entry parameter along [0, 1]
      const segLen = Math.sqrt(lenSq);
      const halfChord = Math.sqrt(Math.max(0, totalRadius * totalRadius - distSq));
      const tEntry = Math.max(0, Math.min(1, (proj / segLen - halfChord) / segLen));
      return {
        hit: true,
        t: tEntry,
        hitX: x0 + tEntry * dx,
        hitY: y0 + tEntry * dy
      };
    }
    return null;
  }

  update(dt, map, enemies, barrels, game) {
    if (!this.active) return;

    this.pulseAnim += dt * 16;

    // Record trail point
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.pop();
    }

    // 0. Smart Directional Homing Steer (Hydra Micro-Missiles)
    // Considers the fired direction and prioritizes enemies ahead in the forward cone; never turns 180° backward
    if (this.homing) {
      const potentialTargets = [];
      if (enemies && enemies.length > 0) {
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (e && e.alive && !(e.type === 'ghost' && e.isPhased)) {
            potentialTargets.push(e);
          }
        }
      }
      if (game && game.network && game.network.remotePlayers) {
        const isMyBullet = !this.shooterId || this.shooterId === game.localPlayerId;
        const isTeamsMode = game.network.lobbyMode === 'teams';
        const myTeam = (game.player && game.player.team) ? game.player.team : this.shooterTeam;
        if (isMyBullet) {
          for (const rId in game.network.remotePlayers) {
            const rp = game.network.remotePlayers[rId];
            if (!rp || !rp.alive || (rp.invulnerableTimer && rp.invulnerableTimer > 0)) continue;
            if (isTeamsMode && myTeam && rp.team && myTeam === rp.team) continue;
            potentialTargets.push(rp);
          }
        } else {
          // In multiplayer, opponent missiles also simulate guidance locally toward local player!
          const shooterRp = game.network.remotePlayers[this.shooterId];
          const shooterTeam = this.shooterTeam || (shooterRp ? shooterRp.team : null);
          const isTeammate = isTeamsMode && shooterTeam && game.player && game.player.team && shooterTeam === game.player.team;
          if (!isTeammate && game.player && game.player.alive && game.player.invulnerableTime <= 0) {
            potentialTargets.push(game.player);
          }
        }
      }

      // 1. Verify existing locked target
      if (this.homingTarget) {
        const t = this.homingTarget;
        const isDead = !t.alive || (t.type === 'ghost' && t.isPhased);
        const toTargetAngle = Math.atan2(t.y - this.y, t.x - this.x);
        let diff = toTargetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const dist = Math.hypot(t.x - this.x, t.y - this.y);

        // Discard target if dead or drifted off-angle (>32 deg), ensuring the missile arcs gracefully past dodging players
        if (isDead || Math.abs(diff) > Math.PI * 0.18 || dist > 550) {
          this.homingTarget = null;
        }
      }

      // 2. Select best target in calibrated forward cone
      if (!this.homingTarget && potentialTargets.length > 0) {
        let bestScore = Infinity;
        let bestTarget = null;
        const maxConeAngle = Math.PI * 0.20; // ~36 degrees from forward heading (~72 deg total cone)
        const maxRange = 500;

        for (let i = 0; i < potentialTargets.length; i++) {
          const t = potentialTargets[i];
          const dist = Math.hypot(t.x - this.x, t.y - this.y);
          if (dist > maxRange) continue;

          const toTargetAngle = Math.atan2(t.y - this.y, t.x - this.x);
          let angleDiff = toTargetAngle - this.angle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          const absAngle = Math.abs(angleDiff);

          // Strictly ignore targets outside the forward search cone
          if (absAngle > maxConeAngle) continue;

          // Score by distance and alignment
          const alignmentPenalty = 1.0 + (absAngle / maxConeAngle) * 1.5;
          const score = dist * alignmentPenalty;

          if (score < bestScore) {
            bestScore = score;
            bestTarget = t;
          }
        }

        if (bestTarget) {
          this.homingTarget = bestTarget;
        }
      }

      // 3. Smooth curving arc towards locked target with soft launch ramp and terminal approach damping
      if (this.homingTarget) {
        const t = this.homingTarget;
        const dist = Math.hypot(t.x - this.x, t.y - this.y);

        // A. Initial launch ramp: straight exit for first 50px, gentle guidance ramp over next 130px
        const launchRamp = Math.min(1.0, Math.max(0, (this.distanceTraveled - 50) / 130));

        // B. Terminal phase damping: within 170px of target, steering smoothly drops to 0 at 50px
        // Freezes heading into a committed ballistic line, completely preventing late sharp snaps!
        const proximityDamp = Math.max(0, Math.min(1.0, (dist - 50) / 120));

        // Dynamically lead the target based on target's velocity so the arc adjusts to their movement
        const leadTime = Math.min(0.25, dist / this.speed);
        const aimTargetX = t.x + (t.vx || 0) * leadTime;
        const aimTargetY = t.y + (t.vy || 0) * leadTime;

        const targetAngle = Math.atan2(aimTargetY - this.y, aimTargetX - this.x);
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        // Gentle, fluid turning (~68 deg/sec base, dampening to 0 near target): never sharp!
        const maxTurn = 1.2 * dt * launchRamp * proximityDamp;
        if (maxTurn > 0.00001) {
          this.angle += Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
          this.vx = Math.cos(this.angle) * this.speed;
          this.vy = Math.sin(this.angle) * this.speed;
        }
      }
    }

    // Micro thruster spark particles for Hydra micro-missiles
    if (this.weaponType === 'hydra' && Math.random() < 0.6 && window.particleSystem) {
      window.particleSystem.emit(this.x, this.y, 1, {
        speed: 40,
        color: '#ff007f',
        life: 0.18,
        size: 2.2
      });
    }
    // 0.1 Gravitational Vortex Suction Pull (Singularity Cannon)
    if (this.isVortex) {
      const isMyBullet = !this.shooterId || (game && this.shooterId === game.localPlayerId);

      // Calculates escape factor: 0.0 means fully escaping/resisting, 1.0 means full suction pull
      const calculateEscapeFactor = (entity, dist) => {
        // 1. Dash with Space: If entity is actively dashing, or in post-dash gravity escape grace
        if (entity.isDashing || (entity.gravityEscapeTimer && entity.gravityEscapeTimer > 0)) {
          const dashAngle = entity.dashAngle !== undefined ? entity.dashAngle : (entity.angle || 0);
          const pullAngle = Math.atan2(this.y - entity.y, this.x - entity.x);
          const dashDot = Math.cos(dashAngle) * Math.cos(pullAngle) + Math.sin(dashAngle) * Math.sin(pullAngle);

          // If dashing directly towards the singularity core (dashDot >= 0.75), suction persists.
          // Otherwise (dashing sideways, diagonally, or away), completely breaks the gravitational pull!
          if (dashDot < 0.75) {
            entity.gravityEscapeTimer = 0.35; // 350ms grace window to safely exit event horizon
            return 0.0;
          }
        }

        // 2. Stationary Target: When rival is stationary, exert 100% full gravitational suction
        const vX = entity.vx || 0;
        const vY = entity.vy || 0;
        const spd = Math.hypot(vX, vY);
        if (spd < 25) {
          return 1.0;
        }

        // 3. Movement Direction vs Pull Direction (Dodging & Counter-movement)
        const pullAngle = Math.atan2(this.y - entity.y, this.x - entity.x);
        const pullDirX = Math.cos(pullAngle);
        const pullDirY = Math.sin(pullAngle);
        const moveDot = (vX / spd) * pullDirX + (vY / spd) * pullDirY;

        // moveDot:
        // +1.0 = moving straight towards the vortex core
        //  0.0 = moving perpendicular (lateral strafe dodge)
        // -1.0 = moving straight away from the vortex

        if (moveDot < 0.25) {
          if (dist > 100) {
            // At outer distances (>100px), moving away or strafing allows clean evasion:
            if (moveDot <= -0.25) return 0.0;
            return Math.max(0, (moveDot - (-0.25)) / 0.50);
          } else {
            // Deep within the gravity well (dist <= 100px):
            // Gravity is intense; walking away meets heavy drag (player moves at crawl).
            // To break free from point-blank, player must activate Dash (Space)!
            const closeRatio = dist / 100;
            if (moveDot <= -0.3) {
              return 0.22 * (1 - closeRatio);
            } else {
              return 0.25 + 0.45 * (1 - closeRatio);
            }
          }
        }

        // Moving towards the vortex:
        return 1.0;
      };

      // Gravity Escape Timer Decay for Local Player
      if (game && game.player && game.player.gravityEscapeTimer > 0) {
        game.player.gravityEscapeTimer = Math.max(0, game.player.gravityEscapeTimer - dt);
      }

      // Stable gravitational velocity curve:
      // - Decisive baseline pull for stationary targets (490 - 580 px/s)
      // - Smooth inner core damping (< 40px) to completely prevent catapulting / slingshotting
      const getStablePullSpeed = (dist) => {
        const normalizedDist = Math.max(0, Math.min(1, dist / this.pullRadius));
        const baseSpeed = 490 + (1 - normalizedDist) * 110;
        const coreDamping = Math.min(1.0, Math.max(0.18, dist / 40));
        return baseSpeed * coreDamping;
      };

      // 1. PvE: Pull hostiles toward singularity core with steady gravitational suction
      if (enemies) {
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e.alive) continue;
          const ed = Math.hypot(this.x - e.x, this.y - e.y);
          if (ed < this.pullRadius && ed > 6) {
            const pullSpeed = getStablePullSpeed(ed);
            const pullForce = pullSpeed * dt;
            const pullAngle = Math.atan2(this.y - e.y, this.x - e.x);
            e.x += Math.cos(pullAngle) * pullForce;
            e.y += Math.sin(pullAngle) * pullForce;
            if (Math.random() < 0.25) {
              e.takeDamage(6, e.x, e.y, pullAngle, false, 'vortex');
            }
          }
        }
      }

      // 2. PvP: Gravitational suction pull on Local Player (game.player)
      // The shooter is completely IMMUNE to their own vortex pull!
      if (!isMyBullet && game && game.player && game.player.alive && game.player.invulnerableTime <= 0) {
        const isTeamsMode = game.network && game.network.lobbyMode === 'teams';
        const shooterRp = (game.network && game.network.remotePlayers) ? game.network.remotePlayers[this.shooterId] : null;
        const shooterTeam = this.shooterTeam || (shooterRp ? shooterRp.team : null);
        const myTeam = game.player.team;
        const isTeammate = isTeamsMode && shooterTeam && myTeam && shooterTeam === myTeam;

        if (!isTeammate) {
          const pd = Math.hypot(this.x - game.player.x, this.y - game.player.y);
          if (pd < this.pullRadius && pd > 6) {
            const escapeFactor = calculateEscapeFactor(game.player, pd);
            if (escapeFactor > 0.001) {
              const pullSpeed = getStablePullSpeed(pd);
              const pullForce = pullSpeed * escapeFactor * dt;
              const pullAngle = Math.atan2(this.y - game.player.y, this.x - game.player.x);
              const nextPlX = game.player.x + Math.cos(pullAngle) * pullForce;
              const nextPlY = game.player.y + Math.sin(pullAngle) * pullForce;
              if (!map || !map.isColliding(nextPlX, nextPlY, game.player.radius)) {
                game.player.x = nextPlX;
                game.player.y = nextPlY;
              }
              if (Math.random() < 0.35 && window.particleSystem) {
                window.particleSystem.emit(game.player.x, game.player.y, 2, {
                  speed: 55,
                  color: '#c084fc',
                  life: 0.18,
                  size: 2.2
                });
              }
            }
          }
        }
      }

      // 3. PvP: Gravitational suction pull on Remote Players in multiplayer
      // Exclude shooter from being pulled!
      if (game && game.network && game.network.remotePlayers) {
        const isTeamsMode = game.network.lobbyMode === 'teams';
        const myTeam = (game.player && game.player.team) ? game.player.team : this.shooterTeam;
        for (const rId in game.network.remotePlayers) {
          if (rId === this.shooterId) continue; // Never pull the shooter!

          const rp = game.network.remotePlayers[rId];
          if (!rp || !rp.alive || (rp.invulnerableTimer && rp.invulnerableTimer > 0)) continue;
          if (isTeamsMode && myTeam && rp.team && myTeam === rp.team) continue;

          if (rp.gravityEscapeTimer > 0) {
            rp.gravityEscapeTimer = Math.max(0, rp.gravityEscapeTimer - dt);
          }

          const rpd = Math.hypot(this.x - rp.x, this.y - rp.y);
          if (rpd < this.pullRadius && rpd > 6) {
            const escapeFactor = calculateEscapeFactor(rp, rpd);
            if (escapeFactor > 0.001) {
              const pullSpeed = getStablePullSpeed(rpd);
              const pullForce = pullSpeed * escapeFactor * dt;
              const pullAngle = Math.atan2(this.y - rp.y, this.x - rp.x);
              const nextRpX = rp.x + Math.cos(pullAngle) * pullForce;
              const nextRpY = rp.y + Math.sin(pullAngle) * pullForce;
              if (!map || !map.isColliding(nextRpX, nextRpY, rp.radius || 20)) {
                rp.x = nextRpX;
                rp.y = nextRpY;
              }
              if (Math.random() < 0.35 && window.particleSystem) {
                window.particleSystem.emit(rp.x, rp.y, 2, {
                  speed: 55,
                  color: '#c084fc',
                  life: 0.18,
                  size: 2.2
                });
              }
            }
          }
        }
      }

      // Cleanse nearby hostile acid spits
      if (game && game.acidSpits) {
        for (let s = 0; s < game.acidSpits.length; s++) {
          const spit = game.acidSpits[s];
          if (spit && spit.active && Math.hypot(this.x - spit.x, this.y - spit.y) < this.pullRadius * 0.75) {
            spit.active = false;
          }
        }
      }
      if (Math.random() < 0.5 && window.particleSystem) {
        window.particleSystem.emit(this.x, this.y, 2, {
          speed: 65,
          color: '#c084fc',
          life: 0.25,
          size: 2.5
        });
      }
    }

    const prevX = this.x;
    const prevY = this.y;
    const prevDist = this.distanceTraveled;

    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    const stepDist = Math.hypot(stepX, stepY);

    if (stepDist < 0.0001) return;

    let nextX = prevX + stepX;
    let nextY = prevY + stepY;
    let effectiveDist = stepDist;
    let isRangeExpired = false;

    // Range expiry check
    if (prevDist + stepDist >= this.maxDistance) {
      const remainingDist = Math.max(0, this.maxDistance - prevDist);
      const frac = remainingDist / stepDist;
      nextX = prevX + stepX * frac;
      nextY = prevY + stepY * frac;
      effectiveDist = remainingDist;
      isRangeExpired = true;
    }

    // 1. Continuous Collision Detection with Map Obstacles (Walls, Pillars)
    const numSubSteps = Math.max(1, Math.ceil(effectiveDist / 12));
    let hitWall = false;
    let wallHitT = 1.0;
    let wallHitPoint = null;

    if (map) {
      for (let s = 1; s <= numSubSteps; s++) {
        const tSample = s / numSubSteps;
        const sX = prevX + (nextX - prevX) * tSample;
        const sY = prevY + (nextY - prevY) * tSample;
        const sDist = prevDist + effectiveDist * tSample;
        if (sDist > 24 && map.isColliding(sX, sY, this.radius)) {
          hitWall = true;
          wallHitT = tSample;
          wallHitPoint = { x: sX, y: sY };
          break;
        }
      }
    }

    // If wall hit, the projectile cannot advance beyond the wall
    if (hitWall && wallHitPoint) {
      nextX = wallHitPoint.x;
      nextY = wallHitPoint.y;
    }

    // 2. Candidate Hits Collection along the flight path
    const candidateHits = [];

    // Barrels
    for (const barrel of barrels) {
      if (barrel.exploded) continue;
      const bRad = this.radius + barrel.radius;
      const col = this.checkSegmentCircle(prevX, prevY, nextX, nextY, barrel.x, barrel.y, bRad);
      if (col && col.t <= wallHitT) {
        candidateHits.push({
          type: 'barrel',
          entity: barrel,
          t: col.t,
          hitX: col.hitX,
          hitY: col.hitY
        });
      }
    }

    // Enemies (PvE)
    // Generous beam tolerance for railgun and high-speed energy weapons to prevent any tunneling
    const beamExtra = this.weaponType === 'railgun' ? 6 : (this.weaponType === 'hydra' ? 0 : 2);
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      // Ghost phase intangibility: Phased ghost enemies are intangible to bullets!
      if (enemy.type === 'ghost' && enemy.isPhased) continue;
      if (this.penetrating && this.hitTargets.has(enemy.id)) continue;
      const eRad = this.radius + enemy.radius + beamExtra;
      const col = this.checkSegmentCircle(prevX, prevY, nextX, nextY, enemy.x, enemy.y, eRad);
      if (col && col.t <= wallHitT) {
        candidateHits.push({
          type: 'enemy',
          entity: enemy,
          t: col.t,
          hitX: col.hitX,
          hitY: col.hitY
        });
      }
    }

    // PvP / Other Players
    if (game && game.network) {
      const isMyBullet = !this.shooterId || this.shooterId === game.localPlayerId;
      const isTeamsMode = game.network.lobbyMode === 'teams';

      if (isMyBullet) {
        const myTeam = (game.player && game.player.team) ? game.player.team : this.shooterTeam;
        for (const rId in game.network.remotePlayers) {
          const rp = game.network.remotePlayers[rId];
          if (!rp.alive || (rp.invulnerableTimer && rp.invulnerableTimer > 0)) continue;
          if (isTeamsMode && myTeam && rp.team && myTeam === rp.team) continue;
          if (this.penetrating && this.hitTargets.has(rId)) continue;

          const extraRad = (this.weaponType === 'railgun' ? 4 : (this.weaponType === 'hydra' ? 0 : 1));
          const pRad = this.radius + rp.radius + extraRad;
          const col = this.checkSegmentCircle(prevX, prevY, nextX, nextY, rp.x, rp.y, pRad);
          if (col && col.t <= wallHitT) {
            candidateHits.push({
              type: 'remotePlayer',
              entity: rp,
              id: rId,
              t: col.t,
              hitX: col.hitX,
              hitY: col.hitY
            });
          }
        }
      } else {
        const shooterRp = game.network.remotePlayers[this.shooterId];
        const shooterTeam = this.shooterTeam || (shooterRp ? shooterRp.team : null);
        const myTeam = game.player ? game.player.team : null;
        const isTeammateBullet = isTeamsMode && shooterTeam && myTeam && shooterTeam === myTeam;

        if (!isTeammateBullet && game.player && game.player.alive && game.player.invulnerableTime <= 0) {
          const extraRad = (this.weaponType === 'railgun' ? 4 : (this.weaponType === 'hydra' ? 0 : 1));
          const plRad = this.radius + game.player.radius + extraRad;
          const col = this.checkSegmentCircle(prevX, prevY, nextX, nextY, game.player.x, game.player.y, plRad);
          if (col && col.t <= wallHitT) {
            candidateHits.push({
              type: 'localPlayer',
              entity: game.player,
              t: col.t,
              hitX: col.hitX,
              hitY: col.hitY
            });
          }
        }
      }
    }

    // Sort all collision events along trajectory by flight progress
    candidateHits.sort((a, b) => a.t - b.t);

    // 3. Process Hits
    if (candidateHits.length > 0) {
      if (this.explosive) {
        const firstHit = candidateHits[0];
        this.x = firstHit.hitX;
        this.y = firstHit.hitY;
        this.detonate(map, enemies, barrels, game);
        return;
      }

      if (!this.penetrating) {
        const hit = candidateHits[0];
        this.x = hit.hitX;
        this.y = hit.hitY;
        this.active = false;

        if (hit.type === 'enemy') {
          hit.entity.takeDamage(this.damage, hit.hitX, hit.hitY, this.angle, this.isCritical, this.weaponType);
          game.recordHit();
          if (this.weaponType === 'tesla') {
            this.triggerChainLightning(hit.entity, enemies, game);
          }
          if (game && game.network && (!this.shooterId || this.shooterId === game.localPlayerId)) {
            game.network.reportEnemyHit(hit.entity.id, this.damage, this.isCritical, hit.hitX, hit.hitY);
          }
        } else if (hit.type === 'barrel') {
          hit.entity.hp -= this.damage;
          window.particleSystem.emit(hit.hitX, hit.hitY, 10, {
            angle: this.angle + Math.PI,
            spread: 0.8,
            speed: 220,
            color: '#ff5500',
            life: 0.2
          });
          window.soundSystem.playWallHit();
          if (game && game.network) {
            game.network.reportBarrelHit(hit.entity.id, this.damage);
          }
          if (hit.entity.hp <= 0 && (!game || !game.network || !game.network.connected)) {
            map.triggerBarrelExplosion(hit.entity, game);
          }
        } else if (hit.type === 'remotePlayer') {
          game.recordHit();
          game.network.reportPlayerHit(hit.id, this.damage, this.isCritical, hit.hitX, hit.hitY);
          window.particleSystem.emitBlood(hit.hitX, hit.hitY, this.angle, 14);
          window.soundSystem.playPlayerHurt();
        } else if (hit.type === 'localPlayer') {
          window.particleSystem.emitBlood(hit.hitX, hit.hitY, this.angle, 14);
        }
        return;
      }

      // Penetrating Projectile Ballistics (e.g., Supersonic Railgun)
      for (const hit of candidateHits) {
        if (hit.type === 'enemy') {
          const enemy = hit.entity;
          if (this.hitTargets.has(enemy.id)) continue;
          this.hitTargets.add(enemy.id);
          this.penetrations++;

          // Deal damage at exact impact coordinates
          enemy.takeDamage(this.damage, hit.hitX, hit.hitY, this.angle, this.isCritical, this.weaponType);
          game.recordHit();

          // High-energy ionization burst at entry point
          window.particleSystem.emit(hit.hitX, hit.hitY, 14, {
            angle: this.angle,
            spread: 1.2,
            speed: 280,
            color: '#d946ef',
            life: 0.22
          });

          if (game && game.network && (!this.shooterId || this.shooterId === game.localPlayerId)) {
            game.network.reportEnemyHit(enemy.id, this.damage, this.isCritical, hit.hitX, hit.hitY);
          }

          if (this.penetrations >= this.maxPenetrations) {
            this.active = false;
            this.x = hit.hitX;
            this.y = hit.hitY;
            return;
          }
        } else if (hit.type === 'barrel') {
          const barrel = hit.entity;
          barrel.hp -= this.damage;
          window.particleSystem.emit(hit.hitX, hit.hitY, 10, {
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
        } else if (hit.type === 'remotePlayer') {
          if (this.hitTargets.has(hit.id)) continue;
          this.hitTargets.add(hit.id);
          this.penetrations++;
          game.recordHit();
          game.network.reportPlayerHit(hit.id, this.damage, this.isCritical, hit.hitX, hit.hitY);
          window.particleSystem.emitBlood(hit.hitX, hit.hitY, this.angle, 14);
          window.soundSystem.playPlayerHurt();

          if (this.penetrations >= this.maxPenetrations) {
            this.active = false;
            this.x = hit.hitX;
            this.y = hit.hitY;
            return;
          }
        } else if (hit.type === 'localPlayer') {
          this.active = false;
          this.x = hit.hitX;
          this.y = hit.hitY;
          window.particleSystem.emitBlood(hit.hitX, hit.hitY, this.angle, 14);
          return;
        }
      }
    }

    // 4. Map Wall Impact
    if (hitWall && wallHitPoint) {
      this.active = false;
      this.x = wallHitPoint.x;
      this.y = wallHitPoint.y;
      if (this.explosive) {
        this.detonate(map, enemies, barrels, game);
      } else {
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

    // 5. Range Expiry
    if (isRangeExpired) {
      this.x = nextX;
      this.y = nextY;
      if (this.explosive) {
        this.detonate(map, enemies, barrels, game);
      } else {
        this.active = false;
      }
      return;
    }

    // Advance bullet position
    this.x = nextX;
    this.y = nextY;
    this.distanceTraveled += effectiveDist;
  }

  // --- Area-of-Effect Explosive Detonation ---
  detonate(map, enemies, barrels, game) {
    if (!this.active) return;
    this.active = false;

    // Visual & Audio Explosion
    window.particleSystem.emitExplosion(this.x, this.y, this.blastRadius);
    if (this.weaponType === 'vortex' && window.soundSystem && window.soundSystem.playVortexImplode) {
      window.soundSystem.playVortexImplode();
    } else {
      window.soundSystem.playExplosion();
    }
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

    // 3. Splash Damage to Remote Players in PvP (Teammates immune in Teams mode)
    const isTeamsMode = game && game.network && game.network.lobbyMode === 'teams';
    if (game && game.network && isMyBullet) {
      const myTeam = (game.player && game.player.team) ? game.player.team : this.shooterTeam;
      for (const rId in game.network.remotePlayers) {
        const rp = game.network.remotePlayers[rId];
        if (!rp.alive || (rp.invulnerableTimer && rp.invulnerableTimer > 0)) continue;
        if (isTeamsMode && myTeam && rp.team && myTeam === rp.team) continue; // Immune!

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

    // 4. Splash Damage to Local Player if near blast (Immune if blast is from a teammate)
    if (game && game.player && game.player.alive && game.player.invulnerableTime <= 0) {
      const shooterRp = (game.network && game.network.remotePlayers) ? game.network.remotePlayers[this.shooterId] : null;
      const shooterTeam = this.shooterTeam || (shooterRp ? shooterRp.team : null);
      const myTeam = game.player.team;
      const isTeammateBlast = isTeamsMode && shooterTeam && myTeam && shooterTeam === myTeam && this.shooterId !== game.localPlayerId;

      if (!isTeammateBlast) {
        const d = Math.hypot(this.x - game.player.x, this.y - game.player.y);
        const playerBlastRad = this.blastRadius * 0.75 + game.player.radius;
        if (d <= playerBlastRad) {
          const falloff = Math.max(0.18, 1 - (d / playerBlastRad));
          // Self-inflicted explosive damage reduced significantly (max ~15-18 dmg at point blank instead of 48)
          const damageRatio = isMyBullet ? 0.16 : 0.45;
          const splash = Math.max(3, Math.round(this.splashDamage * damageRatio * falloff));
          game.player.takeDamage(splash);
        }
      }
    }
  }

  // --- Tesla-Arc Chain Lightning Propagation ---
  triggerChainLightning(primaryEnemy, enemies, game) {
    if (!enemies || enemies.length <= 1) return;
    const chained = new Set([primaryEnemy.id]);
    let curr = primaryEnemy;
    const targetsToChain = this.chainTargets || 3;
    const chainRadius = this.chainRange || 220;
    const chainDmg = this.chainDamage || 40;

    for (let c = 0; c < targetsToChain; c++) {
      let nextTarget = null;
      let nextDist = chainRadius;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive || chained.has(e.id) || (e.type === 'ghost' && e.isPhased)) continue;
        const d = Math.hypot(e.x - curr.x, e.y - curr.y);
        if (d < nextDist) {
          nextDist = d;
          nextTarget = e;
        }
      }
      if (!nextTarget) break;
      chained.add(nextTarget.id);

      // Inflict chain damage & brief electric shock stun
      nextTarget.takeDamage(chainDmg, nextTarget.x, nextTarget.y, 0, false, 'tesla');
      nextTarget.stunTimer = Math.max(nextTarget.stunTimer || 0, 0.45);

      // Emit high-voltage electric spark line particles between victims
      if (window.particleSystem) {
        for (let p = 0; p < 7; p++) {
          const t = p / 7;
          const px = curr.x + (nextTarget.x - curr.x) * t + (Math.random() - 0.5) * 14;
          const py = curr.y + (nextTarget.y - curr.y) * t + (Math.random() - 0.5) * 14;
          window.particleSystem.emit(px, py, 2, {
            speed: 70,
            color: '#00f0ff',
            life: 0.22,
            size: 2.4
          });
        }
      }
      curr = nextTarget;
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

    } else if (this.weaponType === 'hydra') {
      // --- HYDRA-9 HOMING SMART MICRO-MISSILE ---
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 0; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 3.8;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      // Rocket body
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -2, 10, 4);
      // Nosecone
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.moveTo(3, -2.5);
      ctx.lineTo(8, 0);
      ctx.lineTo(3, 2.5);
      ctx.closePath();
      ctx.fill();
      // Fins
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(-7, -4, 2.5, 8);
      // Thruster flame
      ctx.fillStyle = '#ffb703';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-7, -1.8);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-7, 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (this.weaponType === 'tesla') {
      // --- TESLA-ARC HIGH VOLTAGE PROJECTILE ---
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 0; i < this.trail.length; i++) {
          const jitterX = (Math.random() - 0.5) * 5;
          const jitterY = (Math.random() - 0.5) * 5;
          ctx.lineTo(this.trail[i].x + jitterX, this.trail[i].y + jitterY);
        }
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.fill();

    } else if (this.weaponType === 'vortex') {
      // --- SINGULARITY GRAVITATIONAL VORTEX ---
      const pulse = 1 + Math.sin(this.pulseAnim * 2) * 0.15;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.pulseAnim);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 15;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, (this.radius + 6) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#581c87';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 22;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#05000a';
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
