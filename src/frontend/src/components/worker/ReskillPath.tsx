import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ExternalLink, Clock, BookOpen, Target, Zap, Brain, CheckCircle2 } from 'lucide-react';

interface Step {
  weekRange: string;
  startDate?: string;
  endDate?: string;
  courseName: string;
  provider: string;
  institution?: string;
  url: string;
  duration: string;
  estimatedHours?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  isFree: boolean;
  skillsGained?: string[];
  reasoning?: string;
  personalNote?: string;
  practicalProject?: string;
  milestones?: string[];
  prerequisiteSteps?: number[];
}

interface SkillGap {
  skill: string;
  currentProficiency: number;
  priority: 'critical' | 'important' | 'nice-to-have';
  reasoning: string;
  transferableFrom?: string;
}

interface ReskillPathProps {
  targetRole: string;
  targetCity: string;
  isHiringVerified: boolean;
  totalWeeks: number;
  hoursPerWeek: number;
  steps: Step[];
  ragEnhanced?: boolean;
  ragChunksUsed?: number;
  personalizedInsight?: string;
  strengthsLeveraged?: string[];
  skillGapAnalysis?: SkillGap[];
  matchingSkills?: string[];
  missingSkills?: string[];
  compact?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  NPTEL: '#00d4aa',
  SWAYAM: '#00bcd4',
  PMKVY: '#4dd0e1',
  Coursera: '#ffd740',
  freeCodeCamp: '#a78bfa',
  Udemy: '#a855f7',
  Other: '#ffffff',
};

