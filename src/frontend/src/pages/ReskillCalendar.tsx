import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Brain, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft,
  Sparkles, Target, Clock, BookOpen, CheckCircle2, AlertTriangle,
  Lightbulb, ExternalLink, Flame, Zap, GraduationCap, Play,
  TrendingUp, Star, Award,
} from 'lucide-react';
import { useSeekerStore } from '../stores/seekerStore';
import ReskillPath from '../components/worker/ReskillPath';
import api from '../utils/api';

type ViewMode = 'timeline' | 'calendar' | 'insights';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PROVIDER_COLORS: Record<string, string> = {
  NPTEL: '#00d4aa', SWAYAM: '#00bcd4', PMKVY: '#4dd0e1',
  Coursera: '#ffd740', freeCodeCamp: '#a78bfa', Udemy: '#a855f7', Other: '#ffffff',
};

const DIFFICULTY_BADGE: Record<string, { color: string; label: string }> = {
  beginner: { color: 'text-green-400', label: 'B' },
  intermediate: { color: 'text-yellow-400', label: 'I' },
  advanced: { color: 'text-red-400', label: 'A' },
};

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface DayData {
  date: Date;
  courses: any[];
  milestones: string[];
  deliverables: string[];
  hoursTarget: number;
  intensity: number; // 0-4 scale
  isProjectDay: boolean;
  practicalProject?: string;
  aiSuggestion?: string;
  weekFocus?: string;
  reasoning?: string;
}

/* ─── Main Component ────────────────────────────────────────────────────── */

