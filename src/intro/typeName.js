import gsap from 'gsap';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>[]{}=+*';
const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

/**
 * Prepara el nombre: un <span> por letra con ancho fijo (medido con la letra final),
 * así los glifos aleatorios del "decodificado" no hacen saltar el texto.
 */
export function buildLetters(container, text) {
  container.textContent = '';
  const letters = [...text].map((char) => {
    const span = document.createElement('span');
    span.className = 'name__letter';
    span.dataset.char = char;
    span.textContent = char;
    container.appendChild(span);
    return span;
  });
  letters.forEach((span) => {
    span.style.width = `${span.offsetWidth}px`;
  });
  return letters;
}

/** Re-mide los anchos fijos (por ejemplo tras un resize que cambia el tamaño de fuente). */
export function remeasure(letters) {
  letters.forEach((span) => {
    span.style.width = '';
    const prev = span.textContent;
    span.textContent = span.dataset.char;
    span.style.width = `${span.offsetWidth}px`; // offsetWidth ignora el transform (escala del encabezado)
    span.textContent = prev;
  });
}

/** Mueve el cursor de bloque justo después de una letra (o antes de la primera). */
export function placeCursor(cursor, letters, index) {
  const ref = letters[Math.max(0, index)];
  const x = index < 0 ? ref.offsetLeft - cursor.offsetWidth * 0.4 : ref.offsetLeft + ref.offsetWidth + cursor.offsetWidth * 0.25;
  return x;
}

/**
 * Timeline de una letra: aparece decodificándose (glifos aleatorios) y se "enciende"
 * con un destello al fijarse.
 */
export function typeLetter(span, { scramble = true } = {}) {
  const tl = gsap.timeline();
  const final = span.dataset.char;
  const proxy = { p: 0 };
  let last = -1;

  tl.set(span, { autoAlpha: 1 });
  tl.fromTo(
    span,
    { opacity: 0, y: '0.08em', filter: 'blur(10px)', scale: 1.25 },
    { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: 0.42, ease: 'power3.out' },
    0,
  );
  if (scramble) {
    tl.to(
      proxy,
      {
        p: 1,
        duration: 0.24,
        ease: 'none',
        onUpdate() {
          const step = Math.floor(proxy.p * 5);
          if (step !== last) {
            last = step;
            span.textContent = randomGlyph();
          }
        },
      },
      0,
    );
  }
  tl.call(
    () => {
      span.textContent = final;
      span.classList.remove('is-lit');
      void span.offsetWidth; // reinicia la animación CSS del destello
      span.classList.add('is-lit');
    },
    null,
    scramble ? 0.24 : 0.05,
  );
  return tl;
}

/** Pequeño glitch al pasar el puntero por el nombre ya ubicado como encabezado. */
export function glitch(letters) {
  letters.forEach((span, i) => {
    const final = span.dataset.char;
    let n = 0;
    gsap.delayedCall(i * 0.035, function step() {
      if (n++ < 4) {
        span.textContent = randomGlyph();
        gsap.delayedCall(0.04, step);
      } else {
        span.textContent = final;
      }
    });
  });
}
