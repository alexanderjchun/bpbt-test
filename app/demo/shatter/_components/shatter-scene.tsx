"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Delaunay } from "d3-delaunay";
import gsap from "gsap";
import GUI from "lil-gui";

// --- Shaders ---
const vertexShader = `
  uniform float uProgress;
  uniform float uExplosionStrength;
  uniform float uRotationStrength;
  attribute vec3 aCentroid;
  attribute vec3 aRandomness;
  varying vec2 vUv;

  mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(
      oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
      0.0,                                0.0,                                0.0,                                1.0
    );
  }

  void main() {
    vUv = uv;
    float rawExplosion = 1.0 - uProgress;
    float threshold = 0.001;
    float explosionFactor = max(0.0, rawExplosion - threshold) * (1.0 / (1.0 - threshold));
    float easeFactor = pow(explosionFactor, 3.0);
    float rotationAngle = easeFactor * uRotationStrength * aRandomness.x * (aRandomness.y > 0.5 ? 1.0 : -1.0);
    mat4 rotMat = rotationMatrix(normalize(aRandomness + vec3(0.1)), rotationAngle);
    vec3 localPosition = position - aCentroid;
    vec3 rotatedLocalPosition = (rotMat * vec4(localPosition, 1.0)).xyz;
    vec3 explosionDirection = normalize(aCentroid);
    if (length(aCentroid.xy) < 0.01) explosionDirection = vec3(0.0, 0.0, 1.0);
    explosionDirection.z += (aRandomness.z - 0.5) * 3.0;
    explosionDirection = normalize(explosionDirection);
    float distanceMetric = length(aCentroid.xy);
    vec3 explosionOffset = explosionDirection * uExplosionStrength * easeFactor * (0.2 + distanceMetric + aRandomness.x);
    vec3 targetCentroid = aCentroid + explosionOffset;
    vec3 finalPosition = targetCentroid + rotatedLocalPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  varying vec2 vUv;
  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    gl_FragColor = texColor;
  }
`;

