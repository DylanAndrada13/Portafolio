import gsap from 'gsap';
import { projects } from '../data/projects.js';
import { profile } from '../data/profile.js';
import { regionAt, REGIONS } from '../scene/regions.js';
import { strike, scheduleLightning } from '../scene/lightning.js';
import { DylanOS } from '../os/DylanOS.js';
import { Panel } from '../ui/Panel.js';
import { Hotspots } from '../ui/Hotspots.js';
import { WallDecals } from '../ui/WallDecals.js';
import { MusicPlayer } from '../ui/MusicPlayer.js';
import { achievements, ACHIEVEMENTS } from '../ui/achievements.js';
import { sound } from '../audio/sound.js';
import { t, i18n } from '../i18n/i18n.js';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const byId = (id) => REGIONS.find((r) => r.id === id);

/**
 * La habitación como menú. Modos: room · os (monitor) · about (cuadro) · contact (ventana).
 */
export class App {
  constructor({ stage, state, device, onHome }) {
    this.onHome = onHome;
    this.stage = stage;
    this.state = state;
    this.device = device;
    this.mode = 'room';
    this.busy = false;
    this.uiRoot = document.getElementById('ui-root');
    this.hero = document.querySelector('.hero');
    this.canvas = document.getElementById('scene');
  }

  start() {
    const s = this.state;
    scheduleLightning(s);

    // linterna: solo con mouse (en táctil no hay puntero que seguir)
    if (!this.device.coarse) gsap.to(s, { torch: 1, duration: 2.5, ease: 'sine.inOut' });

    this.hotspots = new Hotspots({
      root: document.getElementById('hotspots'),
      stage: this.stage,
      onSelect: (r) => this.select(r),
      onHover: (r) => this.hover(r),
    });
    this.hotspots.show();

    // stickers de herramientas en el cuadro + cartel "¿tenés un proyecto?" arriba de la cama
    this.decals = new WallDecals({
      root: document.getElementById('hotspots'),
      stage: this.stage,
      state: s,
      skills: profile.skills,
      onSign: () => this.mode === 'room' && this.openContactForm(),
      onSwitch: () => this.mode === 'room' && this.toggleLamp(),
      onSpeaker: () => this.mode === 'room' && this.music.toggle(),
    });
    // parlante con 3 canciones (src/data/music.js)
    this.music = new MusicPlayer({ anchor: this.decals.speaker, onState: (on) => this.decals.setSpeaker(on) });
    this.decals.setInteractive(true);
    this.decals.sign.addEventListener('pointerenter', () => this.mode === 'room' && sound.tick());

    this.os = new DylanOS({
      root: this.uiRoot,
      projects,
      profile,
      actions: {
        go: (m) => this.go(m),
        exit: () => this.go('room'),
        toggleLamp: () => this.toggleLamp(),
        storm: () => strike(s) && achievements.unlock('storm'),
        toggleRgb: () => this.toggleRgb(),
        toggleSound: () => sound.toggle(),
        toggleLang: () => this.switchLang(),
        onTerminal: () => achievements.unlock('hacker'),
        onProjectOpen: () => achievements.unlock('curious'),
      },
    });

    this.bindRoom();
    this.bindKeys();
    this.buildHud();
    if (this.device.coarse) this.showSwipeHint();
  }

  /** En pantallas táctiles: aviso de que se puede deslizar para recorrer la habitación. */
  showSwipeHint() {
    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = `<span class="swipe-hint__hand">👆</span><span data-t="swipe.hint"></span>`;
    const label = () => (hint.lastElementChild.textContent = t('swipe.hint'));
    label();
    i18n.onChange(label);
    document.body.appendChild(hint);
    const hide = () => {
      hint.classList.add('is-gone');
      setTimeout(() => hint.remove(), 600);
      this.canvas.removeEventListener('pointerdown', hide);
    };
    // solo si seguimos en la habitación (no si se entró directo a una sección)
    setTimeout(() => (this.mode === 'room' ? hint.classList.add('is-in') : hide()), 1200);
    setTimeout(hide, 7000);
    this.canvas.addEventListener('pointerdown', hide);
  }

  /* ------------------------------------------------------------------ habitación */

