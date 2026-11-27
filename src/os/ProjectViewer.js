import gsap from 'gsap';
import { sound } from '../audio/sound.js';
import { t } from '../i18n/i18n.js';

/**
 * Abre un proyecto en una "ventana de navegador" que crece desde su tarjeta 3D
 * hasta ocupar la pantalla, y carga la página real adentro.
 */
export class ProjectViewer {
  constructor(root) {
    this.root = root;
    this.el = null;
  }

  get isOpen() {
    return !!this.el;
  }

  open(project, fromEl) {
    if (this.el) return;
    sound.whoosh(0.7, true);
    const from = fromEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'viewer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', project.title);
    el.style.setProperty('--accent', project.accent || '#46dcff');
    el.innerHTML = `
      <div class="viewer__window">
        <div class="viewer__bar">
          <button class="viewer__btn viewer__back" type="button">${t('viewer.back')}</button>
          <div class="viewer__url"><span class="viewer__lock" aria-hidden="true">⌁</span>${project.url}</div>
          <button class="viewer__btn viewer__reload" type="button" aria-label="${t('viewer.reload')}">↻</button>
          ${project.repo ? `<a class="viewer__btn viewer__ext viewer__code" href="${project.repo}" target="_blank" rel="noopener">${t('viewer.code')}</a>` : ''}
          <a class="viewer__btn viewer__ext" href="${project.url}" target="_blank" rel="noopener">${t('viewer.ext')}</a>
        </div>
        <div class="viewer__body">
          <img class="viewer__shot" alt="" src="/assets/projects/${project.id}.jpg" />
          <div class="viewer__loading"><span></span>${t('viewer.loading', { title: project.title })}</div>
        </div>
      </div>`;
    this.root.appendChild(el);
    this.el = el;
    const win = el.querySelector('.viewer__window');
    const body = el.querySelector('.viewer__body');
    const shot = el.querySelector('.viewer__shot');
    shot.addEventListener('error', () => shot.remove(), { once: true });

    // FLIP: la ventana arranca con el tamaño y la posición de la tarjeta
    const to = win.getBoundingClientRect();
    const barH = el.querySelector('.viewer__bar').offsetHeight;
    this.fromRect = from;
    const sx = from.width / to.width;
    const sy = from.height / (to.height - barH);
    const tl = gsap.timeline();
    tl.fromTo(el, { backgroundColor: 'rgba(0,6,14,0)' }, { backgroundColor: 'rgba(0,6,14,0.82)', duration: 0.6 }, 0);
    tl.fromTo(
      win,
      {
        x: from.left - to.left,
        y: from.top - to.top - barH * sy,
        scaleX: sx,
        scaleY: sy,
        rotateX: 14,
        transformOrigin: '0 0',
      },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, rotateX: 0, duration: 0.95, ease: 'expo.inOut' },
      0,
    );
    tl.fromTo(el.querySelector('.viewer__bar'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.55);

    // carga la página real al terminar la animación
    tl.call(() => {
      const frame = document.createElement('iframe');
      frame.className = 'viewer__frame';
      frame.title = project.title;
      frame.src = project.url;
      frame.setAttribute('allow', 'fullscreen; clipboard-write');
      frame.addEventListener('load', () => {
        el.querySelector('.viewer__loading')?.remove();
        gsap.fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
        if (shot.isConnected) gsap.to(shot, { autoAlpha: 0, duration: 0.6, delay: 0.2, onComplete: () => shot.remove() });
      });
      body.appendChild(frame);
      el.querySelector('.viewer__reload').onclick = () => {
        frame.src = project.url;
      };
    });

    el.querySelector('.viewer__back').addEventListener('click', () => this.close());
  }

  close() {
    if (!this.el || this.closing) return Promise.resolve();
    this.closing = true;
    sound.whoosh(0.6, false);
    const el = this.el;
    const win = el.querySelector('.viewer__window');
    const to = win.getBoundingClientRect();
    const from = this.fromRect;
    return new Promise((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            el.remove();
            this.el = null;
            this.closing = false;
            resolve();
          },
        })
        .to(el.querySelector('.viewer__bar'), { autoAlpha: 0, duration: 0.2 }, 0)
        .to(
          win,
          {
            x: from.left - to.left,
            y: from.top - to.top,
            scaleX: from.width / to.width,
            scaleY: from.height / to.height,
            rotateX: 10,
            transformOrigin: '0 0',
            duration: 0.75,
            ease: 'expo.inOut',
          },
          0,
        )
        .to(win, { autoAlpha: 0, duration: 0.25 }, 0.55)
        .to(el, { backgroundColor: 'rgba(0,6,14,0)', duration: 0.5 }, 0.3);
    });
  }
}