export default function ReskillCalendar() {
  const { jobId } = useParams<{ jobId: string }>();
  const fetchReskillPlan = useSeekerStore((s) => s.fetchReskillPlan);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [ragInsights, setRagInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    fetchReskillPlan(jobId)
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err.response?.data?.error || 'Failed to load plan'); setLoading(false); });
  }, [jobId]);

  useEffect(() => {
    if (viewMode === 'insights' && !ragInsights && !insightsLoading) {
      setInsightsLoading(true);
      api.get('/seeker/rag-insights')
        .then(({ data }) => { setRagInsights(data); setInsightsLoading(false); })
        .catch(() => { setRagInsights({ insights: [], summary: 'Failed to load insights.' }); setInsightsLoading(false); });
    }
  }, [viewMode]);

  if (loading) {
    return (
      <div className="pt-24 px-8 min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-mirage-teal/30 border-t-mirage-teal rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Generating your personalized reskilling plan...</p>
        <p className="text-white/20 text-xs">This may take a moment as we analyze your profile</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-24 px-8 min-h-screen max-w-4xl mx-auto">
        <div className="border border-red-400/30 rounded-lg p-8 bg-red-400/5 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/seeker" className="text-mirage-teal hover:text-mirage-cyan text-sm transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { job, reskillPlan } = data || {};

  return (
    <div className="pt-24 px-8 min-h-screen max-w-6xl mx-auto pb-20">
      <Link to="/seeker" className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mb-6">
        <ArrowLeft className="w-3 h-3" /> Back to Dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="label-bracketed text-mirage-teal mb-3">[ RESKILLING PLAN ]</p>
            <h1 className="heading-section text-3xl mb-2">{job?.title || 'Target Role'}</h1>
            <p className="text-white/40 text-sm">{job?.company} — {job?.city}</p>
            {reskillPlan?.generatedAt && (
              <p className="text-xs text-white/20 mt-1">
                Generated {new Date(reskillPlan.generatedAt).toLocaleDateString()}
                {reskillPlan.ragEnhanced && (
                  <span className="ml-2 text-purple-400/60">
                    <Brain className="w-3 h-3 inline" /> RAG-enhanced with {reskillPlan.ragChunksUsed} knowledge chunks
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-mirage-border">
          {([
            { key: 'timeline' as ViewMode, label: 'Timeline View', icon: Target },
            { key: 'calendar' as ViewMode, label: 'AI Calendar', icon: Calendar },
            { key: 'insights' as ViewMode, label: 'RAG Insights', icon: Brain },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
                viewMode === tab.key ? 'text-mirage-teal' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {viewMode === tab.key && (
                <motion.div layoutId="reskill-tab" className="absolute bottom-0 left-0 right-0 h-px bg-mirage-teal" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {viewMode === 'timeline' && reskillPlan && (
          <ReskillPath
            targetRole={reskillPlan.targetRole || job?.title || 'Target Role'}
            targetCity={reskillPlan.targetCity || job?.city || ''}
            isHiringVerified={reskillPlan.isHiringVerified ?? true}
            totalWeeks={reskillPlan.totalWeeks || 8}
            hoursPerWeek={reskillPlan.hoursPerWeek || 10}
            steps={reskillPlan.steps || []}
            ragEnhanced={reskillPlan.ragEnhanced}
            ragChunksUsed={reskillPlan.ragChunksUsed}
            personalizedInsight={reskillPlan.personalizedInsight}
            strengthsLeveraged={reskillPlan.strengthsLeveraged}
            skillGapAnalysis={reskillPlan.skillGapAnalysis}
            matchingSkills={reskillPlan.matchingSkills}
            missingSkills={reskillPlan.missingSkills}
          />
        )}

        {viewMode === 'calendar' && reskillPlan && (
          <MonthCalendar
            steps={reskillPlan.steps || []}
            weeklyBreakdown={reskillPlan.weeklyBreakdown}
            totalWeeks={reskillPlan.totalWeeks || 8}
            hoursPerWeek={reskillPlan.hoursPerWeek || 10}
            skillGapAnalysis={reskillPlan.skillGapAnalysis}
            personalizedInsight={reskillPlan.personalizedInsight}
          />
        )}

        {viewMode === 'insights' && (
          <RAGInsightsPanel
            ragInsights={ragInsights || reskillPlan?.ragInsights}
            loading={insightsLoading}
            reskillPlan={reskillPlan}
          />
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MONTH CALENDAR — Full grid with AI suggestions
   ═══════════════════════════════════════════════════════════════════════════ */

function MonthCalendar({ steps, weeklyBreakdown, totalWeeks, hoursPerWeek, skillGapAnalysis, personalizedInsight }: {
  steps: any[];
  weeklyBreakdown?: any[];
  totalWeeks: number;
  hoursPerWeek: number;
  skillGapAnalysis?: any[];
  personalizedInsight?: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Plan date range
  const planStart = useMemo(() => {
    const firstStep = steps.find((s: any) => s.startDate);
    return firstStep ? new Date(firstStep.startDate) : new Date();
  }, [steps]);

  const planEnd = useMemo(() => {
    const d = new Date(planStart);
    d.setDate(d.getDate() + totalWeeks * 7);
    return d;
  }, [planStart, totalWeeks]);

  // Build day-level data map for the entire plan
  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();

    // Build weeks data
    const weeks = weeklyBreakdown?.length
      ? weeklyBreakdown
      : buildWeeksFromSteps(steps, totalWeeks, hoursPerWeek, planStart);

    // Map each step to its date range
    for (const step of steps) {
      const start = step.startDate ? new Date(step.startDate) : new Date(planStart);
      const end = step.endDate ? new Date(step.endDate) : new Date(start.getTime() + 14 * 86400000);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = dateKey(d);
        if (!map.has(key)) {
          map.set(key, {
            date: new Date(d),
            courses: [],
            milestones: [],
            deliverables: [],
            hoursTarget: 0,
            intensity: 0,
            isProjectDay: false,
          });
        }
        const dayData = map.get(key)!;
        dayData.courses.push(step);

        // Put milestones on the last day of the step
        if (isSameDay(d, end) && step.milestones?.length) {
          dayData.milestones.push(...step.milestones);
        }

        // Project days on weekends (Sat/Sun) when there's a practical project
        if ((d.getDay() === 0 || d.getDay() === 6) && step.practicalProject) {
          dayData.isProjectDay = true;
          dayData.practicalProject = step.practicalProject;
        }
      }
    }

    // Overlay weekly data
    for (const week of weeks) {
      const weekDate = week.date ? parseWeekDate(week.date, planStart) : null;
      if (!weekDate) continue;

      for (let d = 0; d < 7; d++) {
        const day = new Date(weekDate);
        day.setDate(weekDate.getDate() + d);
        const key = dateKey(day);
        if (!map.has(key)) {
          map.set(key, {
            date: new Date(day),
            courses: [],
            milestones: [],
            deliverables: [],
            hoursTarget: 0,
            intensity: 0,
            isProjectDay: false,
          });
        }
        const dayData = map.get(key)!;
        dayData.weekFocus = week.focus;
        dayData.hoursTarget = Math.round((week.hoursRequired || hoursPerWeek) / 7 * 10) / 10;

        // Spread deliverables across the week
        if (week.deliverables?.length) {
          const idx = d % week.deliverables.length;
          if (d < week.deliverables.length) {
            dayData.deliverables.push(week.deliverables[idx]);
          }
        }
      }
    }

    // Compute intensity for all days
    for (const [, dayData] of map) {
      const courseCount = dayData.courses.length;
      const hasMilestone = dayData.milestones.length > 0;
      const hasDeliverable = dayData.deliverables.length > 0;
      dayData.intensity = Math.min(4,
        courseCount + (hasMilestone ? 1 : 0) + (hasDeliverable ? 1 : 0) + (dayData.isProjectDay ? 1 : 0)
      );
    }

    // Generate AI suggestions for days with data
    generateAISuggestions(map, steps, skillGapAnalysis);

    return map;
  }, [steps, weeklyBreakdown, totalWeeks, hoursPerWeek, planStart, skillGapAnalysis]);

  // Build calendar grid for current month
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Monday-based: getDay() returns 0 (Sun) ... 6 (Sat)
    // Convert to Mon=0, Tue=1, ... Sun=6
    let startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ date: Date | null; dayData: DayData | null }> = [];

    // Fill leading blanks
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, dayData: null });

    // Fill days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentYear, currentMonth, d);
      const key = dateKey(date);
      cells.push({ date, dayData: dayMap.get(key) || null });
    }

    // Fill trailing blanks to complete the grid
    while (cells.length % 7 !== 0) cells.push({ date: null, dayData: null });

    return cells;
  }, [currentMonth, currentYear, dayMap]);

  // Month-level stats
  const monthStats = useMemo(() => {
    let totalHours = 0;
    let activeDays = 0;
    let milestoneCount = 0;
    let projectDays = 0;
    const coursesThisMonth = new Set<string>();

    for (const cell of calendarGrid) {
      if (!cell.dayData) continue;
      activeDays++;
      totalHours += cell.dayData.hoursTarget;
      milestoneCount += cell.dayData.milestones.length;
      if (cell.dayData.isProjectDay) projectDays++;
      cell.dayData.courses.forEach((c: any) => coursesThisMonth.add(c.courseName));
    }

    return { totalHours: Math.round(totalHours), activeDays, milestoneCount, projectDays, courseCount: coursesThisMonth.size };
  }, [calendarGrid]);

  // Navigation helpers
  const canGoPrev = currentYear > planStart.getFullYear() || (currentYear === planStart.getFullYear() && currentMonth > planStart.getMonth());
  const canGoNext = currentYear < planEnd.getFullYear() || (currentYear === planEnd.getFullYear() && currentMonth < planEnd.getMonth());

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  return (
    <div className="space-y-6">
      {/* AI Insight Banner */}
      {personalizedInsight && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-purple-500/20 rounded-lg p-4 bg-purple-500/5 flex items-start gap-3"
        >
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-purple-400/60 font-mono mb-1">AI STUDY PLANNER</p>
            <p className="text-xs text-white/70 leading-relaxed">{personalizedInsight}</p>
          </div>
        </motion.div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Study Hours', value: monthStats.totalHours, unit: 'hrs', icon: Clock, color: 'text-mirage-teal' },
          { label: 'Active Days', value: monthStats.activeDays, unit: 'days', icon: Flame, color: 'text-orange-400' },
          { label: 'Milestones', value: monthStats.milestoneCount, unit: '', icon: Award, color: 'text-yellow-400' },
          { label: 'Project Days', value: monthStats.projectDays, unit: '', icon: BookOpen, color: 'text-purple-400' },
          { label: 'Courses', value: monthStats.courseCount, unit: '', icon: GraduationCap, color: 'text-mirage-cyan' },
        ].map(stat => (
          <div key={stat.label} className="border border-mirage-border rounded-lg p-3 bg-mirage-bg">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-3 h-3 ${stat.color}`} />
              <span className="text-[10px] text-white/30 font-mono uppercase">{stat.label}</span>
            </div>
            <p className={`text-lg font-mono ${stat.color}`}>
              {stat.value}<span className="text-xs text-white/20 ml-1">{stat.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Calendar Header: Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            disabled={!canGoPrev}
            className="w-8 h-8 rounded border border-mirage-border flex items-center justify-center hover:border-white/20 transition-colors disabled:opacity-20"
          >
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <h2 className="text-lg font-medium text-white/90 font-mono min-w-[180px] text-center">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className="w-8 h-8 rounded border border-mirage-border flex items-center justify-center hover:border-white/20 transition-colors disabled:opacity-20"
          >
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="text-xs text-mirage-teal font-mono px-3 py-1.5 border border-mirage-teal/30 rounded hover:bg-mirage-teal/10 transition-colors"
          >
            TODAY
          </button>
          {/* Intensity legend */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/20 font-mono">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{ background: intensityColor(level) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-mirage-border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-mirage-border">
          {DAYS.map(day => (
            <div key={day} className="px-2 py-2.5 text-center text-[10px] font-mono text-white/30 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarGrid.map((cell, i) => {
            const isToday = cell.date && isSameDay(cell.date, today);
            const isInPlanRange = cell.date && cell.date >= planStart && cell.date <= planEnd;
            const hasData = !!cell.dayData;
            const isSelected = selectedDay && cell.date && isSameDay(cell.date, selectedDay.date);

            return (
              <motion.div
                key={i}
                className={`
                  min-h-[100px] border-b border-r border-mirage-border/50 p-1.5 relative cursor-pointer transition-all
                  ${!cell.date ? 'bg-transparent' : ''}
                  ${cell.date && !isInPlanRange ? 'opacity-30' : ''}
                  ${isSelected ? 'ring-1 ring-mirage-teal ring-inset bg-mirage-teal/5' : ''}
                  ${isToday ? 'bg-mirage-teal/5' : ''}
                  ${hasData && !isSelected ? 'hover:bg-white/[0.02]' : ''}
                `}
                onClick={() => cell.dayData && setSelectedDay(isSelected ? null : cell.dayData)}
                whileHover={hasData ? { scale: 1.01 } : {}}
              >
                {cell.date && (
                  <>
                    {/* Date number + today indicator */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-mono ${
                        isToday
                          ? 'bg-mirage-teal text-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold'
                          : 'text-white/40'
                      }`}>
                        {cell.date.getDate()}
                      </span>
                      {/* Intensity dot */}
                      {hasData && cell.dayData!.intensity > 0 && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: intensityColor(cell.dayData!.intensity) }}
                        />
                      )}
                    </div>

                    {/* Content snippets */}
                    {hasData && (
                      <div className="space-y-0.5">
                        {/* Course chips (max 2) */}
                        {cell.dayData!.courses.slice(0, 2).map((course: any, j: number) => (
                          <div
                            key={j}
                            className="text-[9px] leading-tight truncate rounded px-1 py-0.5"
                            style={{
                              color: PROVIDER_COLORS[course.provider] || '#fff',
                              background: `${PROVIDER_COLORS[course.provider] || '#fff'}10`,
                            }}
                          >
                            {course.courseName?.split(' ').slice(0, 3).join(' ')}
                          </div>
                        ))}
                        {cell.dayData!.courses.length > 2 && (
                          <span className="text-[8px] text-white/20 font-mono">+{cell.dayData!.courses.length - 2} more</span>
                        )}

                        {/* Milestone marker */}
                        {cell.dayData!.milestones.length > 0 && (
                          <div className="flex items-center gap-0.5 text-[9px] text-yellow-400/80">
                            <Star className="w-2.5 h-2.5" />
                            <span className="truncate">{cell.dayData!.milestones[0]?.split(' ').slice(0, 3).join(' ')}</span>
                          </div>
                        )}

                        {/* Project day marker */}
                        {cell.dayData!.isProjectDay && (
                          <div className="flex items-center gap-0.5 text-[9px] text-purple-400/70">
                            <BookOpen className="w-2.5 h-2.5" />
                            <span>Project</span>
                          </div>
                        )}

                        {/* AI suggestion indicator */}
                        {cell.dayData!.aiSuggestion && (
                          <div className="absolute bottom-1 right-1">
                            <Sparkles className="w-2.5 h-2.5 text-purple-400/40" />
                          </div>
                        )}

                        {/* Hours target */}
                        {cell.dayData!.hoursTarget > 0 && (
                          <div className="absolute bottom-1 left-1.5 text-[8px] text-white/15 font-mono">
                            {cell.dayData!.hoursTarget}h
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      <AnimatePresence>
        {selectedDay && (
          <DayDetailPanel day={selectedDay} onClose={() => setSelectedDay(null)} />
        )}
      </AnimatePresence>

      {/* AI Suggestions Sidebar — shows today's focus + upcoming milestones */}
      <AISuggestionsPanel dayMap={dayMap} today={today} steps={steps} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DAY DETAIL PANEL — Expanded view of a selected day
   ═══════════════════════════════════════════════════════════════════════════ */

function DayDetailPanel({ day, onClose }: { day: DayData; onClose: () => void }) {
  const dayName = day.date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 20, height: 0 }}
      className="border border-mirage-teal/30 rounded-lg overflow-hidden bg-gradient-to-b from-mirage-teal/5 to-transparent"
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/90 font-medium">{dayName}</p>
            {day.weekFocus && (
              <p className="text-xs text-mirage-teal/60 mt-0.5">Week Focus: {day.weekFocus}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {day.hoursTarget > 0 && (
              <div className="flex items-center gap-1 text-xs text-white/30 font-mono">
                <Clock className="w-3 h-3" /> {day.hoursTarget}h target
              </div>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-xs font-mono">
              CLOSE
            </button>
          </div>
        </div>

        {/* AI Suggestion */}
        {day.aiSuggestion && (
          <div className="border border-purple-500/20 rounded-lg p-3 bg-purple-500/5 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-purple-400/60 font-mono mb-0.5">AI SUGGESTION</p>
              <p className="text-xs text-white/70 leading-relaxed">{day.aiSuggestion}</p>
            </div>
          </div>
        )}

        {/* Courses */}
        {day.courses.length > 0 && (
          <div>
            <p className="text-[10px] text-white/30 font-mono mb-2">ACTIVE COURSES ({day.courses.length})</p>
            <div className="space-y-2">
              {day.courses.map((course: any, i: number) => {
                const diffBadge = DIFFICULTY_BADGE[course.difficulty] || DIFFICULTY_BADGE.beginner;
                return (
                  <div key={i} className="border border-mirage-border rounded-lg p-3 flex items-start justify-between hover:border-white/15 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: PROVIDER_COLORS[course.provider] || '#fff' }}
                        />
                        <p className="text-xs text-white/80 font-medium truncate">{course.courseName}</p>
                        <span className={`text-[9px] font-mono ${diffBadge.color}`}>{diffBadge.label}</span>
                      </div>
                      <p className="text-[10px] text-white/30 ml-4">
                        {course.provider}{course.institution ? ` — ${course.institution}` : ''} · {course.weekRange}
                      </p>
                      {course.reasoning && (
                        <p className="text-[10px] text-white/40 mt-1.5 ml-4 leading-relaxed border-l border-mirage-teal/20 pl-2">
                          {course.reasoning}
                        </p>
                      )}
                      {course.skillsGained?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 ml-4">
                          {course.skillsGained.map((s: string, j: number) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 border border-mirage-teal/20 rounded text-mirage-teal/50">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mirage-teal hover:text-mirage-cyan transition-colors flex-shrink-0 ml-3"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestones */}
        {day.milestones.length > 0 && (
          <div>
            <p className="text-[10px] text-yellow-400/50 font-mono mb-2 flex items-center gap-1">
              <Award className="w-3 h-3" /> MILESTONES DUE
            </p>
            <div className="space-y-1.5">
              {day.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-yellow-400/70 bg-yellow-400/5 border border-yellow-400/15 rounded px-3 py-2">
                  <Star className="w-3 h-3 flex-shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables */}
        {day.deliverables.length > 0 && (
          <div>
            <p className="text-[10px] text-white/30 font-mono mb-2">TODAY'S DELIVERABLES</p>
            <div className="space-y-1.5">
              {day.deliverables.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-3.5 h-3.5 rounded border border-mirage-border mt-0.5 flex-shrink-0 cursor-pointer hover:border-mirage-teal hover:bg-mirage-teal/10 transition-all" />
                  <p className="text-xs text-white/50">{d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Practical Project */}
        {day.isProjectDay && day.practicalProject && (
          <div className="border border-purple-500/20 rounded-lg p-3 bg-purple-500/5">
            <p className="text-[10px] text-purple-400/60 font-mono mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> HANDS-ON PROJECT DAY
            </p>
            <p className="text-xs text-white/60 leading-relaxed">{day.practicalProject}</p>
          </div>
        )}

        {/* Reasoning */}
        {day.reasoning && (
          <div className="border-l-2 border-mirage-teal/30 pl-3">
            <p className="text-[10px] text-mirage-teal/50 font-mono mb-0.5">WHY THIS MATTERS</p>
            <p className="text-xs text-white/40 leading-relaxed">{day.reasoning}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI SUGGESTIONS PANEL — Today's focus, upcoming, smart tips
   ═══════════════════════════════════════════════════════════════════════════ */

function AISuggestionsPanel({ dayMap, today, steps }: {
  dayMap: Map<string, DayData>;
  today: Date;
  steps: any[];
}) {
  const todayData = dayMap.get(dateKey(today));

  // Next 7 days with milestones
  const upcomingMilestones = useMemo(() => {
    const milestones: Array<{ date: Date; milestone: string }> = [];
    for (let d = 0; d < 21; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const data = dayMap.get(dateKey(date));
      if (data?.milestones.length) {
        data.milestones.forEach(m => milestones.push({ date, milestone: m }));
      }
    }
    return milestones.slice(0, 5);
  }, [dayMap, today]);

  // Compute weekly load forecast
  const weekForecast = useMemo(() => {
    const forecast: Array<{ day: string; hours: number; courses: number }> = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const data = dayMap.get(dateKey(date));
      forecast.push({
        day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        hours: data?.hoursTarget || 0,
        courses: data?.courses.length || 0,
      });
    }
    return forecast;
  }, [dayMap, today]);

  const maxHours = Math.max(...weekForecast.map(f => f.hours), 1);

  // AI-generated tips based on the data
  const aiTips = useMemo(() => {
    const tips: string[] = [];
    const todayCourses = todayData?.courses || [];

    if (todayCourses.length === 0) {
      tips.push('No courses scheduled today. Review previous material or explore ahead.');
    } else if (todayCourses.length >= 3) {
      tips.push('Heavy day ahead. Prioritize the most difficult course first when focus is highest.');
    }

    const hasAdvanced = todayCourses.some((c: any) => c.difficulty === 'advanced');
    if (hasAdvanced) {
      tips.push('Advanced content today. Take breaks every 25 minutes (Pomodoro technique) for better retention.');
    }

    if (todayData?.isProjectDay) {
      tips.push('Project day! Apply what you\'ve learned. Aim for a working prototype, not perfection.');
    }

    const upcomingDeadlines = upcomingMilestones.filter(m => {
      const daysAway = Math.ceil((m.date.getTime() - today.getTime()) / 86400000);
      return daysAway <= 3 && daysAway > 0;
    });
    if (upcomingDeadlines.length > 0) {
      tips.push(`${upcomingDeadlines.length} milestone${upcomingDeadlines.length > 1 ? 's' : ''} due within 3 days. Consider allocating extra time.`);
    }

    // Check for skill stacking opportunity
    const skillsToday = new Set(todayCourses.flatMap((c: any) => c.skillsGained || []));
    if (skillsToday.size >= 3) {
      tips.push(`Great skill synergy today: ${[...skillsToday].slice(0, 3).join(', ')} — these compound together.`);
    }

    return tips.length > 0 ? tips : ['Stay consistent. Small daily progress compounds into mastery.'];
  }, [todayData, upcomingMilestones, today]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-mirage-teal/30 rounded-lg p-4 bg-gradient-to-br from-mirage-teal/5 to-transparent"
      >
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-mirage-teal" />
          <p className="text-xs text-mirage-teal font-mono">TODAY'S FOCUS</p>
        </div>

        {todayData ? (
          <div className="space-y-3">
            {todayData.weekFocus && (
              <p className="text-sm text-white/80 font-medium">{todayData.weekFocus}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {todayData.courses.length} course{todayData.courses.length !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {todayData.hoursTarget}h target</span>
            </div>
            {todayData.courses.slice(0, 2).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: PROVIDER_COLORS[c.provider] || '#fff' }} />
                <span className="text-white/60 truncate">{c.courseName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30">No study scheduled for today.</p>
        )}
      </motion.div>

      {/* 7-Day Load Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="border border-mirage-border rounded-lg p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <p className="text-xs text-orange-400 font-mono">7-DAY LOAD FORECAST</p>
        </div>

        <div className="flex items-end gap-1.5 h-16 mb-2">
          {weekForecast.map((f, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: '48px' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (f.hours / maxHours) * 48)}px` }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="absolute bottom-0 w-full rounded-t-sm"
                  style={{
                    background: i === 0
                      ? 'linear-gradient(to top, #00d4aa, #00bcd4)'
                      : f.hours > 0
                        ? `linear-gradient(to top, ${intensityColor(Math.min(4, Math.ceil(f.courses / 1.5)))}, ${intensityColor(Math.min(4, Math.ceil(f.courses / 1.5)))}80)`
                        : 'rgba(255,255,255,0.05)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {weekForecast.map((f, i) => (
            <div key={i} className="flex-1 text-center">
              <p className={`text-[9px] font-mono ${i === 0 ? 'text-mirage-teal' : 'text-white/25'}`}>{f.day}</p>
              <p className="text-[8px] text-white/15 font-mono">{f.hours}h</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Tips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-purple-500/20 rounded-lg p-4 bg-purple-500/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-purple-400" />
          <p className="text-xs text-purple-400 font-mono">AI STUDY TIPS</p>
        </div>

        <div className="space-y-2">
          {aiTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <Lightbulb className="w-3 h-3 text-purple-400/50 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/50 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>

        {/* Upcoming milestones */}
        {upcomingMilestones.length > 0 && (
          <div className="mt-3 pt-3 border-t border-purple-500/15">
            <p className="text-[10px] text-purple-400/40 font-mono mb-2">UPCOMING MILESTONES</p>
            <div className="space-y-1.5">
              {upcomingMilestones.map((m, i) => {
                const daysAway = Math.ceil((m.date.getTime() - new Date().getTime()) / 86400000);
                return (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-white/40 truncate flex-1">{m.milestone}</span>
                    <span className={`font-mono ml-2 flex-shrink-0 ${daysAway <= 2 ? 'text-red-400/60' : 'text-white/20'}`}>
                      {daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `${daysAway}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RAG Insights Panel
   ═══════════════════════════════════════════════════════════════════════════ */

function RAGInsightsPanel({ ragInsights, loading, reskillPlan }: {
  ragInsights: any;
  loading: boolean;
  reskillPlan: any;
}) {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Analyzing your knowledge base through AI...</p>
        <p className="text-white/20 text-xs">Parsing GitHub repos and resume into actionable insights</p>
      </div>
    );
  }

  const insights = ragInsights || reskillPlan?.ragInsights;
  if (!insights) {
    return (
      <div className="text-center py-20 border border-mirage-border rounded-lg">
        <Brain className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 mb-2">No knowledge base data available</p>
        <p className="text-white/20 text-sm">Upload your resume or connect GitHub to get AI-powered insights</p>
        <Link to="/knowledge-graph" className="inline-block mt-4 text-mirage-teal text-sm hover:text-mirage-cyan transition-colors">
          Go to Knowledge Graph
        </Link>
      </div>
    );
  }

  const IMPACT_COLORS = {
    high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'HIGH IMPACT' },
    medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'MEDIUM' },
    low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'LOW' },
  };

  return (
    <div className="space-y-6">
      {insights.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-purple-500/20 rounded-lg p-5 bg-purple-500/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <p className="text-xs text-purple-400/70 font-mono">AI ANALYSIS OF YOUR KNOWLEDGE BASE</p>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{insights.summary}</p>

          <div className="grid grid-cols-3 gap-4 mt-4">
            {insights.totalProjects && (
              <div className="bg-purple-500/10 rounded p-3">
                <p className="text-xs text-purple-400/50">Projects Found</p>
                <p className="text-lg font-mono text-purple-400">{insights.totalProjects}</p>
              </div>
            )}
            {insights.dominantTechStack?.length > 0 && (
              <div className="bg-purple-500/10 rounded p-3 col-span-2">
                <p className="text-xs text-purple-400/50 mb-1">Dominant Tech Stack</p>
                <div className="flex flex-wrap gap-1">
                  {insights.dominantTechStack.slice(0, 5).map((t: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-0.5 border border-purple-500/30 rounded text-purple-300/70">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {insights.hiddenStrengths?.length > 0 && (
            <div className="mt-4 border-t border-purple-500/20 pt-3">
              <p className="text-xs text-purple-400/50 font-mono mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> HIDDEN STRENGTHS (found in your code but not listed in profile)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {insights.hiddenStrengths.map((s: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 border border-green-500/30 rounded text-green-400/70 bg-green-500/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {insights.insights?.length > 0 && (
        <div>
          <p className="text-xs text-white/30 font-mono mb-3">ACTIONABLE INSIGHTS ({insights.insights.length})</p>
          <div className="space-y-3">
            {insights.insights.map((insight: any, i: number) => {
              const impact = IMPACT_COLORS[insight.impact as keyof typeof IMPACT_COLORS] || IMPACT_COLORS.low;
              const isExpanded = expandedInsight === i;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border border-mirage-border rounded-lg overflow-hidden hover:border-white/15 transition-colors"
                >
                  <button
                    onClick={() => setExpandedInsight(isExpanded ? null : i)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${impact.bg} ${impact.text} ${impact.border}`}>
                            {impact.label}
                          </span>
                          <span className="text-[10px] text-white/20 font-mono uppercase">{insight.source}</span>
                          {insight.repoName && (
                            <span className="text-[10px] text-white/20 font-mono">{insight.repoName}</span>
                          )}
                        </div>
                        <p className="text-sm text-white/90 font-medium">{insight.title}</p>
                        <p className="text-xs text-white/40 mt-1 line-clamp-2">{insight.finding}</p>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30 ml-3" /> : <ChevronRight className="w-4 h-4 text-white/30 ml-3" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-mirage-border pt-3 space-y-3">
                          <div className="border-l-2 border-mirage-teal/30 pl-3">
                            <p className="text-[10px] text-mirage-teal/60 font-mono mb-1">RECOMMENDATION</p>
                            <p className="text-xs text-white/60 leading-relaxed">{insight.recommendation}</p>
                          </div>
                          {insight.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {insight.skills.map((s: string, j: number) => (
                                <span key={j} className="text-xs px-2 py-0.5 border border-mirage-border rounded text-white/40">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {insights.chunksUsed && (
        <p className="text-[10px] text-white/15 font-mono text-center">
          Generated from {insights.chunksUsed} knowledge base chunks via ChromaDB RAG
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function intensityColor(level: number): string {
  const colors = [
    'rgba(255,255,255,0.04)',
    'rgba(0,212,170,0.15)',
    'rgba(0,212,170,0.30)',
    'rgba(0,212,170,0.50)',
    'rgba(0,212,170,0.75)',
  ];
  return colors[Math.min(level, 4)];
}

function parseWeekDate(dateStr: string, fallback: Date): Date | null {
  // Try ISO format first
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;

  // Try "Mar 10" format
  const match = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
  if (match) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIdx = monthNames.indexOf(match[1].toLowerCase().slice(0, 3));
    if (monthIdx >= 0) {
      return new Date(fallback.getFullYear(), monthIdx, parseInt(match[2]));
    }
  }

  return null;
}

function buildWeeksFromSteps(steps: any[], totalWeeks: number, hoursPerWeek: number, planStart: Date) {
  const weeks: any[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const weekDate = new Date(planStart);
    weekDate.setDate(planStart.getDate() + (w - 1) * 7);

    const activeSteps = steps.filter((step: any) => {
      const match = step.weekRange?.match(/(\d+)/);
      const startWeek = match ? parseInt(match[1]) : 1;
      const endMatch = step.weekRange?.match(/(\d+)$/);
      const endWeek = endMatch ? parseInt(endMatch[1]) : startWeek;
      return w >= startWeek && w <= endWeek;
    });

    weeks.push({
      week: w,
      date: weekDate.toISOString().split('T')[0],
      focus: activeSteps[0]?.courseName || `Week ${w} studies`,
      hoursRequired: hoursPerWeek,
      deliverables: activeSteps
        .flatMap((s: any) => s.milestones || [])
        .slice(0, 3)
        .concat(activeSteps.length > 0 ? [] : ['Continue current coursework']),
    });
  }

  return weeks;
}

function generateAISuggestions(dayMap: Map<string, DayData>, steps: any[], skillGapAnalysis?: any[]) {
  const criticalSkills = skillGapAnalysis
    ?.filter((s: any) => s.priority === 'critical')
    .map((s: any) => s.skill) || [];

  for (const [, dayData] of dayMap) {
    const suggestions: string[] = [];
    const dayOfWeek = dayData.date.getDay();

    // Monday: week planning
    if (dayOfWeek === 1 && dayData.courses.length > 0) {
      suggestions.push(`Start of week: Set clear goals for ${dayData.courses.length} active course${dayData.courses.length > 1 ? 's' : ''}. Block focused study time in your calendar.`);
    }

    // Mid-week check
    if (dayOfWeek === 3 && dayData.courses.length > 0) {
      suggestions.push('Mid-week checkpoint: Review notes from earlier this week. Active recall boosts retention by 50%.');
    }

    // Weekend project suggestion
    if (dayData.isProjectDay) {
      suggestions.push('Weekend project session: Build something tangible. Even a small prototype solidifies theory into practice.');
    }

    // Milestone deadline approaching
    if (dayData.milestones.length > 0) {
      suggestions.push(`Milestone day: "${dayData.milestones[0]}" is due. Focus your energy here before moving to new material.`);
    }

    // Heavy course load
    if (dayData.courses.length >= 2) {
      const providers = [...new Set(dayData.courses.map((c: any) => c.provider))];
      suggestions.push(`Multiple courses active (${providers.join(', ')}). Alternate between them in 45-min blocks for better retention.`);
    }

    // Critical skill alignment
    const todaySkills = dayData.courses.flatMap((c: any) => c.skillsGained || []);
    const criticalToday = todaySkills.filter((s: string) => criticalSkills.some(cs => s.toLowerCase().includes(cs.toLowerCase())));
    if (criticalToday.length > 0) {
      suggestions.push(`High-priority skill${criticalToday.length > 1 ? 's' : ''} today: ${criticalToday.join(', ')}. These are critical for your target role.`);
    }

    if (suggestions.length > 0) {
      dayData.aiSuggestion = suggestions[0]; // Primary suggestion
    }
  }
}
