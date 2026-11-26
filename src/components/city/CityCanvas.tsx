import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import type { CityState } from "@/lib/city";

export type District = "geral" | "cidadela" | "materias" | "arena" | "revisoes" | "farol";
export const DISTRICT_POS: Record<District, [number, number, number]> = {
  geral: [0, 0, 0], cidadela: [0, 0.6, 0], materias: [-3.4, 0.6, 2.4], arena: [3.4, 0.4, 2.2], revisoes: [-3, 0.4, -2.8], farol: [4, 1, -3.4],
};

type Palette = { ground: string; rock: string; stone: string; roof: string; accent: string; leaf: string; water: string; window: string; sky: string };
const PAL: Record<"day" | "night", Palette> = {
  day: { ground: "#c9b88f", rock: "#8a7a62", stone: "#efe6d2", roof: "#2f4fb3", accent: "#c8673f", leaf: "#6f8f4e", water: "#7fa3c9", window: "#3a3a3a", sky: "#e9e1cf" },
  night: { ground: "#2c3d31", rock: "#1d2420", stone: "#5b6b62", roof: "#2b6b4a", accent: "#7dff9a", leaf: "#2f5a3c", water: "#13241c", window: "#ffd27a", sky: "#0b0f0c" },
};

function Island({ p }: { p: Palette }) {
  return <group>
    <mesh receiveShadow position={[0, -0.25, 0]}><cylinderGeometry args={[6.4, 6, 0.5, 9]} /><meshStandardMaterial color={p.ground} flatShading /></mesh>
    <mesh position={[0, -2.2, 0]}><coneGeometry args={[6, 3.6, 9]} /><meshStandardMaterial color={p.rock} flatShading /></mesh>
    <mesh position={[0, -0.02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[1.6, 1.9, 24]} /><meshStandardMaterial color={p.stone} /></mesh>
  </group>;
}

function Building({ h, w = 0.5, color, roof, win, night, pos, onClick }: { h: number; w?: number; color: string; roof: string; win: string; night: boolean; pos: [number, number, number]; onClick?: () => void }) {
  return <group position={pos} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
    <mesh castShadow position={[0, h / 2, 0]}><boxGeometry args={[w, h, w]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[0, h / 2, w / 2 + 0.005]}><planeGeometry args={[w * 0.5, h * 0.7]} /><meshStandardMaterial color={win} emissive={night ? win : "#000"} emissiveIntensity={night ? 0.9 : 0} /></mesh>
    <mesh castShadow position={[0, h + 0.18, 0]}><coneGeometry args={[w * 0.75, 0.36, 4]} /><meshStandardMaterial color={roof} flatShading /></mesh>
  </group>;
}

function Citadel({ stage, p, night, go }: { stage: number; p: Palette; night: boolean; go: () => void }) {
  const gold = stage === 4 ? "#d9b45a" : p.roof;
  return <group onClick={(e) => { e.stopPropagation(); go(); }}>
    <Building pos={[0, 0, 0]} h={0.8 + stage * 0.6} w={0.9} color={p.stone} roof={gold} win={p.window} night={night} />
    {stage >= 1 && [[-0.9, 0.9], [0.9, -0.9]].map(([x, z], i) => <Building key={i} pos={[x!, 0, z!]} h={0.7 + stage * 0.3} w={0.45} color={p.stone} roof={gold} win={p.window} night={night} />)}
    {stage >= 2 && [[0.9, 0.9], [-0.9, -0.9]].map(([x, z], i) => <Building key={i} pos={[x!, 0, z!]} h={0.6 + stage * 0.3} w={0.45} color={p.stone} roof={gold} win={p.window} night={night} />)}
    {stage >= 3 && <mesh castShadow position={[0, 0.15, 0]}><boxGeometry args={[2.3, 0.3, 2.3]} /><meshStandardMaterial color={p.stone} flatShading /></mesh>}
    {stage >= 4 && <mesh position={[0, 3.6, 0]}><octahedronGeometry args={[0.25]} /><meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.6} /></mesh>}
  </group>;
}

