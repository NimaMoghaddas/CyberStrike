/**
 * CYBER STRIKE // NANO-STIM MEDKIT (HEALTH PACK)
 * Spawns periodically (every 5 seconds) across tactical map sectors.
 * Restores 50% health (+50 HP) upon operative contact.
 */

class Medkit {
  constructor(x, y, id = null, heal = 50) {
    this.x = x;
    this.y = y;
    this.id = id || `med_${Math.floor(Math.random() * 1000000)}`;
    this.heal = heal;
    this.radius = 18;
    this.collected = false;
    this.createdAt = performance.now();
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(dt, player, game) {
    if (this.collected) return false;

    // Check collision with operative
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy;
    const touchDist = player.radius + this.radius;

    if (distSq <= touchDist * touchDist) {
      if (player.alive && player.hp < player.maxHp) {
        this.collect(player, game);
        return true;
      }
    }
    return false;
  }

  collect(player, game) {
    if (this.collected) return;
    this.collected = true;

    // Restore 20% of total health (e.g., 20% of max HP)
    const healAmount = Math.max(1, Math.round(player.maxHp * 0.20));
    const oldHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    const healedAmount = Math.round(player.hp - oldHp);

    // Visual FX: Emerald nanite sparks & floating heal popup
    if (window.particleSystem) {
      window.particleSystem.emit(this.x, this.y, 22, {
        speed: 120,
        color: '#00ff88',
        life: 0.45
      });
      if (window.particleSystem.emitDamageNumber) {
        window.particleSystem.emitDamageNumber(this.x, this.y - 12, `+${healedAmount} HP`, true);
      }
    }

    // Audio Cue
    if (window.soundSystem && window.soundSystem.playMedkit) {
      window.soundSystem.playMedkit();
    }

    // Refresh HUD
    if (game && game.updateHUD) {
      game.updateHUD();
    }

    // If in multiplayer mode, notify server of pickup
    if (game && game.network && game.gameMode === 'multiplayer') {
      game.network.reportMedkitPickup(this.id);
    }
  }

  draw(ctx) {
    if (this.collected) return;

    const time = performance.now() * 0.001;
    const bob = Math.sin(time * 3.5 + this.pulsePhase) * 3.5;
    const pulse = 1 + Math.sin(time * 4.5 + this.pulsePhase) * 0.06;
    const drawY = this.y + bob;

    ctx.save();

    // 1. Soft green ground shadow
    const shadowScale = Math.max(0.6, 1 - (bob / 18));
    ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, 16 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Rotating ambient holo-bracket ring
    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.rotate(time * 1.6);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Medkit Outer Case (High-tech nanite case)
    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.scale(pulse, pulse);

    const w = 26, h = 20;
    ctx.fillStyle = '#08141d';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Corner brackets
    ctx.fillStyle = '#1e3848';
    ctx.fillRect(-w / 2, -h / 2, 4, 4);
    ctx.fillRect(w / 2 - 4, -h / 2, 4, 4);
    ctx.fillRect(-w / 2, h / 2 - 4, 4, 4);
    ctx.fillRect(w / 2 - 4, h / 2 - 4, 4, 4);

    // Glowing Emerald Medical Cross (+)
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    // Vertical bar
    ctx.fillRect(-2.5, -6, 5, 12);
    // Horizontal bar
    ctx.fillRect(-6, -2.5, 12, 5);
    ctx.shadowBlur = 0;

    ctx.restore();
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Medkit };
} else {
  window.Medkit = Medkit;
}
