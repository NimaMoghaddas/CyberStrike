/**
 * CYBER STRIKE // CYBERWARE POWER-UP & ABILITY CRATE SYSTEM
 * Ground tactical crates that grant temporary superhuman cybernetic abilities:
 * 1. Chrono Matrix (Bullet Time / Sandevistan - 10s)
 * 2. Combat Drone Buddy (Support Drone Companion - 20s)
 * 3. Cluster Barrage (Passive Bouncing Tactical Grenades - 15s)
 * 4. Cyber Overdrive (Matrix Berserk: +60% Fire Rate, Life Steal, Dash Shockwave - 15s)
 */

const POWERUP_CONFIGS = {
  chrono: {
    id: 'chrono',
    name: 'CHRONO MATRIX',
    subtitle: 'BULLET TIME / TIME DILATION',
    icon: '⏱️',
    color: '#00f0ff',
    glowColor: '#38bdf8',
    duration: 10.0,
    tag: 'SLOW TIME 75%'
  },
  drone: {
    id: 'drone',
    name: 'COMBAT DRONE',
    subtitle: 'TACTICAL SUPPORT COMPANION',
    icon: '🛸',
    color: '#00ff66',
    glowColor: '#39ff14',
    duration: 20.0,
    tag: 'AUTO-TARGET'
  },
  cluster: {
    id: 'cluster',
    name: 'CLUSTER BARRAGE',
    subtitle: 'TACTICAL GRENADE VOLLEYS',
    icon: '💣',
    color: '#ff9900',
    glowColor: '#ffbb00',
    duration: 15.0,
    tag: 'AOE BOMBS'
  },
  overdrive: {
    id: 'overdrive',
    name: 'CYBER OVERDRIVE',
    subtitle: 'BERSERK // LIFE STEAL & HYPER-FIRE',
    icon: '🔥',
    color: '#ff0055',
    glowColor: '#ff2a75',
    duration: 15.0,
    tag: '+60% FIRE & HEAL'
  }
};

function powerupHexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getAvailablePowerupTypes(game = null) {
  const g = game || (typeof window !== 'undefined' ? window.gameInstance : null);
  // Time-dilation (Chrono Matrix) is completely excluded in multiplayer & PvP modes
  const isMultiplayer = g && (g.gameMode === 'multiplayer' || g.pvpOnly || (g.network && (g.network.pvpOnly || g.network.connected)));
  if (isMultiplayer) {
    return ['drone', 'cluster', 'overdrive'];
  }
  return ['chrono', 'drone', 'cluster', 'overdrive'];
}

const POWERUP_TYPES = ['chrono', 'drone', 'cluster', 'overdrive'];

// --- Ground Holographic Power-Up Crate ---
class PowerupDrop {
  constructor(x, y, type = null, id = null, game = null) {
    this.x = x;
    this.y = y;
    const available = getAvailablePowerupTypes(game);
    if (type === 'chrono' && !available.includes('chrono')) {
      type = 'overdrive';
    }
    this.type = type || available[Math.floor(Math.random() * available.length)];
    this.config = POWERUP_CONFIGS[this.type] || POWERUP_CONFIGS.overdrive;
    this.id = id || `pow_${Math.floor(Math.random() * 1000000)}`;
    this.radius = 26;
    this.collected = false;
    this.createdAt = performance.now();
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.lifetime = 35.0; // Despawns after 35s (generous time to collect)
    this.maxLifetime = 35.0;
  }

  update(dt, player, game) {
    if (this.collected) return false;

    // Tick lifetime
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.collected = true;
      if (window.particleSystem) {
        window.particleSystem.emit(this.x, this.y, 8, {
          speed: 40,
          color: '#64748b',
          life: 0.25,
          size: 2
        });
      }
      return false;
    }

    // Check collision with player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy;
    const touchDist = player.radius + this.radius;

