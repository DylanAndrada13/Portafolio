import gsap from 'gsap';
import { ProjectsCarousel } from './ProjectsCarousel.js';
import { ProjectViewer } from './ProjectViewer.js';
import { Terminal } from './Terminal.js';
import { sound } from '../audio/sound.js';
import { t, i18n } from '../i18n/i18n.js';
import { LOGO_SVG, LOGO_VIEWBOX } from '../data/logo.js';

/**
 * "DYLAN OS": la interfaz que aparece al meterse dentro del monitor.
 * Apps: proyectos (carrusel 3D) y terminal. El dock también lleva a sobre mí / contacto.
 */
export class DylanOS {
  constructor({ root, projects, profile, actions }) {
    this.actions = actions;
    this.el = document.createElement('div');
    this.el.className = 'os';
    this.el.setAttribute('role', 'dialog');
    this.el.innerHTML = `
      <div class="os__bg" aria-hidden="true"></div>
      <header class="os__top">
        <span class="os__logo"><svg class="os__mark" viewBox="${LOGO_VIEWBOX}" aria-hidden="true">${LOGO_SVG.replaceAll('dl-', 'os-dl-')}</svg>DYLAN<span>OS</span></span>
        <span class="os__title"></span>
        <span class="os__clock" aria-hidden="true"></span>
      </header>
      <div class="os__boot" aria-hidden="true"></div>
      <main class="os__main"></main>
      <nav class="os__dock">
        <button class="dock__btn is-active" data-app="projects"><span aria-hidden="true">▣</span><em data-t="os.projects"></em></button>
        <button class="dock__btn" data-app="terminal"><span aria-hidden="true">&gt;_</span><em data-t="os.terminal"></em></button>
        <button class="dock__btn" data-go="about"><span aria-hidden="true">◉</span><em data-t="os.about"></em></button>
        <button class="dock__btn" data-go="contact"><span aria-hidden="true">✉</span><em data-t="os.contact"></em></button>
        <button class="dock__btn dock__btn--lang" data-lang><span aria-hidden="true" class="dock__lang"></span><em data-t="os.lang"></em></button>
        <button class="dock__btn dock__btn--exit" data-go="room"><span aria-hidden="true">⏻</span><em data-t="os.exit"></em></button>
      </nav>
      <div class="os__flash" aria-hidden="true"></div>`;
    root.appendChild(this.el);

    this.main = this.el.querySelector('.os__main');
    this.viewer = new ProjectViewer(this.el);
    this.carousel = new ProjectsCarousel({
      projects,
      onOpen: (p, fromEl) => this.openProject(p, fromEl),
    });
    this.terminal = new Terminal({
      projects,
      profile,
      actions: {
        ...actions,
        openProject: (p) => this.openProjectById(p.id),
      },
    });
    this.main.append(this.carousel.el, this.terminal.el);
    this.app = 'projects';

    this.el.querySelectorAll('.dock__btn').forEach((b) =>
      b.addEventListener('click', () => {
        sound.blip(true, 0.08);
        if (b.dataset.app) this.switchApp(b.dataset.app);
        else if ('lang' in b.dataset) this.actions.toggleLang?.();
        else this.actions.go(b.dataset.go);
      }),
    );
    this.clock = this.el.querySelector('.os__clock');
    this.onKey = this.onKey.bind(this);
    this.relabel();
    i18n.onChange(() => this.relabel());
  }

