import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type PerformanceTier = 'high' | 'balanced' | 'low';

interface Premium3DBackgroundProps {
  performanceOverride?: 'auto' | PerformanceTier;
}

interface DeviceCapabilities {
  tier: PerformanceTier;
  webglAvailable: boolean;
  isSoftwareGl: boolean;
  maxDpr: number;
}

function detectCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { tier: 'low', webglAvailable: false, isSoftwareGl: true, maxDpr: 1 };
  }

  let webglAvailable = false;
  let isSoftwareGl = false;

  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);

    if (gl) {
      webglAvailable = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const rendererStr = String(gl.getParameter(param) ?? '');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
        rendererStr
      );
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webglAvailable = false;
    isSoftwareGl = true;
  }

  if (!webglAvailable) {
    return {
      tier: 'low',
      webglAvailable: false,
      isSoftwareGl: true,
      maxDpr: 1,
    };
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memoryGb = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;
  const cores =
    typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 8;

  if (memoryGb <= 2 || cores <= 2) {
    return { tier: 'low', webglAvailable: true, isSoftwareGl, maxDpr: 1 };
  }

  if (isSoftwareGl || memoryGb <= 4 || cores <= 4) {
    return {
      tier: 'balanced',
      webglAvailable: true,
      isSoftwareGl,
      maxDpr: isSoftwareGl ? 1 : 1.25,
    };
  }

  return {
    tier: 'high',
    webglAvailable: true,
    isSoftwareGl: false,
    maxDpr: 1.5,
  };
}

function createParticleGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255, 245, 214, 1)');
    grad.addColorStop(0.28, 'rgba(229, 212, 165, 0.85)');
    grad.addColorStop(0.6, 'rgba(199, 164, 90, 0.25)');
    grad.addColorStop(1, 'rgba(199, 164, 90, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface FloatingSculpture {
  group: THREE.Group;
  basePos: THREE.Vector3;
  floatAmpY: number;
  floatAmpX: number;
  floatSpeed: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
  phase: number;
}

interface RibbonRig {
  mesh: THREE.Mesh;
  baseRotX: number;
  baseRotY: number;
  baseRotZ: number;
  swaySpeed: number;
  phase: number;
}