    if (distSq <= touchDist * touchDist && player.alive) {
      this.collect(player, game);
      return true;
    }
    return false;
  }

  collect(player, game) {
    if (this.collected) return;
    this.collected = true;

    // Safety check: Chrono time-dilation is completely disabled in multiplayer & PvP
    const isMultiplayer = game && (game.gameMode === 'multiplayer' || game.pvpOnly || (game.network && (game.network.pvpOnly || game.network.connected)));
    if (this.type === 'chrono' && isMultiplayer) {
      this.type = 'overdrive';
      this.config = POWERUP_CONFIGS.overdrive;
    }

    // Apply active powerup on player (replaces any current active powerup)
    if (player && player.addPowerup) {
      player.addPowerup(this.type, this.config.duration);
    }

    // Audio cue
    if (window.soundSystem) {
      if (window.soundSystem.playPowerupPickup) window.soundSystem.playPowerupPickup();
      if (this.type === 'chrono' && window.soundSystem.playChronoWarp) window.soundSystem.playChronoWarp();
      if (this.type === 'overdrive' && window.soundSystem.playOverdriveActive) window.soundSystem.playOverdriveActive();
    }

    // Particle Burst FX
    if (window.particleSystem) {
      window.particleSystem.emit(this.x, this.y, 28, {
        speed: 150,
        color: this.config.color,
        life: 0.5,
        size: 3
      });
      if (window.particleSystem.emitDamageNumber) {
        window.particleSystem.emitDamageNumber(this.x, this.y - 14, `+${this.config.name}!`, false, true);
      }
    }

    // Screen Banner / Toast
    if (game && game.showPowerupToast) {
      game.showPowerupToast(this.config);
    }
    // Instantly update HUD
    if (game && game.updateHUD) {
      game.updateHUD();
    }
  }

  draw(ctx) {
    if (this.collected) return;

    // Expiry blink when < 4.5 seconds left
    if (this.lifetime < 4.5) {
      const blink = Math.sin((4.5 - this.lifetime) * 16) > 0;
      if (blink) return;
    }

    const time = performance.now() * 0.001;
    const bob = Math.sin(time * 3.5 + this.pulsePhase) * 5;
    const pulse = 1 + Math.sin(time * 4.8 + this.pulsePhase) * 0.09;
    const drawY = this.y + bob;
    const col = this.config.color;
    const glowCol = this.config.glowColor || col;

    ctx.save();

    // 1. Vibrant Ground Glow & Projected Energy Well
    const groundPulse = 1 + Math.sin(time * 3.0 + this.pulsePhase) * 0.15;
    const groundGrad = ctx.createRadialGradient(this.x, this.y + 14, 4, this.x, this.y + 14, 44 * groundPulse);
    groundGrad.addColorStop(0, powerupHexToRgba(col, 0.65));
    groundGrad.addColorStop(0.45, powerupHexToRgba(glowCol, 0.35));
    groundGrad.addColorStop(1, powerupHexToRgba(col, 0));
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, 44 * groundPulse, 18 * groundPulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Expanding Ground Energy Shockwave Ring
    const waveProgress = (time * 0.8 + this.pulsePhase) % 1;
    ctx.strokeStyle = powerupHexToRgba(col, (1 - waveProgress) * 0.55);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, (14 + waveProgress * 32), (6 + waveProgress * 14), 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Vertical Holographic Light Pillar / Beacon Beam (Visible from afar)
    const beamGrad = ctx.createLinearGradient(0, drawY, 0, drawY - 60);
    beamGrad.addColorStop(0, powerupHexToRgba(col, 0.45));
    beamGrad.addColorStop(0.5, powerupHexToRgba(glowCol, 0.18));
    beamGrad.addColorStop(1, powerupHexToRgba(col, 0));
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(this.x - 16, drawY + 8);
    ctx.lineTo(this.x + 16, drawY + 8);
    ctx.lineTo(this.x + 8, drawY - 56);
    ctx.lineTo(this.x - 8, drawY - 56);
    ctx.closePath();
    ctx.fill();

    // 3. Counter-rotating Holographic Reticle Rings with Orbiting Nodes
    ctx.save();
    ctx.translate(this.x, drawY);

    // Outer Reticle Ring (Clockwise)
    ctx.save();
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Inner Accent Ring (Counter-clockwise)
    ctx.save();
    ctx.rotate(-time * 2.2);
    ctx.strokeStyle = glowCol;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting Spark Nodes on Inner Ring
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2 / 3);
      const nx = Math.cos(ang) * 20 * pulse;
      const ny = Math.sin(ang) * 20 * pulse;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(nx, ny, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Cyber Crate Body - Rich Glowing Neon Style
    ctx.save();
    ctx.scale(pulse, pulse);
    const w = 32, h = 28;

    // Glowing backdrop bloom
    ctx.shadowColor = col;
    ctx.shadowBlur = 22;

    // Crate Body Fill with rich vibrant cyber gradient
    const crateGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    crateGrad.addColorStop(0, powerupHexToRgba(col, 0.42));
    crateGrad.addColorStop(0.5, '#0b192c');
    crateGrad.addColorStop(1, powerupHexToRgba(glowCol, 0.36));
    ctx.fillStyle = crateGrad;

    // Bright outer border
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.8;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.fill();
    ctx.stroke();

    // Metallic Reinforced Corner Armor Brackets
    ctx.fillStyle = col;
    ctx.shadowBlur = 10;
    const cw = 5, ch = 5;
    ctx.fillRect(-w / 2, -h / 2, cw, ch);
    ctx.fillRect(w / 2 - cw, -h / 2, cw, ch);
    ctx.fillRect(-w / 2, h / 2 - ch, cw, ch);
    ctx.fillRect(w / 2 - cw, h / 2 - ch, cw, ch);

    // Luminous Center Core Plate
    const coreW = 20, coreH = 18;
    ctx.fillStyle = powerupHexToRgba(col, 0.30);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-coreW / 2, -coreH / 2, coreW, coreH, 3);
    } else {
      ctx.rect(-coreW / 2, -coreH / 2, coreW, coreH);
    }
    ctx.fill();
    ctx.stroke();

    // Glowing Inner Emblem / Icon (Clear & Prominent)
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.fillText(this.config.icon, 0, 1);

    ctx.restore(); // Restore scale
    ctx.restore(); // Restore translation (this.x, drawY)

    // 5. Floating Holographic AR Nameplate (Above Crate)
    ctx.save();
    ctx.translate(this.x, drawY - 32);

    const nameText = this.config.name;
    const tagText = this.config.tag || 'POWER-UP';
    ctx.font = 'bold 11px "Rajdhani", sans-serif';
    const textW = ctx.measureText(nameText).width;
    const badgeW = Math.max(68, textW + 18);
    const badgeH = 18;

    // Floating Badge Background
    ctx.fillStyle = 'rgba(7, 14, 26, 0.92)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = col;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 4);
    else ctx.rect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
    ctx.fill();
    ctx.stroke();

    // Mini Sub-Tag above badge
    ctx.font = '700 8px "Rajdhani", monospace';
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 6;
    ctx.fillText(tagText, 0, -badgeH / 2 - 2);

    // Name text inside badge
    ctx.font = 'bold 11px "Rajdhani", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 8;
    ctx.shadowColor = col;
    ctx.fillText(nameText, 0, 1);

    ctx.restore(); // Restore badge translate

    ctx.restore(); // Restore master save
  }
}

