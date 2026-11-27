import gsap from 'gsap';
import { sound } from '../audio/sound.js';
import { t } from '../i18n/i18n.js';

const KEY = 'dylan:achievements';

const ICONS = {
  explorer: '▣',
  curious: '◈',
  light: '✦',
  storm: 'ϟ',
  hacker: '>_',
  social: '✉',
  reader: '◉',
  rgb: '◆',
  polyglot: '⇄',
  completionist: '★',
};

/** Logros con título y texto en el idioma actual. */
export const ACHIEVEMENTS = Object.fromEntries(
  Object.entries(ICONS).map(([id, icon]) => [
    id,
    {
      icon,
      get title() {
        return t(`ach.${id}`)[0];
      },
      get text() {
        return t(`ach.${id}`)[1];
      },
    },
  ]),
);

function load() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

class Achievements {
  constructor() {
    this.unlocked = load();
    this.queue = Promise.resolve();
    this.root = document.createElement('div');
    this.root.className = 'toasts';
    this.root.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.root);
  }

  get count() {
    return this.unlocked.size;
  }

  get total() {
    return Object.keys(ACHIEVEMENTS).length;
  }

  unlock(id) {
    if (!ACHIEVEMENTS[id] || this.unlocked.has(id)) return;
    this.unlocked.add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.unlocked]));
    } catch {
      /* sin almacenamiento */
    }
    // de a uno, para que no se pisen
    this.queue = this.queue.then(() => this.toast(ACHIEVEMENTS[id]));
    const rest = Object.keys(ACHIEVEMENTS).filter((k) => k !== 'completionist');
    if (id !== 'completionist' && rest.every((k) => this.unlocked.has(k))) this.unlock('completionist');
  }

  toast(a) {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `
        <span class="toast__icon" aria-hidden="true">${a.icon}</span>
        <span class="toast__body">
          <span class="toast__kicker">${t('ach.unlocked')} · ${this.count}/${this.total}</span>
          <span class="toast__title">${a.title}</span>
          <span class="toast__text">${a.text}</span>
        </span>`;
      this.root.appendChild(el);
      sound.chime();
      gsap
        .timeline({ onComplete: () => (el.remove(), resolve()) })
        .fromTo(el, { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' })
        .fromTo(el.querySelector('.toast__icon'), { scale: 0.4, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2)' }, '<0.1')
        .to(el, { x: 30, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, '+=3');
    });
  }
}

export const achievements = new Achievements();
