/**
 * CYBER STRIKE // PARTICLE & FX SYSTEM
 * Handles Sparks, Explosions, Blood Splatters, Shell Casings, and Floating Damage Numbers.
 */

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shellCasings = [];
    this.damageNumbers = [];
    this.shockwaves = [];
  }

  // --- Dynamic Particle Spawn ---
  emit(x, y, count, options = {}) {
    for (let i = 0; i < count; i++) {
      const angle = options.angle !== undefined 
        ? options.angle + (Math.random() - 0.5) * (options.spread || Math.PI)
        : Math.random() * Math.PI * 2;
      
      const speed = (options.speed || 150) * (0.4 + Math.random() * 0.8);
      const life = (options.life || 0.4) * (0.6 + Math.random() * 0.8);

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: options.size || (2 + Math.random() * 2.5),
        color: options.color || '#00f0ff',
        life: life,
        maxLife: life,
        drag: options.drag || 0.94,
        type: options.type || 'spark',
        alpha: 1
      });
    }
  }

  // --- Gun Muzzle Flash Effect ---
  emitMuzzleFlash(x, y, angle) {
    // 1. Sparks shooting forward
    this.emit(x, y, 7, {
      angle: angle,
      spread: 0.4,
      speed: 380,
      life: 0.12,
      size: 2.5,
      color: '#ffe066',
      drag: 0.86
    });

    // 2. Gun smoke puff
    for (let i = 0; i < 2; i++) {
      const smokeAngle = angle + (Math.random() - 0.5) * 0.8;
      const speed = 60 + Math.random() * 50;
      this.particles.push({
        x: x + Math.cos(angle) * 8,
        y: y + Math.sin(angle) * 8,
        vx: Math.cos(smokeAngle) * speed,
        vy: Math.sin(smokeAngle) * speed,
        size: 5 + Math.random() * 4,
        maxSize: 16 + Math.random() * 8,
        color: '#8fa0b5',
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.5,
        drag: 0.9,
        type: 'smoke',
        alpha: 0.45
      });
    }
  }

  // --- Blood Splatter on Hit / Kill ---
  emitBlood(x, y, angle, amount = 10, isDead = false) {
    const spread = isDead ? Math.PI * 2 : 0.8;
    const baseAngle = isDead ? 0 : angle;

    for (let i = 0; i < amount; i++) {
      const a = baseAngle + (Math.random() - 0.5) * spread;
      const speed = (isDead ? 200 : 160) * (0.3 + Math.random() * 0.9);
      const life = 0.3 + Math.random() * 0.3;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.3 ? '#88081a' : '#c9182b',
        life: life,
        maxLife: life,
        drag: 0.88,
        type: 'blood',
        alpha: 1,
        splatterDecal: true
      });
    }
  }

  // --- Spent Brass Shell Casing ---
  ejectShell(x, y, angle) {
    // Eject to the right of the gun direction
    const ejectAngle = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    const speed = 120 + Math.random() * 60;

    this.shellCasings.push({
      x: x,
      y: y,
      vx: Math.cos(ejectAngle) * speed,
      vy: Math.sin(ejectAngle) * speed,
      angle: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 20,
      life: 0.4,
      bounced: false
    });
  }

  // --- Big Explosion (Barrels / Tanks) ---
  emitExplosion(x, y, radius = 60) {
    // 1. Expanding Shockwave
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 5,
      maxRadius: radius * 1.5,
      life: 0.35,
      maxLife: 0.35,
      color: '#ffaa33'
    });

    // 2. Fire and embers
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (180 + Math.random() * 260) * (radius / 60);
      const colors = ['#fff', '#ffe066', '#ff7700', '#ff2200', '#555'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: color,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        drag: 0.91,
        type: 'fire',
        alpha: 1
      });
    }

    // 3. Thick Black Smoke Clouds
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 10 + Math.random() * 10,
        maxSize: 30 + Math.random() * 20,
        color: '#2a2d34',
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        drag: 0.93,
        type: 'smoke',
        alpha: 0.6
      });
    }
  }

  // --- Floating Combat Damage Numbers ---
  addDamageNumber(x, y, amount, isCritical = false) {
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      vy: -90,
      amount: Math.round(amount),
      isCritical: isCritical,
      life: 0.6,
      maxLife: 0.6,
      scale: isCritical ? 1.5 : 1.0
    });
  }

  // --- Update All FX Entities ---
  update(dt, decalCanvasCtx) {
    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        // If it's a blood particle, bake it into the ground decal layer!
        if (p.splatterDecal && decalCanvasCtx && Math.random() > 0.4) {
          decalCanvasCtx.fillStyle = p.color;
          decalCanvasCtx.globalAlpha = 0.55;
          decalCanvasCtx.beginPath();
          decalCanvasCtx.arc(p.x, p.y, p.size * (0.8 + Math.random() * 0.6), 0, Math.PI * 2);
          decalCanvasCtx.fill();
          decalCanvasCtx.globalAlpha = 1.0;
        }
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);

      const progress = p.life / p.maxLife;
      p.alpha = progress;

      if (p.type === 'smoke') {
        p.size += (p.maxSize - p.size) * (dt * 3);
      }
    }

    // 2. Update Shell Casings
    for (let i = this.shellCasings.length - 1; i >= 0; i--) {
      const s = this.shellCasings[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= Math.pow(0.85, dt * 60);
      s.vy *= Math.pow(0.85, dt * 60);
      s.angle += s.vRot * dt;
      s.vRot *= Math.pow(0.88, dt * 60);

      if (s.life <= 0) {
        // Bake spent casing decal onto ground
        if (decalCanvasCtx) {
          decalCanvasCtx.save();
          decalCanvasCtx.translate(s.x, s.y);
          decalCanvasCtx.rotate(s.angle);
          decalCanvasCtx.fillStyle = '#bfa140';
          decalCanvasCtx.globalAlpha = 0.6;
          decalCanvasCtx.fillRect(-3, -1.2, 6, 2.4);
          decalCanvasCtx.restore();
        }
        this.shellCasings.splice(i, 1);
      }
    }

    // 3. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1 - sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * progress;
    }

    // 4. Update Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy += 80 * dt; // slight downward deceleration
      if (d.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  // --- Render Dynamic Particles ---
  draw(ctx) {
    ctx.save();

    // Shockwaves
    for (const sw of this.shockwaves) {
      const alpha = sw.life / sw.maxLife;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 4 * alpha;
      ctx.globalAlpha = alpha;
      ctx.stroke();
      ctx.restore();
    }

    // Flying Shell Casings
    for (const s of this.shellCasings) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.fillStyle = '#ffd152';
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 4;
      ctx.fillRect(-3.5, -1.5, 7, 3);
      ctx.restore();
    }

    // Standard Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'spark' || p.type === 'fire') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'blood') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating Damage Numbers
    for (const d of this.damageNumbers) {
      const alpha = Math.min(1, d.life / (d.maxLife * 0.4));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.round(14 * d.scale)}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';

      if (d.isCritical) {
        ctx.fillStyle = '#ffb703';
        ctx.shadowColor = '#ffb703';
        ctx.shadowBlur = 10;
        ctx.fillText(`CRIT ${d.amount}`, d.x, d.y);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.fillText(`${d.amount}`, d.x, d.y);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}

window.particleSystem = new ParticleSystem();