// --- Autonomous Companion Drone Buddy ---
class SupportDrone {
  constructor(player) {
    this.player = player;
    this.orbitAngle = 0;
    this.orbitRadius = 52;
    this.x = player.x;
    this.y = player.y;
    this.fireTimer = 0;
    this.fireRate = 0.36; // Fast laser fire
    this.target = null;
    this.animTimer = 0;
  }

  update(dt, enemies, acidSpits, game) {
    this.animTimer += dt * 4;
    this.orbitAngle += dt * 2.8;

    // Smooth orbital position hovering relative to operative
    const targetX = this.player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    const targetY = this.player.y + Math.sin(this.orbitAngle) * this.orbitRadius;
    this.x += (targetX - this.x) * Math.min(1, dt * 14);
    this.y += (targetY - this.y) * Math.min(1, dt * 14);

    // 1. Defend operative from nearby acid spits
    if (acidSpits && acidSpits.length > 0) {
      for (let i = 0; i < acidSpits.length; i++) {
        const spit = acidSpits[i];
        if (spit && spit.active && Math.hypot(this.x - spit.x, this.y - spit.y) < 130) {
          spit.active = false;
          if (window.soundSystem && window.soundSystem.playDroneShoot) window.soundSystem.playDroneShoot();
          if (window.particleSystem) {
            window.particleSystem.emit(spit.x, spit.y, 8, { speed: 120, color: '#39ff14', life: 0.2 });
          }
          break;
        }
      }
    }

    // 2. Autonomous Target Acquisition & Laser Strike
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && enemies && enemies.length > 0) {
      let closestDist = 460;
      let closestEnemy = null;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive || (e.type === 'ghost' && e.isPhased)) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = e;
        }
      }

      if (closestEnemy) {
        this.target = closestEnemy;
        this.fireTimer = this.fireRate;
        this.shootAt(closestEnemy, game);
      }
    }
  }

  shootAt(enemy, game) {
    const aimAngle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
    if (window.soundSystem && window.soundSystem.playDroneShoot) {
      window.soundSystem.playDroneShoot();
    }

    // Spawn drone high-speed micro-plasma projectile
    if (game && game.bullets) {
      const bullet = new Bullet(this.x, this.y, aimAngle, {
        speed: 1300,
        damage: 28,
        range: 600,
        radius: 3.5,
        color: '#39ff14',
        glowColor: '#00ff88',
        weaponType: 'smg'
      });
      game.bullets.push(bullet);
    }

    if (window.particleSystem) {
      window.particleSystem.emitMuzzleFlash(this.x, this.y, aimAngle, '#39ff14');
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const bob = Math.sin(this.animTimer * 2) * 2;
    const pulse = 1 + Math.sin(this.animTimer * 3) * 0.1;

    // Glowing Drone Thruster Ring
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, bob, 11 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Dark Drone Metal Fuselage
    ctx.fillStyle = '#081726';
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Optical Sensor Eye
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Quad Thruster Pods
    ctx.fillStyle = '#1e293b';
    const offsets = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
    for (const [ox, oy] of offsets) {
      ctx.fillRect(ox - 1.5, oy + bob - 1.5, 3, 3);
    }

    ctx.restore();
  }
}

