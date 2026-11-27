/** Datos del dispositivo que condicionan calidad y movimiento. */
export function getDevice() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const minSide = Math.min(window.screen.width, window.screen.height);
  const isSmall = coarse || minSide < 820;

  // equipos modestos: poca memoria / pocos núcleos / ahorro de datos → modo liviano
  const nav = navigator;
  const mem = nav.deviceMemory || 8;
  const cores = nav.hardwareConcurrency || 8;
  const saveData = !!nav.connection?.saveData;
  const forced = new URLSearchParams(location.search).get('lite');
  const lite =
    forced === '1' || (forced !== '0' && (saveData || mem <= 2 || cores <= 2 || (coarse && (mem <= 3 || cores <= 4))));

  return { reducedMotion, coarse, isSmall, lite };
}

export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
