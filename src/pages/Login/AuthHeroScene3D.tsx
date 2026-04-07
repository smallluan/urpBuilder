import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type AuthHeroScene3DProps = {
  className?: string;
};

type InteractiveWidget = {
  group: THREE.Group;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  hover: number;
  hoverTarget: number;
  floatSeed: number;
  light?: THREE.PointLight;
};

const createRoundedRectShape = (width: number, height: number, radius: number) => {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
};

const createRoundedPanel = (width: number, height: number, depth: number, radius: number, material: THREE.Material) => {
  const geometry = new THREE.ExtrudeGeometry(createRoundedRectShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    curveSegments: 20,
  });
  geometry.center();
  return new THREE.Mesh(geometry, material);
};

const AuthHeroScene3D: React.FC<AuthHeroScene3DProps> = ({ className }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.18, 10.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearAlpha(0);
    mount.appendChild(renderer.domElement);

    const pmremGenerator = new PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const envRenderTarget = pmremGenerator.fromScene(roomEnvironment);
    scene.environment = envRenderTarget.texture;
    pmremGenerator.dispose();

    const getThemeColor = (token: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      return new THREE.Color(value || fallback);
    };

    const surface = getThemeColor('--td-bg-color-container', '#ffffff');
    const surfaceSecondary = getThemeColor('--td-bg-color-secondarycontainer', '#f3f5f9');
    const brand5 = getThemeColor('--td-brand-color-5', '#699ef5');
    const brand6 = getThemeColor('--td-brand-color-6', '#3d73f5');
    const brand7 = getThemeColor('--td-brand-color-7', '#2f5fd9');
    const brand8 = getThemeColor('--td-brand-color-8', '#1d4fbf');
    const success5 = getThemeColor('--td-success-color-5', '#1fbf75');
    const warning5 = getThemeColor('--td-warning-color-5', '#ed7b2f');
    scene.fog = new THREE.FogExp2(surface.clone(), 0.012);

    const ambient = new THREE.AmbientLight(surface.clone(), 1.12);
    const keyLight = new THREE.DirectionalLight(surface.clone(), 1.35);
    keyLight.position.set(4.5, 6, 5);
    const fillLight = new THREE.DirectionalLight(surfaceSecondary.clone(), 0.85);
    fillLight.position.set(-4.8, 2.2, 4.2);
    const rimLight = new THREE.DirectionalLight(brand6, 0.72);
    rimLight.position.set(2.8, 3.2, 6);
    const bounceLight = new THREE.DirectionalLight(brand7, 0.32);
    bounceLight.position.set(-3.2, -4.5, 5);
    const glassSheenLight = new THREE.PointLight(surface.clone(), 1.45, 22, 2);
    glassSheenLight.position.set(-5.2, 2.1, 7.5);
    const glassFillLight = new THREE.PointLight(brand5.clone().lerp(surface, 0.35), 0.85, 16, 2);
    glassFillLight.position.set(-2.8, -1.2, 8);
    scene.add(ambient, keyLight, fillLight, rimLight, bounceLight, glassSheenLight, glassFillLight);

    const root = new THREE.Group();
    scene.add(root);

    const pointer = new THREE.Vector2(2, 2);
    const raycaster = new THREE.Raycaster();
    const hitTargets: THREE.Object3D[] = [];
    const widgets: InteractiveWidget[] = [];
    const scanLineMeshRef: { mesh: THREE.Mesh | null } = { mesh: null };
    const meterMeshes: THREE.Mesh[] = [];
    const knobMarkMeshRef: { mesh: THREE.Mesh | null } = { mesh: null };
    const waveBars: THREE.Mesh[] = [];
    const gaugeNeedleRef: { group: THREE.Group | null } = { group: null };
    const sliderKnobRef: { mesh: THREE.Mesh | null } = { mesh: null };

    const makeGlassShell = () =>
      new THREE.MeshPhysicalMaterial({
        color: surface.clone().lerp(brand7, 0.012),
        transmission: 0.78,
        roughness: 0.035,
        metalness: 0.02,
        thickness: 0.95,
        ior: 1.52,
        transparent: true,
        opacity: 0.82,
        clearcoat: 1,
        clearcoatRoughness: 0.028,
        specularIntensity: 1.45,
        envMapIntensity: 1.55,
        iridescence: 0.08,
        iridescenceIOR: 1.18,
        iridescenceThicknessRange: [120, 280],
        attenuationColor: surfaceSecondary.clone(),
        attenuationDistance: 2.2,
        emissive: brand6,
        emissiveIntensity: 0.004,
      });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: brand6,
      emissive: brand5.clone().lerp(brand6, 0.65),
      emissiveIntensity: 0.52,
      metalness: 0.35,
      roughness: 0.22,
      envMapIntensity: 1.25,
    });

    const brandDeepMaterial = new THREE.MeshStandardMaterial({
      color: brand8,
      emissive: brand7,
      emissiveIntensity: 0.38,
      metalness: 0.28,
      roughness: 0.26,
      envMapIntensity: 1.15,
    });

    const hudDimMaterial = new THREE.MeshStandardMaterial({
      color: surfaceSecondary.clone().lerp(brand8, 0.22),
      emissive: brand7.clone().lerp(surfaceSecondary, 0.55),
      emissiveIntensity: 0.045,
      metalness: 0.18,
      roughness: 0.48,
      envMapIntensity: 0.95,
      transparent: true,
      opacity: 0.72,
    });

    const successMaterial = new THREE.MeshStandardMaterial({
      color: success5,
      emissive: success5,
      emissiveIntensity: 0.42,
      metalness: 0.22,
      roughness: 0.28,
      envMapIntensity: 1.1,
    });

    const warningMaterial = new THREE.MeshStandardMaterial({
      color: warning5,
      emissive: warning5,
      emissiveIntensity: 0.4,
      metalness: 0.22,
      roughness: 0.28,
      envMapIntensity: 1.05,
    });

    const softPanelMaterial = new THREE.MeshBasicMaterial({
      color: surface.clone().lerp(surfaceSecondary, 0.5),
      transparent: true,
      opacity: 0.14,
    });

    const glassTintMaterial = new THREE.MeshPhysicalMaterial({
      color: surface.clone().lerp(brand7, 0.14),
      transmission: 0.62,
      roughness: 0.045,
      metalness: 0.04,
      thickness: 0.62,
      ior: 1.5,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1,
      clearcoatRoughness: 0.035,
      specularIntensity: 1.25,
      envMapIntensity: 1.45,
      iridescence: 0.06,
      iridescenceIOR: 1.15,
      iridescenceThicknessRange: [100, 260],
      attenuationColor: surfaceSecondary.clone(),
      attenuationDistance: 1.6,
    });

    const scanGlowMaterial = new THREE.MeshBasicMaterial({
      color: brand5.clone().lerp(brand6, 0.45),
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const frostedTrayMaterial = () => {
      const m = glassTintMaterial.clone();
      m.transmission = 0.72;
      m.opacity = 0.52;
      m.roughness = 0.055;
      m.thickness = 0.45;
      m.envMapIntensity = 1.15;
      return m;
    };

    const createHitArea = (width: number, height: number) =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );

    const registerWidget = (group: THREE.Group, hit: THREE.Mesh, light?: THREE.PointLight) => {
      const index = widgets.length;
      hit.userData.widgetIndex = index;
      hitTargets.push(hit);
      widgets.push({
        group,
        basePosition: group.position.clone(),
        baseRotation: group.rotation.clone(),
        hover: 0,
        hoverTarget: 0,
        floatSeed: 0.5 + index * 1.16,
        light,
      });
    };

    const controlWidget = new THREE.Group();
    controlWidget.position.set(-3.55, -1.58, -2.06);
    controlWidget.scale.setScalar(1.56);
    controlWidget.rotation.set(-0.05, 0.22, -0.036);
    const panelW = 5.12;
    const panelH = 3.45;
    const controlShell = createRoundedPanel(panelW, panelH, 0.12, 0.28, makeGlassShell());
    controlWidget.add(controlShell);
    const innerPlane = new THREE.Mesh(new THREE.PlaneGeometry(panelW * 0.88, panelH * 0.76), softPanelMaterial.clone());
    innerPlane.position.z = 0.072;
    controlWidget.add(innerPlane);
    const innerSheen = new THREE.Mesh(new THREE.PlaneGeometry(panelW * 0.92, panelH * 0.8), softPanelMaterial.clone());
    innerSheen.material = (innerSheen.material as THREE.MeshBasicMaterial).clone();
    (innerSheen.material as THREE.MeshBasicMaterial).opacity = 0.06;
    innerSheen.position.z = 0.045;
    controlWidget.add(innerSheen);

    const titleRailMat = glassTintMaterial.clone();
    titleRailMat.emissive = brand6;
    titleRailMat.emissiveIntensity = 0.035;
    const titleRail = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.095, 0.042), titleRailMat);
    titleRail.position.set(0, 1.38, 0.13);
    controlWidget.add(titleRail);
    const titleAccent = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.05, 0.036),
      accentMaterial.clone(),
    );
    titleAccent.position.set(-1.08, 1.38, 0.17);
    controlWidget.add(titleAccent);

    const statusY = 1.05;
    const ledPalette: THREE.Color[] = [brand6, brand5, success5, brand6, warning5, success5, brand7];
    for (let i = 0; i < 7; i += 1) {
      const c = ledPalette[i];
      const led = new THREE.Mesh(
        new THREE.CircleGeometry(0.088, 22),
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 0.58,
          metalness: 0.32,
          roughness: 0.2,
          envMapIntensity: 1.25,
          side: THREE.DoubleSide,
        }),
      );
      led.position.set(-1.58 + i * 0.52, statusY, 0.15);
      controlWidget.add(led);
    }

    const metricsCx = 0.04;
    const metricsCy = 0.18;
    const metricsW = 2.72;
    const rowGap = 0.28;
    const metricsFrame = new THREE.Mesh(
      new THREE.BoxGeometry(metricsW + 0.2, rowGap * 4 + 0.38, 0.022),
      frostedTrayMaterial(),
    );
    metricsFrame.position.set(metricsCx, metricsCy, 0.11);
    controlWidget.add(metricsFrame);

    const metricSpecs: { ratio: number; fill: THREE.MeshStandardMaterial; cap: THREE.Color }[] = [
      { ratio: 0.9, fill: accentMaterial, cap: brand6 },
      { ratio: 0.64, fill: successMaterial, cap: success5 },
      { ratio: 0.42, fill: brandDeepMaterial, cap: brand8 },
      { ratio: 0.78, fill: warningMaterial, cap: warning5 },
    ];
    metricSpecs.forEach((spec, row) => {
      const y = metricsCy + 0.46 - row * rowGap;
      const track = new THREE.Mesh(
        new THREE.BoxGeometry(metricsW, 0.16, 0.026),
        hudDimMaterial.clone(),
      );
      track.position.set(metricsCx, y, 0.142);
      controlWidget.add(track);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.082, 0.13, 0.036),
        new THREE.MeshStandardMaterial({
          color: spec.cap,
          emissive: spec.cap,
          emissiveIntensity: 0.45,
          metalness: 0.3,
          roughness: 0.24,
        }),
      );
      cap.position.set(metricsCx - metricsW / 2 - 0.1, y, 0.15);
      controlWidget.add(cap);
      const fillW = metricsW * spec.ratio * 0.94;
      const fill = new THREE.Mesh(
        new THREE.BoxGeometry(fillW, 0.125, 0.04),
        spec.fill.clone(),
      );
      fill.position.set(metricsCx - metricsW / 2 + fillW / 2 + 0.07, y, 0.165);
      controlWidget.add(fill);
    });

    const stepY = -0.38;
    const stepOn = [true, true, true, true, false, false];
    const stepColors = [brand6, success5, brand6, success5, brand7, brand7];
    for (let s = 0; s < 6; s += 1) {
      const c = stepColors[s];
      const mat = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: stepOn[s] ? 0.5 : 0.08,
        metalness: stepOn[s] ? 0.3 : 0.2,
        roughness: stepOn[s] ? 0.22 : 0.55,
        envMapIntensity: stepOn[s] ? 1.2 : 0.6,
        transparent: true,
        opacity: stepOn[s] ? 1 : 0.55,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.086, 22), mat);
      disc.position.set(-1.12 + s * 0.44, stepY, 0.15);
      controlWidget.add(disc);
      if (stepOn[s] && s < 5) {
        const link = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.042, 0.022),
          accentMaterial.clone(),
        );
        link.position.set(-1.12 + s * 0.44 + 0.22, stepY, 0.14);
        controlWidget.add(link);
      }
    }

    const knobBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 0.11, 40),
      hudDimMaterial.clone(),
    );
    knobBase.rotation.x = Math.PI / 2;
    knobBase.position.set(-1.95, -0.82, 0.16);
    controlWidget.add(knobBase);
    const knobCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 40), glassTintMaterial.clone());
    knobCap.rotation.x = Math.PI / 2;
    knobCap.position.set(-1.95, -0.82, 0.26);
    controlWidget.add(knobCap);
    const knobMark = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.042),
      accentMaterial.clone(),
    );
    knobMark.position.set(-1.95, -0.68, 0.34);
    knobMarkMeshRef.mesh = knobMark;
    controlWidget.add(knobMark);

    const gaugePivot = new THREE.Group();
    gaugePivot.position.set(1.92, 0.62, 0.15);
    const gaugeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.028, 14, 56, Math.PI * 1.22),
      new THREE.MeshStandardMaterial({
        color: surfaceSecondary.clone().lerp(brand8, 0.55),
        metalness: 0.5,
        roughness: 0.18,
        emissive: brand6.clone().lerp(brand7, 0.5),
        emissiveIntensity: 0.22,
        envMapIntensity: 1.28,
      }),
    );
    gaugePivot.add(gaugeRing);
    const needleArm = new THREE.Group();
    const needleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.28, 0.024), accentMaterial.clone());
    needleMesh.position.y = 0.14;
    needleArm.add(needleMesh);
    gaugePivot.add(needleArm);
    gaugeNeedleRef.group = needleArm;
    controlWidget.add(gaugePivot);

    for (let m = 0; m < 3; m += 1) {
      const track = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.98, 0.055),
        hudDimMaterial.clone(),
      );
      track.position.set(1.38 + m * 0.3, -0.52, 0.14);
      controlWidget.add(track);
      const fill = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.68, 0.068),
        (m === 0 ? accentMaterial : m === 1 ? successMaterial : warningMaterial).clone(),
      );
      fill.position.set(1.38 + m * 0.3, -0.52, 0.178);
      meterMeshes.push(fill);
      controlWidget.add(fill);
    }

    const chipOffsets: [number, number, THREE.MeshStandardMaterial, THREE.Color][] = [
      [-1.95, -1.06, successMaterial, success5],
      [1.95, -1.0, warningMaterial, warning5],
    ];
    chipOffsets.forEach(([cx, cy, mat, ringColor]) => {
      const chipMat = glassTintMaterial.clone();
      chipMat.emissive = brand7;
      chipMat.emissiveIntensity = 0.04;
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.06), chipMat);
      chip.position.set(cx, cy, 0.15);
      controlWidget.add(chip);
      const dotMat = mat.clone();
      dotMat.side = THREE.DoubleSide;
      dotMat.emissiveIntensity = 0.55;
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.056, 18), dotMat);
      dot.position.set(cx - 0.22, cy + 0.12, 0.2);
      controlWidget.add(dot);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.07, 0.095, 24),
        new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        }),
      );
      ring.position.set(cx + 0.18, cy + 0.1, 0.19);
      controlWidget.add(ring);
      const microBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.055, 0.028), accentMaterial.clone());
      microBar.position.set(cx + 0.02, cy - 0.1, 0.19);
      controlWidget.add(microBar);
    });

    const sliderTrack = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.038), hudDimMaterial.clone());
    sliderTrack.position.set(-0.12, -1.32, 0.14);
    controlWidget.add(sliderTrack);
    const sliderKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.078, 24),
      glassTintMaterial.clone(),
    );
    sliderKnob.rotation.x = Math.PI / 2;
    sliderKnob.position.set(-0.12, -1.32, 0.2);
    sliderKnobRef.mesh = sliderKnob;
    controlWidget.add(sliderKnob);

    const waveY = -1.48;
    const waveCount = 28;
    const waveMats = [accentMaterial, brandDeepMaterial, successMaterial, warningMaterial];
    for (let w = 0; w < waveCount; w += 1) {
      const wm = waveMats[w % waveMats.length].clone();
      wm.emissiveIntensity = 0.48;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.24, 0.038), wm);
      const x = -1.52 + (w / (waveCount - 1)) * 3.04;
      bar.position.set(x, waveY, 0.16);
      bar.scale.y = 0.65 + (w % 5) * 0.14;
      waveBars.push(bar);
      controlWidget.add(bar);
    }

    const scanLine = new THREE.Mesh(new THREE.PlaneGeometry(4.25, 0.048), scanGlowMaterial.clone());
    scanLine.position.set(0.05, 0.06, 0.22);
    scanLineMeshRef.mesh = scanLine;
    controlWidget.add(scanLine);

    const controlLight = new THREE.PointLight(surface.clone(), 2.45, 14, 2);
    controlLight.position.set(0.45, 0.35, 2.05);
    controlWidget.add(controlLight);
    const rimFill = new THREE.PointLight(brand6, 0.72, 9, 2);
    rimFill.position.set(-2.35, 1.45, 1.25);
    controlWidget.add(rimFill);
    const faceGlint = new THREE.PointLight(brand5.clone().lerp(surface, 0.5), 1.15, 8, 2);
    faceGlint.position.set(1.85, -0.35, 1.55);
    controlWidget.add(faceGlint);
    const controlHit = createHitArea(6.4, 4.85);
    controlHit.position.z = 0.42;
    controlWidget.add(controlHit);
    registerWidget(controlWidget, controlHit, controlLight);
    root.add(controlWidget);

    let targetX = 0;
    let targetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let hoveredWidgetIndex = -1;
    let pulseWidgetIndex = -1;
    let pulseValue = 0;

    const setHoveredWidget = (index: number) => {
      hoveredWidgetIndex = index;
      widgets.forEach((widget, widgetIndex) => {
        widget.hoverTarget = widgetIndex === index ? 1 : 0;
      });
      mount.style.cursor = index >= 0 ? 'pointer' : 'default';
    };

    const updateRaycast = () => {
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(hitTargets, false);
      const widgetIndex = intersections.length ? Number(intersections[0].object.userData.widgetIndex ?? -1) : -1;
      setHoveredWidget(widgetIndex);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      targetX = x - 0.5;
      targetY = y - 0.5;
      pointer.set(x * 2 - 1, -(y * 2 - 1));
      updateRaycast();
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      pointer.set(2, 2);
      setHoveredWidget(-1);
    };

    const onPointerDown = () => {
      if (hoveredWidgetIndex >= 0) {
        pulseWidgetIndex = hoveredWidgetIndex;
        pulseValue = 1;
      }
    };

    const resize = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 980 ? 12.95 : 11.65;
      camera.position.y = width < 980 ? 0.05 : 0.12;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener('resize', resize);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerleave', onPointerLeave);
    mount.addEventListener('pointerdown', onPointerDown);

    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;

      root.rotation.y = pointerX * 0.04;
      root.rotation.x = -pointerY * 0.02;
      root.position.x = pointerX * 0.08;
      root.position.y = pointerY * 0.05;

      widgets.forEach((widget, index) => {
        widget.hover += (widget.hoverTarget - widget.hover) * 0.08;
        const pulse = index === pulseWidgetIndex ? pulseValue : 0;
        const bob = Math.sin(elapsed * 0.58 + widget.floatSeed * 1.4) * 0.14;
        widget.group.position.x = widget.basePosition.x + Math.sin(elapsed * 0.18 + widget.floatSeed) * 0.02 + pointerX * 0.05;
        widget.group.position.y =
          widget.basePosition.y + bob + widget.hover * 0.07 + pulse * 0.045 - pointerY * 0.035;
        widget.group.rotation.x = widget.baseRotation.x + pointerY * 0.035 + Math.sin(elapsed * 0.14 + widget.floatSeed) * 0.01;
        widget.group.rotation.y = widget.baseRotation.y + pointerX * 0.05 + Math.cos(elapsed * 0.12 + widget.floatSeed) * 0.012;
        widget.group.rotation.z = widget.baseRotation.z + Math.sin(elapsed * 0.16 + widget.floatSeed) * 0.008;
        widget.group.scale.setScalar(1 + widget.hover * 0.022 + pulse * 0.022);
        if (widget.light) {
          widget.light.intensity = 2.35 + widget.hover * 0.6 + pulse * 0.55;
        }
      });

      if (scanLineMeshRef.mesh) {
        scanLineMeshRef.mesh.position.y = Math.sin(elapsed * 1.25) * 0.62;
      }
      if (knobMarkMeshRef.mesh) {
        knobMarkMeshRef.mesh.rotation.z = elapsed * 0.42;
      }
      meterMeshes.forEach((fill, index) => {
        const wave = 0.92 + Math.sin(elapsed * 1.05 + index * 0.65) * 0.14;
        fill.scale.y = wave;
      });

      if (gaugeNeedleRef.group) {
        gaugeNeedleRef.group.rotation.z = Math.sin(elapsed * 0.72) * 0.62;
      }
      if (sliderKnobRef.mesh) {
        sliderKnobRef.mesh.position.x = -0.12 + Math.sin(elapsed * 0.55) * 0.58;
      }
      waveBars.forEach((bar, index) => {
        bar.scale.y = 0.45 + Math.abs(Math.sin(elapsed * 1.85 + index * 0.31)) * 0.95;
      });

      if (pulseValue > 0.001) {
        pulseValue *= 0.9;
      } else {
        pulseValue = 0;
        pulseWidgetIndex = -1;
      }

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerleave', onPointerLeave);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.style.cursor = 'default';
      scene.remove(glassSheenLight, glassFillLight);
      scene.environment = null;
      envRenderTarget.dispose();
      root.traverse((object: THREE.Object3D) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material: THREE.Material) => material.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className={className} ref={mountRef} />;
};

export default AuthHeroScene3D;
