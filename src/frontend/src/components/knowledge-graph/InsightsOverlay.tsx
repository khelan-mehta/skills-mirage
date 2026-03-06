import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGraphStore } from '../../stores/graphStore';

interface GraphInsight {
  category: string;
  text: string;
  action?: string;
}

function computeInsights(nodes: any[], edges: any[]): GraphInsight[] {
  const insights: GraphInsight[] = [];
  const skills = nodes.filter((n: any) => n.type === 'skill');
  const repos = nodes.filter((n: any) => n.type === 'repo');
  const languages = nodes.filter((n: any) => n.type === 'language');
  const tools = nodes.filter((n: any) => n.type === 'tool');
  const domains = nodes.filter((n: any) => n.type === 'domain');
  const certs = nodes.filter((n: any) => n.type === 'certification');

  // Core Strength
  if (skills.length > 0) {
    const top = [...skills].sort((a, b) => b.weight - a.weight)[0];
    insights.push({
      category: 'CORE STRENGTH',
      text: `${top.label} is your highest-weighted skill (${top.weight}/10)`,
      action: 'Leverage this in job applications',
    });
  }

  // Tech Stack
  if (languages.length > 0) {
    const langNames = languages
      .sort((a: any, b: any) => b.weight - a.weight)
      .map((l: any) => l.label)
      .slice(0, 3)
      .join(', ');
    insights.push({
      category: 'TECH STACK',
      text: `${languages.length} language${languages.length > 1 ? 's' : ''} detected: ${langNames}${languages.length > 3 ? '...' : ''}`,
      action: languages.length < 3 ? 'Consider learning a complementary language' : undefined,
    });
  }

  // Portfolio
  if (repos.length > 0) {
    insights.push({
      category: 'PORTFOLIO',
      text: `${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'} analyzed from your GitHub`,
      action: 'Pin your best repos for recruiter visibility',
    });
  }

  // Growth Opportunity — skills with many connections but low weight
  if (skills.length > 2) {
    const skillConnections = skills.map((s: any) => ({
      ...s,
      connections: edges.filter((e: any) => e.source === s.id || e.target === s.id).length,
    }));
    const emerging = skillConnections
      .filter((s: any) => s.weight <= 5 && s.connections >= 2)
      .sort((a: any, b: any) => b.connections - a.connections)[0];
    if (emerging) {
      insights.push({
        category: 'GROWTH AREA',
        text: `${emerging.label} has ${emerging.connections} connections but weight ${emerging.weight}/10`,
        action: 'Invest here for maximum career impact',
      });
    }
  }

  // Domain Focus
  if (domains.length > 0) {
    const topDomain = [...domains].sort((a, b) => b.weight - a.weight)[0];
    insights.push({
      category: 'DOMAIN',
      text: `Primary focus: ${topDomain.label}`,
      action: domains.length > 1 ? `Also active in ${domains.length - 1} other domain(s)` : undefined,
    });
  }

  // Tooling
  if (tools.length > 0) {
    const toolNames = tools
      .sort((a: any, b: any) => b.weight - a.weight)
      .map((t: any) => t.label)
      .slice(0, 4)
      .join(', ');
    insights.push({
      category: 'TOOLING',
      text: `Key tools: ${toolNames}`,
    });
  }

  // Certifications
  if (certs.length > 0) {
    insights.push({
      category: 'CREDENTIALS',
      text: `${certs.length} certification${certs.length > 1 ? 's' : ''} on record`,
      action: 'Highlight these in your LinkedIn profile',
    });
  }

  return insights.slice(0, 5);
}

export default function InsightsOverlay() {
  const { nodes, edges, selectedNode } = useGraphStore();
  const insights = useMemo(() => computeInsights(nodes, edges), [nodes, edges]);

  if (insights.length === 0 || selectedNode) return null;

  return (
    <div className="absolute top-20 right-4 w-60 space-y-2.5 z-10 pointer-events-none">
      {insights.map((insight, i) => (
        <motion.div
          key={insight.category}
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: 1,
            x: 0,
            y: [0, -3, 0],
          }}
          transition={{
            opacity: { delay: 0.8 + i * 0.15, duration: 0.4 },
            x: { delay: 0.8 + i * 0.15, duration: 0.4 },
            y: { duration: 3.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 },
          }}
          className="pointer-events-auto"
        >
          <div className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-mirage-teal/15 rounded-lg px-3.5 py-2.5 hover:border-mirage-teal/30 transition-colors">
            <p className="text-[10px] font-mono text-mirage-teal/50 tracking-widest">
              [ {insight.category} ]
            </p>
            <p className="text-[11px] text-white/75 mt-1 leading-relaxed">
              {insight.text}
            </p>
            {insight.action && (
              <p className="text-[10px] text-mirage-teal/70 mt-1.5 leading-snug">
                {insight.action}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