  relabel() {
    this.el.setAttribute('aria-label', t('os.aria'));
    this.el.querySelector('.os__dock').setAttribute('aria-label', t('os.apps'));
    this.el.querySelectorAll('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t)));
    this.el.querySelector('.dock__lang').textContent = i18n.other.toUpperCase();
    this.el.querySelector('.os__title').textContent = t(this.app === 'terminal' ? 'os.path.terminal' : 'os.path.projects');
    if (this.clock) this.tickClock();
  }

  get isOpen() {
    return this.el.classList.contains('is-open');
  }

  onKey(e) {
    if (e.key === 'Escape') {
      if (this.viewer.isOpen) this.viewer.close();
      else this.actions.go('room');
      return;
    }
    if (this.app === 'projects' && !this.viewer.isOpen) this.carousel.onKey(e);
  }

  tickClock() {
    const d = new Date();
    this.clock.textContent = d.toLocaleTimeString(i18n.lang === 'es' ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }

  /** Entrada: destello de pantalla + secuencia de arranque + apps. */
  open() {
    this.el.classList.add('is-open');
    this.tickClock();
    this.clockTimer = setInterval(() => this.tickClock(), 10000);
    window.addEventListener('keydown', this.onKey);
    this.switchApp('projects', true);

    const boot = this.el.querySelector('.os__boot');
    const lines = t('os.boot', { n: this.carousel.projects.length });
    boot.innerHTML = lines.map((l) => `<p>${l}</p>`).join('');
    const tl = gsap.timeline();
    tl.set(this.el, { autoAlpha: 1 });
    tl.fromTo(this.el.querySelector('.os__flash'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.9, ease: 'power2.out' });
    tl.fromTo(this.el.querySelector('.os__bg'), { scaleY: 0.004, scaleX: 1.2 }, { scaleY: 1, scaleX: 1, duration: 0.55, ease: 'expo.out' }, 0);
    tl.set(boot, { autoAlpha: 1 }, 0.2);
    tl.fromTo(boot.children, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.12, stagger: 0.11 }, 0.25);
    tl.call(() => sound.key(), null, 0.3);
    tl.to(boot, { autoAlpha: 0, duration: 0.3 }, '+=0.35');
    tl.fromTo('.os__top, .os__dock', { autoAlpha: 0, y: (i) => (i ? 20 : -20) }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' }, '-=0.1');
    tl.call(() => this.carousel.intro(), null, '<');
    tl.fromTo(this.carousel.el.querySelector('.carousel__info'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, '<0.5');
    this.openTl = tl;
    return tl;
  }

  /** Salida: la pantalla se "apaga" como un CRT y se ve la habitación. */
  async close() {
    this.openTl?.kill();
    await this.viewer.close();
    window.removeEventListener('keydown', this.onKey);
    clearInterval(this.clockTimer);
    return new Promise((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            this.el.classList.remove('is-open');
            gsap.set(this.el, { autoAlpha: 0 });
            gsap.set(this.el.querySelector('.os__bg'), { clearProps: 'transform' });
            resolve();
          },
        })
        .to(this.el.querySelector('.os__flash'), { autoAlpha: 1, duration: 0.25, ease: 'power2.in' })
        .to(this.el, { autoAlpha: 0, duration: 0.35 });
    });
  }

  switchApp(app, instant = false) {
    this.app = app;
    this.el.querySelectorAll('.dock__btn[data-app]').forEach((b) => b.classList.toggle('is-active', b.dataset.app === app));
    this.el.querySelector('.os__title').textContent = t(app === 'projects' ? 'os.path.projects' : 'os.path.terminal');
    const show = app === 'projects' ? this.carousel.el : this.terminal.el;
    const hide = app === 'projects' ? this.terminal.el : this.carousel.el;
    hide.classList.remove('is-active');
    show.classList.add('is-active');
    if (!instant) gsap.fromTo(show, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'expo.out' });
    else gsap.set(show, { autoAlpha: 1, scale: 1 });
    gsap.set(hide, { autoAlpha: 0 });
    if (app === 'terminal') {
      this.terminal.focus();
      this.actions.onTerminal?.();
    }
  }

  openProject(p, fromEl) {
    this.actions.onProjectOpen?.(p);
    if (!p.url) {
      if (p.repo) window.open(p.repo, '_blank', 'noopener');
      return;
    }
    this.viewer.open(p, fromEl);
  }

  openProjectById(id) {
    const idx = this.carousel.items.findIndex((it) => it.project?.id === id);
    this.switchApp('projects');
    if (idx < 0) return;
    this.carousel.go(this.carousel.nearestIndexTo(idx));
    setTimeout(() => this.carousel.openActive(), 900);
  }
}
