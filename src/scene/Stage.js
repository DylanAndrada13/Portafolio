import { OrthographicCamera, Scene, Vector2, Vector4, WebGLRenderer, LinearSRGBColorSpace } from 'three';
import { Background } from './Background.js';
import { Dust } from './Dust.js';
import { LogoScreen } from './logoTexture.js';

const IMG_W = 1920;
const IMG_H = 1080;
const IMG_ASPECT = IMG_W / IMG_H;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Orquesta el renderer, la "cámara" 2.5D (recorte + parallax + deriva) y el loop.
 */
export class Stage {
  constructor(canvas, textures, { device, state }) {
    this.device = device;
    this.state = state;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: device.lite ? 'low-power' : 'high-performance',
    });
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.setClearColor(0x000000, 1);

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // uniforms compartidos entre fondo y partículas (mismo objeto = misma cámara)
    this.shared = {
      uCenter: { value: new Vector2(0.5, 0.5) },
      uScale: { value: new Vector2(1, 1) },
      uParallax: { value: new Vector2() },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uPower: { value: 0 },
      uLed: { value: 0 },
    };

    // tu logo en la pantalla de arriba: se dibuja dentro del shader, así calza con la cámara
    this.logo = new LogoScreen();
    this.background = new Background({ ...textures, logo: this.logo.texture }, this.shared);
    this.dust = new Dust({ count: device.lite ? 40 : device.isSmall ? 90 : 200, glow: textures.glow, shared: this.shared });
    this.scene.add(this.background.mesh, this.dust.points);

    // entrada del usuario (suavizada en el loop)
    this.pointer = new Vector2();
    this.pointerSmooth = new Vector2();
    this.torchTarget = new Vector2(0.5, 0.5);
    this.hoverIndex = -1;
    this.hoverSmooth = new Vector4();
    this.paused = false;
    this.bindInput();

    this.maxDpr = device.lite ? 1 : device.isSmall ? 1.25 : 1.75;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    this.frameTimes = [];
    this.start = performance.now();
    this.tick = this.tick.bind(this);
    this.renderer.setAnimationLoop(this.tick);
  }

  bindInput() {
    this.bindSwipe();
    window.addEventListener(
      'pointermove',
      (e) => {
        this.torchTarget.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
        if (this.device.reducedMotion) return;
        this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      },
      { passive: true },
    );
    if (this.device.reducedMotion) return;
    // inclinación del teléfono (Android; en iOS requiere permiso explícito, así que se omite)
    window.addEventListener(
      'deviceorientation',
      (e) => {
        if (e.gamma == null) return;
        this.pointer.set(clamp(e.gamma / 25, -1, 1), clamp((e.beta - 45) / -25, -1, 1));
      },
      { passive: true },
    );
  }

  /**
   * Deslizar el dedo recorre la habitación (celu y tablets). Después del primer
   * deslizamiento la cámara queda donde la dejaste, con un poco de inercia.
   */
  bindSwipe() {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';
    this.pan = { x: 0.5, y: 0.5, mix: 0, vx: 0, vy: 0, id: null, lx: 0, ly: 0, moved: 0, dragging: false };
    this.dragged = false; // App lo usa para no tomar el deslizamiento como un toque
    const p = this.pan;
    // se puede arrancar a deslizar sobre la habitación o sobre lo que está pegado en ella
    // (marcadores, cartel, parlante), pero no sobre la interfaz
    const BLOCK = '#ui-root, .landing, .hud, .music, .panel, .os, input, textarea, select, [role="dialog"]';
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || p.id !== null) return;
      if (e.target.closest?.(BLOCK)) return;
      p.id = e.pointerId;
      p.lx = e.clientX;
      p.ly = e.clientY;
      p.moved = 0;
      p.vx = p.vy = 0;
      this.dragged = false;
    });
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId !== p.id) return;
        const dx = e.clientX - p.lx;
        const dy = e.clientY - p.ly;
        p.lx = e.clientX;
        p.ly = e.clientY;
        p.moved += Math.abs(dx) + Math.abs(dy);
        if (!p.dragging && p.moved > 10) {
          p.dragging = true;
          this.dragged = true;
          if (p.mix < 1) {
            // arranca desde donde está la cámara ahora
            p.x = this.shared.uCenter.value.x;
            p.y = this.shared.uCenter.value.y;
          }
          p.mix = 1;
        }
        if (!p.dragging) return;
        const sc = this.shared.uScale.value;
        p.vx = (-dx / this.viewW) * sc.x;
        p.vy = (dy / this.viewH) * sc.y;
        p.x += p.vx;
        p.y += p.vy;
      },
      { passive: true },
    );
    const end = (e) => {
      if (e.pointerId !== p.id) return;
      p.id = null;
      p.dragging = false;
      setTimeout(() => (this.dragged = false), 60);
    };
    window.addEventListener('pointerup', end);
    // si fue un deslizamiento, el "click" que dispara el navegador al soltar no cuenta
    window.addEventListener(
      'click',
      (e) => {
        if (!this.dragged) return;
        e.preventDefault();
        e.stopPropagation();
      },
      true,
    );
    window.addEventListener('pointercancel', end);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.background.setSize(w * this.dpr, h * this.dpr);
    this.dust.setPixelRatio(this.dpr);
    this.viewW = w;
    this.viewH = h;
    this.viewAspect = w / h;
    this.portrait = this.viewAspect < 1;
  }

  /** Píxel de pantalla -> píxel de la imagen original. */
  screenToImage(x, y) {
    const c = this.shared.uCenter.value;
    const s = this.shared.uScale.value;
    const u = c.x + (x / this.viewW - 0.5) * s.x;
    const v = c.y + (1 - y / this.viewH - 0.5) * s.y;
    return [u * IMG_W, (1 - v) * IMG_H];
  }

  /**
   * Píxel de la imagen original -> píxel de pantalla.
   * Con `depth` (0 lejos..1 cerca, como depth.png) aplica el mismo parallax que el shader,
   * para que lo pegado en una pared se mueva junto con esa pared.
   */
  imageToScreen(px, py, depth) {
    const c = this.shared.uCenter.value;
    const s = this.shared.uScale.value;
    let u = px / IMG_W;
    let v = 1 - py / IMG_H;
    if (depth != null) {
      const k = depth - 0.3;
      const par = this.shared.uParallax.value;
      const dolly = this.background.uniforms.uDolly.value;
      const den = 1 + k * dolly;
      u = (u - par.x * k + c.x * k * dolly) / den;
      v = (v - par.y * k + c.y * k * dolly) / den;
    }
    const sx = (u - c.x) / s.x + 0.5;
    const sy = (v - c.y) / s.y + 0.5;
    return [sx * this.viewW, (1 - sy) * this.viewH];
  }

  /** Calcula el recorte "cover" de la imagen + paneo de cámara. */
  updateCamera(t) {
    const s = this.state;
    const focus = s.focusMix;
    const motion = (this.device.reducedMotion ? 0 : s.motion) * (1 - focus);

    // escala visible de la imagen (uv) para que cubra la pantalla
    let sx = 1;
    let sy = 1;
    if (this.viewAspect > IMG_ASPECT) sy = IMG_ASPECT / this.viewAspect;
    else sx = this.viewAspect / IMG_ASPECT;
    const breathe = 1 + Math.sin(t * 0.11) * 0.012 * motion;
    const zoom = s.zoom * breathe;
    sx /= zoom;
    sy /= zoom;

    // deriva cinematográfica lenta. En vertical recorre la habitación de lado a lado.
    const driftX = this.portrait
      ? Math.sin(t * 0.06) * 0.9
      : Math.sin(t * 0.05) * 0.45 + Math.sin(t * 0.13) * 0.12;
    const driftY = Math.sin(t * 0.07 + 1.3) * 0.35;
    const focusX = this.portrait ? 0.42 : 0.5;

    let cx = focusX + driftX * motion * (1 - sx) * 0.5;
    let cy = 0.5 + driftY * motion * (1 - sy) * 0.5;
    // lo que recorriste deslizando (con inercia al soltar)
    const pan = this.pan;
    if (pan.mix > 0) {
      if (!pan.dragging) {
        pan.x += pan.vx;
        pan.y += pan.vy;
        pan.vx *= 0.92;
        pan.vy *= 0.92;
      }
      pan.x = clamp(pan.x, sx / 2, 1 - sx / 2);
      pan.y = clamp(pan.y, sy / 2, 1 - sy / 2);
      cx = pan.x + driftX * motion * 0.01;
      cy = pan.y + driftY * motion * (1 - sy) * 0.1;
    }
    // la cámara viaja hacia un objeto (pantallas, cuadro, ventana)
    cx = lerp(cx, s.focusX / IMG_W, focus);
    cy = lerp(cy, 1 - s.focusY / IMG_H, focus);
    this.shared.uCenter.value.set(clamp(cx, sx / 2, 1 - sx / 2), clamp(cy, sy / 2, 1 - sy / 2));
    this.shared.uScale.value.set(sx, sy);

    // parallax: puntero + pequeña oscilación propia
    this.pointerSmooth.lerp(this.pointer, 0.045);
    const amp = 0.016 * motion;
    this.shared.uParallax.value.set(
      (this.pointerSmooth.x + Math.sin(t * 0.21) * 0.35) * amp,
      (this.pointerSmooth.y + Math.cos(t * 0.17) * 0.25) * amp * 0.6,
    );
    this.background.uniforms.uDolly.value = Math.sin(t * 0.09) * 0.03 * motion;
  }

  updateLights() {
    const s = this.state;
    const u = this.background.uniforms;
    const target = [0, 0, 0, 0];
    if (this.hoverIndex >= 0) target[this.hoverIndex] = 1;
    const h = this.hoverSmooth;
    h.set(lerp(h.x, target[0], 0.12), lerp(h.y, target[1], 0.12), lerp(h.z, target[2], 0.12), lerp(h.w, target[3], 0.12));
    u.uHover.value.copy(h);

    u.uTorchPos.value.lerp(this.torchTarget, 0.18);
    const torch = s.torch; // la luz roja no ilumina la habitación: la linterna sigue igual
    u.uTorch.value = torch;
    u.uDim.value = lerp(1, 0.7, torch);
    u.uLamp.value = s.lamp;
    u.uRgb.value = s.rgb;
    u.uTheme.value = s.theme;
    u.uWhiteout.value = s.whiteout;
    u.uFlash.value = s.flash;
  }

  tick(now) {
    if (this.paused) {
      this.frameTimes.length = 0;
      return;
    }
    const elapsed = now - this.start;
    const t = elapsed / 1000;
    const s = this.state;

    this.shared.uTime.value = t;
    this.shared.uReveal.value = s.reveal;
    this.shared.uPower.value = s.power;
    this.shared.uLed.value = s.led;

    this.updateCamera(t);
    this.updateLights();
    // la primera vez que se encienden las pantallas, el logo se arma (y queda armado)
    if (s.entered && s.power > 0.98 && s.reveal > 0.3) this.logo.build(now);
    this.logo.update(now, this.device.reducedMotion);
    this.background.update(elapsed);
    this.renderer.render(this.scene, this.camera);
    this.adaptQuality(now);
  }

  /**
   * Calidad adaptativa: mide ~90 frames y, si el equipo no llega a ~45fps, baja la
   * resolución interna. Repite hasta dos veces (la segunda también saca las partículas).
   */
  adaptQuality(now) {
    if (this.qualitySteps >= 2 || this.state.reveal < 1) return;
    const last = this.frameTimes[this.frameTimes.length - 1];
    if (last && now - last > 250) this.frameTimes.length = 0; // pestaña oculta u otra pausa: no cuenta
    this.frameTimes.push(now);
    if (this.frameTimes.length < 90) return;
    const span = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0];
    const avg = span / (this.frameTimes.length - 1);
    this.frameTimes = [];
    this.qualitySteps = (this.qualitySteps || 0) + 1;
    if (avg <= 22) {
      this.qualitySteps = 2; // va bien: no se mide más
      return;
    }
    const floor = this.qualitySteps === 1 ? 1 : 0.75;
    if (this.dpr > floor) {
      this.dpr = Math.max(floor, lerp(this.dpr, floor, 0.7));
      this.resize();
    }
    if (this.qualitySteps === 2 && avg > 30) this.dust.points.visible = false;
    document.body.classList.add('is-lite');
  }
}
