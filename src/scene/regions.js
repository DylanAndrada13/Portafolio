/**
 * Zonas interactivas de la habitación, en píxeles de la imagen original (1920x1080).
 * Si cambiás la imagen, ajustá estos polígonos (y los de tools/build_scene_assets.py).
 *
 *  - hover:  índice del canal que el shader resalta (0 pantallas, 1 ventana, 2 cuadro, 3 lámpara)
 *  - anchor: dónde se dibuja el marcador en pantalla
 *  - focus:  hacia dónde viaja la cámara y con cuánto zoom
 *  - panelSide: de qué lado aparece el panel de información
 */
export const REGIONS = [
  {
    id: 'monitor',
    label: 'proyectos',
    hint: 'entrar al setup',
    hover: 0,
    poly: [[210, 280], [485, 340], [460, 730], [205, 730]],
    anchor: [470, 300],
    focus: { x: 342, y: 505, zoom: 3.4 },
  },
  {
    id: 'window',
    label: 'contacto',
    hint: 'mirar afuera',
    hover: 1,
    poly: [[700, 365], [1235, 365], [1235, 672], [700, 672]],
    anchor: [1180, 395],
    focus: { x: 968, y: 520, zoom: 1.9 },
    panelSide: 'right',
  },
  {
    id: 'painting',
    label: 'sobre mí',
    hint: 'ver el cuadro',
    hover: 2,
    poly: [[1600, 395], [1838, 343], [1838, 652], [1600, 622]],
    anchor: [1610, 380],
    focus: { x: 1716, y: 498, zoom: 2.1 },
    panelSide: 'left',
  },
  {
    id: 'lamp', // el interruptor de la luz roja (arriba de la cabeza de la persona)
    label: 'luz',
    hint: 'prender la luz roja',
    hover: 3,
    poly: [[566, 446], [614, 446], [614, 506], [566, 506]],
    anchor: [618, 456],
    focus: null,
  },

];

export function pointInPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function regionAt(point) {
  return REGIONS.find((r) => pointInPoly(point, r.poly)) || null;
}
