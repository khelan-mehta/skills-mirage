import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../../stores/graphStore';

const NODE_COLORS: Record<string, string> = {
  person: '#00d4aa', skill: '#00bcd4', project: '#4dd0e1', language: '#00e676',
  certification: '#ffd740', company: '#7c4dff', education: '#ff6e40',
  repo: '#40c4ff', domain: '#ea80fc', tool: '#b2ff59',
};

export default function NodeDetail() {
  const { selectedNode, edges, nodes, selectNode } = useGraphStore();

  const connectedNodes = selectedNode
    ? edges
        .filter((e: any) => e.source === selectedNode.id || e.target === selectedNode.id)
        .map((e: any) => {
          const targetId = e.source === selectedNode.id ? e.target : e.source;
          const node = nodes.find((n: any) => n.id === targetId);
          return { ...node, edgeType: e.type };
        })
        .filter(Boolean)
    : [];

  return (
    <AnimatePresence>
      {selectedNode && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="absolute top-4 right-4 w-80 max-h-[70vh] overflow-y-auto bg-mirage-bg/95 backdrop-blur border border-mirage-border rounded-lg p-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ background: NODE_COLORS[selectedNode.type] }} />
                <span className="text-xs font-mono text-white/40 uppercase">{selectedNode.type}</span>
              </div>
              <h3 className="text-lg text-white">{selectedNode.label}</h3>
            </div>
            <button
              onClick={() => selectNode(null)}
              className="text-white/30 hover:text-white text-lg"
            >
              x
            </button>
          </div>

          {/* Weight */}
          <div className="mb-4">
            <span className="text-xs text-white/40">Weight: </span>
            <span className="text-sm font-mono" style={{ color: NODE_COLORS[selectedNode.type] }}>
              {selectedNode.weight}/10
            </span>
          </div>

          {/* Metadata */}
          {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-mono text-white/40 mb-2">DETAILS</p>
              {Object.entries(selectedNode.metadata).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1 text-xs border-b border-mirage-border">
                  <span className="text-white/40">{key}</span>
                  <span className="text-white/70">{String(val)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Connections */}
          <div>
            <p className="text-xs font-mono text-white/40 mb-2">
              CONNECTIONS ({connectedNodes.length})
            </p>
            <div className="space-y-1">
              {connectedNodes.map((node: any, i: number) => (
                <button
                  key={i}
                  onClick={() => selectNode(node)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/5 transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[node.type] }} />
                  <span className="text-xs text-white/70 flex-1">{node.label}</span>
                  <span className="text-xs text-white/30">{node.edgeType}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
