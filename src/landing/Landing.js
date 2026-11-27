import gsap from 'gsap';
import { profile } from '../data/profile.js';
import { LOGO_SVG, LOGO_VIEWBOX } from '../data/logo.js';
import { t, i18n } from '../i18n/i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// íconos de línea (24x24) para los botones secundarios
const ICON = {
  projects: '<path d="M3 5h18v12H3zM8 21h8M12 17v4"/><path d="M8 9l-2 2 2 2M16 9l2 2-2 2"/>',
  about: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  contact: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6l8.5 7 8.5-7"/>',
  github:
    '<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  cv: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6M9 9h2"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

let cvCheck = null;
/** El botón del CV solo aparece si el PDF existe de verdad (en dev, Vite responde HTML). */
function cvAvailable(url) {
  if (!url) return Promise.resolve(false);
  cvCheck ??= fetch(url, { method: 'HEAD' })
    .then((r) => r.ok && /pdf/i.test(r.headers.get('content-type') || ''))
    .catch(() => false);
  return cvCheck;
}

/**
 * Pantalla de entrada: la habitación desenfocada de fondo, tu personaje a la izquierda
 * y un menú clásico de portfolio. El botón grande entra a la habitación; los demás
 * entran y van directo a esa sección.
 */
export class Landing {
  constructor({ onEnter }) {
    this.onEnter = onEnter;
    this.el = document.createElement('div');
    this.el.className = 'landing';
    document.body.appendChild(this.el);
    document.body.classList.add('is-landing');
    this.render();
    i18n.onChange(() => this.render());
    this.onKey = (e) => {
      if (e.key !== 'Enter' || this.left) return;
      if (e.target instanceof HTMLElement && e.target.closest('a, button') && e.target !== this.enterBtn) return;
      e.preventDefault();
      this.enter();
    };
    window.addEventListener('keydown', this.onKey);
    this.bindTilt();
  }

  render() {
    const c = profile.contact;
    this.el.innerHTML = `
      <div class="landing__shade" aria-hidden="true"></div>
      <figure class="landing__pj">
        <span class="landing__halo"></span>
        <img src="/brand/dylan.webp" srcset="/brand/dylan-820.webp 820w, /brand/dylan.webp 1230w"
             sizes="(max-width: 760px) 70vw, 46vw" alt="Dylan Andrada, web developer &amp; marketing" width="1230" height="1278" decoding="async" fetchpriority="high">
      </figure>
      <header class="landing__bar">
        <span class="landing__brand">
          <svg viewBox="${LOGO_VIEWBOX}" aria-hidden="true">${LOGO_SVG}</svg>
          <span>${esc(profile.name)}</span>
        </span>
        <button type="button" class="landing__lang" aria-label="${esc(t('cart.aria'))}">
          <span class="${i18n.lang === 'en' ? 'is-on' : ''}">EN</span><span class="${i18n.lang === 'es' ? 'is-on' : ''}">ES</span>
        </button>
      </header>
      <main class="landing__content">
        <p class="landing__status"><i aria-hidden="true"></i>${esc(t('landing.status'))}</p>
        <h1 class="landing__title">
          <span class="landing__hello">${esc(t('landing.hello'))}</span>
          <span class="landing__role">${esc(t('landing.role')).replace(/\*(.+?)\*/g, '<em>$1</em>')}</span>
        </h1>
        <p class="landing__lead">${esc(t('landing.lead'))}</p>

        <button type="button" class="landing__enter">
          <span class="landing__enter-icon" aria-hidden="true"><svg viewBox="${LOGO_VIEWBOX}">${LOGO_SVG}</svg></span>
          <span class="landing__enter-text">
            <span class="landing__enter-label">${esc(t('landing.enter'))}</span>
            <span class="landing__enter-sub">${esc(t('landing.enter.sub'))}</span>
          </span>
          <span class="landing__enter-arrow" aria-hidden="true">→</span>
        </button>

        <nav class="landing__links" aria-label="${esc(t('hud.sections'))}">
          <button type="button" data-go="os">${svg('projects')}<span>${esc(t('hud.projects'))}</span></button>
          <button type="button" data-go="about">${svg('about')}<span>${esc(t('hud.about'))}</span></button>
          <button type="button" data-go="contact">${svg('contact')}<span>${esc(t('hud.contact'))}</span></button>
          ${c.github ? `<a href="${esc(c.github)}" target="_blank" rel="noopener">${svg('github')}<span>GitHub</span></a>` : ''}
          <a class="landing__cv" href="${esc(profile.cv || '')}" download hidden>${svg('cv')}<span>${esc(t('landing.cv'))}</span></a>
        </nav>

        <ul class="landing__stack">
          ${t('landing.do').map((s) => `<li>${esc(s)}</li>`).join('')}
        </ul>
      </main>
      <p class="landing__foot"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a><span>·</span><span>${esc(t('landing.place'))}</span></p>`;

    this.enterBtn = this.el.querySelector('.landing__enter');
    this.enterBtn.addEventListener('click', () => this.enter());
    this.el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => this.enter(b.dataset.go)));
    this.el.querySelector('.landing__lang').addEventListener('click', () => i18n.toggle());
    const cv = this.el.querySelector('.landing__cv');
    cvAvailable(profile.cv).then((ok) => (cv.hidden = !ok));
  }

  /** Entrada con animación escalonada (se llama cuando ya hay algo que mostrar). */
  show() {
    const q = (s) => this.el.querySelectorAll(s);
    gsap.set(this.el, { autoAlpha: 1 });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(q('.landing__pj img'), { x: -60, autoAlpha: 0, duration: 1.6 }, 0.1)
      .from(q('.landing__halo'), { scale: 0.6, autoAlpha: 0, duration: 1.8 }, 0.2)
      .from(q('.landing__bar > *'), { y: -14, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.3)
      .from(q('.landing__content > *'), { y: 24, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.35)
      .from(q('.landing__foot'), { autoAlpha: 0, duration: 1 }, 0.9);
    if (!matchMedia('(pointer: coarse)').matches) this.enterBtn.focus({ preventScroll: true });
  }

  /** Movimiento sutil del personaje con el puntero. */
  bindTilt() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.onMove = (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      gsap.to(this.el.querySelector('.landing__pj'), { x: x * -14, y: y * -8, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(this.el.querySelector('.landing__halo'), { x: x * 26, y: y * 16, duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
    };
    window.addEventListener('pointermove', this.onMove, { passive: true });
  }

  enter(target = null) {
    if (this.left) return;
    this.left = true;
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pointermove', this.onMove);
    const q = (s) => this.el.querySelectorAll(s);
    const tl = gsap.timeline({
      onComplete: () => {
        this.el.remove();
      },
    });
    tl.to(q('.landing__content > *, .landing__bar, .landing__foot'), { y: -18, autoAlpha: 0, duration: 0.45, stagger: 0.03, ease: 'power2.in' }, 0)
      .to(q('.landing__pj'), { x: -80, autoAlpha: 0, duration: 0.7, ease: 'power3.in' }, 0)
      .to(q('.landing__shade'), { autoAlpha: 0, duration: 1.1, ease: 'power2.inOut' }, 0.2)
      .call(() => document.body.classList.remove('is-landing'), null, 0.25);
    this.onEnter?.(target);
  }
}
