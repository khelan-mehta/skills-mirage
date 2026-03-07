import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, ExternalLink, Clock, BookOpen,
  Target, Zap, Brain, CheckCircle2, ClipboardList, X,
  ChevronLeft, RotateCcw, Trophy, AlertCircle, Loader2,
} from 'lucide-react';
import api from '../../utils/api';

/* ─── Types ──────────────────────────────────────────────────────────────── */

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

interface MCQQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizState {
  stepIndex: number;
  courseName: string;
  questions: MCQQuestion[];
  difficulty: string;
}

/* ─── Style constants ────────────────────────────────────────────────────── */

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

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/* ─── Quiz checkpoint placement ─────────────────────────────────────────── */

/**
 * Returns the indices of steps AFTER which a quiz checkpoint should appear.
 * Distributes quizzes equally — one checkpoint after each N steps.
 * e.g. 8 steps → checkpoints after steps 1, 3, 5, 7 (every 2 steps)
 * Minimum 1 quiz (at the halfway mark), max 4 quizzes.
 */
function getQuizCheckpointIndices(totalSteps: number): Set<number> {
  if (totalSteps < 2) return new Set();
  const count = Math.min(4, Math.max(1, Math.floor(totalSteps / 2)));
  const interval = totalSteps / (count + 1);
  const indices = new Set<number>();
  for (let i = 1; i <= count; i++) {
    indices.add(Math.round(i * interval) - 1); // 0-indexed step
  }
  return indices;
}

/* ─── Quiz Modal ─────────────────────────────────────────────────────────── */

