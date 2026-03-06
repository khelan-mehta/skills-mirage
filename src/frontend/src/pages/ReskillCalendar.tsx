import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Brain, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft,
  Sparkles, Target, Clock, BookOpen, CheckCircle2, AlertTriangle,
  Lightbulb, ExternalLink, Flame, Zap, GraduationCap, Play,
  TrendingUp, Star, Award, Sun, Moon, Sunrise, Coffee,
  BarChart3, CircleDot, ArrowUpRight, RefreshCw, Timer,
  ChevronUp, Layers, MousePointerClick, CalendarDays,
} from 'lucide-react';
import { useSeekerStore } from '../stores/seekerStore';
import ReskillPath from '../components/worker/ReskillPath';
import api from '../utils/api';

type ViewMode = 'timeline' | 'calendar' | 'insights';
type CalendarMode = 'month' | 'week';

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PROVIDER_COLORS: Record<string, string> = {
  NPTEL: '#00d4aa', SWAYAM: '#00bcd4', PMKVY: '#4dd0e1',
  Coursera: '#ffd740', freeCodeCamp: '#a78bfa', Udemy: '#a855f7', Other: '#ffffff',
};

const DIFFICULTY_BADGE: Record<string, { color: string; bg: string; label: string; full: string }> = {
  beginner: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'B', full: 'Beginner' },
  intermediate: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'I', full: 'Intermediate' },
  advanced: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'A', full: 'Advanced' },
};

const TIME_BLOCKS = [
  { key: 'morning', label: 'Morning', time: '6:00 - 12:00', icon: Sunrise, color: '#fbbf24', hours: '6AM-12PM' },
  { key: 'afternoon', label: 'Afternoon', time: '12:00 - 17:00', icon: Sun, color: '#f97316', hours: '12PM-5PM' },
  { key: 'evening', label: 'Evening', time: '17:00 - 22:00', icon: Moon, color: '#8b5cf6', hours: '5PM-10PM' },
];

/* --- Types ---------------------------------------------------------------- */

interface DayData {
  date: Date;
  courses: any[];
  milestones: string[];
  deliverables: string[];
  hoursTarget: number;
  intensity: number;
  isProjectDay: boolean;
  practicalProject?: string;
  aiSuggestion?: string;
  weekFocus?: string;
  reasoning?: string;
  completed?: boolean;
  timeBlocks?: { morning: any[]; afternoon: any[]; evening: any[] };
  priorityCourse?: any;
  studyTip?: string;
  optimalTime?: string;
}

/* === Main Component ====================================================== */

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
    <div className="pt-24 px-8 min-h-screen max-w-7xl mx-auto pb-20">
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
          <EnhancedCalendar
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
            ragInsights={pickBestInsights(ragInsights, reskillPlan?.ragInsights)}
            loading={insightsLoading}
            reskillPlan={reskillPlan}
          />
        )}
      </motion.div>
    </div>
  );
}

/* =========================================================================
   ENHANCED CALENDAR — Month + Week views with AI scheduling
   ========================================================================= */