const DIFFICULTY_COLORS = {
  beginner: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  intermediate: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  advanced: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

const PRIORITY_COLORS = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  important: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'nice-to-have': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

export default function ReskillPath({
  targetRole, targetCity, isHiringVerified, totalWeeks, hoursPerWeek, steps,
  ragEnhanced, ragChunksUsed, personalizedInsight, strengthsLeveraged,
  skillGapAnalysis, matchingSkills, missingSkills, compact,
}: ReskillPathProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showSkillGap, setShowSkillGap] = useState(false);

  const totalHours = steps.reduce((sum, s) => sum + (s.estimatedHours || 0), 0) || totalWeeks * hoursPerWeek;

  return (
    <div className={`border border-mirage-border rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-mirage-teal text-sm font-mono">RESKILLING PATH</h3>
        {ragEnhanced && (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <Brain className="w-3 h-3" /> RAG-ENHANCED
          </span>
        )}
      </div>

      {/* RAG Insight Banner */}
      {ragEnhanced && personalizedInsight && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 border border-purple-500/20 rounded-lg p-4 bg-purple-500/5"
        >
          <p className="text-xs text-purple-400/70 font-mono mb-1">PERSONALIZED INSIGHT</p>
          <p className="text-sm text-white/80 leading-relaxed">{personalizedInsight}</p>

          {strengthsLeveraged && strengthsLeveraged.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-purple-400/50 font-mono mb-1.5">YOUR STRENGTHS LEVERAGED</p>
              <div className="flex flex-wrap gap-1.5">
                {strengthsLeveraged.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 border border-purple-500/30 rounded text-purple-300/70">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ragChunksUsed && (
            <p className="text-[10px] text-white/20 mt-2 font-mono">
              Based on {ragChunksUsed} knowledge base chunks from your GitHub projects & resume
            </p>
          )}
        </motion.div>
      )}

      {/* Target + Stats */}
      <div className="flex items-center gap-3 mb-4">
        <Target className="w-5 h-5 text-mirage-teal" />
        <span className="text-lg text-white/90">{targetRole}</span>
        <span className="text-xs text-white/40">in {targetCity}</span>
        {isHiringVerified && (
          <span className="text-xs font-mono text-mirage-teal bg-mirage-teal/10 px-2 py-0.5 rounded">
            VERIFIED HIRING
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-mirage-bg-secondary rounded p-3">
          <p className="text-xs text-white/40">Duration</p>
          <p className="text-xl font-mono text-white">{totalWeeks} <span className="text-sm text-white/40">weeks</span></p>
        </div>
        <div className="bg-mirage-bg-secondary rounded p-3">
          <p className="text-xs text-white/40">Total Hours</p>
          <p className="text-xl font-mono text-white">{totalHours} <span className="text-sm text-white/40">hrs</span></p>
        </div>
        <div className="bg-mirage-bg-secondary rounded p-3">
          <p className="text-xs text-white/40">Steps</p>
          <p className="text-xl font-mono text-white">{steps.length} <span className="text-sm text-white/40">courses</span></p>
        </div>
      </div>

      {/* Skill Gap & Match Analysis */}
      {(matchingSkills?.length || missingSkills?.length) && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          {matchingSkills && matchingSkills.length > 0 && (
            <div className="border border-green-500/20 rounded-lg p-3 bg-green-500/5">
              <p className="text-xs text-green-400/70 font-mono mb-2">SKILLS YOU ALREADY HAVE</p>
              <div className="flex flex-wrap gap-1.5">
                {matchingSkills.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 border border-green-500/30 rounded text-green-400/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {missingSkills && missingSkills.length > 0 && (
            <div className="border border-orange-500/20 rounded-lg p-3 bg-orange-500/5">
              <p className="text-xs text-orange-400/70 font-mono mb-2">SKILLS TO LEARN</p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 border border-orange-500/30 rounded text-orange-400/80">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skill Gap Analysis (expandable) */}
      {skillGapAnalysis && skillGapAnalysis.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowSkillGap(!showSkillGap)}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors mb-3"
          >
            {showSkillGap ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-mono text-xs">DEEP SKILL GAP ANALYSIS</span>
            <span className="text-xs text-white/30">({skillGapAnalysis.length} skills)</span>
          </button>

          <AnimatePresence>
            {showSkillGap && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2"
              >
                {skillGapAnalysis.map((gap, i) => {
                  const pColors = PRIORITY_COLORS[gap.priority] || PRIORITY_COLORS['nice-to-have'];
                  return (
                    <div key={i} className="border border-mirage-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white/90 font-medium">{gap.skill}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pColors.bg} ${pColors.text} ${pColors.border} font-mono uppercase`}>
                            {gap.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-mirage-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${gap.currentProficiency}%`,
                                background: gap.currentProficiency > 60 ? '#00d4aa' : gap.currentProficiency > 30 ? '#ffd740' : '#ff8800',
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-white/50">{gap.currentProficiency}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">{gap.reasoning}</p>
                      {gap.transferableFrom && (
                        <p className="text-xs text-purple-400/60 mt-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Transferable from: {gap.transferableFrom}
                        </p>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-mirage-border" />

        <div className="space-y-4">
          {steps.map((step, i) => {
            const isExpanded = expandedStep === i;
            const diffColors = DIFFICULTY_COLORS[step.difficulty || 'beginner'];

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 relative"
              >
                {/* Dot */}
                <div
                  className="w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 bg-mirage-bg"
                  style={{ borderColor: PROVIDER_COLORS[step.provider] || '#fff' }}
                >
                  <span className="text-xs font-mono" style={{ color: PROVIDER_COLORS[step.provider] }}>
                    {i + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 border border-mirage-border rounded-lg hover:border-white/15 transition-colors overflow-hidden">
                  {/* Main row — always visible */}
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : i)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90 font-medium">{step.courseName}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {step.institution ? `${step.institution} via ` : ''}{step.provider}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        {step.difficulty && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${diffColors.bg} ${diffColors.text} ${diffColors.border}`}>
                            {step.difficulty.toUpperCase()}
                          </span>
                        )}
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded"
                          style={{
                            color: PROVIDER_COLORS[step.provider],
                            background: `${PROVIDER_COLORS[step.provider]}15`,
                          }}
                        >
                          {step.provider}
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-white/40 mt-2">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {step.weekRange}</span>
                      {step.startDate && <span>{step.startDate} → {step.endDate}</span>}
                      {step.estimatedHours && <span>{step.estimatedHours}h</span>}
                      <span className={step.isFree ? 'text-mirage-teal' : 'text-yellow-400'}>
                        {step.isFree ? 'FREE' : 'PAID'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-mirage-border pt-3">
                          {/* Reasoning */}
                          {step.reasoning && (
                            <div className="border-l-2 border-mirage-teal/40 pl-3">
                              <p className="text-[10px] text-mirage-teal/60 font-mono mb-1">WHY THIS STEP</p>
                              <p className="text-xs text-white/60 leading-relaxed">{step.reasoning}</p>
                            </div>
                          )}

                          {/* Personal note */}
                          {step.personalNote && (
                            <div className="border-l-2 border-purple-500/40 pl-3">
                              <p className="text-[10px] text-purple-400/60 font-mono mb-1">PERSONALIZED FOR YOU</p>
                              <p className="text-xs text-purple-300/60 leading-relaxed italic">{step.personalNote}</p>
                            </div>
                          )}

                          {/* Practical project */}
                          {step.practicalProject && (
                            <div className="border border-mirage-teal/20 rounded p-3 bg-mirage-teal/5">
                              <p className="text-[10px] text-mirage-teal/60 font-mono mb-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> HANDS-ON PROJECT
                              </p>
                              <p className="text-xs text-white/60 leading-relaxed">{step.practicalProject}</p>
                            </div>
                          )}

                          {/* Skills gained */}
                          {step.skillsGained && step.skillsGained.length > 0 && (
                            <div>
                              <p className="text-[10px] text-white/30 font-mono mb-1">SKILLS GAINED</p>
                              <div className="flex flex-wrap gap-1.5">
                                {step.skillsGained.map((s, j) => (
                                  <span key={j} className="text-xs px-2 py-0.5 border border-mirage-teal/30 rounded text-mirage-teal/70">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Milestones */}
                          {step.milestones && step.milestones.length > 0 && (
                            <div>
                              <p className="text-[10px] text-white/30 font-mono mb-1">MILESTONES</p>
                              <div className="space-y-1">
                                {step.milestones.map((m, j) => (
                                  <div key={j} className="flex items-center gap-2 text-xs text-white/50">
                                    <div className="w-1.5 h-1.5 rounded-full bg-mirage-teal/50" />
                                    {m}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Course link */}
                          <a
                            href={step.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-mirage-teal hover:text-mirage-cyan transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Open Course
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
