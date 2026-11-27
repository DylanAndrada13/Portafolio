import gsap from 'gsap';
import { buildLetters, glitch, placeCursor, remeasure, typeLetter } from './typeName.js';

const NAME = 'DYLAN';
// pausas irregulares entre letras: la escritura tiene "personalidad"
const GAPS = [0, 0.16, 0.24, 0.12, 0.3];

/** Tamaño y posición del nombre cuando queda como encabezado (en px). */
function headerLayout(nameEl) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const introFont = parseFloat(getComputedStyle(nameEl).fontSize);
  const targetFont = Math.min(64, Math.max(36, vw * 0.044));
  const scale = targetFont / introFont;
  const top = Math.max(22, vh * 0.045);
  const h = nameEl.offsetHeight;
  const centerNow = nameEl.offsetTop + h / 2;
  const centerTarget = top + (h * scale) / 2;
  return { y: centerTarget - centerNow, scale, bottom: top + h * scale };
}

/**
 * Construye la secuencia completa:
 *   1. negro + cursor  ·  2. DYLAN se escribe  ·  3. pantallas se encienden
 *   4. la oscuridad se retira  ·  5. el nombre sube a encabezado  ·  6. LEDs + ambiente
 */
export function createIntro({ state, assetsReady, reducedMotion, onSettled }) {
  const nameEl = document.getElementById('name');
  const lettersEl = nameEl.querySelector('.name__letters');
  const cursor = nameEl.querySelector('.name__cursor');
  const curtain = document.querySelector('.curtain');
  const hero = document.querySelector('.hero');
  const skipBtn = document.querySelector('.skip');

  const letters = buildLetters(lettersEl, NAME);
  gsap.set(letters, { autoAlpha: 0 });
  gsap.set(cursor, { x: placeCursor(cursor, letters, -1), autoAlpha: 0 });

  const metaLayout = () => {
    const { bottom } = headerLayout(nameEl);
    hero.style.setProperty('--header-bottom', `${bottom}px`);
  };

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

  // 1 — cursor parpadeando en la oscuridad
  tl.set(cursor, { autoAlpha: 1 });
  tl.call(() => cursor.classList.add('is-blinking'));
  tl.to({}, { duration: reducedMotion ? 0.2 : 1.15 });
  tl.call(() => cursor.classList.remove('is-blinking'));

  // 2 — escritura letra por letra
  letters.forEach((span, i) => {
    const at = i === 0 ? '>' : `>+=${GAPS[i]}`;
    tl.add(typeLetter(span, { scramble: !reducedMotion }), at);
    tl.to(cursor, { x: () => placeCursor(cursor, letters, i), duration: 0.12, ease: 'power3.out' }, '<');
  });
  tl.call(() => cursor.classList.add('is-blinking'));
  tl.call(() => nameEl.classList.add('is-charged'), null, '>+0.15');
  tl.to({}, { duration: reducedMotion ? 0.2 : 0.9 });

  // espera a que la escena esté cargada (normalmente ya lo está a esta altura)
  tl.call(() => {
    if (!assetsReady.done) {
      tl.pause();
      assetsReady.promise.then(() => tl.resume());
    }
  });

  // 3 — apagón inverso: primero las pantallas, después la habitación
  tl.addLabel('reveal');
  tl.to(cursor, { autoAlpha: 0, duration: 0.25 }, 'reveal');
  tl.to(curtain, { autoAlpha: 0, duration: 0.6, ease: 'none' }, 'reveal');
  tl.to(
    state,
    { keyframes: { power: [0, 0.75, 0.05, 0.9, 0.25, 1] }, duration: 0.75, ease: 'none' },
    'reveal+=0.1',
  );
  tl.to(state, { reveal: 1, duration: 3.0, ease: 'power2.inOut' }, 'reveal+=0.55');
  tl.fromTo(state, { zoom: 1.22 }, { zoom: 1.06, duration: 4.6, ease: 'power3.out' }, 'reveal+=0.4');

  // 4 — el nombre se achica y sube a la zona superior central
  tl.call(metaLayout, null, 'reveal+=0.6');
  tl.to(
    nameEl,
    {
      y: () => headerLayout(nameEl).y,
      scale: () => headerLayout(nameEl).scale,
      duration: 2.1,
      ease: 'expo.inOut',
    },
    'reveal+=0.7',
  );
  tl.call(() => nameEl.classList.add('is-header'), null, 'reveal+=1.6');

  // 5 — LEDs y movimiento ambiental
  tl.to(
    state,
    { keyframes: { led: [0, 0.55, 0, 0.85, 0.15, 0.6, 1] }, duration: 1.0, ease: 'none' },
    'reveal+=2.0',
  );
  tl.to(state, { motion: 1, duration: 3.2, ease: 'sine.inOut' }, 'reveal+=1.4');
  tl.fromTo(
    '.hero__rule',
    { scaleX: 0, autoAlpha: 1 },
    { scaleX: 1, duration: 1.3, ease: 'expo.out' },
    'reveal+=2.5',
  );
  // "developer" se enciende como un cartel de neón
  tl.fromTo(
    '.hero__role',
    { autoAlpha: 0 },
    { keyframes: { autoAlpha: [0, 1, 0.2, 1, 0.5, 1] }, duration: 0.9, ease: 'none' },
    'reveal+=2.8',
  );
  tl.to(skipBtn, { autoAlpha: 0, duration: 0.3 }, 'reveal');
  tl.call(() => {
    document.body.classList.add('is-ready');
    skipBtn.hidden = true;
    onSettled?.();
  });

  // --- saltar intro: avanza rápido en vez de cortar (sigue siendo fluido) ---
  const skip = () => {
    if (tl.progress() >= 1) return;
    gsap.to(tl, { timeScale: 7, duration: 0.4, ease: 'power1.in' });
  };
  skipBtn.addEventListener('click', skip);
  window.addEventListener('keydown', (e) => {
    if (['Enter', 'Escape', ' '].includes(e.key)) skip();
  });
  gsap.fromTo(skipBtn, { autoAlpha: 0 }, { autoAlpha: 1, delay: 1.4, duration: 0.8 });

  // --- resize: mantiene el encabezado bien ubicado ---
  window.addEventListener('resize', () => {
    remeasure(letters);
    if (tl.progress() < 1) return;
    const { y, scale } = headerLayout(nameEl);
    gsap.set(nameEl, { y, scale });
    metaLayout();
  });

  // --- glitch al pasar el puntero, una vez como encabezado ---
  let lastGlitch = 0;
  nameEl.addEventListener('pointerenter', () => {
    if (!nameEl.classList.contains('is-header') || reducedMotion) return;
    const now = performance.now();
    if (now - lastGlitch < 700) return;
    lastGlitch = now;
    glitch(letters);
  });

  return tl;
}

