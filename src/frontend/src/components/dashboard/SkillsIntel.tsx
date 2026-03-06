import { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDashboardStore } from '../../stores/dashboardStore';
import { formatPercent } from '../../utils/formatters';

export default function SkillsIntel() {
  const { skillsTrends, fetchSkillsTrends } = useDashboardStore();

  useEffect(() => {
    fetchSkillsTrends();
  }, []);

  const hasRising = skillsTrends.rising.length > 0;
  const hasDeclining = skillsTrends.declining.length > 0;

  return (
    <div className="space-y-8">
      {/* Rising Skills */}
      <div className="border border-mirage-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-mono text-mirage-teal">RISING SKILLS</h3>
            <p className="text-xs text-white/30 mt-1">
              {hasRising
                ? `${skillsTrends.rising.length} skills with increasing demand — week-over-week growth`
                : 'Week-over-week growth in job mentions'}
            </p>
          </div>
          <span className="text-xs font-mono text-green-400">DEMAND INCREASING</span>
        </div>

        {hasRising ? (
          <>
            <ResponsiveContainer width="100%" height={Math.max(300, skillsTrends.rising.slice(0, 15).length * 30)}>
              <BarChart data={skillsTrends.rising.slice(0, 15)} layout="vertical" margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11}
                  tickFormatter={(v) => `+${v}%`} />
                <YAxis type="category" dataKey="skill" stroke="rgba(255,255,255,0.3)" fontSize={11} width={105} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                  formatter={(value: number, _: string, props: any) => [
                    `${formatPercent(value)} (${props.payload.mentionCount} mentions)`,
                    'Growth',
                  ]}
                />
                <Bar dataKey="weekOverWeekChange" radius={[0, 4, 4, 0]} barSize={14}>
                  {skillsTrends.rising.slice(0, 15).map((_: any, i: number) => (
                    <Cell key={i} fill={i < 5 ? '#00d4aa' : '#00bcd4'} fillOpacity={1 - i * 0.04} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Top cities per skill */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {skillsTrends.rising.slice(0, 6).map((s: any) => (
                <div key={s.skill} className="border border-mirage-border/50 rounded p-3">
                  <p className="text-xs font-mono text-mirage-teal mb-1">{s.skill}</p>
                  <p className="text-[10px] text-white/30">
                    Top cities: {(s.topCities || []).slice(0, 3).join(', ')}
                  </p>
                  <p className="text-xs text-green-400 mt-1">+{s.weekOverWeekChange}% | {s.mentionCount} mentions</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-white/20 text-sm">No rising skill data available.</div>
        )}
      </div>

      {/* Declining Skills */}
      <div className="border border-mirage-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-mono text-mirage-teal">DECLINING SKILLS</h3>
            <p className="text-xs text-white/30 mt-1">
              {hasDeclining
                ? `${skillsTrends.declining.length} skills with decreasing demand`
                : 'Week-over-week decline in job mentions'}
            </p>
          </div>
          <span className="text-xs font-mono text-red-400">DEMAND FALLING</span>
        </div>

        {hasDeclining ? (
          <ResponsiveContainer width="100%" height={Math.max(200, skillsTrends.declining.slice(0, 10).length * 30)}>
            <BarChart data={skillsTrends.declining.slice(0, 10)} layout="vertical" margin={{ left: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11}
                tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="skill" stroke="rgba(255,255,255,0.3)" fontSize={11} width={105} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                formatter={(value: number, _: string, props: any) => [
                  `${formatPercent(value)} (${props.payload.mentionCount} mentions)`,
                  'Decline',
                ]}
              />
              <Bar dataKey="weekOverWeekChange" radius={[4, 0, 0, 4]} barSize={14}>
                {skillsTrends.declining.slice(0, 10).map((_: any, i: number) => (
                  <Cell key={i} fill="#ff4444" fillOpacity={1 - i * 0.06} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-white/20 text-sm">No declining skill data available.</div>
        )}
      </div>

      {/* Skill Gap Analysis — derived from actual data */}
      {hasRising && (
        <div className="border border-mirage-border rounded-lg p-6">
          <h3 className="text-sm font-mono text-mirage-teal mb-4">SKILL GAP INSIGHTS</h3>
          <p className="text-xs text-white/30 mb-6">Skills growing fastest vs. declining — showing market shift</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-white/50 mb-3">FASTEST GROWING — RESKILL INTO THESE</p>
              {skillsTrends.rising.slice(0, 5).map((s: any) => (
                <div key={s.skill} className="flex items-center gap-3 py-2 border-b border-mirage-border/50">
                  <span className="w-2 h-2 rounded-full bg-mirage-teal" />
                  <span className="text-sm text-white/70 flex-1">{s.skill}</span>
                  <span className="text-xs font-mono text-green-400">+{s.weekOverWeekChange}%</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-white/50 mb-3">AT RISK — AVOID DOUBLING DOWN</p>
              {(hasDeclining ? skillsTrends.declining : []).slice(0, 5).map((s: any) => (
                <div key={s.skill} className="flex items-center gap-3 py-2 border-b border-mirage-border/50">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-sm text-white/70 flex-1">{s.skill}</span>
                  <span className="text-xs font-mono text-red-400">{s.weekOverWeekChange}%</span>
                </div>
              ))}
              {!hasDeclining && (
                <p className="text-xs text-white/20 py-4">No declining skills detected — all skills are stable or growing.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
