uniform float uTime;

varying vec2 vUv;
varying float vElevation;

void main() {
  float r = 0.2 + vElevation * 0.5 + 0.3;
  float g = 0.4 + vUv.y * 0.3;
  float b = 0.8 + sin(uTime * 0.5) * 0.2;

  gl_FragColor = vec4(r, g, b, 1.0);
}
