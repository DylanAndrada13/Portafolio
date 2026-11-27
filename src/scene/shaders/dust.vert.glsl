// Partículas de polvo / chispas que flotan en la habitación.
// Viven en coordenadas uv de la imagen, así siguen la cámara y el parallax del fondo.
attribute vec4 aSeed;   // x,y posición inicial · z profundidad · w tipo

uniform sampler2D uGlow;
uniform vec2  uCenter;
uniform vec2  uScale;
uniform vec2  uParallax;
uniform float uTime;
uniform float uPixelRatio;
uniform float uReveal;
uniform float uSize;

varying float vAlpha;
varying vec3  vColor;

void main() {
  float depth = mix(0.25, 1.0, aSeed.z);
  float spark = step(0.9, aSeed.w);

  vec2 pos = aSeed.xy;
  float t = uTime * (0.006 + aSeed.z * 0.01);
  pos.y = fract(pos.y + t);                                         // ascenso lento
  pos.x += sin(uTime * 0.25 + aSeed.w * 40.0) * 0.012 * depth;      // vaivén
  pos.y += cos(uTime * 0.31 + aSeed.x * 30.0) * 0.006 * depth;

  // mismo desplazamiento que el fondo (en sentido opuesto al muestreo)
  vec2 view = pos - uParallax * (depth - 0.3);
  vec2 ndc = (view - uCenter) / uScale * 2.0;
  gl_Position = vec4(ndc, 0.0, 1.0);

  // el polvo solo se ve donde lo ilumina la luz de las pantallas / ventana
  vec3 g = texture2D(uGlow, pos).rgb;
  float light = g.r * 1.2 + g.g * 0.5;
  float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + aSeed.w * 3.0) + aSeed.x * 50.0);
  vAlpha = (0.05 + light) * twinkle * mix(0.55, 1.0, spark) * smoothstep(0.4, 1.0, uReveal);
  vColor = mix(vec3(0.75, 0.9, 1.0), vec3(0.25, 0.9, 1.0), spark);

  gl_PointSize = uSize * mix(1.0, 3.2, depth) * mix(1.0, 1.6, spark) * uPixelRatio;
}
