import { TextureLoader, LinearFilter, ClampToEdgeWrapping, NoColorSpace } from 'three';

const BASE = '/assets/scene/';

function configure(tex) {
  tex.colorSpace = NoColorSpace; // trabajamos todo en espacio sRGB "tal cual" (sin conversiones)
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
  return tex;
}

/**
 * Carga los recursos de la escena. En pantallas chicas usa frames reducidos.
 * Devuelve { frames: Texture[], depth, mask, glow, regions }.
 */
export async function loadSceneTextures({ small = false } = {}) {
  const loader = new TextureLoader();
  const load = (file) => loader.loadAsync(BASE + file).then(configure);
  const suffix = small ? '-sm' : '';

  const [frames, depth, mask, glow, regions] = await Promise.all([
    Promise.all([0, 1, 2].map((i) => load(`frame${i}${suffix}.webp`))),
    load('depth.png'),
    load('mask.png'),
    load('glow.png'),
    load('regions.png'),
  ]);
  return { frames, depth, mask, glow, regions };
}
