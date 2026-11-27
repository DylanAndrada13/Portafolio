import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';
import vertexShader from './shaders/dust.vert.glsl?raw';
import fragmentShader from './shaders/dust.frag.glsl?raw';

/** Polvo y chispas cian que flotan en la luz de las pantallas. */
export class Dust {
  constructor({ count, glow, shared }) {
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // concentramos más partículas en la mitad izquierda (zona del setup)
      const x = Math.random() < 0.6 ? Math.random() * 0.55 : Math.random();
      seeds[i * 4 + 0] = x;
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
    }
    const geometry = new BufferGeometry();
    // "position" es obligatoria para three; la posición real se calcula en el shader
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));

    this.uniforms = {
      uGlow: { value: glow },
      uSize: { value: 2.0 },
      uPixelRatio: { value: 1 },
      ...shared,
    };

    this.points = new Points(
      geometry,
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: this.uniforms,
        transparent: true,
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
  }

  setPixelRatio(pr) {
    this.uniforms.uPixelRatio.value = pr;
  }
}
