varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform sampler2D uTexture;
uniform float uProgress;

void main() {
  // When viewing the back face, mirror the UV so image reads correctly
  vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
  vec4 texColor = texture2D(uTexture, uv);

  // Slight darkening on back face during mid-fold
  float backDim = gl_FrontFacing ? 1.0 : mix(0.6, 1.0, uProgress);
  vec3 color = texColor.rgb * backDim;

  gl_FragColor = vec4(color, 1.0);
}
