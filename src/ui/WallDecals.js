import gsap from 'gsap';
import { SKILL_ICONS } from '../data/skillIcons.js';
import { t, i18n } from '../i18n/i18n.js';

/**
 * Cosas "pegadas" en las paredes de la habitación, en perspectiva:
 *   - stickers con los logos de las herramientas sobre el cuadro
 *   - cartel de neón "¿tenés un proyecto?" en la pared de arriba de la cama
 *
 * Cada capa es un div plano que se deforma (matrix3d) para calzar en un cuadrilátero
 * de la imagen original (1920x1080) y sigue a la cámara en cada frame.
 */

// esquinas en píxeles de la imagen: arriba-izq, arriba-der, abajo-der, abajo-izq.
// `depth` es la profundidad de la pared en cada esquina (depth.png), para que el
// parallax de la cámara mueva lo pegado igual que la pared.
const PAINTING_QUAD = [[1615, 405], [1818, 363], [1818, 638], [1615, 610]];
const PAINTING_DEPTH = [0.34, 0.75, 0.75, 0.34]; // pared lateral: se acerca hacia la derecha
const SIGN_QUAD = [[1272, 405], [1490, 405], [1490, 625], [1272, 625]];
const SIGN_DEPTH = [0.15, 0.15, 0.15, 0.15];
// interruptor en la pared, arriba de la cabeza de la persona
const SWITCH_QUAD = [[574, 452], [606, 452], [606, 500], [574, 500]];
const SWITCH_DEPTH = [0.15, 0.15, 0.15, 0.15];
// parlante de la compu (el dibujado a la derecha de los monitores): abre la música
const SPEAKER_QUAD = [[445, 615], [516, 615], [516, 707], [445, 707]];
const SPEAKER_DEPTH = [0.64, 0.64, 0.64, 0.64];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Transformación proyectiva de un rectángulo w×h a un cuadrilátero (formato CSS matrix3d). */
function quadMatrix(w, h, [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  const a = (x1 - x0 + g * x1) / w;
  const b = (x3 - x0 + k * x3) / h;
  const d = (y1 - y0 + g * y1) / w;
  const e = (y3 - y0 + k * y3) / h;
  const m = [a, d, 0, g / w, b, e, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map((v) => v.toFixed(6)).join(',')})`;
}

// rotaciones "a mano" para que no parezcan alineados por una máquina
const TILT = [-8, 6, -3, 10, 4, -11, 7, -5, 12, -6, 3, -9, 8, -2, 5, -7];

export class WallDecals {
  constructor({ root, stage, state, skills, onSign, onSwitch, onSpeaker }) {
    this.stage = stage;
    this.state = state;
    this.el = document.createElement('div');
    this.el.className = 'decals';
    this.el.setAttribute('aria-hidden', 'false');
    root.before(this.el); // antes de los marcadores: queda por debajo de ellos

    // --- stickers en el cuadro ---
    this.board = document.createElement('div');
    this.board.className = 'decal decal--board';
    this.board.dataset.w = 200;
    this.board.dataset.h = 230;
    const list = skills.filter((s) => SKILL_ICONS[s.name || s]);
    this.board.innerHTML =
      `<span class="board__tape" data-t="decal.stack"></span>` +
      list
        .map((s, i) => {
          const name = s.name || s;
          return `<span class="sticker" style="--c:${esc(s.color || '#46dcff')};--r:${TILT[i % TILT.length]}deg" title="${esc(name)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SKILL_ICONS[name]}"/></svg>
            </span>`;
        })
        .join('');
    this.el.appendChild(this.board);

    // (tu logo en el monitor de arriba se dibuja dentro de la escena: src/scene/logoTexture.js)

    // --- interruptor de la luz roja ---
    this.switch = document.createElement('button');
    this.switch.type = 'button';
    this.switch.className = 'decal decal--switch light-switch';
    this.switch.dataset.w = 60;
    this.switch.dataset.h = 90;
    this.switch.innerHTML = `
      <span class="light-switch__plate" aria-hidden="true"></span>
      <span class="light-switch__led" aria-hidden="true"></span>
      <span class="light-switch__slot" aria-hidden="true"><span class="light-switch__lever"></span></span>`;
    this.switch.addEventListener('click', () => onSwitch?.());
    this.el.appendChild(this.switch);

    // --- parlante de la compu: capa transparente encima del dibujado (abre la música) ---
    this.speaker = document.createElement('button');
    this.speaker.type = 'button';
    this.speaker.className = 'decal decal--speaker speaker';
    this.speaker.dataset.w = 142;
    this.speaker.dataset.h = 184;
    this.speaker.setAttribute('aria-haspopup', 'dialog');
    this.speaker.innerHTML = `
      <span class="speaker__led" aria-hidden="true"></span>
      <span class="speaker__ring speaker__ring--big" aria-hidden="true"></span>
      <span class="speaker__ring speaker__ring--small" aria-hidden="true"></span>
      <span class="speaker__tag" aria-hidden="true">♫</span>
      <span class="speaker__notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i></span>`;
    this.speaker.addEventListener('click', () => onSpeaker?.());
    this.el.appendChild(this.speaker);

    // --- cartel de neón arriba de la cama ---
    this.sign = document.createElement('button');
    this.sign.type = 'button';
    this.sign.className = 'decal decal--sign neon-sign';
    this.sign.dataset.w = 240;
    this.sign.dataset.h = 242;
    this.sign.innerHTML = `
      <span class="neon-sign__frame" aria-hidden="true"></span>
      <span class="neon-sign__script" data-t="sign.script"></span>
      <svg class="neon-sign__icon" viewBox="0 0 40 28" aria-hidden="true"><rect x="2" y="2" width="36" height="24" rx="3"/><path d="M3 4 L20 16 L37 4"/></svg>
      <span class="neon-sign__main" data-t="sign.main"></span>
      <span class="neon-sign__sub" data-t="sign.sub"></span>`;
    this.sign.addEventListener('click', () => onSign?.());
    this.el.appendChild(this.sign);

    this.relabel();
    i18n.onChange(() => this.relabel());
    this.update = this.update.bind(this);
    gsap.ticker.add(this.update);
  }

  relabel() {
    this.el.querySelectorAll('[data-t]').forEach((n) => (n.textContent = t(n.dataset.t)));
    this.sign.setAttribute('aria-label', `${t('sign.script')} ${t('sign.main')}`);
    this.switch.setAttribute('aria-label', t('region.lamp.hint'));
    this.speaker.setAttribute('aria-label', t('speaker.aria'));
  }

  /** El cartel solo se puede tocar estando en la habitación. */
  setInteractive(on) {
    this.el.classList.toggle('is-interactive', on);
    this.sign.tabIndex = on ? 0 : -1;
    this.switch.tabIndex = on ? 0 : -1;
    this.speaker.tabIndex = on ? 0 : -1;
  }

  setSpeaker(playing) {
    this.speaker.classList.toggle('is-playing', playing);
  }

  setSwitch(on) {
    this.switch.classList.toggle('is-on', on);
    this.switch.setAttribute('aria-pressed', String(on));
  }

  place(el, quad, depth) {
    const pts = quad.map(([x, y], i) => this.stage.imageToScreen(x, y, depth[i]));
    el.style.transform = quadMatrix(Number(el.dataset.w), Number(el.dataset.h), pts);
  }

  update() {
    const s = this.state;
    this.place(this.board, PAINTING_QUAD, PAINTING_DEPTH);
    this.place(this.sign, SIGN_QUAD, SIGN_DEPTH);
    this.place(this.switch, SWITCH_QUAD, SWITCH_DEPTH);
    this.place(this.speaker, SPEAKER_QUAD, SPEAKER_DEPTH);
    // los stickers reciben la luz de la habitación (la roja de los LEDs apenas los toca);
    // el neón brilla solo
    const light = 0.5 + s.lamp * 0.08 + s.flash * 0.5;
    this.el.style.setProperty('--room-light', light.toFixed(3));
    this.el.style.opacity = Math.min(1, s.reveal * 1.2).toFixed(3);
    this.el.style.visibility = s.whiteout > 0.98 ? 'hidden' : 'visible';
  }
}