/**
 * Entrada desde la pantalla de inicio: la habitación ya está iluminada (desenfocada),
 * así que en vez del apagón se enfoca la cámara, parpadean las pantallas y el nombre
 * se escribe directamente arriba.
 */
export function createEntry({ state, assetsReady, reducedMotion, onSettled }) {
  const nameEl = document.getElementById('name');
  const lettersEl = nameEl.querySelector('.name__letters');
  const cursor = nameEl.querySelector('.name__cursor');
  const hero = document.querySelector('.hero');
  const skipBtn = document.querySelector('.skip');
  skipBtn.hidden = true;

  const letters = buildLetters(lettersEl, NAME);
  gsap.set(letters, { autoAlpha: 0 });
  gsap.set(cursor, { autoAlpha: 0 });
  const layout = headerLayout(nameEl);
  gsap.set(nameEl, { y: layout.y, scale: layout.scale });
  hero.style.setProperty('--header-bottom', `${layout.bottom}px`);
  nameEl.classList.add('is-header');

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  tl.call(() => {
    if (!assetsReady.done) {
      tl.pause();
      assetsReady.promise.then(() => tl.resume());
    }
  });
  tl.addLabel('go');
  tl.set(state, { entered: 1 }, 'go');
  tl.to(state, { reveal: 1, duration: 0.8, ease: 'power2.out' }, 'go');
  tl.to(state, { zoom: 1.06, duration: 2.2, ease: 'expo.out' }, 'go');
  tl.to(state, { keyframes: { power: [1, 0.15, 0.9, 0.3, 1] }, duration: 0.6, ease: 'none' }, 'go+=0.35');
  tl.to(state, { keyframes: { led: [0, 0.55, 0, 0.85, 0.15, 0.6, 1] }, duration: 0.9, ease: 'none' }, 'go+=0.7');
  tl.to(state, { motion: 1, duration: 2.4, ease: 'sine.inOut' }, 'go+=0.4');
  letters.forEach((span, i) => {
    tl.add(typeLetter(span, { scramble: !reducedMotion }), `go+=${0.5 + i * 0.09}`);
  });
  tl.call(() => nameEl.classList.add('is-charged'), null, 'go+=1.1');
  tl.fromTo('.hero__rule', { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 1.1, ease: 'expo.out' }, 'go+=1.0');
  tl.fromTo('.hero__role', { autoAlpha: 0 }, { keyframes: { autoAlpha: [0, 1, 0.2, 1, 0.5, 1] }, duration: 0.8, ease: 'none' }, 'go+=1.2');
  tl.call(() => {
    document.body.classList.add('is-ready');
    onSettled?.();
  }, null, 'go+=1.3');
  if (reducedMotion) tl.timeScale(3);

  window.addEventListener('resize', () => {
    remeasure(letters);
    const { y, scale, bottom } = headerLayout(nameEl);
    gsap.set(nameEl, { y, scale });
    hero.style.setProperty('--header-bottom', `${bottom}px`);
  });
  let lastGlitch = 0;
  nameEl.addEventListener('pointerenter', () => {
    if (reducedMotion) return;
    const now = performance.now();
    if (now - lastGlitch < 700) return;
    lastGlitch = now;
    glitch(letters);
  });
  return tl;
}
