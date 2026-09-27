/**
 * CYBER STRIKE // MAP & ENVIRONMENT
 * Generates an expansive industrial cyber-facility (2400x2400)
 * Includes concrete blast walls, cargo crates, reactor pillars, and explosive barrels.
 */

class GameMap {
  constructor(width = 2400, height = 2400) {
    this.width = width;
    this.height = height;

    // Obstacle lists
    this.walls = []; // Rectangular solid obstacles {x, y, w, h, type}
    this.pillars = []; // Cylindrical reactor pillars {x, y, radius}
    this.barrels = []; // Red explosive barrels {x, y, radius, hp, maxHp, exploded}

    // Persistent Decal Layer (Blood, blast marks, spent shells)
    this.decalCanvas = document.createElement('canvas');
    this.decalCanvas.width = width;
    this.decalCanvas.height = height;
    this.decalCtx = this.decalCanvas.getContext('2d');

    // Pre-rendered Floor Canvas for high performance
    this.floorCanvas = document.createElement('canvas');
    this.floorCanvas.width = width;
    this.floorCanvas.height = height;
    this.floorCtx = this.floorCanvas.getContext('2d');

    this.initMap();
    this.renderFloor();
  }

  initMap() {
    const W = this.width;
    const H = this.height;
    const wallThick = 50;

    // 1. Boundary Perimeter Walls
    this.walls.push({ x: 0, y: 0, w: W, h: wallThick, type: 'boundary' }); // Top
    this.walls.push({ x: 0, y: H - wallThick, w: W, h: wallThick, type: 'boundary' }); // Bottom
    this.walls.push({ x: 0, y: 0, w: wallThick, h: H, type: 'boundary' }); // Left
    this.walls.push({ x: W - wallThick, y: 0, w: wallThick, h: H, type: 'boundary' }); // Right

    // 2. Inner Facility Structures & Corridors
    // Central Reactor Ring & Partitions
    const cx = W / 2;
    const cy = H / 2;

    // 4 Heavy Cylindrical Core Pillars around the center
    const pillarDist = 260;
    this.pillars.push({ x: cx - pillarDist, y: cy - pillarDist, radius: 45 });
    this.pillars.push({ x: cx + pillarDist, y: cy - pillarDist, radius: 45 });
    this.pillars.push({ x: cx - pillarDist, y: cy + pillarDist, radius: 45 });
    this.pillars.push({ x: cx + pillarDist, y: cy + pillarDist, radius: 45 });

    // Center cover barriers
    this.walls.push({ x: cx - 120, y: cy - 20, w: 240, h: 40, type: 'barrier' });
    this.walls.push({ x: cx - 20, y: cy - 120, w: 40, h: 240, type: 'barrier' });

    // Quadrant 1: Northwest Cargo Bay (Containers & Crate Stacks)
    this.walls.push({ x: 250, y: 250, w: 180, h: 90, type: 'container' });
    this.walls.push({ x: 470, y: 250, w: 90, h: 180, type: 'container' });
    this.walls.push({ x: 250, y: 480, w: 140, h: 80, type: 'crate' });
    this.walls.push({ x: 680, y: 350, w: 80, h: 260, type: 'wall' });
    this.walls.push({ x: 350, y: 720, w: 300, h: 50, type: 'wall' });

    // Quadrant 2: Northeast Research Complex (Bunkers & Choke Points)
    this.walls.push({ x: W - 450, y: 250, w: 200, h: 90, type: 'container' });
    this.walls.push({ x: W - 700, y: 280, w: 70, h: 280, type: 'wall' });
    this.walls.push({ x: W - 580, y: 560, w: 320, h: 60, type: 'wall' });
    this.walls.push({ x: W - 400, y: 740, w: 120, h: 120, type: 'crate' });

    // Quadrant 3: Southwest Generation Depot
    this.walls.push({ x: 250, y: H - 420, w: 220, h: 90, type: 'container' });
    this.walls.push({ x: 550, y: H - 420, w: 80, h: 200, type: 'container' });
    this.walls.push({ x: 300, y: H - 750, w: 320, h: 60, type: 'wall' });
    this.walls.push({ x: 720, y: H - 650, w: 60, h: 280, type: 'wall' });

    // Quadrant 4: Southeast Armory & Hangars
    this.walls.push({ x: W - 500, y: H - 450, w: 240, h: 100, type: 'container' });
    this.walls.push({ x: W - 780, y: H - 550, w: 160, h: 80, type: 'crate' });
    this.walls.push({ x: W - 400, y: H - 780, w: 80, h: 240, type: 'wall' });
    this.walls.push({ x: W - 700, y: H - 850, w: 280, h: 60, type: 'wall' });

    // Tactical Mid-Field Barrier Walls
    this.walls.push({ x: cx - 500, y: cy - 40, w: 180, h: 80, type: 'barrier' });
    this.walls.push({ x: cx + 320, y: cy - 40, w: 180, h: 80, type: 'barrier' });
    this.walls.push({ x: cx - 40, y: cy - 500, w: 80, h: 180, type: 'barrier' });
    this.walls.push({ x: cx - 40, y: cy + 320, w: 80, h: 180, type: 'barrier' });

    // Extra Pillars
    this.pillars.push({ x: 520, y: cy, radius: 40 });
    this.pillars.push({ x: W - 520, y: cy, radius: 40 });
    this.pillars.push({ x: cx, y: 520, radius: 40 });
    this.pillars.push({ x: cx, y: H - 520, radius: 40 });

    // 3. Place Explosive Barrels in tactical alcoves
    const barrelLocations = [
      { x: cx - 180, y: cy - 180 },
      { x: cx + 180, y: cy - 180 },
      { x: cx - 180, y: cy + 180 },
      { x: cx + 180, y: cy + 180 },
      { x: 420, y: 450 },
      { x: 460, y: 450 },
      { x: W - 420, y: 450 },
      { x: W - 460, y: 450 },
      { x: 420, y: H - 450 },
      { x: W - 420, y: H - 450 },
      { x: cx - 350, y: cy },
      { x: cx + 350, y: cy },
      { x: cx, y: cy - 350 },
      { x: cx, y: cy + 350 }
    ];

    barrelLocations.forEach(loc => {
      this.barrels.push({
        x: loc.x,
        y: loc.y,
        radius: 18,
        hp: 35,
        maxHp: 35,
        exploded: false
      });
    });
  }

