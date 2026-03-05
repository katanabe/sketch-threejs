uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;

varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;

  float elevation = sin(position.x * uFrequency + uTime) * uAmplitude
                  + sin(position.y * uFrequency * 0.8 + uTime * 1.2) * uAmplitude * 0.5;

  vElevation = elevation;

  vec3 newPosition = position;
  newPosition.z = elevation;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
