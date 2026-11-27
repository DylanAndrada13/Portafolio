import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace } from 'three';

/**
 * Tu logo como textura para la pantalla del monitor de arriba.
 * Se dibuja en un canvas (dentro del shader de la escena), así calza exacto con la
 * pantalla aunque la cámara se mueva. La primera vez que se encienden las pantallas
 * se "arma": líneas → cara roja → destello → DYLAN. Después queda fijo.
 */

// mismas coordenadas que public/brand/logo-d.svg
const OUTER = [[15, 105], [178, 13], [406, 148], [406, 346], [129, 504], [129, 435]];
const STEM = [[15, 105], [121, 152], [121, 345], [15, 406], [15, 105]];
const TRI = [[127, 348], [127, 152], [302, 247], [302, 328]];
const FACET = [[127, 348], [302, 247], [302, 328], [129, 435]];

const SIZE = 512;
const S = 0.55; // escala del logo dentro del canvas
const OX = SIZE / 2 - (15 + 406) / 2 * S;
const OY = 92 - 13 * S;
const NAME_Y = 422;
const RED = '#ff1f42';
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const tp = ([x, y]) => [OX + x * S, OY + y * S];

/** Dibuja una polilínea hasta la fracción `p` de su largo. */
function partial(ctx, pts, p) {
  if (p <= 0) return;
  const P = pts.map(tp);
  let total = 0;
  for (let i = 1; i < P.length; i++) total += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  let left = total * p;
  ctx.beginPath();
  ctx.moveTo(...P[0]);
  for (let i = 1; i < P.length && left > 0; i++) {
    const [ax, ay] = P[i - 1];
    const [bx, by] = P[i];
    const seg = Math.hypot(bx - ax, by - ay);
    const k = Math.min(1, left / seg);
    ctx.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k);
    left -= seg;
  }
  ctx.stroke();
}

export class LogoScreen {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = NoColorSpace;
    // con mipmaps: la pantalla se ve chica y sin ellos las líneas finas parpadean
    this.texture.minFilter = LinearMipmapLinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.anisotropy = 4;
    document.fonts?.load('600 34px Tektur').catch(() => {});
    this.start = -1;
    this.done = false;
    this.draw(0);
  }

  /** Arranca la animación de armado (una sola vez). */
  build(now) {
    if (this.start < 0) this.start = now;
  }

  /** Llamar en cada frame: solo redibuja mientras se está armando. */
  update(now, reducedMotion) {
    if (this.start < 0 || this.done) return;
    const t = reducedMotion ? 99 : (now - this.start) / 1000;
    this.draw(t);
    this.texture.needsUpdate = true;
    if (t > 3.8) this.done = true;
  }

  draw(t) {
    const c = this.ctx;
    c.save();
    c.fillStyle = '#000';
    c.fillRect(0, 0, SIZE, SIZE);
    if (t <= 0) {
      c.restore();
      this.texture.needsUpdate = true;
      return;
    }

    // líneas que se van dibujando (con un poco de brillo de neón, dentro de la pantalla)
    const fade = c.createLinearGradient(0, OY, 0, OY + 500 * S);
    fade.addColorStop(0, RED);
    fade.addColorStop(0.72, RED);
    fade.addColorStop(1, '#6a3a42');
    c.lineWidth = 7;
    c.lineJoin = 'miter';
    c.lineCap = 'square';
    c.shadowColor = 'rgba(255, 31, 66, 0.85)';
    c.shadowBlur = 14;
    c.strokeStyle = fade;
    partial(c, OUTER, ease(clamp01(t / 1.5)));
    partial(c, STEM, ease(clamp01((t - 0.55) / 1.0)));
    c.strokeStyle = RED;
    partial(c, TRI, ease(clamp01((t - 1.05) / 1.0)));

    // la cara roja se llena de abajo hacia arriba
    const pf = ease(clamp01((t - 1.8) / 0.7));
    if (pf > 0) {
      const F = FACET.map(tp);
      const top = Math.min(...F.map((p) => p[1]));
      const bottom = Math.max(...F.map((p) => p[1]));
      c.save();
      c.beginPath();
      c.rect(0, bottom - (bottom - top) * pf, SIZE, SIZE);
      c.clip();
      const g = c.createLinearGradient(F[3][0], F[3][1], F[1][0], F[1][1]);
      g.addColorStop(0, '#ff1a3c');
      g.addColorStop(1, '#5e0010');
      c.fillStyle = g;
      c.shadowBlur = 0;
      c.beginPath();
      F.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
      c.closePath();
      c.fill();
      c.restore();
    }

    // destello cuando queda armado
    const flash = clamp01(1 - Math.abs(t - 2.7) / 0.45);
    if (flash > 0) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = flash * 0.35;
      c.shadowBlur = 30;
      c.lineWidth = 9;
      c.strokeStyle = RED;
      partial(c, OUTER, 1);
      partial(c, STEM, 1);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }

    // DYLAN, letra por letra
    const letters = 'DYLAN';
    const shown = Math.floor(clamp01((t - 2.6) / 0.6) * letters.length + 0.001);
    if (shown > 0) {
      c.shadowBlur = 8;
      c.shadowColor = 'rgba(255, 31, 66, 0.7)';
      c.fillStyle = '#ff3a55';
      c.font = '600 34px Tektur, "Segoe UI", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const gap = 40;
      const x0 = SIZE / 2 - ((letters.length - 1) * gap) / 2;
      for (let i = 0; i < shown; i++) c.fillText(letters[i], x0 + i * gap, NAME_Y);
    }

    // barrido de escaneo
    const sweep = clamp01((t - 2.3) / 1.2);
    if (sweep > 0 && sweep < 1) {
      const y = sweep * SIZE;
      const g = c.createLinearGradient(0, y - 30, 0, y + 30);
      g.addColorStop(0, 'rgba(255, 50, 80, 0)');
      g.addColorStop(0.5, `rgba(255, 50, 80, ${0.18 * (1 - sweep)})`);
      g.addColorStop(1, 'rgba(255, 50, 80, 0)');
      c.shadowBlur = 0;
      c.fillStyle = g;
      c.fillRect(0, y - 30, SIZE, 60);
    }

    // líneas de pantalla muy sutiles
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let y = 0; y < SIZE; y += 4) c.fillRect(0, y, SIZE, 1);
    c.restore();
  }
}
