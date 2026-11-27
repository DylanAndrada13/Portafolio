import gsap from 'gsap';
import { sound } from '../audio/sound.js';
import { t, tr, i18n } from '../i18n/i18n.js';

const MIN_SLOTS = 3; // si hay pocos proyectos se completan con "slots" bloqueados
const ARC_STEP = 36; // grados entre tarjetas cuando no alcanzan para cerrar el anillo
const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return url || '';
  }
};

/**
 * Carrusel 3D de proyectos (anillo en CSS 3D): arrastrar, rueda, flechas o tocar.
 * Cada tarjeta es una "pantalla" con la captura de la página de inicio del proyecto.
 */
export class ProjectsCarousel {
  constructor({ projects, onOpen }) {
    this.projects = projects;
    this.onOpen = onOpen;
    this.items = [
      ...projects.map((p) => ({ type: 'project', project: p })),
      ...Array.from({ length: Math.max(0, MIN_SLOTS - projects.length) }, () => ({ type: 'locked' })),
    ];
    this.n = this.items.length;
    // con muchas tarjetas: anillo cerrado que gira infinito; con pocas: un arco
    this.closed = this.n * ARC_STEP >= 360;
    this.step = this.closed ? 360 / this.n : ARC_STEP;
    this.rot = { value: 0 };
    this.active = 0;
    this.tilt = { x: 0, y: 0 };

    this.el = document.createElement('section');
    this.el.className = 'carousel';

    this.el.innerHTML = `
      <div class="carousel__stage">
        <div class="carousel__tilt"><div class="carousel__ring"></div></div>
        <div class="carousel__floor" aria-hidden="true"></div>
      </div>
      <div class="carousel__info">
        <button class="carousel__arrow" data-dir="-1">‹</button>
        <div class="carousel__meta">
          <p class="carousel__count"></p>
          <h2 class="carousel__title"></h2>
          <p class="carousel__desc"></p>
          <p class="carousel__tags"></p>
          <button class="btn btn--primary carousel__open"><em></em> <span aria-hidden="true">↗</span></button>
        </div>
        <button class="carousel__arrow" data-dir="1">›</button>
      </div>`;
    this.ring = this.el.querySelector('.carousel__ring');
    this.tiltEl = this.el.querySelector('.carousel__tilt');
    this.cards = this.items.map((item, i) => this.buildCard(item, i));
    this.cards.forEach((c) => this.ring.appendChild(c));

    this.bind();
    this.layout();
    this.render();
    this.updateInfo();
    this.relabel();
    i18n.onChange(() => {
      this.relabel();
      this.updateInfo();
    });
  }

  relabel() {
    this.el.setAttribute('aria-label', t('os.projects'));
    const [prev, next] = this.el.querySelectorAll('.carousel__arrow');
    prev.setAttribute('aria-label', t('car.prev'));
    next.setAttribute('aria-label', t('car.next'));
    this.updateOpenLabel();
    this.cards.forEach((c, i) => {
      const item = this.items[i];
      if (item.type === 'locked') {
        c.setAttribute('aria-label', t('car.next.aria'));
        c.querySelector('.pcard__bar span').textContent = t('car.loading');
        c.querySelector('.pcard__soon').textContent = t('car.soon');
      } else {
        c.setAttribute('aria-label', t('car.project', { title: item.project.title }));
      }
    });
  }

  buildCard(item, i) {
    const card = document.createElement('button');
    card.className = 'pcard';
    card.type = 'button';
    card.dataset.index = i;
    if (item.type === 'locked') {
      card.classList.add('pcard--locked');
      card.innerHTML = `
        <div class="pcard__frame">
          <div class="pcard__bar"><i></i><i></i><i></i><span></span></div>
          <div class="pcard__screen pcard__screen--locked">
            <span class="pcard__lock" aria-hidden="true">⌁</span>
            <span class="pcard__soon"></span>
            <span class="pcard__progress"><span></span></span>
          </div>
        </div>`;
      return card;
    }
    const p = item.project;
    card.style.setProperty('--accent', p.accent || '#46dcff');
    card.innerHTML = `
      <div class="pcard__frame">
        <div class="pcard__bar"><i></i><i></i><i></i><span>${hostOf(p.url || p.repo)}</span></div>
        <div class="pcard__screen">
          <img class="pcard__shot" alt="" loading="lazy" decoding="async" src="/assets/projects/${p.id}.jpg" />
        </div>
      </div>
      <div class="pcard__glare" aria-hidden="true"></div>`;
    // sin captura: muestra la página en vivo, escalada dentro de la tarjeta
    card.querySelector('.pcard__shot').addEventListener('error', () => this.liveFallback(card, p), { once: true });
    return card;
  }