export default function ShatterScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const fileInput = fileInputRef.current;
    const sourceVideo = videoRef.current;
    if (!container || !fileInput || !sourceVideo) return;

    // --- Scene Setup ---
    let scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
      renderer: THREE.WebGLRenderer,
      controls: OrbitControls;
    let mesh: THREE.Mesh | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let gui: GUI;
    let animFrameId: number;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    // Recording
    let mediaRecorder: MediaRecorder | null = null;
    let recordedChunks: Blob[] = [];
    let isRecording = false;
    let recCtrl: ReturnType<GUI["add"]>;

    const params = {
      progress: 1.0,
      explosionStrength: 5.0,
      rotationStrength: 20.0,
      baseSplinters: 37,
      tinySplinters: 1500,
      splinterGrouping: 0.55,
      animationDuration: 5.0,
      reverse: false,
      backgroundColor: "#636363",

      loadFile: () => fileInput.click(),

      animateAssembly: () => {
        gsap.killTweensOf(params);
        const startValue = params.reverse ? 1.0 : 0.0;
        const endValue = params.reverse ? 0.0 : 1.0;
        params.progress = startValue;
        if (material) material.uniforms.uProgress.value = startValue;
        gsap.to(params, {
          progress: endValue,
          duration: params.animationDuration,
          ease: "power1.out",
          onUpdate: () => {
            if (material)
              material.uniforms.uProgress.value = params.progress;
          },
        });
      },

      toggleRecording: () => {
        if (!isRecording) {
          tryStartRecording();
        } else {
          stopAndSave();
        }
      },
      recBtnLabel: "Rec Video",
    };

    function updateBackground() {
      if (renderer) renderer.setClearColor(params.backgroundColor);
    }

    function setupTexture(texture: THREE.Texture) {
      texture.colorSpace = THREE.LinearSRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }

    function createProcessedMesh(texture: THREE.Texture) {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        material?.dispose();
      }

      let width = 800;
      let height = 600;
      const img = texture.image as
        | HTMLImageElement
        | HTMLVideoElement
        | undefined;
      if (img) {
        width =
          (img as HTMLVideoElement).videoWidth ||
          (img as HTMLImageElement).width ||
          800;
        height =
          (img as HTMLVideoElement).videoHeight ||
          (img as HTMLImageElement).height ||
          600;
      }

      const imgAspect = width / height;
      const halfH = 1.0;
      const halfW = halfH * imgAspect;
      const points: [number, number][] = [];

      for (let i = 0; i < params.baseSplinters; i++) {
        points.push([
          THREE.MathUtils.randFloat(-halfW, halfW),
          THREE.MathUtils.randFloat(-halfH, halfH),
        ]);
      }

      const impactPoints: [number, number][] = [];
      const numImpacts = Math.max(
        3,
        Math.floor(params.baseSplinters / 10),
      );
      for (let k = 0; k < numImpacts; k++) {
        impactPoints.push([
          THREE.MathUtils.randFloat(-halfW * 0.8, halfW * 0.8),
          THREE.MathUtils.randFloat(-halfH * 0.8, halfH * 0.8),
        ]);
      }

      for (let i = 0; i < params.tinySplinters; i++) {
        const impact =
          impactPoints[Math.floor(Math.random() * impactPoints.length)];
        const spread =
          (1.0 - params.splinterGrouping) * 0.8 + 0.05;
        const offsetX =
          Math.pow(Math.random(), 3) *
          spread *
          (Math.random() > 0.5 ? 1 : -1);
        const offsetY =
          Math.pow(Math.random(), 3) *
          spread *
          (Math.random() > 0.5 ? 1 : -1);
        points.push([
          THREE.MathUtils.clamp(
            impact[0] + offsetX,
            -halfW,
            halfW,
          ),
          THREE.MathUtils.clamp(
            impact[1] + offsetY,
            -halfH,
            halfH,
          ),
        ]);
      }

      const bounds: [number, number, number, number] = [
        -halfW * 1.01,
        -halfH * 1.01,
        halfW * 1.01,
        halfH * 1.01,
      ];
      const delaunay = Delaunay.from(points);
      const voronoi = delaunay.voronoi(bounds);

      const vertices: number[] = [];
      const uvs: number[] = [];
      const centroids: number[] = [];
      const randomness: number[] = [];

      const totalCells = params.baseSplinters + params.tinySplinters;
      for (let i = 0; i < totalCells; i++) {
        const polygon = voronoi.cellPolygon(i);
        if (!polygon) continue;

        let cx = 0,
          cy = 0;
        const polyPoints = polygon.length - 1;
        for (let j = 0; j < polyPoints; j++) {
          cx += polygon[j][0];
          cy += polygon[j][1];
        }
        cx /= polyPoints;
        cy /= polyPoints;
        const cz = 0.0;

        const randX = Math.random();
        const randY = Math.random();
        const randZ = Math.random();

        for (let j = 1; j < polyPoints - 1; j++) {
          vertices.push(polygon[0][0], polygon[0][1], cz);
          vertices.push(polygon[j][0], polygon[j][1], cz);
          vertices.push(polygon[j + 1][0], polygon[j + 1][1], cz);

          uvs.push(
            (polygon[0][0] + halfW) / (2 * halfW),
            (polygon[0][1] + halfH) / (2 * halfH),
          );
          uvs.push(
            (polygon[j][0] + halfW) / (2 * halfW),
            (polygon[j][1] + halfH) / (2 * halfH),
          );
          uvs.push(
            (polygon[j + 1][0] + halfW) / (2 * halfW),
            (polygon[j + 1][1] + halfH) / (2 * halfH),
          );

          for (let k = 0; k < 3; k++) {
            centroids.push(cx, cy, cz);
            randomness.push(randX, randY, randZ);
          }
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(uvs, 2),
      );
      geometry.setAttribute(
        "aCentroid",
        new THREE.Float32BufferAttribute(centroids, 3),
      );
      geometry.setAttribute(
        "aRandomness",
        new THREE.Float32BufferAttribute(randomness, 3),
      );
      geometry.computeVertexNormals();

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTexture: { value: texture },
          uProgress: { value: params.progress },
          uExplosionStrength: { value: params.explosionStrength },
          uRotationStrength: { value: params.rotationStrength },
        },
        side: THREE.DoubleSide,
        transparent: true,
      });

      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
    }

    function rebuild() {
      if (material?.uniforms.uTexture.value) {
        createProcessedMesh(material.uniforms.uTexture.value);
      }
    }

    function updateUniforms() {
      if (material) {
        material.uniforms.uExplosionStrength.value =
          params.explosionStrength;
        material.uniforms.uRotationStrength.value =
          params.rotationStrength;
        material.uniforms.uProgress.value = params.progress;
      }
    }

    // --- Recording ---
    function tryStartRecording() {
      recordedChunks = [];
      const canvas = renderer.domElement;

      let stream: MediaStream;
      try {
        stream = canvas.captureStream(60);
      } catch (e) {
        alert("Capture Stream failed: " + (e as Error).message);
        return;
      }

      const mimeTypes = [
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        "video/mp4",
        "video/webm; codecs=h264",
        "video/webm; codecs=vp9",
        "video/webm",
      ];

      let selectedMimeType = "";
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) {
        alert("Video recording not supported by this browser.");
        return;
      }

      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 25000000,
        });
      } catch (e) {
        alert("MediaRecorder init failed: " + (e as Error).message);
        return;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) recordedChunks.push(event.data);
      };
      mediaRecorder.onstop = saveVideo;
      mediaRecorder.onerror = () => {
        stopAndSave();
      };

      try {
        mediaRecorder.start();
        isRecording = true;
        recCtrl?.name("Stop and Save Video");
      } catch (e) {
        alert(
          "Could not start MediaRecorder: " + (e as Error).message,
        );
      }
    }

    function stopAndSave() {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      isRecording = false;
      recCtrl?.name("Rec Video");
    }

    function saveVideo() {
      if (recordedChunks.length === 0) return;
      const blob = new Blob(recordedChunks, {
        type: mediaRecorder!.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      const ext = mediaRecorder!.mimeType.includes("mp4")
        ? "mp4"
        : "webm";
      a.download = `shatter_effect_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }

    // --- File Handling ---
    function handleFileSelect(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file || !sourceVideo) return;

      const objectURL = URL.createObjectURL(file);

      if (file.type.startsWith("video/")) {
        sourceVideo.src = objectURL;
        sourceVideo.onloadedmetadata = () => {
          sourceVideo!.play();
          const videoTexture = new THREE.VideoTexture(sourceVideo!);
          setupTexture(videoTexture);
          createProcessedMesh(videoTexture);
          params.animateAssembly();
        };
      } else {
        sourceVideo.pause();
        sourceVideo.src = "";
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const texture = new THREE.Texture(img);
            texture.needsUpdate = true;
            setupTexture(texture);
            createProcessedMesh(texture);
            params.animateAssembly();
          };
          img.src = e.target!.result as string;
        };
        reader.readAsDataURL(file);
      }
    }

    // --- GUI ---
    function setupGUI() {
      gui = new GUI({ width: 340, autoPlace: false });
      container!.appendChild(gui.domElement);
      gui.domElement.style.position = "absolute";
      gui.domElement.style.bottom = "20px";
      gui.domElement.style.right = "20px";
      gui.domElement.style.top = "auto";

      const settingsFolder = gui.addFolder("Settings");
      settingsFolder
        .add(params, "loadFile")
        .name("Load Media (Img/Vid)");
      settingsFolder
        .addColor(params, "backgroundColor")
        .name("Background Color")
        .onChange(updateBackground);

      const sizeFolder = settingsFolder.addFolder(
        "Shard Generation (Reloads)",
      );
      sizeFolder
        .add(params, "baseSplinters", 10, 200, 1)
        .name("Large Shards")
        .onChange(rebuild);
      sizeFolder
        .add(params, "tinySplinters", 0, 2000, 50)
        .name("Tiny Splinters")
        .onChange(rebuild);
      sizeFolder
        .add(params, "splinterGrouping", 0.5, 0.99, 0.01)
        .name("Cluster Focus")
        .onChange(rebuild);

      settingsFolder
        .add(params, "explosionStrength", 1, 15)
        .name("Explosion Dist")
        .onChange(updateUniforms);
      settingsFolder
        .add(params, "rotationStrength", 1, 25)
        .name("Rotation Speed")
        .onChange(updateUniforms);

      const animFolder = gui.addFolder("Animation");
      animFolder
        .add(params, "animationDuration", 0.5, 10)
        .name("Duration (s)");
      animFolder.add(params, "reverse").name("Reverse Effect");
      animFolder
        .add(params, "animateAssembly")
        .name("PLAY Animation");
      animFolder
        .add(params, "progress", 0, 1)
        .name("Manual Progress")
        .onChange(updateUniforms)
        .listen();

      const recFolder = gui.addFolder("Video Recording");
      recCtrl = recFolder
        .add(params, "toggleRecording")
        .name(params.recBtnLabel);

      settingsFolder.open();
      animFolder.open();
      recFolder.open();
    }

    // --- Resize ---
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // --- Animate ---
    function animate() {
      animFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    // --- Init ---
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      25,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 7);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    updateBackground();
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Load default image
    const placeholderUrl =
      "https://images.unsplash.com/photo-1610642433569-fb4f62b3795f?w=1200&q=80";
    textureLoader.load(
      placeholderUrl,
      (texture) => {
        setupTexture(texture);
        createProcessedMesh(texture);
        params.animateAssembly();
      },
      undefined,
      (err) => console.error("Could not load default image", err),
    );

    setupGUI();
    fileInput.addEventListener("change", handleFileSelect);
    window.addEventListener("resize", onWindowResize);
    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", onWindowResize);
      fileInput.removeEventListener("change", handleFileSelect);
      gsap.killTweensOf(params);
      controls.dispose();
      renderer.dispose();
      if (mesh) {
        mesh.geometry.dispose();
        material?.dispose();
      }
      gui?.destroy();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="relative h-dvh w-full" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, video/mp4, video/webm, video/quicktime"
        className="hidden"
      />
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />
    </>
  );
}
