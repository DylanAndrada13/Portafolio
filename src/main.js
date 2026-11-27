import gsap from 'gsap';
import './styles/main.css';
import './styles/ui.css';
import './styles/os.css';
import './styles/landing.css';
import originalGif from '../images/fondoanimado3.gif';
import { getDevice, supportsWebGL } from './utils/device.js';
import { createEntry } from './intro/introTimeline.js';
import { Landing } from './landing/Landing.js';
import { createSceneState } from './scene/state.js';
import { t, i18n } from './i18n/i18n.js';

const device = getDevice();
document.body.classList.toggle('is-lite', device.lite);
document.body.classList.toggle('is-touch', device.coarse);

// textos estáticos del HTML que dependen del idioma
function relabelStatic() {
  const skip = document.querySelector('.skip');
  skip.textContent = t('skip');
  skip.setAttribute('aria-label', t('skip.aria'));
  // descripción para Google según el idioma (?lang=es tiene la suya)
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
}
relabelStatic();
i18n.onChange(relabelStatic);

async function loadStage(state) {
  if (!supportsWebGL()) throw new Error('WebGL no disponible');
  // carga diferida: three.js y la escena se descargan mientras se escribe el nombre
  const [{ Stage }, { loadSceneTextures }] = await Promise.all([
    import('./scene/Stage.js'),
    import('./scene/assets.js'),
  ]);
  const textures = await loadSceneTextures({ small: device.isSmall || device.lite });
  return new Stage(document.getElementById('scene'), textures, { device, state });
}

/**
 * Reemplazo mínimo de Stage cuando no hay WebGL: el fondo es la imagen original en
 * modo "cover", así que alcanza con mapear coordenadas para los marcadores y los clics.
 */
class FallbackStage {
  constructor() {
    this.paused = false;
    this.hoverIndex = -1;
  }
  map() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = Math.max(w / 1920, h / 1080) * 1.155; // inset -4% + escala media de la animación drift
    return { s, ox: (w - 1920 * s) / 2, oy: (h - 1080 * s) / 2 };
  }
  imageToScreen(px, py) {
    const m = this.map();
    return [m.ox + px * m.s, m.oy + py * m.s];
  }
  screenToImage(x, y) {
    const m = this.map();
    return [(x - m.ox) / m.s, (y - m.oy) / m.s];
  }
}

function useCssFallback() {
  document.body.classList.add('no-webgl');
  document.documentElement.style.setProperty('--fallback-bg', `url(${originalGif})`);
}

async function boot() {
  // la tipografía tiene que estar lista antes de medir las letras
  await Promise.race([
    Promise.all([document.fonts.load('600 1em Tektur'), document.fonts.load('1em Yellowtail')]),
    new Promise((r) => setTimeout(r, 1800)),
  ]).catch(() => {});

  // la intro y la app animan este objeto; la escena lo lee en cada frame
  const state = createSceneState();
  const assetsReady = { done: false, promise: null };
  let stage = null;
  assetsReady.promise = loadStage(state)
    .then((s) => {
      stage = s;
    })
    .catch((err) => {
      console.warn('[scene] usando fallback CSS:', err);
      useCssFallback();
    })
    .finally(() => {
      assetsReady.done = true;
    });

  // sin WebGL, el revelado se traduce a una variable CSS
  gsap.ticker.add(() => {
    if (!stage) document.documentElement.style.setProperty('--reveal', state.reveal.toFixed(3));
  });

  // --- pantalla de inicio: la habitación de fondo, desenfocada ---
  const curtain = document.querySelector('.curtain');
  document.querySelector('.skip').hidden = true;
  let pending = null; // a qué sección ir después de entrar
  let app = null;
  // volver al inicio desde la habitación: el inicio se vuelve a mostrar encima
  const openHome = () => {
    const home = new Landing({
      onEnter: (target) => {
        if (target === 'contact') app.openContactForm();
        else if (target) app.go(target);
      },
    });
    home.show();
  };
  const landing = new Landing({
    onEnter: (target) => {
      pending = target;
      createEntry({
        state,
        assetsReady,
        reducedMotion: device.reducedMotion,
        onSettled: async () => {
          // sin WebGL la habitación es una imagen fija, pero el menú funciona igual
          const { App } = await import('./app/App.js');
          app = new App({ stage: stage || new FallbackStage(), state, device, onHome: openHome });
          app.start();
          if (import.meta.env.DEV) window.__app = app;
          if (pending === 'contact') app.openContactForm();
          else if (pending) app.go(pending);
        },
      }).play();
    },
  });
  landing.show();
  if (import.meta.env.DEV) window.__landing = landing;

  // de fondo: la habitación se ilumina detrás del desenfoque mientras se ve el inicio
  assetsReady.promise.then(() => {
    gsap.to(curtain, { autoAlpha: 0, duration: 1.2, ease: 'power2.out' });
    gsap.to(state, { reveal: 1, duration: 2.6, ease: 'power2.inOut' });
    gsap.to(state, { power: 1, duration: 1.2, delay: 0.3 });
    gsap.to(state, { zoom: 1.14, motion: 0.5, duration: 3, ease: 'sine.out' });
  });
  if (import.meta.env.DEV) window.__intro = { state, getStage: () => stage };
}

boot();
