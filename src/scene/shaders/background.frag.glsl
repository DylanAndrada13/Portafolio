// Fondo 2.5D: la imagen original + mapa de profundidad + capas de luz procedurales.
precision highp float;

uniform sampler2D uFrame;   // frame actual del GIF original
uniform sampler2D uDepth;   // 0 lejos -> 1 cerca
uniform sampler2D uMask;    // R pantallas, G ventana, B brillo rojo PC
uniform sampler2D uGlow;    // máscaras difuminadas (bloom precalculado)
uniform sampler2D uRegions; // R cuadro, G lámpara

uniform vec2  uRes;
uniform vec2  uCenter;      // centro del recorte (uv de imagen)
uniform vec2  uScale;       // tamaño del recorte (uv de imagen)
uniform vec2  uParallax;    // desplazamiento de cámara (uv) — puntero + deriva
uniform float uDolly;       // "respiración" de cámara: zoom diferencial por profundidad
uniform float uTime;

uniform float uReveal;      // 0 negro total -> 1 escena revelada
uniform float uPower;       // encendido de pantallas
uniform float uLed;         // encendido de tiras LED
uniform float uFlash;       // relámpago
uniform float uRain;
uniform vec4  uHover;       // resaltado: pantallas, ventana, cuadro, lámpara
uniform vec2  uTorchPos;    // posición de la linterna (uv de pantalla)
uniform float uTorch;       // intensidad de la linterna
uniform float uDim;         // oscurecimiento ambiente (la linterna compensa)
uniform float uLamp;        // lámpara del techo
uniform float uRgb;         // modo RGB (código Konami)
uniform float uWhiteout;    // fundido a blanco-cian al entrar a una pantalla
uniform float uTheme;       // 0 ambiente apagado (neutro) -> 1 luz roja prendida (solo LEDs e interfaz)
uniform sampler2D uLogo;    // tu logo, dibujado en un canvas (pantalla de arriba)
uniform mat3  uScreenH;     // px de imagen -> cuadrado unitario de esa pantalla

varying vec2 vUv;

