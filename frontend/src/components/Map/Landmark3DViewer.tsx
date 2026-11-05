import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Landmark3DViewerProps {
  landmarkName: string;
  category: string;
  province: string;
  className?: string;
}

export const Landmark3DViewer: React.FC<Landmark3DViewerProps> = ({
  landmarkName,
  category,
  province,
  className = 'w-full h-64',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 256;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.08);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting (Warm cultural lantern & golden highlights)
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 1.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffddaa, 2.4);
    directionalLight.position.set(5, 8, 4);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    // Warm lantern point light inside pavilion
    const lanternLight = new THREE.PointLight(0xf59e0b, 3.0, 6);
    lanternLight.position.set(0, 1.5, 0);
    scene.add(lanternLight);

    // Floating golden embers / fireflies effect
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 4.5;
      particlePos[i + 1] = Math.random() * 3.5;
      particlePos[i + 2] = (Math.random() - 0.5) * 4.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.05,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 3. Circular Platform / Pedestal
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.25, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.12;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Ring accent on base
    const ringGeo = new THREE.TorusGeometry(2.45, 0.04, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x78350f,
      emissiveIntensity: 0.3,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.01;
    scene.add(ringMesh);

    // 4. Procedural 3D Model Group according to landmark type
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const lowerName = (landmarkName + ' ' + province).toLowerCase();

    if (lowerName.includes('hoàng sa') || lowerName.includes('trường sa') || lowerName.includes('lũng cú') || lowerName.includes('cà mau')) {
      // 3D SOVEREIGNTY MONUMENT / TOWER
      buildSovereigntyMonument(modelGroup);
    } else if (lowerName.includes('tháp') || lowerName.includes('mỹ sơn') || lowerName.includes('ponagar')) {
      // 3D ANCIENT CHAM TOWER
      buildChamTower(modelGroup);
    } else if (lowerName.includes('chùa') || lowerName.includes('đền') || lowerName.includes('miếu') || lowerName.includes('quốc tử giám')) {
      // 3D ANCIENT VIETNAMESE PAGODA (Curved roof, lim wood pillars)
      buildVietnamesePagoda(modelGroup);
    } else {
      // 3D IMPERIAL CITADEL / GARRISON GATE (Hoàng thành, Thành cổ)
      buildImperialCitadelGate(modelGroup);
    }

    // 5. Interactive Orbit Controls (Mouse Drag & Wheel Zoom)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationSpeedX = 0.005;
    let autoRotate = true;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      autoRotate = false;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      modelGroup.rotation.y += deltaX * rotationSpeedX;
      camera.position.y = Math.max(1.5, Math.min(5.5, camera.position.y - deltaY * 0.01));
      camera.lookAt(0, 1.2, 0);
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
      setTimeout(() => { autoRotate = true; }, 3000);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.002;
      const newZ = camera.position.z + zoomFactor;
      if (newZ >= 3.0 && newZ <= 8.5) {
        camera.position.z = newZ;
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Touch support for mobile/tablets
    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        autoRotate = false;
        touchStartX = e.touches[0].clientX;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchStartX;
        modelGroup.rotation.y += deltaX * 0.008;
        touchStartX = e.touches[0].clientX;
      }
    };
    const onTouchEnd = () => {
      setTimeout(() => { autoRotate = true; }, 3000);
    };

    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // 6. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (autoRotate) {
        modelGroup.rotation.y += delta * 0.35;
      }
      if (particleSystem) {
        particleSystem.rotation.y += delta * 0.08;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [landmarkName, category, province]);

  return (
    <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950/90 shadow-2xl">
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className={className} style={{ cursor: 'grab' }} />

      {/* Top 3D Badge */}
      <div className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-400/40 text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center space-x-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span>Mô hình 3D tương tác</span>
      </div>

      {/* Interactive Helper Hint */}
      <div className="absolute bottom-2 right-2.5 text-[10px] text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
        Kéo để xoay 360° • Cuộn để phóng to
      </div>
    </div>
  );
};

// ==========================================
// 3D Procedural Generators for Landmarks
// ==========================================

