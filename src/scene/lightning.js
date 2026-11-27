import gsap from 'gsap';
import { sound } from '../audio/sound.js';

let busy = false;

/** Un relámpago: destello doble + trueno con retardo. */
export function strike(state) {
  if (busy) return false;
  busy = true;
  const double = Math.random() < 0.45;
  gsap
    .timeline({ onComplete: () => (busy = false) })
    .to(state, { flash: 1, duration: 0.05, ease: 'none' })
    .to(state, { flash: 0.12, duration: 0.09, ease: 'none' })
    .to(state, { flash: double ? 0.85 : 0.4, duration: 0.05, ease: 'none' })
    .to(state, { flash: 0, duration: 0.9, ease: 'power2.out' });
  document.body.classList.add('is-flash');
  gsap.delayedCall(0.35, () => document.body.classList.remove('is-flash'));
  sound.thunder(0.35 + Math.random() * 0.6);
  return true;
}

/** Relámpagos ocasionales detrás de la ventana. */
export function scheduleLightning(state) {
  const next = () => gsap.delayedCall(gsap.utils.random(10, 20), () => (strike(state), next()));
  gsap.delayedCall(gsap.utils.random(3, 6), () => (strike(state), next()));
}
