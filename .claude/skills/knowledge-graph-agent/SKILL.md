# Knowledge Graph Agent — Three.js Interactive Visualization

## Role
You build the knowledge graph from resume + GitHub data. Gemini does the heavy extraction.
Three.js renders the interactive 3D force-directed graph.

## Input Flow
```
User uploads Resume (PDF/DOCX) + GitHub URL
         ↓
  [Backend: Resume Parser + GitHub Scraper]
         ↓ (both use Gemini for extraction)
  [Graph Service: merge data → nodes + edges]
         ↓
  [Frontend: Three.js renders interactive 3D graph]
```

## Graph Data Schema
```typescript
interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    personName: string;
    generatedAt: Date;
    sources: ('resume' | 'github')[];
  };
}

interface GraphNode {
  id: string;
  label: string;
  type: 'skill' | 'project' | 'language' | 'certification' | 'company'
      | 'education' | 'repo' | 'domain' | 'tool' | 'person';
  category: string;        // grouping for color
  weight: number;          // 1-10, affects node size
  metadata: Record<string, any>; // type-specific data
  position?: { x: number; y: number; z: number }; // computed by layout
}

interface GraphEdge {
  id: string;
  source: string;          // node ID
  target: string;          // node ID
  type: 'uses' | 'built_with' | 'skilled_at' | 'works_at' | 'studied_at'
      | 'certified_in' | 'contributes_to' | 'related_to';
  weight: number;          // affects edge thickness
  label?: string;
}
```

## Gemini Graph Generation Prompt
```
You are a knowledge graph builder. Given a person's resume and GitHub data,
generate a comprehensive knowledge graph.

RESUME DATA:
{resumeJSON}

GITHUB DATA:
{githubJSON}

Generate nodes and edges following these rules:
1. PERSON node (central, largest)
2. SKILL nodes — every technical + soft skill found, with proficiency level
3. PROJECT nodes — from both resume projects and GitHub repos
4. LANGUAGE nodes — programming languages with relative expertise
5. COMPANY nodes — past employers
6. EDUCATION nodes — institutions
7. CERTIFICATION nodes
8. DOMAIN nodes — broad areas (Web Dev, ML, Embedded, etc.)
9. TOOL nodes — specific tools (Docker, AWS, Figma, etc.)
10. REPO nodes — significant GitHub repos (>5 commits or >1 star)

Edge rules:
- Person → Company (works_at)
- Person → Education (studied_at)
- Person → Certification (certified_in)
- Person → Skill (skilled_at, weight = proficiency)
- Project → Language (built_with)
- Project → Skill (uses)
- Repo → Language (built_with)
- Skill → Domain (related_to)
- Skill → Tool (uses)

Assign weights (1-10) based on:
- Skills: frequency of mention + GitHub evidence
- Projects: complexity + recency
- Languages: lines of code + repo count

Return ONLY valid JSON: { nodes: [...], edges: [...] }
```

## Three.js Implementation

### Scene Setup (GraphCanvas.tsx)
```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

const GraphCanvas = ({ graphData }) => {
  // Use d3-force-3d for layout computation
  // Render in Three.js Canvas

  return (
    <div className="w-full h-[80vh] bg-mirage-bg rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />

        {/* Background: dark with subtle stars */}
        <StarField />

        {/* Nodes */}
        {nodes.map(node => (
          <GraphNodeMesh key={node.id} node={node} onClick={handleNodeClick} />
        ))}

        {/* Edges */}
        {edges.map(edge => (
          <GraphEdgeLine key={edge.id} edge={edge} nodes={nodePositions} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={100}
        />
      </Canvas>
    </div>
  );
};
```

### Node Rendering
```tsx
const GraphNodeMesh = ({ node, onClick }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Node size based on weight
  const radius = 0.3 + (node.weight / 10) * 0.7;

  // Color by type — devxlabs teal-dominant palette
  const colorMap = {
    person: '#00d4aa',      // teal (central)
    skill: '#00bcd4',       // cyan
    project: '#4dd0e1',     // light cyan
    language: '#00e676',    // green
    certification: '#ffd740', // amber
    company: '#7c4dff',     // purple
    education: '#ff6e40',   // deep orange
    repo: '#40c4ff',        // light blue
    domain: '#ea80fc',      // pink
    tool: '#b2ff59',        // lime
  };

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[radius * 1.5, 16, 16]} />
        <meshBasicMaterial
          color={colorMap[node.type]}
          transparent
          opacity={hovered ? 0.15 : 0.05}
        />
      </mesh>

      {/* Core sphere */}
      <mesh
        ref={meshRef}
        onClick={() => onClick(node)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={colorMap[node.type]}
          emissive={colorMap[node.type]}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>

      {/* Label */}
      <Billboard>
        <Text
          fontSize={0.4}
          color="white"
          anchorY="bottom"
          position={[0, radius + 0.3, 0]}
          font="/fonts/DMSans-Regular.woff"
        >
          {node.label}
        </Text>
      </Billboard>
    </group>
  );
};
```

### Edge Rendering with Particles
```tsx
const GraphEdgeLine = ({ edge, nodes }) => {
  // Animated particles flowing along edges
  // Line: thin, semi-transparent
  // Particle: small glowing dot traveling from source to target

  const points = [sourcePos, targetPos];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color="#00d4aa"
          transparent
          opacity={0.15}
        />
      </line>
      <FlowingParticle from={sourcePos} to={targetPos} />
    </group>
  );
};
```

### Force-Directed Layout
```typescript
// utils/graphLayout.ts
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force-3d';

export function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): LayoutResult {
  const simulation = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(-100))
    .force('link', forceLink(edges).id(d => d.id).distance(10))
    .force('center', forceCenter(0, 0, 0))
    .stop();

  // Run simulation
  for (let i = 0; i < 300; i++) simulation.tick();

  return nodes.map(n => ({
    ...n,
    position: { x: n.x, y: n.y, z: n.z }
  }));
}
```

## Node Detail Panel (on click)
Side panel slides in from right:
- Node type icon + label
- All connected nodes listed
- For repos: stars, forks, languages, description
- For skills: proficiency, projects using it
- For certs: issuer, date, verification link
- Styled with devxlabs dark theme + teal accents

## Performance
- Max 500 nodes recommended for smooth interaction
- Use LOD (Level of Detail) — distant nodes = simple dots
- Instanced meshes for large node counts
- Web Workers for force simulation computation
