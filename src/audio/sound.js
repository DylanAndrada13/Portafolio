/**
 * Sonido 100% procedural con Web Audio: no descarga ningún archivo.
 * Apagado por defecto; el navegador solo permite activarlo tras un clic.
 */
const PREF_KEY = 'dylan:sound';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.listeners = new Set();
  }

  get preferred() {
    try {
      return localStorage.getItem(PREF_KEY) === 'on';
    } catch {
      return false;
    }
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.noise = this.makeNoise(2);
    this.startRain();
  }

  async setEnabled(on) {
    this.init();
    if (!this.ctx) return;
    this.enabled = on;
    try {
      localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
    if (on) await this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, now, 0.25);
    this.listeners.forEach((fn) => fn(on));
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  makeNoise(seconds) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    return src;
  }

  /** Lluvia: ruido filtrado continuo con un leve vaivén. */
  startRain() {
    const src = this.noiseSource(true);
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 0.4;
    const low = this.ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 5000;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.07;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(band).connect(low).connect(gain).connect(this.master);
    src.start();
    lfo.start();
  }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  env(gainNode, attack, decay, peak) {
    const t = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** Trueno grave que llega un poco después del relámpago. */
  thunder(delay = 0.4) {
    if (!this.ready) return;
    const src = this.noiseSource();
    const low = this.ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 180;
    const g = this.ctx.createGain();
    src.connect(low).connect(g).connect(this.master);
    const t = this.ctx.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    low.frequency.setValueAtTime(260, t);
    low.frequency.exponentialRampToValueAtTime(70, t + 3);
    src.start(t);
    src.stop(t + 3.3);
  }

  /** Tecla mecánica. */
  key() {
    if (!this.ready) return;
    const src = this.noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800 + Math.random() * 1200;
    const g = this.ctx.createGain();
    src.connect(hp).connect(g).connect(this.master);
    this.env(g, 0.002, 0.04, 0.25);
    src.start();
    src.stop(this.ctx.currentTime + 0.06);
  }

  /** Bip de interfaz. `up` sube el tono (abrir), si no baja (cerrar). */
  blip(up = true, volume = 0.12) {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(up ? 520 : 880, t);
    o.frequency.exponentialRampToValueAtTime(up ? 1040 : 440, t + 0.09);
    o.connect(g).connect(this.master);
    this.env(g, 0.005, 0.12, volume);
    o.start();
    o.stop(t + 0.15);
  }

  /** Hover suave. */
  tick() {
    this.blip(true, 0.04);
  }

  /** Barrido de aire para los movimientos de cámara. */
  whoosh(duration = 1.2, up = true) {
    if (!this.ready) return;
    const src = this.noiseSource();
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.2;
    const g = this.ctx.createGain();
    src.connect(band).connect(g).connect(this.master);
    const t = this.ctx.currentTime;
    band.frequency.setValueAtTime(up ? 300 : 2400, t);
    band.frequency.exponentialRampToValueAtTime(up ? 2400 : 300, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + duration * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.start();
    src.stop(t + duration + 0.05);
  }

  /** Encendido de CRT / logro. */
  chime() {
    if (!this.ready) return;
    [660, 990, 1320].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g).connect(this.master);
      const t = this.ctx.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.start(t);
      o.stop(t + 0.55);
    });
  }

  /** Clic de interruptor (lámpara). */
  click() {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = 140;
    o.connect(g).connect(this.master);
    this.env(g, 0.001, 0.05, 0.15);
    o.start();
    o.stop(this.ctx.currentTime + 0.07);
  }
}

export const sound = new SoundEngine();
