/**
 * CYBER STRIKE // AUDIO SYSTEM
 * Procedural Web Audio API sound synthesizer
 * Zero external asset dependencies, instant playback, zero latency.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);
    }
    return this.muted;
  }

  // --- Sound: Tactical Rifle Shot ---
  playShoot() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // 1. Initial click/transient
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    
    oscGain.gain.setValueAtTime(0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);

    // 2. Punchy Noise Burst (Gunpowder / Plasma crack)
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, t);
    noiseFilter.Q.setValueAtTime(1.2, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);

    // 3. Sub thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.09);
    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.1);
  }

  // --- Dispatcher for Weapon Specific Audio ---
  playWeaponShoot(type = 'rifle') {
    switch (type) {
      case 'shotgun':
        this.playShotgunShoot();
        break;
      case 'smg':
        this.playSmgShoot();
        break;
      case 'railgun':
        this.playRailgunShoot();
        break;
      case 'cannon':
        this.playCannonShoot();
        break;
      case 'rifle':
      default:
        this.playShoot();
        break;
    }
  }

  // --- Sound: SG-12 Heavy Shotgun Blast ---
  playShotgunShoot() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // 1. Deep Sub Blast
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(140, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 0.22);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.23);

    // 2. Gritty Heavy Gunpowder Noise Burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.18);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);

    // 3. Mechanical Pump-Action Racking Sound (160ms delayed)
    const tRack = t + 0.16;
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(950, tRack);
    clickOsc.frequency.exponentialRampToValueAtTime(350, tRack + 0.05);
    clickGain.gain.setValueAtTime(0.25, tRack);
    clickGain.gain.exponentialRampToValueAtTime(0.001, tRack + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);
    clickOsc.start(tRack);
    clickOsc.stop(tRack + 0.06);
  }

  // --- Sound: Viper-X High-RPM SMG ---
  playSmgShoot() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // 1. Ultra-sharp transient chirp
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.045);
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);

    // 2. High-speed suppressed noise snap
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.Q.setValueAtTime(2.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.38, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
  }

  // --- Sound: Vortex-50 Supersonic Piercing Railgun ---
  playRailgunShoot() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // 1. Electric Capacitor Whine (Lead-in transient)
    const chargeOsc = this.ctx.createOscillator();
    const chargeGain = this.ctx.createGain();
    chargeOsc.type = 'sine';
    chargeOsc.frequency.setValueAtTime(600, t);
    chargeOsc.frequency.exponentialRampToValueAtTime(3200, t + 0.04);
    chargeGain.gain.setValueAtTime(0.4, t);
    chargeGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    chargeOsc.connect(chargeGain);
    chargeGain.connect(this.masterGain);
    chargeOsc.start(t);
    chargeOsc.stop(t + 0.045);

    // 2. Supersonic Atmospheric Crack & Discharge
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(1400, t + 0.01);
    crackOsc.frequency.exponentialRampToValueAtTime(60, t + 0.35);
    crackGain.gain.setValueAtTime(0.65, t + 0.01);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(t + 0.01);
    crackOsc.stop(t + 0.36);

    // 3. Resonant High Voltage Sizzle Noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.18));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.25);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);

    // 4. Sub-bass seismic rumble
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(95, t);
    rumble.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    rumbleGain.gain.setValueAtTime(0.8, t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumble.start(t);
    rumble.stop(t + 0.42);
  }

  // --- Sound: Nova-Plas Explosive Cannon Launch ---
  playCannonShoot() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // 1. Heavy Pneumatic Launch Thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);
    oscGain.gain.setValueAtTime(0.75, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);

    // 2. Heavy Plasma Ejection Woosh
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(550, t);
    filter.Q.setValueAtTime(1.8, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
  }

  // --- Sound: Weapon Switch / Holster Cycle ---
  playWeaponSwitch() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // Dual crisp metallic mechanical clicks
    [0, 0.045].forEach((offset, idx) => {
      const click = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      click.type = 'sine';
      click.frequency.setValueAtTime(idx === 0 ? 1800 : 2600, t + offset);
      click.frequency.exponentialRampToValueAtTime(600, t + offset + 0.025);
      gain.gain.setValueAtTime(0.2, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.025);
      click.connect(gain);
      gain.connect(this.masterGain);
      click.start(t + offset);
      click.stop(t + offset + 0.03);
    });
  }

  // --- Sound: Bullet Hit Hostile ---
  playHit() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.06);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // --- Sound: Bullet Hit Wall / Ricochet ---
  playWallHit() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // --- Sound: Enemy Death / Splat ---
  playEnemyDeath(isTank = false) {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = isTank ? 0.4 : 0.22;
    const baseFreq = isTank ? 180 : 360;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + dur);

    gain.gain.setValueAtTime(isTank ? 0.6 : 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // --- Sound: Toxic Acid Spit ---
  playAcidSpit() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 0.28;

    // 1. Organic squelch tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + dur);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);

    // 2. High frequency liquid hiss
    const bufSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(3.0, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(t);
  }

  // --- Sound: Barrel / Large Explosion ---
  playExplosion() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = 0.65;

    // Heavy Sub Drop
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + dur);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + dur);

    // Filtered Blast Noise
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + dur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
  }

  // --- Sound: Player Hurt ---
  playPlayerHurt() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  // --- Sound: Dash Whoosh ---
  playDash() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.linearRampToValueAtTime(540, t + 0.08);
    osc.frequency.linearRampToValueAtTime(150, t + 0.18);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  // --- Sound: Weapon Reload ---
  playReload() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // Mechanical click 1 (Magazine eject)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(700, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    gain1.gain.setValueAtTime(0.25, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.09);

    // Mechanical click 2 (Magazine slam in + bolt rack)
    const t2 = t + 0.8;
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(400, t2);
    osc2.frequency.exponentialRampToValueAtTime(800, t2 + 0.1);
    gain2.gain.setValueAtTime(0.35, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.1);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.11);
  }

  // --- Sound: Empty Gun Click ---
  playDryFire() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- Sound: Wave Start / Sector Clear Fanfare ---
  playWaveStart() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [220, 330, 440, 554];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.18, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.36);
    });
  }

  playWaveClear() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [330, 440, 554, 660, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);
      gain.gain.setValueAtTime(0.25, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.46);
    });
  }

  // --- Sound: Nano-Stim Medkit Health Pickup ---
  playMedkit() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 triumphant chime
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.24, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.32);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.34);
    });
  }
}

window.soundSystem = new SoundSystem();