function Trees({ count, p, center, radius, fog }: { count: number; p: Palette; center: [number, number, number]; radius: number; fog: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const a = i * 2.399, r = radius * Math.sqrt((i + 0.5) / count), s = 0.6 + ((i * 37) % 10) / 20;
      m.compose(new THREE.Vector3(center[0] + Math.cos(a) * r, 0.3 * s, center[2] + Math.sin(a) * r), q, new THREE.Vector3(s, s, s));
      ref.current?.setMatrixAt(i, m);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [count, center, radius]);
  return <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
    <coneGeometry args={[0.22, 0.6, 6]} /><meshStandardMaterial color={fog ? "#8a8f7e" : p.leaf} flatShading />
  </instancedMesh>;
}

function Lamps({ night, p }: { night: boolean; p: Palette }) {
  const pts = useMemo(() => Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [Math.cos(a) * 5.4, Math.sin(a) * 5.4] as const; }), []);
  return <>{pts.map(([x, z], i) => <group key={i} position={[x, 0, z]}>
    <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.03, 0.03, 0.6]} /><meshStandardMaterial color={p.rock} /></mesh>
    <mesh position={[0, 0.63, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={p.window} emissive={night ? p.window : "#000"} emissiveIntensity={night ? 1.4 : 0} /></mesh>
  </group>)}</>;
}

function Particles({ night }: { night: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const a = new Float32Array(300); for (let i = 0; i < 300; i++) { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; a[i] = (v - Math.floor(v)) * 14 - 7; } g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g; }, []);
  useFrame((_, d) => { if (ref.current) ref.current.rotation.y += Math.min(d, 0.05) * 0.05; });
  return <points ref={ref} geometry={geo} position={[0, 3, 0]}><pointsMaterial size={0.06} color={night ? "#9dffb4" : "#ffffff"} transparent opacity={0.7} /></points>;
}

function Rig({ target, zoom, reduced, controls }: { target: District; zoom: number; reduced: boolean; controls: React.RefObject<OrbitImpl | null> }) {
  const { camera } = useThree();
  const goal = useRef(new THREE.Vector3());
  const moving = useRef(true);
  useEffect(() => { moving.current = true; }, [target, zoom]);
  useFrame((_, delta) => {
    const c = controls.current; if (!c || !moving.current) return;
    const t = new THREE.Vector3(...DISTRICT_POS[target]);
    const dist = (target === "geral" ? 14 : 6.5) / zoom;
    goal.current.copy(t).add(new THREE.Vector3(0.7, 0.75, 1).normalize().multiplyScalar(dist));
    const k = reduced ? 1 : 1 - Math.exp(-4 * Math.min(delta, 0.05));
    c.target.lerp(t, k); camera.position.lerp(goal.current, k); c.update();
    if (camera.position.distanceTo(goal.current) < 0.05) moving.current = false;
  });
  return null;
}