function buildVietnamesePagoda(group: THREE.Group) {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });

  // Stone base steps
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.0), stoneMat);
  step1.position.y = 0.1;
  step1.castShadow = true;
  group.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.6), stoneMat);
  step2.position.y = 0.3;
  step2.castShadow = true;
  group.add(step2);

  // Wooden Pillars (4 core columns)
  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16);
  const pos = [-0.6, 0.6];
  pos.forEach(x => {
    pos.forEach(z => {
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(x, 1.0, z);
      p.castShadow = true;
      group.add(p);
    });
  });

  // Pagoda Inner Sanctuary
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), woodMat);
  chamber.position.y = 0.95;
  chamber.castShadow = true;
  group.add(chamber);

  // Roof Tier 1 (Lower curved eave)
  const roof1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.45, 4), roofMat);
  roof1.rotation.y = Math.PI / 4;
  roof1.position.y = 1.65;
  roof1.castShadow = true;
  group.add(roof1);

  // Tier 2 Upper Pavilion
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), woodMat);
  p2.position.y = 2.0;
  group.add(p2);

  // Roof Tier 2 (Top curved eave)
  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.4, 4), roofMat);
  roof2.rotation.y = Math.PI / 4;
  roof2.position.y = 2.45;
  roof2.castShadow = true;
  group.add(roof2);

  // Golden Spire (Hồ lô đỉnh nóc)
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 0.4, 16), goldMat);
  spire.position.y = 2.75;
  group.add(spire);
}

function buildChamTower(group: THREE.Group) {
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 });

  // Main square base
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), trimMat);
  b1.position.y = 0.15;
  group.add(b1);

  // Main Body (Thân tháp gạch nung Kala)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.4), brickMat);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);

  // Doorway arch (Vòm cửa thần thoại)
  const arch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), trimMat);
  arch.position.set(0, 0.7, 0.72);
  group.add(arch);

  // Tier 1 Roof
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), trimMat);
  t1.position.y = 1.95;
  group.add(t1);

  // Tier 2 Roof
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), brickMat);
  t2.position.y = 2.4;
  group.add(t2);

  // Tier 3 Roof
  const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.65), trimMat);
  t3.position.y = 2.8;
  group.add(t3);

  // Peak Linga / Golden Finial
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), goldMat);
  finial.position.y = 3.15;
  group.add(finial);
}

function buildImperialCitadelGate(group: THREE.Group) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }); // Ngói hoàng lưu ly vàng

  // Lower Stone Fortress Rampart
  const rampart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.2), wallMat);
  rampart.position.y = 0.5;
  rampart.castShadow = true;
  group.add(rampart);

  // Central Arched Gate opening (Cổng vòm đá Thăng Long)
  const archWay = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.25, 16, 1, false, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  archWay.rotation.z = Math.PI / 2;
  archWay.rotation.y = Math.PI / 2;
  archWay.position.set(0, 0.4, 0);
  group.add(archWay);

  // Upper Pavilion (Lầu son ngắm cảnh trên cổng thành)
  const pavilion = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.8), timberMat);
  pavilion.position.y = 1.45;
  pavilion.castShadow = true;
  group.add(pavilion);

  // Imperial Roof (Mái đao cung đình thời Lê)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 4), tileMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.5, 1, 0.9);
  roof.position.y = 1.95;
  roof.castShadow = true;
  group.add(roof);

  // Decorative dragon finials on ridge
  const finialMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.8 });
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), finialMat);
  f1.position.set(0.9, 2.05, 0);
  group.add(f1);
  const f2 = f1.clone();
  f2.position.set(-0.9, 2.05, 0);
  group.add(f2);
}

function buildSovereigntyMonument(group: THREE.Group) {
  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.1 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.15 });

  // Octagonal Granite Stele Base (Bệ đài đá hoa cương)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8), graniteMat);
  base.position.y = 0.2;
  base.castShadow = true;
  group.add(base);

  // Stele Column (Thân mốc chủ quyền đá nguyên khối)
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.5), graniteMat);
  column.position.y = 1.25;
  column.castShadow = true;
  group.add(column);

  // National Emblem Plate (Quốc huy / Cờ đỏ sao vàng)
  const flagPlate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.05), redMat);
  flagPlate.position.set(0, 1.4, 0.26);
  group.add(flagPlate);

  // Golden 5-pointed Star on Plate
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), goldMat);
  star.scale.set(1.2, 1.2, 0.2);
  star.position.set(0, 1.4, 0.3);
  group.add(star);

  // Tall Mast & Red Flag (Cột cờ chủ quyền tung bay)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.6, 16), goldMat);
  mast.position.set(0, 2.6, 0);
  group.add(mast);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.02), redMat);
  flag.position.set(0.32, 3.1, 0);
  group.add(flag);

  const starTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), goldMat);
  starTop.position.set(0.32, 3.1, 0.02);
  starTop.scale.set(1, 1, 0.1);
  group.add(starTop);
}

