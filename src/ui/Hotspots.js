import gsap from 'gsap';
import { REGIONS } from '../scene/regions.js';
import { t, i18n } from '../i18n/i18n.js';

/**
 * Marcadores en pantalla sobre los objetos interactivos.
 * Se reposicionan cada frame siguiendo la cámara (también sirven en móvil y con teclado).
 */
export class Hotspots {
  constructor({ root, stage, onSelect, onHover }) {
    this.stage = stage;
    this.root = root;
    this.markers = REGIONS.map((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot';
      b.dataset.id = r.id;
      b.innerHTML = `<span class="hotspot__in"><span class="hotspot__dot" aria-hidden="true"></span><span class="hotspot__text"><span class="hotspot__label"></span><span class="hotspot__hint"></span></span></span>`;
      b.addEventListener('click', () => onSelect(r));
      b.addEventListener('pointerenter', () => onHover(r));
      b.addEventListener('pointerleave', () => onHover(null));
      b.addEventListener('focus', () => onHover(r));
      b.addEventListener('blur', () => onHover(null));
      root.appendChild(b);
      return { region: r, el: b };
    });
    this.relabel();
    i18n.onChange(() => this.relabel());
    this.update = this.update.bind(this);
    gsap.ticker.add(this.update);
  }

  relabel() {
    for (const { region: r, el } of this.markers) {
      const label = t(`region.${r.id}`);
      const hint = t(`region.${r.id}.hint`);
      el.querySelector('.hotspot__label').textContent = label;
      el.querySelector('.hotspot__hint').textContent = hint;
      el.setAttribute('aria-label', `${label}: ${hint}`);
    }
  }

  update() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const m of this.markers) {
      const [x, y] = this.stage.imageToScreen(...m.region.anchor);
      const off = x < 8 || y < 70 || x > w - 8 || y > h - 8;
      m.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      m.el.classList.toggle('is-off', off);
      m.el.classList.toggle('is-flip', x > w - 170); // etiqueta hacia la izquierda cerca del borde
    }
  }

  setActive(id) {
    this.markers.forEach((m) => m.el.classList.toggle('is-hover', m.region.id === id));
  }

  show() {
    this.root.classList.add('is-visible');
    gsap.fromTo(
      this.markers.map((m) => m.el.firstChild),
      { autoAlpha: 0, scale: 0.6 },
      { autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(2)', clearProps: 'scale' },
    );
  }

  hide() {
    this.root.classList.remove('is-visible');
  }
}
