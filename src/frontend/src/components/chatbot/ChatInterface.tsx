import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import api from '../../utils/api';

interface RAGSource {
  source: string;
  chunkType: string;
  summary: string;
  repoName?: string | null;
  score: number;
}

interface MatchedJob {
  _id: string;
  title: string;
  company: string;
  city: string;
  skills: string[];
  salary?: { min: number; max: number };
  sourceUrl?: string;
  source?: string;
  matchPercent: number;
}

interface MarketInsights {
  hiringTrend: string;
  aiMentionRate: number;
  activeJobCount: number;
  risingSkills: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: 'en' | 'hi';
  timestamp: Date;
  ragSources?: RAGSource[];
  matchedJobs?: MatchedJob[];
  marketInsights?: MarketInsights;
}

const QUICK_ACTIONS = [
  { label: 'Why is my risk score high?' },
  { label: 'What jobs are safer for me?' },
  { label: 'Paths under 3 months' },
  { label: 'How many jobs in my city?' },
  { label: '\u092E\u0941\u091D\u0947 \u0915\u094D\u092F\u093E \u0915\u0930\u0928\u093E \u091A\u093E\u0939\u093F\u090F?' },
];

interface ChatInterfaceProps {
  workerId: string;
  compact?: boolean;
}

function formatSalary(salary?: { min: number; max: number }) {
  if (!salary || (!salary.min && !salary.max)) return null;
  const fmt = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
  };
  if (salary.min && salary.max) return `${fmt(salary.min)} - ${fmt(salary.max)}`;
  if (salary.max) return `Up to ${fmt(salary.max)}`;
  return `From ${fmt(salary.min)}`;
}

function trendColor(trend: string) {
  if (trend === 'stable') return 'text-emerald-400 border-emerald-400/30';
  if (trend === 'declining') return 'text-amber-400 border-amber-400/30';
  return 'text-red-400 border-red-400/30';
}

function sourceIcon(source: string) {
  return source === 'github' ? 'GH' : 'CV';
}

function chunkLabel(chunkType: string) {
  const labels: Record<string, string> = {
    repo_overview: 'Repo Overview',
    readme_section: 'README',
    code_block: 'Code',
    dependency_analysis: 'Dependencies',
    resume_summary: 'Resume',
    work_experience: 'Work Exp',
    education: 'Education',
    project: 'Project',
    skill_evidence: 'Certification',
  };
  return labels[chunkType] || chunkType;
}

// ─── Inline components ─────────────────────────────────────────────────────