  bindRoom() {
    let current = null;
    window.addEventListener(
      'pointermove',
      (e) => {
        if (this.mode !== 'room' || this.busy || e.pointerType === 'touch') return;
        const r = e.target === this.canvas ? regionAt(this.stage.screenToImage(e.clientX, e.clientY)) : null;
        if (r !== current) {
          current = r;
          this.hover(r);
        }
      },
      { passive: true },
    );
    this.canvas.addEventListener('click', (e) => {
      if (this.mode !== 'room' || this.busy || this.stage.dragged) return;
      const r = regionAt(this.stage.screenToImage(e.clientX, e.clientY));
      if (r) this.select(r);
    });
  }

  hover(r) {
    if (this.mode !== 'room') r = null;
    this.stage.hoverIndex = r ? r.hover : -1;
    this.hotspots.setActive(r?.id);
    document.body.classList.toggle('is-pointing', !!r);
    if (!r) return;
    sound.tick();
    // pasar por la ventana invoca un relámpago (con pausa entre uno y otro)
    const now = performance.now();
    if (r.id === 'window' && now - (this.lastStorm || 0) > 7000) {
      this.lastStorm = now;
      if (strike(this.state)) achievements.unlock('storm');
    }
  }

  select(r) {
    sound.blip(true, 0.1);
    if (r.id === 'lamp') return this.toggleLamp();
    if (r.id === 'monitor') return this.go('os');
    if (r.id === 'painting') return this.go('about');
    if (r.id === 'window') return this.go('contact');
  }

  toggleLamp() {
    const on = this.state.lamp < 0.5;
    sound.click();
    gsap.killTweensOf(this.state, 'lamp');
    gsap.killTweensOf(this.state, 'theme');
    if (on) {
      // los LEDs arrancan con un parpadeo; la interfaz se tiñe de rojo junto con ellos
      gsap.to(this.state, { keyframes: { lamp: [0, 0.8, 0.1, 0.9, 0.4, 1] }, duration: 0.7, ease: 'none' });
      gsap.to(this.state, { theme: 1, duration: 0.9, ease: 'power2.inOut', delay: 0.2 });
      achievements.unlock('light');
    } else {
      gsap.to(this.state, { lamp: 0, duration: 0.35, ease: 'power2.out' });
      gsap.to(this.state, { theme: 0, duration: 1.1, ease: 'power2.inOut' });
    }
    this.decals?.setSwitch(on);
    this.lightBtn?.setAttribute('aria-pressed', String(on));
    this.lightBtn?.classList.toggle('is-on', on);
    // la interfaz cambia de color junto con la habitación
    gsap.delayedCall(on ? 0.25 : 0, () => document.body.classList.toggle('is-red', on));
    return on;
  }

  toggleRgb() {
    const on = this.state.rgb < 0.5;
    gsap.to(this.state, { rgb: on ? 1 : 0, duration: 1.2, ease: 'sine.inOut' });
    document.body.classList.toggle('is-rgb', on);
    if (on) achievements.unlock('rgb');
    sound.chime();
    return on;
  }

  /* ------------------------------------------------------------------ navegación */

  /** Vuelve a la pantalla de inicio (cierra lo que esté abierto primero). */
  async goHome() {
    if (this.busy) return;
    this.music?.close();
    if (this.mode !== 'room') await this.go('room');
    this.hover(null);
    this.onHome?.();
  }

  async go(target) {
    if (this.busy || target === this.mode) return;
    this.busy = true;
    this.hover(null);
    this.music?.close();
    this.decals?.setInteractive(false);
    try {
      if (this.mode !== 'room') await this.leave(this.mode, target === 'room');
      if (target !== 'room') await this.enter(target);
      this.mode = target;
    } finally {
      this.busy = false;
    }
    if (target === 'room') {
      this.hotspots.show();
      this.decals?.setInteractive(true);
    }
  }

  /** Desde el cartel de neón: abre contacto y deja el cursor en el formulario. */
  async openContactForm() {
    sound.blip(true, 0.1);
    await this.go('contact');
    const first = this.panel?.el.querySelector('.cform input');
    if (first && !this.device.coarse) first.focus({ preventScroll: true });
  }

  /** Para cuadro y ventana: el objeto queda a un costado y el panel al otro. */
  focusFor(region) {
    const { x, y, zoom } = region.focus;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const visW = (1920 * Math.min(1, aspect / (16 / 9))) / zoom;
    const visH = (1080 * Math.min(1, (16 / 9) / aspect)) / zoom;
    if (region.id === 'monitor') return { x, y, zoom };
    // el panel va del lado opuesto al objeto (el cuadro está a la derecha: panel a la izquierda)
    const dir = region.panelSide === 'left' ? -1 : 1;
    return w > 760 ? { x: x + dir * visW * 0.22, y, zoom } : { x, y: y + visH * 0.24, zoom };
  }