  // Pre-render floor graphics (metal tiles, seams, hazard stripes, ventilation grates)
  renderFloor() {
    const ctx = this.floorCtx;
    const tileSize = 80;

    // Dark base
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid Floor Plates
    for (let x = 0; x < this.width; x += tileSize) {
      for (let y = 0; y < this.height; y += tileSize) {
        // Tile background with subtle alternate shades
        const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isAlt ? '#0f1422' : '#0c101c';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

        // Subtle tile seam border
        ctx.strokeStyle = '#182136';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize, tileSize);

        // Corner rivets
        ctx.fillStyle = '#222d47';
        ctx.fillRect(x + 4, y + 4, 3, 3);
        ctx.fillRect(x + tileSize - 7, y + 4, 3, 3);
        ctx.fillRect(x + 4, y + tileSize - 7, 3, 3);
        ctx.fillRect(x + tileSize - 7, y + tileSize - 7, 3, 3);
      }
    }

    // Hazard Stripes & Industrial markings around central zone
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Center Platform circular outline
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 380, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 420, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center Crosshair floor marking
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 150, cy); ctx.lineTo(cx + 150, cy);
    ctx.moveTo(cx, cy - 150); ctx.lineTo(cx, cy + 150);
    ctx.stroke();

    // Hazard warning stripes along perimeter inner edge
    this.drawHazardBorder(ctx, 50, 50, this.width - 100, this.height - 100);
  }

  drawHazardBorder(ctx, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.25)';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 16]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  // --- Collision Detection & Sliding Resolution ---
  resolveCircleCollision(entity) {
    let collided = false;
    const r = entity.radius;

    // 1. Check against Map Boundaries
    const pad = 52 + r;
    if (entity.x < pad) { entity.x = pad; collided = true; }
    if (entity.x > this.width - pad) { entity.x = this.width - pad; collided = true; }
    if (entity.y < pad) { entity.y = pad; collided = true; }
    if (entity.y > this.height - pad) { entity.y = this.height - pad; collided = true; }

    // 2. Check against Rectangular Walls & Containers
    for (const wall of this.walls) {
      if (wall.type === 'boundary') continue; // already handled by pad

      // Nearest point on wall rect to circle center
      const nearestX = Math.max(wall.x, Math.min(entity.x, wall.x + wall.w));
      const nearestY = Math.max(wall.y, Math.min(entity.y, wall.y + wall.h));

      const dx = entity.x - nearestX;
      const dy = entity.y - nearestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < r * r) {
        collided = true;
        const dist = Math.sqrt(distSq);

        if (dist === 0) {
          // Entity was inside, push out horizontally
          entity.x = wall.x - r;
        } else {
          // Push circle out along collision normal
          const overlap = r - dist;
          entity.x += (dx / dist) * overlap;
          entity.y += (dy / dist) * overlap;
        }
      }
    }

    // 3. Check against Cylindrical Pillars
    for (const pillar of this.pillars) {
      const dx = entity.x - pillar.x;
      const dy = entity.y - pillar.y;
      const minDist = r + pillar.radius;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDist * minDist) {
        collided = true;
        const dist = Math.sqrt(distSq) || 1;
        const overlap = minDist - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }

    // 4. Check against Unexploded Barrels
    for (const barrel of this.barrels) {
      if (barrel.exploded) continue;
      const dx = entity.x - barrel.x;
      const dy = entity.y - barrel.y;
      const minDist = r + barrel.radius;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDist * minDist) {
        collided = true;
        const dist = Math.sqrt(distSq) || 1;
        const overlap = minDist - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }

    return collided;
  }

  // --- Point / Circle Overlap check (used for bullet & spawn tests) ---
  isColliding(x, y, radius = 0) {
    // Boundary check
    const pad = 50 + radius;
    if (x < pad || x > this.width - pad || y < pad || y > this.height - pad) {
      return true;
    }

    // Wall rect check
    for (const w of this.walls) {
      if (w.type === 'boundary') continue;
      const nx = Math.max(w.x, Math.min(x, w.x + w.w));
      const ny = Math.max(w.y, Math.min(y, w.y + w.h));
      const distSq = (x - nx) * (x - nx) + (y - ny) * (y - ny);
      if (distSq < radius * radius) return true;
    }

    // Pillar circle check
    for (const p of this.pillars) {
      const distSq = (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y);
      const r = radius + p.radius;
      if (distSq < r * r) return true;
    }

    // Barrel circle check
    for (const b of this.barrels) {
      if (b.exploded) continue;
      const distSq = (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y);
      const r = radius + b.radius;
      if (distSq < r * r) return true;
    }

    return false;
  }

  // Check line of sight between two points (returns false if blocked by wall/pillar)
  hasLineOfSight(x1, y1, x2, y2) {
    const steps = 15;
    for (let i = 1; i < steps; i++) {
      const tx = x1 + (x2 - x1) * (i / steps);
      const ty = y1 + (y2 - y1) * (i / steps);
      if (this.isColliding(tx, ty, 8)) {
        return false;
      }
    }
    return true;
  }

  // --- Explode Barrel ---
  triggerBarrelExplosion(barrel, game) {
    if (barrel.exploded) return;
    barrel.exploded = true;

    // FX & Audio
    window.particleSystem.emitExplosion(barrel.x, barrel.y, 90);
    window.soundSystem.playExplosion();
    game.addScreenShake(14);

    // Burn mark on decal canvas
    this.decalCtx.save();
    this.decalCtx.fillStyle = '#111419';
    this.decalCtx.beginPath();
    this.decalCtx.arc(barrel.x, barrel.y, 45, 0, Math.PI * 2);
    this.decalCtx.fill();
    this.decalCtx.restore();

    // Damage enemies & player within explosion radius (140px)
    const blastRadius = 140;
    const blastDamage = 160;

    // Damage Player
    const pDist = Math.hypot(game.player.x - barrel.x, game.player.y - barrel.y);
    if (pDist < blastRadius) {
      const pDmg = Math.round(blastDamage * (1 - pDist / blastRadius));
      game.player.takeDamage(pDmg);
      window.soundSystem.playPlayerHurt();
    }

    // Damage Enemies
    for (const enemy of game.enemies) {
      const eDist = Math.hypot(enemy.x - barrel.x, enemy.y - barrel.y);
      if (eDist < blastRadius) {
        const eDmg = Math.round(blastDamage * (1 - eDist / blastRadius));
        enemy.takeDamage(eDmg, barrel.x, barrel.y);
      }
    }

    // Chain reaction with nearby barrels!
    for (const other of this.barrels) {
      if (other !== barrel && !other.exploded) {
        const bDist = Math.hypot(other.x - barrel.x, other.y - barrel.y);
        if (bDist < blastRadius) {
          setTimeout(() => {
            this.triggerBarrelExplosion(other, game);
          }, 120);
        }
      }
    }
  }

  // --- Render Environment ---
  draw(ctx, camera) {
    // 1. Pre-rendered Floor
    ctx.drawImage(this.floorCanvas, 0, 0);

    // 2. Decal Canvas (Blood & Scorch marks)
    ctx.drawImage(this.decalCanvas, 0, 0);

    // 3. Render Solid Walls & Containers
    for (const wall of this.walls) {
      // Frustum culling: skip if offscreen
      if (wall.x + wall.w < camera.x || wall.x > camera.x + camera.width ||
          wall.y + wall.h < camera.y || wall.y > camera.y + camera.height) {
        continue;
      }

      ctx.save();
      // Drop Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;

      if (wall.type === 'boundary') {
        // High-security boundary wall
        ctx.fillStyle = '#141a29';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      } else if (wall.type === 'container') {
        // Cargo Shipping Container
        ctx.fillStyle = '#1a2838';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        
        // Corrugated ridges
        ctx.strokeStyle = '#283c54';
        ctx.lineWidth = 3;
        const step = 20;
        if (wall.w > wall.h) {
          for (let rx = wall.x + step; rx < wall.x + wall.w - step; rx += step) {
            ctx.beginPath();
            ctx.moveTo(rx, wall.y + 4);
            ctx.lineTo(rx, wall.y + wall.h - 4);
            ctx.stroke();
          }
        } else {
          for (let ry = wall.y + step; ry < wall.y + wall.h - step; ry += step) {
            ctx.beginPath();
            ctx.moveTo(wall.x + 4, ry);
            ctx.lineTo(wall.x + wall.w - 4, ry);
            ctx.stroke();
          }
        }

        // Tech cyan trim
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        // Tech logo badge
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(wall.x + 8, wall.y + 8, 8, 8);
      } else if (wall.type === 'crate') {
        // Heavy military crate
        ctx.fillStyle = '#222633';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        
        // Inner X brace
        ctx.strokeStyle = '#383f54';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wall.x + 6, wall.y + 6);
        ctx.lineTo(wall.x + wall.w - 6, wall.y + wall.h - 6);
        ctx.moveTo(wall.x + wall.w - 6, wall.y + 6);
        ctx.lineTo(wall.x + 6, wall.y + wall.h - 6);
        ctx.stroke();

        ctx.strokeStyle = '#4a5470';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      } else {
        // Reinforced Concrete Blast Barrier
        ctx.fillStyle = '#1c2230';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#323c52';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      }
      ctx.restore();
    }

    // 4. Render Reactor Pillars
    for (const pillar of this.pillars) {
      ctx.save();
      // Base shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;

      // Outer metal cylinder rim
      ctx.fillStyle = '#1b2233';
      ctx.beginPath();
      ctx.arc(pillar.x, pillar.y, pillar.radius, 0, Math.PI * 2);
      ctx.fill();

      // Metallic border
      ctx.strokeStyle = '#3f4e70';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Pulsating Core Center
      const pulse = Math.sin(Date.now() * 0.004) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(0, 240, 255, ${0.4 * pulse})`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14 * pulse;
      ctx.beginPath();
      ctx.arc(pillar.x, pillar.y, pillar.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 5. Render Explosive Barrels
    for (const barrel of this.barrels) {
      if (barrel.exploded) continue;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      // Red barrel body
      ctx.fillStyle = '#d90429';
      ctx.beginPath();
      ctx.arc(barrel.x, barrel.y, barrel.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer rim
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Yellow hazard indicator / biohazard dot
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(barrel.x, barrel.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Small hazard stripes
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(barrel.x, barrel.y, 11, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }
}

window.GameMap = GameMap;