function QuizModal({
  quiz, onClose, targetRole,
}: {
  quiz: QuizState;
  onClose: () => void;
  targetRole: string;
}) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const question = quiz.questions[currentQ];
  const totalQ = quiz.questions.length;
  const selected = selectedAnswers[currentQ];
  const isLast = currentQ === totalQ - 1;

  const score = submitted
    ? selectedAnswers.filter((a, i) => a === quiz.questions[i].correctIndex).length
    : 0;

  const scorePercent = Math.round((score / totalQ) * 100);
  const passed = scorePercent >= 60;

  const handleSelect = (optIdx: number) => {
    if (submitted) return;
    const next = [...selectedAnswers];
    next[currentQ] = optIdx;
    setSelectedAnswers(next);
  };

  const handleNext = () => {
    if (isLast) {
      setSubmitted(true);
      setShowResults(true);
      setCurrentQ(0);
    } else {
      setCurrentQ((q) => q + 1);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers(new Array(totalQ).fill(null));
    setSubmitted(false);
    setShowResults(false);
    setCurrentQ(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-mirage-teal" />
            <div>
              <p className="text-xs text-mirage-teal font-mono">[ KNOWLEDGE CHECK ]</p>
              <p className="text-white/60 text-xs truncate max-w-[280px]">{quiz.courseName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* Results Screen */}
          {showResults ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              {/* Score */}
              <div className="text-center mb-6">
                <div
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mx-auto mb-3 ${passed
                      ? 'border-mirage-teal/50 bg-mirage-teal/10'
                      : 'border-orange-400/50 bg-orange-400/10'
                    }`}
                >
                  {passed
                    ? <Trophy className="w-8 h-8 text-mirage-teal" />
                    : <AlertCircle className="w-8 h-8 text-orange-400" />
                  }
                </div>
                <p className={`text-3xl font-mono font-bold mb-1 ${passed ? 'text-mirage-teal' : 'text-orange-400'}`}>
                  {scorePercent}%
                </p>
                <p className="text-white/50 text-sm">
                  {score} of {totalQ} correct
                </p>
                <p className={`text-xs mt-1 ${passed ? 'text-mirage-teal/70' : 'text-orange-400/70'}`}>
                  {passed ? '✓ Knowledge check passed — great progress!' : 'Review the material before moving on'}
                </p>
              </div>

              {/* Per-question review */}
              <div className="space-y-2 mb-5">
                {quiz.questions.map((q, i) => {
                  const userAnswer = selectedAnswers[i];
                  const isCorrect = userAnswer === q.correctIndex;
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-3 ${isCorrect ? 'border-mirage-teal/20 bg-mirage-teal/5' : 'border-red-400/20 bg-red-400/5'
                        }`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        {isCorrect
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-mirage-teal flex-shrink-0 mt-0.5" />
                          : <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        }
                        <p className="text-xs text-white/70 leading-relaxed">{q.question}</p>
                      </div>
                      {!isCorrect && (
                        <div className="ml-5 space-y-0.5">
                          <p className="text-[10px] text-red-400/70">
                            Your answer: {userAnswer !== null ? OPTION_LABELS[userAnswer] : '—'}
                          </p>
                          <p className="text-[10px] text-mirage-teal/70">
                            Correct: {OPTION_LABELS[q.correctIndex]}. {q.options[q.correctIndex]}
                          </p>
                          <p className="text-[10px] text-white/40 italic mt-1">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-white/15 rounded-lg text-white/50 hover:text-white/80 hover:border-white/25 transition-all text-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Quiz
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-mirage-teal/20 border border-mirage-teal/40 rounded-lg text-mirage-teal text-sm hover:bg-mirage-teal/30 transition-all"
                >
                  Continue Learning
                </button>
              </div>
            </motion.div>
          ) : (
            /* Question Screen */
            <motion.div
              key={`q-${currentQ}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="p-6"
            >
              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-mirage-teal rounded-full"
                    initial={{ width: `${(currentQ / totalQ) * 100}%` }}
                    animate={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs text-white/30 font-mono flex-shrink-0">
                  {currentQ + 1} / {totalQ}
                </span>
              </div>

              {/* Question */}
              <p className="text-white/90 text-sm leading-relaxed mb-5 font-medium">
                {question.question}
              </p>

              {/* Options */}
              <div className="space-y-2.5 mb-6">
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-150 ${selected === idx
                        ? 'border-mirage-teal/60 bg-mirage-teal/12 text-white/90'
                        : 'border-white/8 bg-white/[0.02] text-white/55 hover:border-white/20 hover:text-white/80'
                      }`}
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded border flex items-center justify-center text-xs font-mono transition-colors ${selected === idx
                          ? 'border-mirage-teal/60 text-mirage-teal bg-mirage-teal/15'
                          : 'border-white/15 text-white/30'
                        }`}
                    >
                      {OPTION_LABELS[idx]}
                    </span>
                    <span className="text-sm leading-snug">{opt}</span>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                  disabled={currentQ === 0}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  onClick={handleNext}
                  disabled={selected === null}
                  className="flex items-center gap-2 px-5 py-2 bg-mirage-teal/20 border border-mirage-teal/40 rounded-lg text-mirage-teal text-sm hover:bg-mirage-teal/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isLast ? 'Submit' : 'Next'}
                  {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─── Quiz Checkpoint Banner ─────────────────────────────────────────────── */

function QuizCheckpoint({
  afterStep, steps, targetRole, checkpointNumber, totalCheckpoints,
}: {
  afterStep: number;
  steps: Step[];
  targetRole: string;
  checkpointNumber: number;
  totalCheckpoints: number;
}) {
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [error, setError] = useState('');

  // The quiz covers the step it appears after
  const step = steps[afterStep];

  const handleGenerateQuiz = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/seeker/quiz/generate', {
        courseName: step.courseName,
        skillsGained: step.skillsGained || [],
        difficulty: step.difficulty || 'intermediate',
        stepIndex: checkpointNumber - 1,
        totalSteps: totalCheckpoints,
        targetRole,
      });
      setQuiz({
        stepIndex: afterStep,
        courseName: data.courseName,
        questions: data.questions,
        difficulty: data.difficulty,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  }, [step, afterStep, checkpointNumber, totalCheckpoints, targetRole]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4 relative my-1"
      >
        {/* Checkpoint dot on timeline */}
        <div className="w-[30px] flex-shrink-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-dashed border-mirage-teal/40 bg-mirage-bg flex items-center justify-center z-10">
            <ClipboardList className="w-2.5 h-2.5 text-mirage-teal/60" />
          </div>
        </div>

        {/* Checkpoint card */}
        <div className="flex-1 border border-mirage-teal/20 rounded-lg p-3.5 bg-mirage-teal/[0.04] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <p className="text-[10px] text-mirage-teal/60 font-mono mb-0.5">
                [ CHECKPOINT {checkpointNumber} of {totalCheckpoints} ]
              </p>
              <p className="text-white/60 text-xs">
                Knowledge check on{' '}
                <span className="text-white/80">{step.courseName.split(' ').slice(0, 4).join(' ')}</span>
              </p>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {error && (
              <p className="text-xs text-red-400/70">{error}</p>
            )}
            <button
              onClick={handleGenerateQuiz}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-mirage-teal/40 rounded-md text-mirage-teal text-xs hover:bg-mirage-teal/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ClipboardList className="w-3.5 h-3.5" />
              )}
              {loading ? 'Generating...' : 'Take Quiz'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quiz Modal */}
      <AnimatePresence>
        {quiz && (
          <QuizModal
            quiz={quiz}
            onClose={() => setQuiz(null)}
            targetRole={targetRole}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function ReskillPath({
  targetRole, targetCity, isHiringVerified, totalWeeks, hoursPerWeek, steps,
  ragEnhanced, ragChunksUsed, personalizedInsight, strengthsLeveraged,
  skillGapAnalysis, matchingSkills, missingSkills, compact,
}: ReskillPathProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showSkillGap, setShowSkillGap] = useState(false);

  const totalHours = steps.reduce((sum, s) => sum + (s.estimatedHours || 0), 0) || totalWeeks * hoursPerWeek;
  const quizIndices = getQuizCheckpointIndices(steps.length);
  const totalCheckpoints = quizIndices.size;

  // Map checkpoint index → sequential checkpoint number (1, 2, ...)
  const sortedCheckpointIndices = Array.from(quizIndices).sort((a, b) => a - b);
  const checkpointNumberMap = new Map<number, number>(
    sortedCheckpointIndices.map((idx, i) => [idx, i + 1])
  );

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
        {totalCheckpoints > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-mirage-teal/10 text-mirage-teal/70 border border-mirage-teal/20 flex items-center gap-1">
            <ClipboardList className="w-3 h-3" /> {totalCheckpoints} quiz{totalCheckpoints !== 1 ? 'zes' : ''}
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

      {/* Timeline — steps + quiz checkpoints interleaved */}
      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-mirage-border" />

        <div className="space-y-4">
          {steps.map((step, i) => {
            const isExpanded = expandedStep === i;
            const diffColors = DIFFICULTY_COLORS[step.difficulty || 'beginner'];

            return (
              <div key={i}>
                {/* Step card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
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
                    {/* Main row */}
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
                            {step.reasoning && (
                              <div className="border-l-2 border-mirage-teal/40 pl-3">
                                <p className="text-[10px] text-mirage-teal/60 font-mono mb-1">WHY THIS STEP</p>
                                <p className="text-xs text-white/60 leading-relaxed">{step.reasoning}</p>
                              </div>
                            )}
                            {step.personalNote && (
                              <div className="border-l-2 border-purple-500/40 pl-3">
                                <p className="text-[10px] text-purple-400/60 font-mono mb-1">PERSONALIZED FOR YOU</p>
                                <p className="text-xs text-purple-300/60 leading-relaxed italic">{step.personalNote}</p>
                              </div>
                            )}
                            {step.practicalProject && (
                              <div className="border border-mirage-teal/20 rounded p-3 bg-mirage-teal/5">
                                <p className="text-[10px] text-mirage-teal/60 font-mono mb-1 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> HANDS-ON PROJECT
                                </p>
                                <p className="text-xs text-white/60 leading-relaxed">{step.practicalProject}</p>
                              </div>
                            )}
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

                {/* Quiz checkpoint — appears AFTER certain steps */}
                {quizIndices.has(i) && (
                  <div className="mt-4">
                    <QuizCheckpoint
                      afterStep={i}
                      steps={steps}
                      targetRole={targetRole}
                      checkpointNumber={checkpointNumberMap.get(i) ?? 1}
                      totalCheckpoints={totalCheckpoints}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