  hideRoomUi() {
    this.hotspots.hide();
    gsap.to(this.hero, { autoAlpha: 0, y: -20, duration: 0.5, ease: 'power2.in' });
    gsap.to('.hud', { autoAlpha: 0, duration: 0.3 });
  }

  showRoomUi() {
    gsap.to(this.hero, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.3 });
    gsap.to('.hud', { autoAlpha: 1, duration: 0.5, delay: 0.5 });
  }

  cameraTo(focus, { duration = 1.4, extra = {} } = {}) {
    const s = this.state;
    gsap.set(s, { focusX: focus.x, focusY: focus.y });
    sound.whoosh(duration * 0.9, true);
    return gsap.to(s, {
      focusMix: 1,
      zoom: focus.zoom,
      torch: 0,
      duration,
      ease: 'expo.inOut',
      ...extra,
    });
  }

  cameraHome(duration = 1.3) {
    sound.whoosh(duration * 0.9, false);
    return gsap.to(this.state, {
      focusMix: 0,
      zoom: 1.06,
      torch: this.device.coarse ? 0 : 1,
      duration,
      ease: 'expo.inOut',
    });
  }

  async enter(mode) {
    this.hideRoomUi();
    if (mode === 'os') {
      const region = byId('monitor');
      const tl = gsap.timeline();
      tl.add(this.cameraTo(this.focusFor(region), { duration: 1.5 }));
      tl.to(this.state, { whiteout: 1, duration: 0.45, ease: 'power2.in' }, '-=0.45');
      await tl;
      this.os.open();
      achievements.unlock('explorer');
      gsap.delayedCall(0.35, () => (this.stage.paused = true)); // la escena queda tapada: no se dibuja
      return;
    }
    const region = byId(mode === 'about' ? 'painting' : 'window');
    await this.cameraTo(this.focusFor(region), { duration: 1.25 });
    this.panel = new Panel({ root: this.uiRoot, kind: mode, side: region.panelSide, profile, onClose: () => this.go('room') });
    this.panel.open();
    achievements.unlock(mode === 'about' ? 'reader' : 'social');
  }

  async leave(mode, toRoom) {
    if (mode === 'os') {
      this.state.whiteout = 1;
      this.stage.paused = false;
      await this.os.close();
      const tl = gsap.timeline();
      tl.to(this.state, { whiteout: 0, duration: 0.6, ease: 'power2.out' }, 0);
      tl.add(this.cameraHome(1.5), 0);
      if (toRoom) this.showRoomUi();
      await tl;
      return;
    }
    await this.panel?.close();
    this.panel = null;
    if (toRoom) this.showRoomUi();
    await this.cameraHome(1.1);
  }

  /* ------------------------------------------------------------------ teclado */

  bindKeys() {
    let k = 0;
    window.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
      if (k === KONAMI.length) {
        k = 0;
        this.toggleRgb();
      }
      if (e.key === 'Escape' && (this.mode === 'about' || this.mode === 'contact')) this.go('room');
    });
  }

  /* ------------------------------------------------------------------ idioma */

  /**
   * Cambio de idioma como cambio de cartucho: sale del slot, la pantalla hace glitch,
   * todo el texto cambia y entra el cartucho nuevo.
   */
  switchLang() {
    if (this.swapping) return i18n.lang;
    this.swapping = true;
    const body = this.cart?.querySelector('.cart__body');
    const reduced = this.device.reducedMotion;
    sound.click();
    const tl = gsap.timeline({ onComplete: () => (this.swapping = false) });
    if (body && !reduced) tl.to(body, { y: -30, rotate: -6, duration: 0.28, ease: 'power2.out' });
    tl.call(() => {
      document.body.classList.remove('is-glitch');
      void document.body.offsetWidth;
      document.body.classList.add('is-glitch');
      sound.whoosh(0.35, true);
      i18n.toggle();
      achievements.unlock('polyglot');
    });
    if (body && !reduced) tl.to(body, { y: 0, rotate: 0, duration: 0.42, ease: 'back.in(1.6)' }, '+=0.12');
    tl.call(() => sound.blip(true, 0.12));
    tl.call(() => document.body.classList.remove('is-glitch'), null, '+=0.35');
    return i18n.other;
  }

  /* ------------------------------------------------------------------ HUD */

  buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `
      <nav class="hud__nav">
        <button class="hud__btn hud__home" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5"/></svg><span data-t="hud.home"></span></button>
        <button class="hud__btn" type="button" data-go="os" data-t="hud.projects"></button>
        <button class="hud__btn" type="button" data-go="about" data-t="hud.about"></button>
        <button class="hud__btn" type="button" data-go="contact" data-t="hud.contact"></button>
      </nav>
      <div class="hud__left">
        <button class="hud__btn hud__sound" type="button" aria-pressed="false">
          <span class="hud__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="hud__sound-label"></span>
        </button>
        <button class="hud__btn hud__light" type="button" aria-pressed="false"><span class="hud__light-dot" aria-hidden="true"></span><span data-t="region.lamp"></span></button>
        <button class="cart" type="button">
          <span class="cart__slot" aria-hidden="true"></span>
          <span class="cart__body" aria-hidden="true">
            <span class="cart__label"><b class="cart__lang"></b><small>DYLAN·OS</small></span>
            <span class="cart__pins"></span>
          </span>
          <span class="cart__hint" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hud__right">
        <button class="hud__btn hud__trophy" type="button" aria-expanded="false">
          <span aria-hidden="true">★</span> <span data-t="hud.trophies"></span> <span class="hud__count"></span>
        </button>
        <div class="trophies" hidden></div>
      </div>`;
    document.body.appendChild(hud);

    hud.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.go)));
    hud.querySelector('.hud__home').addEventListener('click', () => this.goHome());
    const homeLabel = () => hud.querySelector('.hud__home').setAttribute('aria-label', t('hud.home'));
    homeLabel();
    i18n.onChange(homeLabel);
    const soundBtn = hud.querySelector('.hud__sound');
    const label = hud.querySelector('.hud__sound-label');
    soundBtn.addEventListener('click', () => sound.toggle());
    const soundLabel = () => {
      label.textContent = t(sound.enabled ? 'hud.sound.on' : 'hud.sound.off');
      soundBtn.setAttribute('aria-label', label.textContent); // en celu el texto está oculto
    };
    sound.onChange((on) => {
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.classList.toggle('is-on', on);
      soundLabel();
    });
    // si ya lo había activado antes, se reactiva con la primera interacción
    if (sound.preferred) {
      window.addEventListener('pointerdown', () => sound.setEnabled(true), { once: true });
    }

    const count = hud.querySelector('.hud__count');
    const trophyBtn = hud.querySelector('.hud__trophy');
    const list = hud.querySelector('.trophies');
    const refresh = () => {
      count.textContent = `${achievements.count}/${achievements.total}`;
      list.innerHTML = Object.entries(ACHIEVEMENTS)
        .map(([id, a]) => {
          const got = achievements.unlocked.has(id);
          return `<div class="trophy ${got ? 'is-got' : ''}"><span aria-hidden="true">${got ? a.icon : '?'}</span><span><strong>${got ? a.title : '???'}</strong><small>${got ? a.text : t('hud.locked')}</small></span></div>`;
        })
        .join('');
    };
    refresh();

    // textos que cambian con el idioma
    const relabel = () => {
      hud.querySelector('.hud__nav').setAttribute('aria-label', t('hud.sections'));
      hud.querySelectorAll('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t)));
      soundLabel();
      refresh();
      this.cart.setAttribute('aria-label', t('cart.aria'));
      this.cart.querySelector('.cart__lang').textContent = i18n.lang.toUpperCase();
      this.cart.querySelector('.cart__hint').textContent = t('cart.hint');
    };
    // en celu el interruptor de la pared puede quedar fuera de cuadro: también está en la barra
    this.lightBtn = hud.querySelector('.hud__light');
    this.lightBtn.addEventListener('click', () => this.toggleLamp());
    this.cart = hud.querySelector('.cart');
    this.cart.addEventListener('click', () => this.switchLang());
    relabel();
    i18n.onChange(relabel);

    const unlock = achievements.unlock.bind(achievements);
    achievements.unlock = (id) => (unlock(id), refresh());
    trophyBtn.addEventListener('click', () => {
      const open = list.hidden;
      list.hidden = !open;
      trophyBtn.setAttribute('aria-expanded', String(open));
      if (open) gsap.fromTo(list, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'expo.out' });
    });
    gsap.fromTo(hud, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, delay: 0.6 });
  }
}