const vec2 IMG = vec2(1920.0, 1080.0);
const vec3 OFF  = vec3(0.82, 0.83, 0.85);   // acento neutro con la luz apagada
const vec3 NEUT = vec3(0.9, 0.91, 0.93);    // luz de pantallas: siempre neutra
const vec3 RED  = vec3(1.0, 0.1, 0.2);
const vec3 DRED = vec3(0.75, 0.03, 0.12);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash1(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

vec3 hue(float h) {
  return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
}

// Distancia de un punto a un segmento (en px de imagen)
float segDist(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 pa = p - a, ba = b - a;
  t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}

// Pantalla del monitor de arriba (px de imagen, medida sobre mask.png).
// Distancia con signo al borde de la pantalla: < 0 adentro, en px.
float edgeDist(vec2 p, vec2 a, vec2 b) {
  vec2 e = normalize(b - a);
  return (p - a).x * e.y - (p - a).y * e.x;
}
float topScreenDist(vec2 p) {
  vec2 a = vec2(286.0, 307.0), b = vec2(456.0, 359.0), c = vec2(421.0, 491.0), d = vec2(240.0, 484.0);
  return max(max(edgeDist(p, a, b), edgeDist(p, b, c)), max(edgeDist(p, c, d), edgeDist(p, d, a)));
}

// Tira LED: núcleo fino + halo + pulso de luz que la recorre
vec3 ledStrip(vec2 p, vec2 a, vec2 b, vec3 color, float phase) {
  float t;
  float d = segDist(p, a, b, t);
  float core = exp(-d * d / 4.0) * 0.8;
  float halo = exp(-d / 26.0) * 0.45 + exp(-d / 90.0) * 0.18;
  float run  = exp(-pow((t - fract(uTime * 0.09 + phase)) * 9.0, 2.0)) * 0.9;
  float breathe = 0.82 + 0.18 * sin(uTime * 0.9 + phase * 6.283);
  vec3 c = mix(color, hue(t * 0.8 - uTime * 0.25 + phase), uRgb);
  return c * (core * 1.4 + halo) * (breathe + run);
}

// Lluvia procedural detrás del vidrio
float rain(vec2 uv) {
  uv.x += uv.y * 0.22;                       // inclinación del viento
  float cols = 210.0;
  float col = floor(uv.x * cols);
  float fx = fract(uv.x * cols);
  float speed = 1.6 + hash1(col) * 1.4;
  float y = fract(uv.y * 3.0 + uTime * speed + hash1(col * 7.1));
  float streak = smoothstep(0.0, 0.03, y) * smoothstep(0.22, 0.0, y);
  float line = smoothstep(0.35, 0.0, abs(fx - 0.5));
  return streak * line * step(0.55, hash1(col * 3.3));
}

void main() {
  // acento de la interfaz dentro de la escena (resaltados): neutro apagado, rojo prendido
  vec3 ACC = mix(OFF, RED, uTheme);

  // --- cámara: recorte "cover" + parallax por profundidad (2 iteraciones) ---
  vec2 uv = uCenter + (vUv - 0.5) * uScale;
  float d = texture2D(uDepth, uv).r;
  vec2 off = uParallax * (d - 0.3) + (uv - uCenter) * (d - 0.3) * uDolly;
  d = texture2D(uDepth, uv + off).r;
  off = uParallax * (d - 0.3) + (uv - uCenter) * (d - 0.3) * uDolly;
  vec2 suv = uv + off;

  // aberración cromática muy sutil hacia los bordes
  vec2 ca = (vUv - 0.5) * 0.0025;
  vec3 base;
  base.r = texture2D(uFrame, suv + ca).r;
  base.g = texture2D(uFrame, suv).g;
  base.b = texture2D(uFrame, suv - ca).b;

  vec3 m  = texture2D(uMask, suv).rgb;
  vec3 g  = texture2D(uGlow, suv).rgb;
  vec3 rg = texture2D(uRegions, suv).rgb;
  vec2 p = vec2(suv.x, 1.0 - suv.y) * IMG;    // px de imagen (y hacia abajo)

  // --- grading: la habitación siempre en gris neutro y tenue (sin azul, sin rojo).
  //     Lo único que se pone rojo son los LEDs (y la interfaz). ---
  vec3 col = pow(base, vec3(1.08));
  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  col = vec3(lum) * vec3(1.0, 0.985, 0.97) * 0.92;

  // --- pantalla de arriba: negra y sin luz; solo el logo ---
  float sd = topScreenDist(p);
  float top = 1.0 - smoothstep(2.5, 4.0, sd);            // la pantalla + el borde brillante de la imagen
  float outside = max(sd, 0.0);
  float keep = (1.0 - top) * (1.0 - smoothstep(0.3, 0.7, m.r)); // no tocar las pantallas de abajo
  float bezel = exp(-outside / 12.0) * keep;             // el marco ya no está iluminado
  float spill = exp(-outside / 42.0) * keep;             // la pared tampoco recibe su luz
  col *= (1.0 - 0.7 * bezel) * (1.0 - 0.35 * spill);
  col = mix(col, vec3(0.006) + lum * 0.02, top);
  vec3 lq = uScreenH * vec3(p, 1.0);
  vec2 luv = clamp(lq.xy / lq.z, 0.0, 1.0);
  vec3 logo = texture2D(uLogo, vec2(luv.x, 1.0 - luv.y)).rgb * top;

  // --- pantallas ---
  float flicker = 0.94 + 0.06 * noise(vec2(uTime * 9.0, 1.0));
  float scan = smoothstep(0.0, 0.02, fract(p.y / 140.0 - uTime * 0.35)) *
               smoothstep(0.06, 0.02, fract(p.y / 140.0 - uTime * 0.35));
  float lowScreens = m.r * (1.0 - top);
  vec3 screens = vec3(dot(base, vec3(0.3, 0.59, 0.11))) * lowScreens * flicker + lowScreens * scan * NEUT * 0.12;
  // el brillo sale solo de los monitores de abajo
  float topZone = (1.0 - smoothstep(498.0, 545.0, p.y)) * (1.0 - smoothstep(500.0, 620.0, p.x));
  vec3 screenGlow = g.r * (1.0 - topZone) * NEUT * 0.55 * flicker * (1.0 + uHover.x * 0.8);

  // --- ventana: lluvia + relámpago ---
  float r = rain(suv) * uRain;
  vec3 win = m.g * (r * vec3(0.7) * 0.3 + uFlash * vec3(0.85, 0.86, 0.9) * 0.9);
  vec3 winGlow = g.g * (0.05 + uFlash * 0.55) * vec3(0.8, 0.8, 0.84);

  // --- LEDs: apagados se ven como tiras grises casi sin luz; con el interruptor
  //     prendido (uLamp, con parpadeo de arranque) pasan a rojo ---
  vec3 LED  = mix(OFF * 0.07, RED, uLamp);
  vec3 LED2 = mix(OFF * 0.05, DRED, uLamp);

  // --- brillo rojo del gabinete: es un LED más, solo con la luz prendida ---
  vec3 pc = g.b * mix(vec3(1.0, 0.12, 0.28), hue(uTime * 0.2), uRgb) * 0.4 * uLamp * (0.75 + 0.25 * sin(uTime * 1.3));

  // --- tiras LED (posiciones en px de la imagen original) ---
  vec3 led = vec3(0.0);
  led += ledStrip(p, vec2(412.0, 264.0), vec2(1518.0, 264.0), LED, 0.0);         // cornisa pared del fondo
  led += ledStrip(p, vec2(0.0, 818.0), vec2(330.0, 806.0), LED2, 0.35) * 0.6;     // bajo escritorio
  // la luz que tiran las tiras sobre la pared y el piso (solo cerca de ellas)
  vec3 washColor = mix(RED, hue(p.x / 1600.0 - uTime * 0.25), uRgb);
  float wash = smoothstep(258.0, 280.0, p.y) * exp(-(p.y - 264.0) / 130.0)
             * smoothstep(380.0, 520.0, p.x) * smoothstep(1550.0, 1400.0, p.x)
             * (1.0 - d * 0.8);
  led += washColor * wash * 0.2 * uLamp;
  float floorWash = smoothstep(800.0, 830.0, p.y) * exp(-(p.y - 820.0) / 110.0) * smoothstep(420.0, 260.0, p.x);
  led += mix(DRED, hue(0.6 - uTime * 0.25), uRgb) * floorWash * 0.2 * uLamp;

  // --- resaltado de zonas interactivas ---
  float pulse = 0.7 + 0.3 * sin(uTime * 4.0);
  float region = lowScreens * uHover.x + m.g * uHover.y + rg.r * uHover.z + rg.g * uHover.w;
  float regionScan = smoothstep(0.0, 0.08, fract(p.y / 60.0 - uTime * 0.6)) * smoothstep(0.3, 0.08, fract(p.y / 60.0 - uTime * 0.6));
  vec3 highlight = ACC * (region * (0.12 + regionScan * 0.12) + g.g * uHover.y * 0.15) * pulse;

  // --- revelado: la oscuridad se retira desde las pantallas ---
  vec2 origin = vec2(340.0, 500.0);
  float dist = length((p - origin) / IMG.y);
  float n = fbm(p / 260.0 + uTime * 0.15);
  float front = uReveal * 2.6;
  float field = dist + n * 0.35;
  float lit = 1.0 - smoothstep(front - 0.35, front, field);
  float edge = exp(-pow((field - front + 0.12) * 7.0, 2.0)) * (1.0 - smoothstep(0.85, 1.0, uReveal));

  // --- linterna: el puntero ilumina la habitación ---
  vec2 tp = (vUv - uTorchPos) * vec2(uRes.x / uRes.y, 1.0);
  float torch = exp(-dot(tp, tp) / 0.03) * uTorch;
  float ambient = uDim + torch * 0.75;

  vec3 scene = col * lit * ambient;
  scene += screens * uPower * (1.0 - lit);          // las pantallas brillan aún en la oscuridad
  scene += logo * uPower;                           // el logo también (pero no ilumina nada)
  scene += screenGlow * uPower + pc * uPower * lit;
  scene += (win + winGlow) * lit;
  scene += led * uLed;
  scene += highlight * lit;
  scene += OFF * torch * 0.035;
  scene += OFF * edge * 0.10 * step(0.001, uReveal);
  scene *= 1.0 + uFlash * 0.22 * lit;

  // --- post: viñeta + grano ---
  float vig = smoothstep(1.15, 0.35, length((vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 0.95));
  scene *= mix(0.55, 1.0, vig);
  scene += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * 0.035;

  // --- fundido al entrar a una pantalla ---
  scene = mix(scene, vec3(0.9, 0.91, 0.93), uWhiteout);

  gl_FragColor = vec4(max(scene, 0.0), 1.0);
}
