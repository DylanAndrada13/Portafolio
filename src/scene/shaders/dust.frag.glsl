varying float vAlpha;
varying vec3  vColor;

void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, r);
  a *= a;
  gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
}
