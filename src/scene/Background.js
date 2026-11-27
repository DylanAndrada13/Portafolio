import { Matrix3, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector4 } from 'three';
import vertexShader from './shaders/fullscreen.vert.glsl?raw';
import fragmentShader from './shaders/background.frag.glsl?raw';

const FRAME_MS = 80; // misma cadencia que el GIF original

// pantalla del monitor de arriba, medida sobre mask.png (px de imagen):
// arriba-izq, arriba-der, abajo-der, abajo-izq
const TOP_SCREEN = [[286, 307], [456, 359], [421, 491], [240, 484]];

/**
 * Homografía px de imagen -> cuadrado unitario de la pantalla (0,0 arriba-izq).
 * Con esto el shader pega el logo en perspectiva exacta sobre la pantalla.
 */
function screenHomography([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  // cuadrado -> cuadrilátero
  const m = new Matrix3().set(
    x1 - x0 + g * x1, x3 - x0 + h * x3, x0,
    y1 - y0 + g * y1, y3 - y0 + h * y3, y0,
    g, h, 1,
  );
  return m.invert();
}

/** Plano a pantalla completa que dibuja la habitación con profundidad y luces. */
export class Background {
  constructor(textures, shared) {
    this.frames = textures.frames;
    this.uniforms = {
      uFrame: { value: this.frames[0] },
      uDepth: { value: textures.depth },
      uMask: { value: textures.mask },
      uGlow: { value: textures.glow },
      uRegions: { value: textures.regions },
      uRes: { value: new Vector2(1, 1) },
      uDolly: { value: 0 },
      uFlash: { value: 0 },
      uRain: { value: 1 },
      uHover: { value: new Vector4() },
      uTorchPos: { value: new Vector2(0.5, 0.5) },
      uTorch: { value: 0 },
      uDim: { value: 1 },
      uLamp: { value: 0 },
      uRgb: { value: 0 },
      uWhiteout: { value: 0 },
      uTheme: { value: 0 },
      uLogo: { value: textures.logo },
      uScreenH: { value: screenHomography(TOP_SCREEN) },
      ...shared,
    };

    this.mesh = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: this.uniforms,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
  }

  setSize(width, height) {
    this.uniforms.uRes.value.set(width, height);
  }

  update(timeMs) {
    const index = Math.floor(timeMs / FRAME_MS) % this.frames.length;
    this.uniforms.uFrame.value = this.frames[index];
  }
}