function InsightsBadges({ insights }: { insights: MarketInsights }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3 mb-1">
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${trendColor(insights.hiringTrend)}`}>
        {insights.hiringTrend.toUpperCase()}
      </span>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-mirage-teal/30 text-mirage-teal">
        AI in {insights.aiMentionRate}% JDs
      </span>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-mirage-border text-white/50">
        {insights.activeJobCount} active jobs
      </span>
      {insights.risingSkills.slice(0, 3).map((skill) => (
        <span key={skill} className="text-[10px] px-2 py-0.5 rounded border border-mirage-teal/20 text-mirage-teal/70">
          {skill}
        </span>
      ))}
    </div>
  );
}

function JobCards({ jobs }: { jobs: MatchedJob[] }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto py-2 -mx-1 px-1 mt-2 scrollbar-thin scrollbar-thumb-mirage-border">
      {jobs.map((job) => (
        <div
          key={job._id}
          className="min-w-[220px] max-w-[250px] flex-shrink-0 border border-mirage-border rounded-lg p-3 bg-mirage-bg/60 hover:border-mirage-teal/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="text-xs font-medium text-white truncate flex-1">{job.title}</h4>
            {job.matchPercent > 0 && (
              <span className="text-[10px] font-mono text-mirage-teal whitespace-nowrap">{job.matchPercent}%</span>
            )}
          </div>
          <p className="text-[10px] text-white/40 truncate mb-2">{job.company} &middot; {job.city}</p>
          {formatSalary(job.salary) && (
            <p className="text-[10px] text-white/50 mb-2">{formatSalary(job.salary)}</p>
          )}
          <div className="flex flex-wrap gap-1 mb-2">
            {job.skills.slice(0, 4).map((s) => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-mirage-teal/10 text-mirage-teal/80 border border-mirage-teal/20">
                {s}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-[9px] text-white/30">+{job.skills.length - 4}</span>
            )}
          </div>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-mirage-teal hover:underline"
            >
              View on {job.source || 'source'}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function SourcesPanel({ sources, expanded, onToggle }: {
  sources: RAGSource[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="text-[10px] font-mono text-white/30 hover:text-mirage-teal transition-colors flex items-center gap-1"
      >
        <span className="inline-block transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          &#9656;
        </span>
        {sources.length} source{sources.length !== 1 ? 's' : ''} retrieved
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 bg-mirage-bg/40 border border-mirage-border/50 rounded p-2">
              {sources.map((src, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className={`font-mono px-1 py-0.5 rounded text-[9px] ${
                    src.source === 'github' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {sourceIcon(src.source)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/50 font-medium">{chunkLabel(src.chunkType)}</span>
                      {src.repoName && <span className="text-white/25">{src.repoName}</span>}
                      <span className="text-mirage-teal/50 ml-auto whitespace-nowrap">{src.score}%</span>
                    </div>
                    <p className="text-white/25 truncate mt-0.5">{src.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ChatInterface({ workerId, compact }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workerId) loadHistory();
  }, [workerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadHistory() {
    try {
      const { data } = await api.get('/chat/history');
      setMessages(data.messages || []);
    } catch {}
  }

  function toggleSources(msgId: string) {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      language,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', {
        workerId,
        message: text,
        language,
      });

      const botMsg: Message = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        language: data.language || language,
        timestamp: new Date(),
        ragSources: data.ragSources,
        matchedJobs: data.matchedJobs,
        marketInsights: data.marketInsights,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        language: 'en',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-[400px]' : 'h-[70vh]'} border border-mirage-border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mirage-border bg-mirage-bg-secondary">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-mirage-teal animate-pulse" />
          <span className="text-xs font-mono text-white/60">AI CAREER ADVISOR</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setLanguage('en')}
            className={`text-xs px-2 py-1 rounded ${language === 'en' ? 'bg-mirage-teal text-black' : 'text-white/40'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`text-xs px-2 py-1 rounded ${language === 'hi' ? 'bg-mirage-teal text-black' : 'text-white/40'}`}
          >
            HI
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/30 text-sm mb-6">Ask me about your risk score, job market, or reskilling paths</p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.label)}
                  className="text-xs px-3 py-2 border border-mirage-border rounded-lg text-white/50 hover:border-mirage-teal/30 hover:text-mirage-teal transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full max-w-[85%]'}`}>
                {/* Message bubble */}
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-mirage-teal/10 border border-mirage-teal/30 text-white'
                      : 'bg-mirage-bg-secondary border border-mirage-border text-white/80'
                  }`}
                >
                  <ReactMarkdown
                    className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:text-white/70 [&_strong]:text-white [&_a]:text-mirage-teal"
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Assistant enrichments */}
                {msg.role === 'assistant' && (
                  <>
                    {/* Market insights badges */}
                    {msg.marketInsights && msg.marketInsights.activeJobCount > 0 && (
                      <InsightsBadges insights={msg.marketInsights} />
                    )}

                    {/* Matched jobs */}
                    {msg.matchedJobs && msg.matchedJobs.length > 0 && (
                      <JobCards jobs={msg.matchedJobs} />
                    )}

                    {/* RAG sources */}
                    {msg.ragSources && msg.ragSources.length > 0 && (
                      <SourcesPanel
                        sources={msg.ragSources}
                        expanded={expandedSources.has(msg.id)}
                        onToggle={() => toggleSources(msg.id)}
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-mirage-bg-secondary border border-mirage-border rounded-lg px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-mirage-teal animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-mirage-border p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder={language === 'hi' ? '\u0905\u092A\u0928\u093E \u0938\u0935\u093E\u0932 \u092A\u0942\u091B\u0947\u0902...' : 'Ask about your risk, reskilling paths, or job market...'}
          className="flex-1 bg-transparent border border-mirage-border rounded px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-mirage-teal text-black px-4 py-2 text-xs font-mono font-medium hover:bg-mirage-cyan transition-colors disabled:opacity-40 rounded"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