  liveFallback(card, p) {
    const screen = card.querySelector('.pcard__screen');
    screen.innerHTML = '';
    if (!p.url) {
      // sin demo online: una "pantalla de código" con el nombre y el stack
      screen.classList.add('pcard__screen--code');
      screen.innerHTML = `
        <span class="pcard__code-title">${p.title}</span>
        <span class="pcard__code-tags">${(p.tags || []).join(' · ')}</span>
        <span class="pcard__code-lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`;
      return;
    }
    const frame = document.createElement('iframe');
    frame.className = 'pcard__live';
    frame.src = p.url;
    frame.loading = 'lazy';
    frame.tabIndex = -1;
    frame.title = p.title;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    screen.appendChild(frame);
    const fit = () => frame.style.setProperty('--s', screen.clientWidth / 1440);
    fit();
    new ResizeObserver(fit).observe(screen);
  }

  layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // la tarjeta (≈ 0.66 × ancho de alto) tiene que entrar en el espacio libre sobre la info
    const stageH = this.el.querySelector('.carousel__stage').clientHeight || vh - 380;
    const w = Math.max(200, Math.min(540, vw * (vw < 700 ? 0.82 : 0.4), (stageH - 40) / 0.66));
    this.cardW = w;
    this.radius = (w / 2 / Math.tan((this.step * Math.PI) / 360)) * 1.18;
    this.el.style.setProperty('--card-w', `${w}px`);
    this.cards.forEach((c, i) => {
      c.style.transform = `rotateY(${i * this.step}deg) translateZ(${this.radius}px)`;
    });
  }

  bind() {
    this.el.querySelectorAll('.carousel__arrow').forEach((b) =>
      b.addEventListener('click', () => this.go(this.active + Number(b.dataset.dir))),
    );
    this.el.querySelector('.carousel__open').addEventListener('click', () => this.openActive());

    // clic en tarjeta: la del frente se abre, las otras giran al frente
    this.cards.forEach((c, i) =>
      c.addEventListener('click', () => {
        if (this.dragged) return;
        if (i === this.active) this.openActive();
        else this.go(this.nearestIndexTo(i));
      }),
    );

    // arrastrar / deslizar
    const stage = this.el.querySelector('.carousel__stage');
    let startX = 0;
    let startRot = 0;
    let down = false;
    stage.addEventListener('pointerdown', (e) => {
      down = true;
      this.dragged = false;
      startX = e.clientX;
      startRot = this.rot.value;
      gsap.killTweensOf(this.rot);
    });
    window.addEventListener('pointermove', (e) => {
      // inclinación del anillo siguiendo el puntero
      this.tilt.x = (e.clientY / window.innerHeight - 0.5) * -10;
      this.tilt.y = (e.clientX / window.innerWidth - 0.5) * 14;
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) this.dragged = true;
      this.rot.value = startRot + dx * (180 / Math.max(500, this.cardW * 2));
      this.render();
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (this.dragged) this.go(Math.round(-this.rot.value / this.step));
      setTimeout(() => (this.dragged = false), 0);
    });

    // rueda del mouse
    let wheelLock = 0;
    stage.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const now = performance.now();
        if (now - wheelLock < 450) return;
        wheelLock = now;
        this.go(this.active + Math.sign(e.deltaY || e.deltaX));
      },
      { passive: false },
    );

    this.onResize = () => {
      this.layout();
      this.render();
    };
    window.addEventListener('resize', this.onResize);
    this.tiltTick = () => {
      const cur = this.tiltCur || { x: 0, y: 0 };
      cur.x += (this.tilt.x - cur.x) * 0.06;
      cur.y += (this.tilt.y - cur.y) * 0.06;
      this.tiltCur = cur;
      this.tiltEl.style.transform = `rotateX(${cur.x}deg) rotateY(${cur.y}deg)`;
    };
    gsap.ticker.add(this.tiltTick);
  }

  onKey(e) {
    if (e.key === 'ArrowRight') this.go(this.active + 1);
    else if (e.key === 'ArrowLeft') this.go(this.active - 1);
    else if (e.key === 'Enter') this.openActive();
  }

  /** Índice "desenrollado" más cercano para girar por el camino corto. */
  nearestIndexTo(i) {
    if (!this.closed) return i;
    const k = Math.round((this.active - i) / this.n);
    return i + k * this.n;
  }

  go(index) {
    if (!this.closed) index = Math.max(0, Math.min(this.n - 1, index));
    this.active = index;
    sound.blip(true, 0.06);
    gsap.to(this.rot, {
      value: -index * this.step,
      duration: 0.9,
      ease: 'expo.out',
      onUpdate: () => this.render(),
    });
    this.updateInfo();
  }

  get activeItem() {
    return this.items[((this.active % this.n) + this.n) % this.n];
  }

  render() {
    this.ring.style.transform = `translateZ(${-this.radius}px) rotateY(${this.rot.value}deg)`;
    this.cards.forEach((c, i) => {
      let diff = (((i * this.step + this.rot.value) % 360) + 540) % 360 - 180; // -180..180
      diff = Math.min(1, Math.abs(diff) / (this.closed ? 180 : this.step * 2.5));
      c.style.setProperty('--front', (1 - diff).toFixed(3));
      c.classList.toggle('is-front', diff < 0.08);
    });
  }

  updateInfo() {
    const item = this.activeItem;
    const $ = (s) => this.el.querySelector(s);
    const idx = ((this.active % this.n) + this.n) % this.n;
    $('.carousel__count').textContent = `${String(idx + 1).padStart(2, '0')} / ${String(this.n).padStart(2, '0')}`;
    const openBtn = $('.carousel__open');
    if (item.type === 'locked') {
      $('.carousel__title').textContent = t('car.soon.title');
      $('.carousel__desc').textContent = t('car.soon.desc');
      $('.carousel__tags').textContent = '';
      openBtn.hidden = true;
    } else {
      const p = item.project;
      $('.carousel__title').textContent = p.title;
      $('.carousel__desc').textContent = tr(p.description) || '';
      $('.carousel__tags').innerHTML = [...(p.tags || []), p.year].filter(Boolean).map((t) => `<span>${t}</span>`).join('');
      openBtn.hidden = false;
    }
    this.updateOpenLabel();
    // el título puede ocupar más o menos líneas: reacomoda la tarjeta al espacio que queda
    requestAnimationFrame(() => {
      this.layout();
      this.render();
    });
    gsap.fromTo(this.el.querySelectorAll('.carousel__meta > *'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', overwrite: true });
  }

  updateOpenLabel() {
    const item = this.activeItem;
    const codeOnly = item?.type === 'project' && !item.project.url;
    this.el.querySelector('.carousel__open em').textContent = t(codeOnly ? 'car.code' : 'car.open');
  }

  openActive() {
    const item = this.activeItem;
    if (item.type !== 'project') return;
    const idx = ((this.active % this.n) + this.n) % this.n;
    this.onOpen(item.project, this.cards[idx].querySelector('.pcard__screen'));
  }

  /** Entrada: las tarjetas llegan girando desde el fondo. */
  intro() {
    this.layout();
    this.render();
    gsap.fromTo(
      this.cards,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' },
    );
    const fly = { z: 1400, r: 150 };
    gsap.to(fly, {
      z: 0,
      r: 0,
      duration: 1.9,
      ease: 'expo.out',
      onUpdate: () => {
        this.ring.style.transform = `translateZ(${-this.radius - fly.z}px) rotateY(${this.rot.value + fly.r}deg)`;
      },
      onComplete: () => this.render(),
    });
  }

  destroy() {
    gsap.ticker.remove(this.tiltTick);
    window.removeEventListener('resize', this.onResize);
  }
}