function EnhancedCalendar({ steps, weeklyBreakdown, totalWeeks, hoursPerWeek, skillGapAnalysis, personalizedInsight }: {
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
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(true);

  const planStart = useMemo(() => {
    const firstStep = steps.find((s: any) => s.startDate);
    return firstStep ? new Date(firstStep.startDate) : new Date();
  }, [steps]);

  const planEnd = useMemo(() => {
    const d = new Date(planStart);
    d.setDate(d.getDate() + totalWeeks * 7);
    return d;
  }, [planStart, totalWeeks]);

  // Build day-level data map
  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();
    const weeks = weeklyBreakdown?.length
      ? weeklyBreakdown
      : buildWeeksFromSteps(steps, totalWeeks, hoursPerWeek, planStart);

    for (const step of steps) {
      const start = step.startDate ? new Date(step.startDate) : new Date(planStart);
      const end = step.endDate ? new Date(step.endDate) : new Date(start.getTime() + 14 * 86400000);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = dateKey(d);
        if (!map.has(key)) {
          map.set(key, {
            date: new Date(d), courses: [], milestones: [], deliverables: [],
            hoursTarget: 0, intensity: 0, isProjectDay: false,
            timeBlocks: { morning: [], afternoon: [], evening: [] },
          });
        }
        const dayData = map.get(key)!;
        dayData.courses.push(step);

        if (isSameDay(d, end) && step.milestones?.length) {
          dayData.milestones.push(...step.milestones);
        }

        if ((d.getDay() === 0 || d.getDay() === 6) && step.practicalProject) {
          dayData.isProjectDay = true;
          dayData.practicalProject = step.practicalProject;
        }
      }
    }

    for (const week of weeks) {
      const weekDate = week.date ? parseWeekDate(week.date, planStart) : null;
      if (!weekDate) continue;

      for (let d = 0; d < 7; d++) {
        const day = new Date(weekDate);
        day.setDate(weekDate.getDate() + d);
        const key = dateKey(day);
        if (!map.has(key)) {
          map.set(key, {
            date: new Date(day), courses: [], milestones: [], deliverables: [],
            hoursTarget: 0, intensity: 0, isProjectDay: false,
            timeBlocks: { morning: [], afternoon: [], evening: [] },
          });
        }
        const dayData = map.get(key)!;
        dayData.weekFocus = week.focus;
        dayData.hoursTarget = Math.round((week.hoursRequired || hoursPerWeek) / 7 * 10) / 10;

        if (week.deliverables?.length) {
          const idx = d % week.deliverables.length;
          if (d < week.deliverables.length) {
            dayData.deliverables.push(week.deliverables[idx]);
          }
        }
      }
    }

    // Compute intensity + AI scheduling for all days
    for (const [, dayData] of map) {
      const courseCount = dayData.courses.length;
      const hasMilestone = dayData.milestones.length > 0;
      const hasDeliverable = dayData.deliverables.length > 0;
      dayData.intensity = Math.min(4,
        courseCount + (hasMilestone ? 1 : 0) + (hasDeliverable ? 1 : 0) + (dayData.isProjectDay ? 1 : 0)
      );

      // AI time-block scheduling
      assignTimeBlocks(dayData);

      // Determine priority course
      if (dayData.courses.length > 0) {
        dayData.priorityCourse = dayData.courses.find((c: any) => c.difficulty === 'advanced')
          || dayData.courses.find((c: any) => c.difficulty === 'intermediate')
          || dayData.courses[0];
      }

      // Optimal study time suggestion
      const dow = dayData.date.getDay();
      if (dow === 0 || dow === 6) {
        dayData.optimalTime = 'morning';
        dayData.studyTip = 'Weekends are ideal for deep focus. Start with the hardest material in the morning.';
      } else if (dayData.courses.some((c: any) => c.difficulty === 'advanced')) {
        dayData.optimalTime = 'morning';
        dayData.studyTip = 'Advanced content benefits from peak cognitive hours. Tackle it first thing.';
      } else {
        dayData.optimalTime = 'evening';
        dayData.studyTip = 'Review and practice in the evening. Spaced repetition before sleep boosts memory consolidation.';
      }
    }

    generateAISuggestions(map, steps, skillGapAnalysis);
    return map;
  }, [steps, weeklyBreakdown, totalWeeks, hoursPerWeek, planStart, skillGapAnalysis]);

  // Current week dates
  const currentWeekDates = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [today, weekOffset]);

  // Calendar grid for month view
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    let startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ date: Date | null; dayData: DayData | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      const prevDate = new Date(currentYear, currentMonth, -startOffset + i + 1);
      cells.push({ date: prevDate, dayData: dayMap.get(dateKey(prevDate)) || null });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentYear, currentMonth, d);
      cells.push({ date, dayData: dayMap.get(dateKey(date)) || null });
    }
    while (cells.length % 7 !== 0) {
      const nextDate = new Date(currentYear, currentMonth + 1, cells.length - startOffset - lastDay.getDate() + 1);
      cells.push({ date: nextDate, dayData: dayMap.get(dateKey(nextDate)) || null });
    }
    return cells;
  }, [currentMonth, currentYear, dayMap]);

  // Stats
  const monthStats = useMemo(() => {
    let totalHours = 0, activeDays = 0, milestoneCount = 0, projectDays = 0;
    const coursesThisMonth = new Set<string>();

    for (const cell of calendarGrid) {
      if (!cell.dayData || !cell.date || cell.date.getMonth() !== currentMonth) continue;
      activeDays++;
      totalHours += cell.dayData.hoursTarget;
      milestoneCount += cell.dayData.milestones.length;
      if (cell.dayData.isProjectDay) projectDays++;
      cell.dayData.courses.forEach((c: any) => coursesThisMonth.add(c.courseName));
    }
    return { totalHours: Math.round(totalHours), activeDays, milestoneCount, projectDays, courseCount: coursesThisMonth.size };
  }, [calendarGrid, currentMonth]);

  // Streak computation
  const streak = useMemo(() => {
    let count = 0;
    const d = new Date(today);
    while (true) {
      const key = dateKey(d);
      if (completedDays.has(key) || (dayMap.has(key) && d > today)) break;
      if (dayMap.has(key) && completedDays.has(key)) count++;
      else if (!dayMap.has(key)) { d.setDate(d.getDate() - 1); continue; }
      else break;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [completedDays, dayMap, today]);

  // Week-level progress
  const weekProgress = useMemo(() => {
    let totalDays = 0, completed = 0;
    for (const date of currentWeekDates) {
      const key = dateKey(date);
      if (dayMap.has(key)) {
        totalDays++;
        if (completedDays.has(key)) completed++;
      }
    }
    return totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
  }, [currentWeekDates, dayMap, completedDays]);

  const toggleDayComplete = useCallback((key: string) => {
    setCompletedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Navigation
  const canGoPrevMonth = currentYear > planStart.getFullYear() || (currentYear === planStart.getFullYear() && currentMonth > planStart.getMonth());
  const canGoNextMonth = currentYear < planEnd.getFullYear() || (currentYear === planEnd.getFullYear() && currentMonth < planEnd.getMonth());

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  // Week label
  const weekLabel = useMemo(() => {
    const s = currentWeekDates[0];
    const e = currentWeekDates[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} - ${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} - ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
  }, [currentWeekDates]);

  // Get the current week number in the plan
  const currentPlanWeek = useMemo(() => {
    const diffMs = today.getTime() - planStart.getTime();
    return Math.max(1, Math.min(totalWeeks, Math.ceil(diffMs / (7 * 86400000))));
  }, [today, planStart, totalWeeks]);

  return (
    <div className="space-y-5">
      {/* AI Insight Banner */}
      {personalizedInsight && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden border border-purple-500/20 rounded-xl p-4 bg-gradient-to-r from-purple-500/[0.07] via-transparent to-mirage-teal/[0.05]"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start gap-3 relative">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-purple-400/60 font-mono mb-1 tracking-wider">AI STUDY PLANNER — WEEK {currentPlanWeek} OF {totalWeeks}</p>
              <p className="text-sm text-white/70 leading-relaxed">{personalizedInsight}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-white/[0.03] border border-mirage-border rounded-lg p-0.5">
            {([
              { key: 'week' as CalendarMode, label: 'Week', icon: CalendarDays },
              { key: 'month' as CalendarMode, label: 'Month', icon: Calendar },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setCalendarMode(m.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                  calendarMode === m.key
                    ? 'bg-mirage-teal/15 text-mirage-teal border border-mirage-teal/30'
                    : 'text-white/30 hover:text-white/50 border border-transparent'
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          {calendarMode === 'month' ? (
            <div className="flex items-center gap-2 ml-2">
              <button onClick={goToPrevMonth} disabled={!canGoPrevMonth}
                className="w-7 h-7 rounded-md border border-mirage-border flex items-center justify-center hover:border-white/20 transition-colors disabled:opacity-20">
                <ChevronLeft className="w-3.5 h-3.5 text-white/50" />
              </button>
              <h2 className="text-sm font-medium text-white/90 font-mono min-w-[160px] text-center">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button onClick={goToNextMonth} disabled={!canGoNextMonth}
                className="w-7 h-7 rounded-md border border-mirage-border flex items-center justify-center hover:border-white/20 transition-colors disabled:opacity-20">
                <ChevronRight className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => setWeekOffset(w => w - 1)}
                className="w-7 h-7 rounded-md border border-mirage-border flex items-center justify-center hover:border-white/20 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-white/50" />
              </button>
              <h2 className="text-sm font-medium text-white/90 font-mono min-w-[220px] text-center">
                {weekLabel}
              </h2>
              <button onClick={() => setWeekOffset(w => w + 1)}
                className="w-7 h-7 rounded-md border border-mirage-border flex items-center justify-center hover:border-white/20 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setWeekOffset(0); }}
            className="text-[10px] text-mirage-teal font-mono px-3 py-1.5 border border-mirage-teal/30 rounded-md hover:bg-mirage-teal/10 transition-colors"
          >
            TODAY
          </button>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-md border transition-colors ${
              showAIPanel ? 'border-purple-500/30 text-purple-400 bg-purple-500/5' : 'border-mirage-border text-white/30 hover:text-white/50'
            }`}
          >
            <Sparkles className="w-3 h-3" /> AI Assist
          </button>
          {/* Intensity legend */}
          <div className="flex items-center gap-1 text-[10px] text-white/20 font-mono">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className="w-3 h-3 rounded-sm" style={{ background: intensityColor(level) }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: 'Study Hours', value: monthStats.totalHours, unit: 'hrs', icon: Clock, color: '#00d4aa' },
          { label: 'Active Days', value: monthStats.activeDays, unit: '', icon: Flame, color: '#f97316' },
          { label: 'Milestones', value: monthStats.milestoneCount, unit: '', icon: Award, color: '#fbbf24' },
          { label: 'Projects', value: monthStats.projectDays, unit: '', icon: BookOpen, color: '#a855f7' },
          { label: 'Courses', value: monthStats.courseCount, unit: '', icon: GraduationCap, color: '#00bcd4' },
          { label: 'Streak', value: streak, unit: 'd', icon: Zap, color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} className="border border-mirage-border/60 rounded-lg p-2.5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors group">
            <div className="flex items-center gap-1.5 mb-0.5">
              <stat.icon className="w-3 h-3" style={{ color: stat.color }} />
              <span className="text-[9px] text-white/25 font-mono uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-base font-mono font-semibold" style={{ color: stat.color }}>
              {stat.value}<span className="text-[10px] text-white/20 ml-0.5 font-normal">{stat.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Calendar Content */}
      <div className={`${showAIPanel ? 'grid grid-cols-[1fr_300px] gap-5' : ''}`}>
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {calendarMode === 'month' ? (
              <motion.div key="month" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                <MonthGrid
                  calendarGrid={calendarGrid}
                  today={today}
                  planStart={planStart}
                  planEnd={planEnd}
                  currentMonth={currentMonth}
                  selectedDay={selectedDay}
                  hoveredDay={hoveredDay}
                  completedDays={completedDays}
                  onSelectDay={setSelectedDay}
                  onHoverDay={setHoveredDay}
                  onToggleComplete={toggleDayComplete}
                />
              </motion.div>
            ) : (
              <motion.div key="week" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <WeekView
                  dates={currentWeekDates}
                  dayMap={dayMap}
                  today={today}
                  planStart={planStart}
                  planEnd={planEnd}
                  selectedDay={selectedDay}
                  completedDays={completedDays}
                  weekProgress={weekProgress}
                  onSelectDay={setSelectedDay}
                  onToggleComplete={toggleDayComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected Day Detail */}
          <AnimatePresence>
            {selectedDay && (
              <DayDetailPanel
                day={selectedDay}
                isCompleted={completedDays.has(dateKey(selectedDay.date))}
                onClose={() => setSelectedDay(null)}
                onToggleComplete={() => toggleDayComplete(dateKey(selectedDay.date))}
              />
            )}
          </AnimatePresence>
        </div>

        {/* AI Sidebar */}
        {showAIPanel && (
          <AISidebar dayMap={dayMap} today={today} steps={steps} selectedDay={selectedDay} completedDays={completedDays} />
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   MONTH GRID
   ========================================================================= */

function MonthGrid({ calendarGrid, today, planStart, planEnd, currentMonth, selectedDay, hoveredDay, completedDays, onSelectDay, onHoverDay, onToggleComplete }: {
  calendarGrid: Array<{ date: Date | null; dayData: DayData | null }>;
  today: Date;
  planStart: Date;
  planEnd: Date;
  currentMonth: number;
  selectedDay: DayData | null;
  hoveredDay: string | null;
  completedDays: Set<string>;
  onSelectDay: (d: DayData | null) => void;
  onHoverDay: (key: string | null) => void;
  onToggleComplete: (key: string) => void;
}) {
  return (
    <div className="border border-mirage-border rounded-xl overflow-hidden bg-white/[0.005]">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-mirage-border bg-white/[0.02]">
        {DAYS.map((day, i) => (
          <div key={day} className={`px-2 py-2.5 text-center text-[10px] font-mono tracking-widest uppercase ${
            i >= 5 ? 'text-white/20' : 'text-white/35'
          }`}>
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {calendarGrid.map((cell, i) => {
          if (!cell.date) return <div key={i} className="min-h-[110px] border-b border-r border-mirage-border/30" />;

          const key = dateKey(cell.date);
          const isToday = isSameDay(cell.date, today);
          const isInPlanRange = cell.date >= planStart && cell.date <= planEnd;
          const isCurrentMonth = cell.date.getMonth() === currentMonth;
          const hasData = !!cell.dayData && cell.dayData.courses.length > 0;
          const isSelected = selectedDay && isSameDay(cell.date, selectedDay.date);
          const isHovered = hoveredDay === key;
          const isCompleted = completedDays.has(key);
          const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;

          return (
            <motion.div
              key={i}
              className={`
                min-h-[110px] border-b border-r border-mirage-border/30 p-1.5 relative cursor-pointer transition-all duration-200
                ${!isCurrentMonth ? 'opacity-25' : ''}
                ${isCurrentMonth && !isInPlanRange ? 'opacity-40' : ''}
                ${isSelected ? 'ring-1 ring-mirage-teal/60 ring-inset bg-mirage-teal/[0.06] z-10' : ''}
                ${isToday && !isSelected ? 'bg-mirage-teal/[0.04]' : ''}
                ${isWeekend && !isSelected && !isToday ? 'bg-white/[0.008]' : ''}
                ${isHovered && !isSelected ? 'bg-white/[0.03]' : ''}
                ${isCompleted ? 'bg-green-500/[0.03]' : ''}
              `}
              onClick={() => cell.dayData && onSelectDay(isSelected ? null : cell.dayData)}
              onMouseEnter={() => onHoverDay(key)}
              onMouseLeave={() => onHoverDay(null)}
            >
              {/* Date header row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  {isToday ? (
                    <span className="bg-mirage-teal text-black w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-1.5 py-0.5">
                      {cell.date.getDate()}
                    </span>
                  ) : (
                    <span className={`text-xs font-mono ${hasData ? 'text-white/60' : 'text-white/25'}`}>
                      {cell.date.getDate()}
                    </span>
                  )}
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-green-400/60" />}
                </div>
                <div className="flex items-center gap-0.5">
                  {hasData && cell.dayData!.intensity > 0 && (
                    <div className="w-2 h-2 rounded-full" style={{ background: intensityColor(cell.dayData!.intensity) }} />
                  )}
                  {cell.dayData?.aiSuggestion && (
                    <Sparkles className="w-2.5 h-2.5 text-purple-400/40" />
                  )}
                </div>
              </div>

              {/* Content */}
              {hasData && (
                <div className="space-y-0.5">
                  {cell.dayData!.courses.slice(0, 2).map((course: any, j: number) => {
                    const provColor = PROVIDER_COLORS[course.provider] || '#fff';
                    return (
                      <div
                        key={j}
                        className="text-[9px] leading-tight truncate rounded-sm px-1 py-[3px] border-l-2 ml-0.5"
                        style={{
                          color: provColor,
                          borderLeftColor: provColor,
                          background: `${provColor}08`,
                        }}
                      >
                        {course.courseName?.split(' ').slice(0, 3).join(' ')}
                      </div>
                    );
                  })}
                  {cell.dayData!.courses.length > 2 && (
                    <span className="text-[8px] text-white/20 font-mono ml-1">+{cell.dayData!.courses.length - 2}</span>
                  )}

                  {cell.dayData!.milestones.length > 0 && (
                    <div className="flex items-center gap-0.5 text-[9px] text-yellow-400/70 mt-0.5">
                      <Star className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{cell.dayData!.milestones[0]?.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  )}

                  {cell.dayData!.isProjectDay && (
                    <div className="flex items-center gap-0.5 text-[9px] text-purple-400/60">
                      <Layers className="w-2.5 h-2.5" />
                      <span>Project</span>
                    </div>
                  )}
                </div>
              )}

              {/* Hours badge */}
              {hasData && cell.dayData!.hoursTarget > 0 && (
                <div className="absolute bottom-1 left-1 text-[8px] text-white/15 font-mono">
                  {cell.dayData!.hoursTarget}h
                </div>
              )}

              {/* Hover actions */}
              {isHovered && hasData && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-1 right-1"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleComplete(key); }}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'border-green-400/50 bg-green-400/20 text-green-400'
                        : 'border-white/15 hover:border-mirage-teal/50 text-white/20 hover:text-mirage-teal'
                    }`}
                    title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   WEEK VIEW — Time-blocked schedule view
   ========================================================================= */

function WeekView({ dates, dayMap, today, planStart, planEnd, selectedDay, completedDays, weekProgress, onSelectDay, onToggleComplete }: {
  dates: Date[];
  dayMap: Map<string, DayData>;
  today: Date;
  planStart: Date;
  planEnd: Date;
  selectedDay: DayData | null;
  completedDays: Set<string>;
  weekProgress: number;
  onSelectDay: (d: DayData | null) => void;
  onToggleComplete: (key: string) => void;
}) {
  // Get the week's focus from the first day that has data
  const weekFocus = useMemo(() => {
    for (const d of dates) {
      const data = dayMap.get(dateKey(d));
      if (data?.weekFocus) return data.weekFocus;
    }
    return null;
  }, [dates, dayMap]);

  // Aggregate week courses
  const weekCourses = useMemo(() => {
    const seen = new Set<string>();
    const courses: any[] = [];
    for (const d of dates) {
      const data = dayMap.get(dateKey(d));
      data?.courses.forEach((c: any) => {
        if (!seen.has(c.courseName)) {
          seen.add(c.courseName);
          courses.push(c);
        }
      });
    }
    return courses;
  }, [dates, dayMap]);

  return (
    <div className="space-y-4">
      {/* Week Header */}
      <div className="flex items-center justify-between border border-mirage-border/60 rounded-xl p-3 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          {weekFocus && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-mirage-teal/70" />
              <div>
                <p className="text-[10px] text-white/25 font-mono uppercase tracking-wider">Week Focus</p>
                <p className="text-sm text-white/80">{weekFocus}</p>
              </div>
            </div>
          )}
          {weekCourses.length > 0 && (
            <div className="flex items-center gap-1.5 ml-4 border-l border-mirage-border pl-4">
              {weekCourses.slice(0, 4).map((c: any, i: number) => (
                <span
                  key={i}
                  className="text-[9px] px-2 py-0.5 rounded-full border font-mono"
                  style={{
                    color: PROVIDER_COLORS[c.provider] || '#fff',
                    borderColor: `${PROVIDER_COLORS[c.provider] || '#fff'}30`,
                    background: `${PROVIDER_COLORS[c.provider] || '#fff'}08`,
                  }}
                >
                  {c.provider}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Progress ring */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="#00d4aa"
                strokeWidth="2.5"
                strokeDasharray={`${weekProgress} 100`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-mirage-teal">
              {weekProgress}%
            </span>
          </div>
          <div>
            <p className="text-[10px] text-white/25 font-mono uppercase">Progress</p>
            <p className="text-xs text-white/50">{completedDays.size} days done</p>
          </div>
        </div>
      </div>

      {/* Weekly Grid — Time blocks x Days */}
      <div className="border border-mirage-border rounded-xl overflow-hidden bg-white/[0.005]">
        {/* Day header row */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-mirage-border bg-white/[0.02]">
          <div className="px-2 py-3 border-r border-mirage-border/50">
            <Timer className="w-3.5 h-3.5 text-white/20 mx-auto" />
          </div>
          {dates.map((date, i) => {
            const isToday = isSameDay(date, today);
            const key = dateKey(date);
            const isCompleted = completedDays.has(key);
            const hasData = dayMap.has(key) && (dayMap.get(key)?.courses.length || 0) > 0;
            const dayData = dayMap.get(key);

            return (
              <div
                key={i}
                className={`px-2 py-2 border-r border-mirage-border/50 text-center relative ${
                  isToday ? 'bg-mirage-teal/[0.06]' : ''
                }`}
              >
                <p className={`text-[10px] font-mono uppercase tracking-wider ${
                  isToday ? 'text-mirage-teal' : i >= 5 ? 'text-white/15' : 'text-white/25'
                }`}>
                  {DAYS_FULL[i].slice(0, 3)}
                </p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {isToday ? (
                    <span className="bg-mirage-teal text-black text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
                      {date.getDate()}
                    </span>
                  ) : (
                    <span className={`text-sm font-mono ${hasData ? 'text-white/70' : 'text-white/25'}`}>
                      {date.getDate()}
                    </span>
                  )}
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-green-400/60" />}
                </div>
                {hasData && dayData!.hoursTarget > 0 && (
                  <p className="text-[9px] text-white/20 font-mono mt-0.5">{dayData!.hoursTarget}h</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Time block rows */}
        {TIME_BLOCKS.map((block) => (
          <div key={block.key} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-mirage-border/30 last:border-b-0">
            {/* Time label */}
            <div className="px-2 py-3 border-r border-mirage-border/50 flex flex-col items-center justify-center gap-1">
              <block.icon className="w-3.5 h-3.5" style={{ color: `${block.color}80` }} />
              <span className="text-[9px] font-mono text-white/25">{block.label}</span>
              <span className="text-[8px] font-mono text-white/12">{block.hours}</span>
            </div>

            {/* Day cells for this time block */}
            {dates.map((date, i) => {
              const key = dateKey(date);
              const dayData = dayMap.get(key);
              const isToday = isSameDay(date, today);
              const isSelected = selectedDay && isSameDay(date, selectedDay.date);
              const blockCourses = dayData?.timeBlocks?.[block.key as keyof typeof dayData.timeBlocks] || [];
              const isOptimal = dayData?.optimalTime === block.key;

              return (
                <motion.div
                  key={i}
                  className={`
                    border-r border-mirage-border/30 p-1.5 min-h-[90px] relative cursor-pointer transition-all duration-150
                    ${isToday ? 'bg-mirage-teal/[0.02]' : ''}
                    ${isSelected ? 'bg-mirage-teal/[0.05] ring-1 ring-inset ring-mirage-teal/30' : 'hover:bg-white/[0.02]'}
                  `}
                  onClick={() => dayData && onSelectDay(isSelected ? null : dayData)}
                  whileHover={{ scale: 1.005 }}
                >
                  {/* Optimal time indicator */}
                  {isOptimal && dayData && dayData.courses.length > 0 && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-pulse" title="AI-recommended study time" />
                    </div>
                  )}

                  {/* Course blocks */}
                  {blockCourses.length > 0 ? (
                    <div className="space-y-1">
                      {blockCourses.map((course: any, j: number) => {
                        const provColor = PROVIDER_COLORS[course.provider] || '#fff';
                        const diff = DIFFICULTY_BADGE[course.difficulty] || DIFFICULTY_BADGE.beginner;
                        return (
                          <motion.div
                            key={j}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: j * 0.05 }}
                            className="rounded-md p-1.5 border-l-2 group/block relative"
                            style={{
                              borderLeftColor: provColor,
                              background: `linear-gradient(135deg, ${provColor}0A, transparent)`,
                            }}
                          >
                            <p className="text-[9px] font-medium truncate" style={{ color: provColor }}>
                              {course.courseName?.split(' ').slice(0, 4).join(' ')}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[8px] text-white/20 font-mono">{course.provider}</span>
                              <span className={`text-[8px] font-mono ${diff.color}`}>{diff.label}</span>
                            </div>

                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover/block:block z-20 pointer-events-none">
                              <div className="bg-[#1a1a1a] border border-mirage-border rounded-lg p-2 shadow-xl min-w-[180px]">
                                <p className="text-[10px] font-medium text-white/80">{course.courseName}</p>
                                <p className="text-[9px] text-white/30 mt-0.5">{course.provider} · {diff.full}</p>
                                {course.skillsGained?.slice(0, 3).map((s: string, k: number) => (
                                  <span key={k} className="inline-block text-[8px] px-1 py-0.5 border border-mirage-teal/20 rounded text-mirage-teal/50 mr-1 mt-1">{s}</span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : dayData && dayData.courses.length > 0 ? (
                    /* Empty time block for a day with courses (courses in other blocks) */
                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-[8px] text-white/10 font-mono">Free</span>
                    </div>
                  ) : null}

                  {/* Milestone badge in block */}
                  {block.key === 'evening' && dayData?.milestones && dayData.milestones.length > 0 && (
                    <div className="flex items-center gap-0.5 text-[8px] text-yellow-400/60 mt-1">
                      <Star className="w-2 h-2 flex-shrink-0" />
                      <span className="truncate">{dayData.milestones[0]?.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  )}

                  {/* Project day in block */}
                  {block.key === 'afternoon' && dayData?.isProjectDay && (
                    <div className="flex items-center gap-0.5 text-[8px] text-purple-400/50 mt-1">
                      <Layers className="w-2 h-2" />
                      <span>Project</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* AI Suggestion row */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] bg-purple-500/[0.02] border-t border-purple-500/10">
          <div className="px-2 py-2 border-r border-mirage-border/50 flex flex-col items-center justify-center gap-0.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400/50" />
            <span className="text-[8px] font-mono text-purple-400/30">AI TIP</span>
          </div>
          {dates.map((date, i) => {
            const dayData = dayMap.get(dateKey(date));
            return (
              <div key={i} className="border-r border-mirage-border/30 px-1.5 py-2 min-h-[40px]">
                {dayData?.aiSuggestion ? (
                  <p className="text-[8px] text-purple-300/40 leading-relaxed line-clamp-2">
                    {dayData.aiSuggestion.split('.')[0]}.
                  </p>
                ) : dayData?.studyTip ? (
                  <p className="text-[8px] text-purple-300/25 leading-relaxed line-clamp-2">
                    {dayData.studyTip.split('.')[0]}.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   DAY DETAIL PANEL — Expanded view of a selected day
   ========================================================================= */

function DayDetailPanel({ day, isCompleted, onClose, onToggleComplete }: {
  day: DayData;
  isCompleted: boolean;
  onClose: () => void;
  onToggleComplete: () => void;
}) {
  const dayName = day.date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 20, height: 0 }}
      className="border border-mirage-teal/20 rounded-xl overflow-hidden bg-gradient-to-b from-mirage-teal/[0.04] to-transparent"
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white/90 font-medium">{dayName}</p>
                {day.intensity > 0 && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: day.intensity }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-mirage-teal/50" />
                    ))}
                  </div>
                )}
              </div>
              {day.weekFocus && (
                <p className="text-xs text-mirage-teal/50 mt-0.5 flex items-center gap-1">
                  <Target className="w-3 h-3" /> {day.weekFocus}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {day.hoursTarget > 0 && (
              <div className="flex items-center gap-1 text-xs text-white/25 font-mono bg-white/[0.03] rounded-md px-2 py-1">
                <Clock className="w-3 h-3" /> {day.hoursTarget}h target
              </div>
            )}
            <button
              onClick={onToggleComplete}
              className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-md border transition-all ${
                isCompleted
                  ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : 'border-mirage-border text-white/30 hover:border-mirage-teal/30 hover:text-mirage-teal'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {isCompleted ? 'DONE' : 'MARK DONE'}
            </button>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-xs font-mono">
              CLOSE
            </button>
          </div>
        </div>

        {/* AI Suggestion */}
        {day.aiSuggestion && (
          <div className="border border-purple-500/15 rounded-lg p-3 bg-gradient-to-r from-purple-500/[0.06] to-transparent flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] text-purple-400/50 font-mono mb-0.5 tracking-wider">AI RECOMMENDATION</p>
              <p className="text-xs text-white/60 leading-relaxed">{day.aiSuggestion}</p>
              {day.optimalTime && (
                <p className="text-[10px] text-purple-400/30 mt-1.5 flex items-center gap-1">
                  {day.optimalTime === 'morning' && <Sunrise className="w-3 h-3" />}
                  {day.optimalTime === 'afternoon' && <Sun className="w-3 h-3" />}
                  {day.optimalTime === 'evening' && <Moon className="w-3 h-3" />}
                  Optimal study time: {day.optimalTime}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Time-blocked Schedule */}
        {day.timeBlocks && (day.timeBlocks.morning.length > 0 || day.timeBlocks.afternoon.length > 0 || day.timeBlocks.evening.length > 0) && (
          <div>
            <p className="text-[10px] text-white/25 font-mono mb-2 tracking-wider">SCHEDULED BLOCKS</p>
            <div className="grid grid-cols-3 gap-2">
              {TIME_BLOCKS.map(block => {
                const courses = day.timeBlocks![block.key as keyof typeof day.timeBlocks] || [];
                const isOptimal = day.optimalTime === block.key;
                return (
                  <div
                    key={block.key}
                    className={`border rounded-lg p-2.5 transition-colors ${
                      isOptimal
                        ? 'border-purple-500/20 bg-purple-500/[0.04]'
                        : 'border-mirage-border/50 bg-white/[0.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <block.icon className="w-3 h-3" style={{ color: `${block.color}80` }} />
                        <span className="text-[10px] font-mono text-white/30">{block.label}</span>
                      </div>
                      {isOptimal && (
                        <span className="text-[8px] font-mono text-purple-400/50 px-1 py-0.5 bg-purple-500/10 rounded">
                          BEST
                        </span>
                      )}
                    </div>
                    {courses.length > 0 ? courses.map((c: any, i: number) => (
                      <div key={i} className="text-[9px] mb-1 last:mb-0">
                        <span style={{ color: PROVIDER_COLORS[c.provider] || '#fff' }}>{c.courseName?.split(' ').slice(0, 3).join(' ')}</span>
                      </div>
                    )) : (
                      <p className="text-[9px] text-white/15">No courses</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Courses */}
        {day.courses.length > 0 && (
          <div>
            <p className="text-[10px] text-white/25 font-mono mb-2 tracking-wider">ACTIVE COURSES ({day.courses.length})</p>
            <div className="space-y-2">
              {day.courses.map((course: any, i: number) => {
                const diffBadge = DIFFICULTY_BADGE[course.difficulty] || DIFFICULTY_BADGE.beginner;
                const provColor = PROVIDER_COLORS[course.provider] || '#fff';
                const isExpanded = expandedCourse === i;

                return (
                  <motion.div
                    key={i}
                    className="border border-mirage-border/60 rounded-lg overflow-hidden hover:border-white/10 transition-colors"
                  >
                    <button
                      className="w-full text-left p-3 flex items-start justify-between"
                      onClick={() => setExpandedCourse(isExpanded ? null : i)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: provColor }} />
                          <p className="text-xs text-white/80 font-medium truncate">{course.courseName}</p>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${diffBadge.bg} ${diffBadge.color}`}>
                            {diffBadge.full}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/25 ml-[18px]">
                          {course.provider}{course.institution ? ` — ${course.institution}` : ''} · {course.weekRange}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-mirage-teal/60 hover:text-mirage-teal transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0 space-y-2 border-t border-mirage-border/30">
                            {course.reasoning && (
                              <p className="text-[10px] text-white/35 leading-relaxed border-l-2 border-mirage-teal/20 pl-2 mt-2">
                                {course.reasoning}
                              </p>
                            )}
                            {course.skillsGained?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {course.skillsGained.map((s: string, j: number) => (
                                  <span key={j} className="text-[9px] px-1.5 py-0.5 border border-mirage-teal/15 rounded text-mirage-teal/40">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            {course.milestones?.length > 0 && (
                              <div className="space-y-1 mt-1">
                                {course.milestones.map((m: string, j: number) => (
                                  <div key={j} className="flex items-center gap-1.5 text-[9px] text-yellow-400/50">
                                    <Star className="w-2.5 h-2.5 flex-shrink-0" /> {m}
                                  </div>
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

        {/* Milestones */}
        {day.milestones.length > 0 && (
          <div>
            <p className="text-[10px] text-yellow-400/40 font-mono mb-2 flex items-center gap-1 tracking-wider">
              <Award className="w-3 h-3" /> MILESTONES DUE
            </p>
            <div className="space-y-1.5">
              {day.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-yellow-400/60 bg-yellow-400/[0.04] border border-yellow-400/10 rounded-lg px-3 py-2">
                  <Star className="w-3 h-3 flex-shrink-0" /> {m}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables */}
        {day.deliverables.length > 0 && (
          <div>
            <p className="text-[10px] text-white/25 font-mono mb-2 tracking-wider">TODAY'S DELIVERABLES</p>
            <div className="space-y-1.5">
              {day.deliverables.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded border border-mirage-border mt-0.5 flex-shrink-0 cursor-pointer hover:border-mirage-teal hover:bg-mirage-teal/10 transition-all flex items-center justify-center" />
                  <p className="text-xs text-white/45">{d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Practical Project */}
        {day.isProjectDay && day.practicalProject && (
          <div className="border border-purple-500/15 rounded-lg p-3 bg-purple-500/[0.04]">
            <p className="text-[10px] text-purple-400/50 font-mono mb-1 flex items-center gap-1 tracking-wider">
              <Layers className="w-3 h-3" /> HANDS-ON PROJECT
            </p>
            <p className="text-xs text-white/55 leading-relaxed">{day.practicalProject}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* =========================================================================
   AI SIDEBAR — Smart suggestions + skill velocity + upcoming
   ========================================================================= */

function AISidebar({ dayMap, today, steps, selectedDay, completedDays }: {
  dayMap: Map<string, DayData>;
  today: Date;
  steps: any[];
  selectedDay: DayData | null;
  completedDays: Set<string>;
}) {
  const todayData = dayMap.get(dateKey(today));

  // Upcoming milestones
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

  // 7-day forecast
  const weekForecast = useMemo(() => {
    const forecast: Array<{ day: string; hours: number; courses: number; date: Date }> = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const data = dayMap.get(dateKey(date));
      forecast.push({
        day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        hours: data?.hoursTarget || 0,
        courses: data?.courses.length || 0,
        date,
      });
    }
    return forecast;
  }, [dayMap, today]);

  const maxHours = Math.max(...weekForecast.map(f => f.hours), 1);

  // Skill velocity — skills being learned this week vs last
  const skillVelocity = useMemo(() => {
    const thisWeek = new Set<string>();
    const lastWeek = new Set<string>();
    for (let d = 0; d < 7; d++) {
      const tw = new Date(today);
      tw.setDate(today.getDate() + d);
      const twData = dayMap.get(dateKey(tw));
      twData?.courses.forEach((c: any) => c.skillsGained?.forEach((s: string) => thisWeek.add(s)));

      const lw = new Date(today);
      lw.setDate(today.getDate() - 7 + d);
      const lwData = dayMap.get(dateKey(lw));
      lwData?.courses.forEach((c: any) => c.skillsGained?.forEach((s: string) => lastWeek.add(s)));
    }
    return { thisWeek: thisWeek.size, lastWeek: lastWeek.size, skills: [...thisWeek].slice(0, 6) };
  }, [dayMap, today]);

  // AI tips
  const aiTips = useMemo(() => {
    const tips: Array<{ text: string; type: 'info' | 'warning' | 'success' }> = [];
    const todayCourses = todayData?.courses || [];

    if (todayCourses.length === 0) {
      tips.push({ text: 'No courses today. Review previous material or explore ahead.', type: 'info' });
    } else if (todayCourses.length >= 3) {
      tips.push({ text: 'Heavy day! Prioritize the hardest course when focus is highest.', type: 'warning' });
    }

    if (todayCourses.some((c: any) => c.difficulty === 'advanced')) {
      tips.push({ text: 'Advanced content today. Use Pomodoro (25min focus + 5min break).', type: 'warning' });
    }

    if (todayData?.isProjectDay) {
      tips.push({ text: 'Project day! Aim for a working prototype, not perfection.', type: 'success' });
    }

    const upcoming = upcomingMilestones.filter(m => {
      const daysAway = Math.ceil((m.date.getTime() - today.getTime()) / 86400000);
      return daysAway <= 3 && daysAway > 0;
    });
    if (upcoming.length > 0) {
      tips.push({ text: `${upcoming.length} milestone${upcoming.length > 1 ? 's' : ''} due within 3 days. Allocate extra time.`, type: 'warning' });
    }

    const skillsToday = new Set(todayCourses.flatMap((c: any) => c.skillsGained || []));
    if (skillsToday.size >= 3) {
      tips.push({ text: `Skill synergy: ${[...skillsToday].slice(0, 3).join(', ')} compound together.`, type: 'success' });
    }

    if (completedDays.size > 0) {
      tips.push({ text: `You've completed ${completedDays.size} study days. Consistency is key!`, type: 'success' });
    }

    return tips.length > 0 ? tips : [{ text: 'Small daily progress compounds into mastery.', type: 'info' as const }];
  }, [todayData, upcomingMilestones, today, completedDays]);

  return (
    <div className="space-y-4">
      {/* Today's Focus */}
      <div className="border border-mirage-teal/20 rounded-xl p-4 bg-gradient-to-b from-mirage-teal/[0.04] to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-mirage-teal/10 border border-mirage-teal/20 flex items-center justify-center">
            <Play className="w-3 h-3 text-mirage-teal" />
          </div>
          <p className="text-[10px] text-mirage-teal font-mono tracking-wider">TODAY'S FOCUS</p>
        </div>

        {todayData && todayData.courses.length > 0 ? (
          <div className="space-y-2.5">
            {todayData.weekFocus && (
              <p className="text-sm text-white/80 font-medium leading-snug">{todayData.weekFocus}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-white/30">
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {todayData.courses.length}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {todayData.hoursTarget}h</span>
              {todayData.optimalTime && (
                <span className="flex items-center gap-1 text-purple-400/40">
                  {todayData.optimalTime === 'morning' && <Sunrise className="w-3 h-3" />}
                  {todayData.optimalTime === 'evening' && <Moon className="w-3 h-3" />}
                  {todayData.optimalTime}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {todayData.courses.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PROVIDER_COLORS[c.provider] || '#fff' }} />
                  <span className="text-white/50 truncate">{c.courseName}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/25">No study scheduled today. Rest or review!</p>
        )}
      </div>

      {/* 7-Day Forecast */}
      <div className="border border-mirage-border/60 rounded-xl p-4 bg-white/[0.01]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <BarChart3 className="w-3 h-3 text-orange-400" />
          </div>
          <p className="text-[10px] text-orange-400 font-mono tracking-wider">7-DAY FORECAST</p>
        </div>

        <div className="flex items-end gap-1 h-14 mb-1.5">
          {weekForecast.map((f, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full relative" style={{ height: '48px' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(3, (f.hours / maxHours) * 48)}px` }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  className="absolute bottom-0 w-full rounded-t-sm"
                  style={{
                    background: i === 0
                      ? 'linear-gradient(to top, #00d4aa, #00bcd4)'
                      : f.hours > 0
                        ? `linear-gradient(to top, ${intensityColor(Math.min(4, Math.ceil(f.courses / 1.5)))}, ${intensityColor(Math.min(4, Math.ceil(f.courses / 1.5)))}80)`
                        : 'rgba(255,255,255,0.03)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {weekForecast.map((f, i) => (
            <div key={i} className="flex-1 text-center">
              <p className={`text-[8px] font-mono ${i === 0 ? 'text-mirage-teal' : 'text-white/20'}`}>{f.day}</p>
              <p className="text-[7px] text-white/12 font-mono">{f.hours}h</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Velocity */}
      <div className="border border-mirage-border/60 rounded-xl p-4 bg-white/[0.01]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
            </div>
            <p className="text-[10px] text-cyan-400 font-mono tracking-wider">SKILL VELOCITY</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-mono text-cyan-400 font-semibold">{skillVelocity.thisWeek}</span>
            {skillVelocity.thisWeek >= skillVelocity.lastWeek ? (
              <ArrowUpRight className="w-3 h-3 text-green-400" />
            ) : (
              <ArrowUpRight className="w-3 h-3 text-red-400 rotate-90" />
            )}
          </div>
        </div>
        <p className="text-[9px] text-white/20 mb-2">
          {skillVelocity.thisWeek} skills this week vs {skillVelocity.lastWeek} last week
        </p>
        {skillVelocity.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skillVelocity.skills.map((s, i) => (
              <span key={i} className="text-[8px] px-1.5 py-0.5 border border-cyan-500/15 rounded text-cyan-400/40 bg-cyan-500/[0.04]">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Tips */}
      <div className="border border-purple-500/15 rounded-xl p-4 bg-purple-500/[0.03]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Zap className="w-3 h-3 text-purple-400" />
          </div>
          <p className="text-[10px] text-purple-400 font-mono tracking-wider">AI STUDY TIPS</p>
        </div>

        <div className="space-y-2">
          {aiTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              {tip.type === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-400/50 flex-shrink-0 mt-0.5" />}
              {tip.type === 'info' && <Lightbulb className="w-3 h-3 text-purple-400/50 flex-shrink-0 mt-0.5" />}
              {tip.type === 'success' && <CheckCircle2 className="w-3 h-3 text-green-400/50 flex-shrink-0 mt-0.5" />}
              <p className="text-[10px] text-white/40 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>

        {/* Upcoming milestones */}
        {upcomingMilestones.length > 0 && (
          <div className="mt-3 pt-3 border-t border-purple-500/10">
            <p className="text-[9px] text-purple-400/30 font-mono mb-2 tracking-wider">UPCOMING MILESTONES</p>
            <div className="space-y-1.5">
              {upcomingMilestones.map((m, i) => {
                const daysAway = Math.ceil((m.date.getTime() - today.getTime()) / 86400000);
                return (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-white/35 truncate flex-1 flex items-center gap-1">
                      <CircleDot className="w-2 h-2 flex-shrink-0" style={{ color: daysAway <= 2 ? '#ef4444' : '#ffffff30' }} />
                      {m.milestone}
                    </span>
                    <span className={`font-mono ml-2 flex-shrink-0 ${daysAway <= 2 ? 'text-red-400/50' : 'text-white/15'}`}>
                      {daysAway === 0 ? 'today' : daysAway === 1 ? 'tmrw' : `${daysAway}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   RAG Insights Panel
   ========================================================================= */

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
  const hasRealData = insights && (
    (insights.insights?.length > 0) ||
    (insights.hiddenStrengths?.length > 0) ||
    (insights.dominantTechStack?.length > 0) ||
    (insights.totalProjects > 0)
  );
  if (!hasRealData) {
    return (
      <div className="text-center py-20 border border-mirage-border rounded-lg">
        <Brain className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 mb-2">No knowledge base data available</p>
        <p className="text-white/20 text-sm">Upload your resume or connect GitHub to get AI-powered insights</p>
        <Link to="/graph" className="inline-block mt-4 text-mirage-teal text-sm hover:text-mirage-cyan transition-colors">
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

/* =========================================================================
   HELPERS
   ========================================================================= */

/** Pick the insights source that actually has meaningful data */
function pickBestInsights(apiInsights: any, planInsights: any): any {
  const hasReal = (d: any) => d && (
    (d.insights?.length > 0) ||
    (d.hiddenStrengths?.length > 0) ||
    (d.dominantTechStack?.length > 0) ||
    (d.totalProjects > 0)
  );
  if (hasReal(apiInsights)) return apiInsights;
  if (hasReal(planInsights)) return planInsights;
  return apiInsights || planInsights;
}

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
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;

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

function assignTimeBlocks(dayData: DayData) {
  if (!dayData.timeBlocks) {
    dayData.timeBlocks = { morning: [], afternoon: [], evening: [] };
  }

  const courses = [...dayData.courses];
  const dow = dayData.date.getDay();
  const isWeekend = dow === 0 || dow === 6;

  // AI-driven scheduling: harder courses in the morning, lighter in evening
  // Weekends: more spread out. Weekdays: concentrated in evening
  courses.sort((a: any, b: any) => {
    const diffOrder: Record<string, number> = { advanced: 0, intermediate: 1, beginner: 2 };
    return (diffOrder[a.difficulty] || 1) - (diffOrder[b.difficulty] || 1);
  });

  if (isWeekend) {
    // Spread across all blocks
    courses.forEach((c, i) => {
      const blocks = ['morning', 'afternoon', 'evening'] as const;
      const block = blocks[i % 3];
      dayData.timeBlocks![block].push(c);
    });
  } else {
    // Weekday: hard stuff in morning if available, rest in evening
    courses.forEach((c, i) => {
      if (i === 0 && c.difficulty === 'advanced') {
        dayData.timeBlocks!.morning.push(c);
      } else if (i === 0) {
        dayData.timeBlocks!.evening.push(c);
      } else {
        dayData.timeBlocks!.evening.push(c);
      }
    });
  }

  // Projects go in afternoon
  if (dayData.isProjectDay && dayData.practicalProject) {
    // Already handled via the project day marker
  }
}

function generateAISuggestions(dayMap: Map<string, DayData>, steps: any[], skillGapAnalysis?: any[]) {
  const criticalSkills = skillGapAnalysis
    ?.filter((s: any) => s.priority === 'critical')
    .map((s: any) => s.skill) || [];

  for (const [, dayData] of dayMap) {
    const suggestions: string[] = [];
    const dayOfWeek = dayData.date.getDay();

    if (dayOfWeek === 1 && dayData.courses.length > 0) {
      suggestions.push(`Week kickoff: Set clear goals for ${dayData.courses.length} active course${dayData.courses.length > 1 ? 's' : ''}. Block focused study time in your calendar.`);
    }

    if (dayOfWeek === 3 && dayData.courses.length > 0) {
      suggestions.push('Mid-week check: Review notes from earlier this week. Active recall boosts retention by 50%.');
    }

    if (dayOfWeek === 5 && dayData.courses.length > 0) {
      suggestions.push('Friday wind-down: Summarize what you learned this week. Teaching it to someone else solidifies understanding.');
    }

    if (dayData.isProjectDay) {
      suggestions.push('Build day: Create something tangible. Even a small prototype converts theory into practice.');
    }

    if (dayData.milestones.length > 0) {
      suggestions.push(`Milestone: "${dayData.milestones[0]}" is due. Focus here before new material.`);
    }

    if (dayData.courses.length >= 2) {
      const providers = [...new Set(dayData.courses.map((c: any) => c.provider))];
      suggestions.push(`Multi-course day (${providers.join(', ')}). Alternate in 45-min blocks for better retention.`);
    }

    const todaySkills = dayData.courses.flatMap((c: any) => c.skillsGained || []);
    const criticalToday = todaySkills.filter((s: string) => criticalSkills.some(cs => s.toLowerCase().includes(cs.toLowerCase())));
    if (criticalToday.length > 0) {
      suggestions.push(`High-priority: ${criticalToday.join(', ')}. Critical for your target role.`);
    }

    if (suggestions.length > 0) {
      dayData.aiSuggestion = suggestions[0];
    }
  }
}