export function Premium3DBackground({
  performanceOverride = 'auto',
}: Premium3DBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [capabilities] = useState<DeviceCapabilities>(() =>
    detectCapabilities()
  );

  const effectiveTier: PerformanceTier =
    !capabilities.webglAvailable
      ? 'low'
      : performanceOverride === 'auto'
      ? capabilities.tier
      : performanceOverride;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (effectiveTier === 'low' || !capabilities.webglAvailable) {
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const isHigh = effectiveTier === 'high';
    const isSoftwareGl = capabilities.isSoftwareGl;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071812');
    scene.fog = new THREE.FogExp2('#071812', 0.042);

    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 0.2, 11.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: isHigh ? 'high-performance' : 'low-power',
      });
    } catch {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, capabilities.maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const disposables: Array<{ dispose: () => void }> = [];

    // Procedural Studio Environment Map for rich gold & emerald glass highlights
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();
    disposables.push(envTarget);

    // Atmospheric Lighting Rig (Emerald, Teal & Warm Champagne Rim)
    const hemiLight = new THREE.HemisphereLight('#2C8263', '#05120D', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF0CC', isHigh ? 2.1 : 1.75);
    keyLight.position.set(7, 8, 9);
    scene.add(keyLight);

    const tealFill = new THREE.DirectionalLight('#1D7A63', 1.25);
    tealFill.position.set(-8, -3, 5);
    scene.add(tealFill);

    const goldRim = new THREE.DirectionalLight('#D9B464', isHigh ? 1.8 : 1.3);
    goldRim.position.set(-3, 6, -8);
    scene.add(goldRim);

    if (isHigh) {
      const emeraldGlowLight = new THREE.PointLight('#1C8A61', 6, 22, 1.5);
      emeraldGlowLight.position.set(2.5, -1.5, -2.5);
      scene.add(emeraldGlowLight);
    }

    // Shared Luxury Materials
    const emeraldGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#156146'),
      emissive: new THREE.Color('#07291D'),
      emissiveIntensity: 0.45,
      metalness: 0.08,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.54,
      reflectivity: 0.9,
      envMapIntensity: 1.35,
      transparent: true,
      opacity: isHigh && !isSoftwareGl ? 0.88 : 0.72,
      transmission: isHigh && !isSoftwareGl ? 0.42 : 0,
      thickness: 1.4,
      attenuationColor: new THREE.Color('#0B3B2B'),
      attenuationDistance: 2.8,
    });
    disposables.push(emeraldGlassMat);

    const darkEmeraldCoreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0C3325'),
      metalness: 0.35,
      roughness: 0.28,
      envMapIntensity: 1.0,
    });
    disposables.push(darkEmeraldCoreMat);

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#C7A45A'),
      emissive: new THREE.Color('#3D2E0E'),
      emissiveIntensity: 0.18,
      metalness: 0.92,
      roughness: 0.22,
      envMapIntensity: 1.45,
    });
    disposables.push(brushedGoldMat);

    const champagneGoldMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E5D4A5'),
      emissive: new THREE.Color('#4B3A15'),
      emissiveIntensity: 0.22,
      metalness: 0.9,
      roughness: 0.18,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 0.86,
    });
    disposables.push(champagneGoldMat);

    // =========================================================================
    // A. Floating 3D Composite Emerald Glass & Metallic Gold Sculptures
    // =========================================================================
    const sculptures: FloatingSculpture[] = [];

    const crystalGeo = new THREE.IcosahedronGeometry(1.15, isHigh ? 2 : 1);
    const torusLensGeo = new THREE.TorusGeometry(1.25, 0.34, 24, isHigh ? 64 : 40);
    const roundedCollarGeo = new THREE.TorusGeometry(1.42, 0.032, 12, isHigh ? 64 : 40);
    const innerRingGeo = new THREE.TorusGeometry(0.86, 0.025, 10, 48);
    const coreGemGeo = new THREE.OctahedronGeometry(0.55, 1);
    const capsulePillarGeo = new THREE.CapsuleGeometry(0.58, 1.35, 12, 24);
    const capsuleBandGeo = new THREE.TorusGeometry(0.64, 0.028, 10, 40);

    disposables.push(
      crystalGeo,
      torusLensGeo,
      roundedCollarGeo,
      innerRingGeo,
      coreGemGeo,
      capsulePillarGeo,
      capsuleBandGeo
    );

    const buildSculpture = (variant: 'prism' | 'torus' | 'capsule') => {
      const group = new THREE.Group();

      if (variant === 'prism') {
        const outer = new THREE.Mesh(crystalGeo, emeraldGlassMat);
        const core = new THREE.Mesh(coreGemGeo, darkEmeraldCoreMat);
        const rimA = new THREE.Mesh(roundedCollarGeo, brushedGoldMat);
        rimA.rotation.x = Math.PI * 0.36;
        const rimB = new THREE.Mesh(innerRingGeo, champagneGoldMat);
        rimB.rotation.y = Math.PI * 0.42;
        group.add(outer, core, rimA, rimB);
      } else if (variant === 'torus') {
        const body = new THREE.Mesh(torusLensGeo, emeraldGlassMat);
        const goldHalo = new THREE.Mesh(roundedCollarGeo, brushedGoldMat);
        goldHalo.scale.setScalar(1.12);
        const core = new THREE.Mesh(coreGemGeo, champagneGoldMat);
        core.scale.setScalar(0.75);
        group.add(body, goldHalo, core);
      } else {
        const body = new THREE.Mesh(capsulePillarGeo, emeraldGlassMat);
        const bandTop = new THREE.Mesh(capsuleBandGeo, brushedGoldMat);
        bandTop.rotation.x = Math.PI / 2;
        bandTop.position.y = 0.48;
        const bandBot = new THREE.Mesh(capsuleBandGeo, brushedGoldMat);
        bandBot.rotation.x = Math.PI / 2;
        bandBot.position.y = -0.48;
        const core = new THREE.Mesh(coreGemGeo, darkEmeraldCoreMat);
        core.scale.set(0.6, 1.2, 0.6);
        group.add(body, bandTop, bandBot, core);
      }

      return group;
    };

    const sculptureSpecs: Array<{
      variant: 'prism' | 'torus' | 'capsule';
      pos: [number, number, number];
      scale: number;
      floatAmpY: number;
      floatAmpX: number;
      floatSpeed: number;
      rot: [number, number, number];
      phase: number;
    }> = isHigh
      ? [
          {
            variant: 'torus',
            pos: [-5.4, 2.3, -2.8],
            scale: 1.08,
            floatAmpY: 0.34,
            floatAmpX: 0.16,
            floatSpeed: 0.24,
            rot: [0.06, 0.09, 0.03],
            phase: 0.2,
          },
          {
            variant: 'prism',
            pos: [5.6, -2.0, -3.5],
            scale: 1.15,
            floatAmpY: 0.38,
            floatAmpX: 0.2,
            floatSpeed: 0.2,
            rot: [0.05, -0.08, 0.04],
            phase: 1.8,
          },
          {
            variant: 'capsule',
            pos: [-4.6, -2.9, -5.6],
            scale: 0.92,
            floatAmpY: 0.28,
            floatAmpX: 0.14,
            floatSpeed: 0.27,
            rot: [-0.04, 0.07, 0.05],
            phase: 3.1,
          },
          {
            variant: 'prism',
            pos: [4.2, 3.1, -6.8],
            scale: 0.85,
            floatAmpY: 0.25,
            floatAmpX: 0.15,
            floatSpeed: 0.18,
            rot: [0.04, 0.06, -0.03],
            phase: 4.4,
          },
          {
            variant: 'torus',
            pos: [0.4, 0.2, -9.2],
            scale: 1.4,
            floatAmpY: 0.22,
            floatAmpX: 0.12,
            floatSpeed: 0.15,
            rot: [0.03, -0.05, 0.02],
            phase: 5.5,
          },
        ]
      : [
          {
            variant: 'torus',
            pos: [-5.1, 2.2, -3.2],
            scale: 1.0,
            floatAmpY: 0.3,
            floatAmpX: 0.14,
            floatSpeed: 0.22,
            rot: [0.05, 0.08, 0.02],
            phase: 0.3,
          },
          {
            variant: 'prism',
            pos: [5.2, -1.9, -4.0],
            scale: 1.05,
            floatAmpY: 0.32,
            floatAmpX: 0.16,
            floatSpeed: 0.19,
            rot: [0.04, -0.07, 0.03],
            phase: 2.1,
          },
          {
            variant: 'capsule',
            pos: [-1.2, -2.5, -7.2],
            scale: 0.9,
            floatAmpY: 0.22,
            floatAmpX: 0.12,
            floatSpeed: 0.16,
            rot: [-0.03, 0.06, 0.04],
            phase: 4.0,
          },
        ];

    for (const spec of sculptureSpecs) {
      const group = buildSculpture(spec.variant);
      group.position.set(...spec.pos);
      group.scale.setScalar(spec.scale);
      group.rotation.set(spec.phase * 0.4, spec.phase * 0.7, spec.phase * 0.2);
      scene.add(group);
      sculptures.push({
        group,
        basePos: new THREE.Vector3(...spec.pos),
        floatAmpY: spec.floatAmpY,
        floatAmpX: spec.floatAmpX,
        floatSpeed: spec.floatSpeed,
        rotSpeedX: spec.rot[0],
        rotSpeedY: spec.rot[1],
        rotSpeedZ: spec.rot[2],
        phase: spec.phase,
      });
    }

    // =========================================================================
    // B. Premium Flowing Metallic-Gold Light Ribbons
    // =========================================================================
    const ribbons: RibbonRig[] = [];

    const createRibbon = (
      points: THREE.Vector3[],
      radius: number,
      mat: THREE.Material,
      swaySpeed: number,
      phase: number
    ) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(
        curve,
        isHigh ? 72 : 44,
        radius,
        10,
        false
      );
      // Flatten slightly into a sleek ribbon profile
      tubeGeo.scale(1, 0.34, 1);
      disposables.push(tubeGeo);
      const mesh = new THREE.Mesh(tubeGeo, mat);
      scene.add(mesh);
      ribbons.push({
        mesh,
        baseRotX: mesh.rotation.x,
        baseRotY: mesh.rotation.y,
        baseRotZ: mesh.rotation.z,
        swaySpeed,
        phase,
      });
    };

    createRibbon(
      [
        new THREE.Vector3(-12, -3.6, -5.5),
        new THREE.Vector3(-4.5, -0.8, -4.2),
        new THREE.Vector3(2.2, 1.4, -5.0),
        new THREE.Vector3(11.5, 3.8, -7.0),
      ],
      0.085,
      champagneGoldMat,
      0.16,
      0.4
    );

    createRibbon(
      [
        new THREE.Vector3(-11, 3.9, -7.8),
        new THREE.Vector3(-3.0, 1.9, -6.2),
        new THREE.Vector3(4.0, -1.6, -6.0),
        new THREE.Vector3(12.0, -3.4, -8.5),
      ],
      0.065,
      brushedGoldMat,
      0.13,
      2.2
    );

    if (isHigh) {
      createRibbon(
        [
          new THREE.Vector3(-9.5, -1.2, -9.0),
          new THREE.Vector3(-1.5, 2.8, -8.2),
          new THREE.Vector3(5.5, 0.4, -8.5),
          new THREE.Vector3(11.0, 2.6, -10.5),
        ],
        0.055,
        champagneGoldMat,
        0.11,
        4.1
      );
    }

    // =========================================================================
    // C. Restrained Ambient Champagne-Gold Particles
    // =========================================================================
    const particleCount = isHigh ? 56 : 26;
    const particleTexture = createParticleGlowTexture();
    disposables.push(particleTexture);

    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleBase = new Float32Array(particleCount * 3);
    const particlePhases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Deterministic golden-ratio spiral dispersion (clean, organic, non-clumpy)
      const t = (i + 0.5) / particleCount;
      const angle = i * 2.3999632;
      const spreadX = Math.cos(angle) * (3.5 + t * 8.5);
      const spreadY = Math.sin(angle * 1.3) * (2.2 + (1 - t) * 4.2);
      const depthZ = -1.5 - t * 9.5;

      particlePositions[i * 3] = spreadX;
      particlePositions[i * 3 + 1] = spreadY;
      particlePositions[i * 3 + 2] = depthZ;

      particleBase[i * 3] = spreadX;
      particleBase[i * 3 + 1] = spreadY;
      particleBase[i * 3 + 2] = depthZ;

      particlePhases[i] = i * 0.73;
    }

    const posAttr = new THREE.BufferAttribute(particlePositions, 3);
    particleGeo.setAttribute('position', posAttr);
    disposables.push(particleGeo);

    const particleMat = new THREE.PointsMaterial({
      size: isHigh ? 0.26 : 0.22,
      map: particleTexture,
      color: new THREE.Color('#E5D4A5'),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    disposables.push(particleMat);

    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);

    // Pre-warm shaders once on real GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Subtle pointer parallax targets (never intercepts events; listens passively on window)
    const pointerTarget = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };

    const handlePointerMove = (e: PointerEvent) => {
      if (reducedMotion) return;
      const nx = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      const ny = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
      pointerTarget.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointerTarget.y = THREE.MathUtils.clamp(ny, -1, 1);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Resize handling
    const handleResize = () => {
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, capabilities.maxDpr)
      );
      renderer.setSize(w, h);
      if (reducedMotion) {
        renderer.render(scene, camera);
      }
    };
    window.addEventListener('resize', handleResize);

    // Animation loop state
    let frameId = 0;
    let isDisposed = false;
    let elapsed = 0;
    let lastTime = performance.now();

    const advanceScene = (delta: number, timeSec: number) => {
      // Gentle camera drift + smooth pointer parallax
      pointerCurrent.x = THREE.MathUtils.damp(
        pointerCurrent.x,
        pointerTarget.x,
        2.5,
        delta
      );
      pointerCurrent.y = THREE.MathUtils.damp(
        pointerCurrent.y,
        pointerTarget.y,
        2.5,
        delta
      );

      camera.position.x =
        Math.sin(timeSec * 0.11) * 0.35 + pointerCurrent.x * 0.42;
      camera.position.y =
        0.2 + Math.cos(timeSec * 0.09) * 0.22 - pointerCurrent.y * 0.28;
      camera.lookAt(0, 0, -4.5);

      // Independent floating sculptures
      for (let i = 0; i < sculptures.length; i++) {
        const s = sculptures[i];
        const t = timeSec * s.floatSpeed + s.phase;
        s.group.position.x = s.basePos.x + Math.sin(t * 0.85) * s.floatAmpX;
        s.group.position.y = s.basePos.y + Math.sin(t) * s.floatAmpY;
        s.group.rotation.x += s.rotSpeedX * delta;
        s.group.rotation.y += s.rotSpeedY * delta;
        s.group.rotation.z += s.rotSpeedZ * delta;
      }

      // Calm organic sway on golden ribbons
      for (let i = 0; i < ribbons.length; i++) {
        const r = ribbons[i];
        const t = timeSec * r.swaySpeed + r.phase;
        r.mesh.rotation.x = r.baseRotX + Math.sin(t) * 0.06;
        r.mesh.rotation.y = r.baseRotY + Math.cos(t * 0.8) * 0.05;
        r.mesh.position.y = Math.sin(t * 0.7) * 0.22;
      }

      // Gentle ambient particle drift
      for (let i = 0; i < particleCount; i++) {
        const p = particlePhases[i];
        const idx = i * 3;
        particlePositions[idx] =
          particleBase[idx] + Math.sin(timeSec * 0.22 + p) * 0.24;
        particlePositions[idx + 1] =
          particleBase[idx + 1] + Math.cos(timeSec * 0.18 + p * 1.3) * 0.32;
      }
      posAttr.needsUpdate = true;
      particleMat.opacity = 0.62 + Math.sin(timeSec * 0.45) * 0.12;
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const status = sync
            ? gl.getSyncParameter(sync, gl.SYNC_STATUS)
            : gl.SIGNALED;
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (isDisposed || document.hidden || reducedMotion) return;

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsed += delta;

      advanceScene(delta, elapsed);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    // Initial render
    advanceScene(0.016, 0);
    renderer.render(scene, camera);

    if (!reducedMotion && !document.hidden) {
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    const handleVisibilityChange = () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      if (!document.hidden && !reducedMotion && !isDisposed) {
        lastTime = performance.now();
        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = window.requestAnimationFrame(tick);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      for (const item of disposables) {
        item.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [effectiveTier, capabilities.webglAvailable, capabilities.isSoftwareGl, capabilities.maxDpr, reducedMotion]);

  return (
    <div
      className="sfs-ambient-bg fixed inset-0 z-0 pointer-events-none overflow-hidden"
      data-tier={effectiveTier}
      aria-hidden="true"
    >
      {/* Layered Emerald CSS Base + Fallback Atmosphere (always active under WebGL or standalone in LOW/No-WebGL) */}
      <div
        className={`sfs-fallback-atmosphere absolute inset-0 ${
          effectiveTier === 'low' && !reducedMotion
            ? 'sfs-fallback-animated'
            : ''
        }`}
      />

      {/* WebGL Canvas Mount */}
      {effectiveTier !== 'low' && capabilities.webglAvailable && (
        <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      )}

      {/* Soft cinematic edge vignette keeping foreground content calm and legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(11, 36, 28, 0.12) 0%, rgba(7, 24, 18, 0.58) 100%)',
        }}
      />
    </div>
  );
}