export default function CityCanvas({ state, night, particles, target, zoom, reduced, onSelect }: { state: CityState; night: boolean; particles: boolean; target: District; zoom: number; reduced: boolean; onSelect: (d: District) => void }) {
  const p = PAL[night ? "night" : "day"];
  const controls = useRef<OrbitImpl | null>(null);
  const [ready, setReady] = useState(false);
  const cols = Math.ceil(Math.sqrt(Math.max(1, state.towers.length)));
  const L = state.lighthouse.intensity;
  return <div className="h-full w-full" data-scene-ready={ready ? "" : undefined}>
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [9, 8, 11], fov: 40 }} onCreated={() => setReady(true)} onPointerMissed={() => onSelect("geral")}>
      <color attach="background" args={[p.sky]} />
      <fog attach="fog" args={[p.sky, 18, 40]} />
      <hemisphereLight args={[night ? "#3b5a48" : "#fff6e0", p.rock, night ? 0.9 : 0.8]} />
      <directionalLight castShadow position={[6, 10, 4]} intensity={night ? 0.8 : 1.6} color={night ? "#9fc7ff" : "#fff1d6"} shadow-mapSize={[1024, 1024]} />
      <Environment resolution={64}><Lightformer intensity={night ? 0.4 : 1.6} position={[0, 5, 0]} scale={[10, 10, 1]} /><Lightformer intensity={0.6} color="#8bb" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} /></Environment>
      <Island p={p} />
      <Citadel stage={state.citadel.stage} p={p} night={night} go={() => onSelect("cidadela")} />
      <group position={[DISTRICT_POS.materias[0] - (cols - 1) * 0.35, 0, DISTRICT_POS.materias[2] - (cols - 1) * 0.35]}>
        {state.towers.map((t, i) => <Building key={t.id} pos={[(i % cols) * 0.7, 0, Math.floor(i / cols) * 0.7]} h={t.height} w={0.42} color={p.stone} roof={t.mastery >= 80 ? p.accent : p.roof} win={p.window} night={night} onClick={() => onSelect("materias")} />)}
        {state.towers.length === 0 && <mesh position={[0, 0.05, 0]} onClick={() => onSelect("materias")}><boxGeometry args={[1.4, 0.1, 1.4]} /><meshStandardMaterial color={p.stone} /></mesh>}
      </group>
      <group position={[DISTRICT_POS.arena[0], 0, DISTRICT_POS.arena[2]]} onClick={(e) => { e.stopPropagation(); onSelect("arena"); }}>
        {Array.from({ length: state.arena.tier + 1 }, (_, i) => <mesh key={i} castShadow rotation-x={Math.PI / 2} position={[0, 0.1 + i * 0.18, 0]}><torusGeometry args={[1.1 + i * 0.12, 0.12, 6, 18]} /><meshStandardMaterial color={p.stone} flatShading /></mesh>)}
        <mesh position={[0, 0.4, 0]}><coneGeometry args={[0.18, 0.5, 6]} /><meshStandardMaterial color={(state.arena.accuracy ?? 0) >= 70 ? p.accent : "#d98c3a"} emissive={(state.arena.accuracy ?? 0) >= 70 ? p.accent : "#d98c3a"} emissiveIntensity={0.7} /></mesh>
      </group>
      <group onClick={(e) => { e.stopPropagation(); onSelect("revisoes"); }}>
        <Trees count={10 + Math.min(30, state.garden.reviewed * 3)} p={p} center={DISTRICT_POS.revisoes} radius={1.5} fog={state.garden.fog} />
        {state.garden.fog && <mesh position={[DISTRICT_POS.revisoes[0], 0.5, DISTRICT_POS.revisoes[2]]}><sphereGeometry args={[1.9, 16, 12]} /><meshStandardMaterial color="#d8dccf" transparent opacity={0.25} depthWrite={false} /></mesh>}
      </group>
      <group position={[DISTRICT_POS.farol[0], 0, DISTRICT_POS.farol[2]]} onClick={(e) => { e.stopPropagation(); onSelect("farol"); }}>
        <mesh castShadow position={[0, 0.9, 0]}><cylinderGeometry args={[0.18, 0.3, 1.8, 8]} /><meshStandardMaterial color={p.stone} flatShading /></mesh>
        <mesh position={[0, 1.95, 0]}><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color="#ffe08a" emissive="#ffd25a" emissiveIntensity={L * 2.5} /></mesh>
        {L > 0 && <pointLight position={[0, 2, 0]} intensity={L * 6} distance={6} color="#ffd25a" />}
      </group>
      <Trees count={24} p={p} center={[0, 0, 0]} radius={5.2} fog={false} />
      <Lamps night={night} p={p} />
      {particles && !reduced && <Particles night={night} />}
      <ContactShadows position={[0, 0.01, 0]} scale={14} blur={2.4} opacity={0.35} far={4} />
      <OrbitControls ref={controls} enablePan={false} minDistance={4} maxDistance={22} maxPolarAngle={1.25} enableDamping={!reduced} />
      <Rig target={target} zoom={zoom} reduced={reduced} controls={controls} />
    </Canvas>
  </div>;
}
