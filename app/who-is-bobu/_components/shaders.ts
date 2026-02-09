export const vertexShader = /* glsl */ `
  attribute vec2 aGridPos;
  attribute vec3 aScatterPos;
  attribute vec4 aColor;
  attribute float aRandom;

  uniform float uProgress;
  uniform int uEffect;
  uniform float uPixelSize;

  varying vec4 vColor;

  float easeOutCubic(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
  }

  void main() {
    vColor = aColor;

    // per-pixel stagger: offset progress by random value
    float stagger = 0.3;
    float localProgress = clamp((uProgress - aRandom * stagger) / (1.0 - stagger), 0.0, 1.0);
    float easedProgress = easeOutCubic(localProgress);

    vec3 pos = vec3(0.0);

    if (uEffect == 0) {
      // assemble: scatter -> grid
      pos = mix(aScatterPos, vec3(aGridPos, 0.0), easedProgress);
    } else if (uEffect == 1) {
      // scatter: grid -> scatter
      pos = mix(vec3(aGridPos, 0.0), aScatterPos, easedProgress);
    } else if (uEffect == 2) {
      // morph: hold at grid pos
      pos = vec3(aGridPos, 0.0);
    } else {
      // hold
      pos = vec3(aGridPos, 0.0);
    }

    // offset from instance center (unit square corners)
    vec3 vertexPos = pos + position * uPixelSize;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPos, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  varying vec4 vColor;

  void main() {
    if (vColor.a < 0.01) discard;
    gl_FragColor = vColor;
  }
`;