// --- Bouncing Cluster Mini-Grenade ---
class ClusterGrenade {
  constructor(x, y, angle, speed = 380) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.15;
    this.maxLife = 1.15;
    this.radius = 6;
    this.active = true;
    this.bounces = 2;
    this.blastRadius = 115;
    this.damage = 95;
  }

  update(dt, map, enemies, barrels, game) {
    if (!this.active) return;
    this.life -= dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.94; // Friction
    this.vy *= 0.94;

    // Wall bounce
    if (map && map.isColliding(this.x, this.y, this.radius)) {
      if (this.bounces > 0) {
        this.bounces--;
        this.vx = -this.vx * 0.7;
        this.vy = -this.vy * 0.7;
        if (window.soundSystem && window.soundSystem.playGrenadeBounce) {
          window.soundSystem.playGrenadeBounce();
        }
      }
    }

    // Detonate on fuse expiry
    if (this.life <= 0) {
      this.explode(map, enemies, barrels, game);
    }
  }

  explode(map, enemies, barrels, game) {
    if (!this.active) return;
    this.active = false;

    window.particleSystem.emitExplosion(this.x, this.y, this.blastRadius);
    if (window.soundSystem) window.soundSystem.playExplosion();
    if (game && game.addScreenShake) game.addScreenShake(6);

    // Damage enemies
    if (enemies) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(this.x - e.x, this.y - e.y);
        if (d <= this.blastRadius + e.radius) {
          const falloff = Math.max(0.35, 1 - (d / (this.blastRadius + e.radius)));
          const dmg = Math.round(this.damage * falloff);
          e.takeDamage(dmg, e.x, e.y, Math.atan2(e.y - this.y, e.x - this.x), true, 'cannon');
          if (game && game.recordHit) game.recordHit();
        }
      }
    }

    // Damage barrels
    if (barrels && map) {
      for (const b of barrels) {
        if (b.exploded) continue;
        if (Math.hypot(this.x - b.x, this.y - b.y) <= this.blastRadius + b.radius) {
          b.hp -= this.damage;
          if (b.hp <= 0) map.triggerBarrelExplosion(b, game);
        }
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    const blink = Math.sin(this.life * 25) > 0;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = blink ? '#ff0055' : '#ff9500';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center fuse beacon dot
    ctx.fillStyle = blink ? '#ffffff' : '#ff9500';
    ctx.shadowColor = '#ff9500';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PowerupDrop, SupportDrone, ClusterGrenade, POWERUP_CONFIGS, POWERUP_TYPES };
} else {
  window.PowerupDrop = PowerupDrop;
  window.SupportDrone = SupportDrone;
  window.ClusterGrenade = ClusterGrenade;
  window.POWERUP_CONFIGS = POWERUP_CONFIGS;
  window.POWERUP_TYPES = POWERUP_TYPES;
}
