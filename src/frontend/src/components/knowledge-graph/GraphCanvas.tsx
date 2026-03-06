import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore } from '../../stores/graphStore';

const NODE_COLORS: Record<string, string> = {
  person: '#00d4aa',
  skill: '#00bcd4',
  project: '#4dd0e1',
  language: '#00e676',
  certification: '#ffd740',
  company: '#7c4dff',
  education: '#ff6e40',
  repo: '#40c4ff',
  domain: '#ea80fc',
  tool: '#b2ff59',
};

function computeLayout(nodes: any[], edges: any[]) {
  const positions = new Map<string, { x: number; y: number; z: number }>();

  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const radius = node.type === 'person' ? 0 : 8 + Math.random() * 12;
    positions.set(node.id, {
      x: Math.cos(angle) * radius + (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 10,
      z: Math.sin(angle) * radius + (Math.random() - 0.5) * 4,
    });
  });

  for (let iter = 0; iter < 100; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const pi = positions.get(nodes[i].id)!;
        const pj = positions.get(nodes[j].id)!;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dz = pi.z - pj.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
        const force = 50 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        pi.x += fx; pi.y += fy; pi.z += fz;
        pj.x -= fx; pj.y -= fy; pj.z -= fz;
      }
    }

    for (const edge of edges) {
      const ps = positions.get(edge.source);
      const pt = positions.get(edge.target);
      if (!ps || !pt) continue;
      const dx = pt.x - ps.x;
      const dy = pt.y - ps.y;
      const dz = pt.z - ps.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
      const force = (dist - 5) * 0.02;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      ps.x += fx; ps.y += fy; ps.z += fz;
      pt.x -= fx; pt.y -= fy; pt.z -= fz;
    }

    for (const [_, pos] of positions) {
      pos.x *= 0.98;
      pos.y *= 0.98;
      pos.z *= 0.98;
    }
  }

  return positions;
}

function GraphNode({ node, position, onClick, isSelected }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const radius = 0.3 + (node.weight / 10) * 0.5;
  const color = NODE_COLORS[node.type] || '#ffffff';

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(
          hovered ? 1.3 : 1,
          hovered ? 1.3 : 1,
          hovered ? 1.3 : 1
        ),
        0.1
      );
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh>
        <sphereGeometry args={[radius * 2, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={hovered || isSelected ? 0.15 : 0.04} />
      </mesh>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(node); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.6 : 0.2}
        />
      </mesh>
      <Billboard>
        <Text
          fontSize={0.35}
          color="white"
          anchorY="bottom"
          position={[0, radius + 0.4, 0]}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {node.label}
        </Text>
      </Billboard>
    </group>
  );
}

function GraphEdge({ edge, positions }: any) {
  const sourcePos = positions.get(edge.source);
  const targetPos = positions.get(edge.target);
  if (!sourcePos || !targetPos) return null;

  const points = [
    new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z),
    new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
  ];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: '#00d4aa', transparent: true, opacity: 0.12 }))} />
  );
}

function CameraController() {
  const { camera } = useThree();
  const zoomAction = useGraphStore((s) => s._zoomAction);
  const prevTs = useRef(0);

  useEffect(() => {
    if (!zoomAction || zoomAction.ts === prevTs.current) return;
    prevTs.current = zoomAction.ts;

    if (zoomAction.type === 'in') {
      camera.position.multiplyScalar(0.8);
    } else if (zoomAction.type === 'out') {
      camera.position.multiplyScalar(1.25);
    } else if (zoomAction.type === 'reset') {
      camera.position.set(0, 0, 35);
    }
  }, [zoomAction, camera]);

  return null;
}

function Scene() {
  const { nodes, edges, selectedNode, selectNode, filterTypes } = useGraphStore();

  const filteredNodes = useMemo(() => {
    if (filterTypes.length === 0) return nodes;
    return nodes.filter((n: any) => !filterTypes.includes(n.type));
  }, [nodes, filterTypes]);

  const positions = useMemo(() => computeLayout(filteredNodes, edges), [filteredNodes, edges]);

  const handleClick = useCallback((node: any) => {
    selectNode(selectedNode?.id === node.id ? null : node);
  }, [selectedNode, selectNode]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <Stars radius={100} depth={50} count={1000} factor={2} saturation={0} fade speed={0.5} />

      <CameraController />

      {filteredNodes.map((node: any) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        return (
          <GraphNode
            key={node.id}
            node={node}
            position={pos}
            onClick={handleClick}
            isSelected={selectedNode?.id === node.id}
          />
        );
      })}

      {edges.map((edge: any) => (
        <GraphEdge key={edge.id} edge={edge} positions={positions} />
      ))}

      <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={120} />
    </>
  );
}

export default function GraphCanvas() {
  return (
    <div className="w-full h-[80vh] bg-mirage-bg rounded-lg overflow-hidden border border-mirage-border">
      <Canvas camera={{ position: [0, 0, 35], fov: 60 }} gl={{ antialias: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}
