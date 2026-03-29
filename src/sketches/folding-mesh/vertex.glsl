uniform float uProgress;   // 0 to 1
uniform float uScale;
uniform float uTime;
uniform vec2 uMouse;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

#define PI 3.141592653589

void main() {
  vUv = uv;

  vec3 pos = position;
  float prog = uProgress;

  // === Hover wobble ===
  float hoverStrength = 0.04 * (1.0 - prog);
  pos.z += sin(pos.x * 4.0 + uMouse.x * 3.0) * uMouse.y * hoverStrength;
  pos.z += cos(pos.y * 4.0 + uMouse.y * 3.0) * uMouse.x * hoverStrength;

  // === Fold: cylinder wrap + rotation ===
  float radius = 0.3;
  vec3 center = vec3(0.0, 0.0, radius);

  // Cylindrical projection
  vec3 cyl = pos;
  cyl.z = -radius; // put all vertices on the back of the cylinder
  cyl -= center;

  // Rotate around X axis by progress * PI (negative = fold away from camera)
  float angle = -prog * PI;
  float cosA = cos(angle);
  float sinA = sin(angle);
  vec3 rotated;
  rotated.x = cyl.x;
  rotated.y = cyl.y * cosA - cyl.z * sinA;
  rotated.z = cyl.y * sinA + cyl.z * cosA;

  rotated += center;

  // Mix between flat and folded
  vec3 finalPos = mix(pos, rotated, prog);

  // === Scale ===
  finalPos *= uScale;

  vPosition = finalPos;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}
