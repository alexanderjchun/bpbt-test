export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uProgress;
  uniform float uGridSize;
  uniform vec3 uColor;

  varying vec2 vUv;

  // pseudo-random hash
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 gridPos = floor(vUv * uGridSize);
    float cellRandom = hash(gridPos);

    // each cell reveals at a different threshold based on its random value
    // cells with lower random values reveal first
    float cellThreshold = cellRandom;

    // smoothstep for a softer reveal edge per cell
    float reveal = smoothstep(cellThreshold - 0.1, cellThreshold + 0.05, uProgress);

    if (reveal < 0.01) {
      discard;
    }

    vec4 texColor = texture2D(uTexture, vUv);

    // blend from solid color to texture as cell reveals
    float colorMix = smoothstep(0.0, 0.6, reveal);
    vec3 finalColor = mix(uColor, texColor.rgb, colorMix);

    // fade in alpha
    float alpha = smoothstep(0.0, 0.3, reveal);

    gl_FragColor = vec4(finalColor, alpha * texColor.a);
  }
`;
