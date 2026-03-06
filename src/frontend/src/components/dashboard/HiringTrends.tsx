import { useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { useDashboardStore } from '../../stores/dashboardStore';
import { formatNumber } from '../../utils/formatters';

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore', 'Nagpur', 'Kochi',
  'Coimbatore', 'Bhopal', 'Patna', 'Thiruvananthapuram', 'Visakhapatnam', 'Vadodara',
  'Surat', 'Ranchi',
];

const SECTORS = ['IT', 'BPO', 'Finance', 'Healthcare', 'Manufacturing', 'Education', 'Retail', 'Marketing'];
const RANGES = ['7d', '30d', '90d', '1yr'] as const;

export default function HiringTrends() {
  const { hiringTrends, activeRange, activeCity, activeSector, setRange, setCity, setSector, fetchHiringTrends, loading } =
    useDashboardStore();

  useEffect(() => {
    fetchHiringTrends();
  }, []);

  const cityData = useMemo(() => {
    if (!hiringTrends?.cities) return [];
    return hiringTrends.cities.slice(0, 22).map((c: any) => ({
      city: c._id,
      jobs: c.totalJobs,
      avgSalary: Math.round(c.avgSalary || 0),
      sectors: (c.topSectors || []).length,
    }));
  }, [hiringTrends]);

  const weeklyData = useMemo(() => {
    if (!hiringTrends?.trends) return [];
    const weekMap = new Map<string, { count: number; year: number; week: number }>();
    for (const t of hiringTrends.trends) {
      const key = `${t._id.year}-W${String(t._id.week).padStart(2, '0')}`;
      const existing = weekMap.get(key);
      weekMap.set(key, {
        count: (existing?.count || 0) + t.count,
        year: t._id.year,
        week: t._id.week,
      });
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ week: `W${val.week}`, count: val.count }))
      .slice(-16);
  }, [hiringTrends]);

  // Sector breakdown from trends
  const sectorData = useMemo(() => {
    if (!hiringTrends?.trends) return [];
    const sectorMap = new Map<string, number>();
    for (const t of hiringTrends.trends) {
      const sector = t._id.sector || 'Other';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + t.count);
    }
    return Array.from(sectorMap.entries())
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [hiringTrends]);

  const hasData = cityData.length > 0 || weeklyData.length > 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 bg-mirage-bg-secondary rounded p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                activeRange === r
                  ? 'bg-mirage-teal text-black'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <select
          value={activeCity}
          onChange={(e) => setCity(e.target.value)}
          className="bg-mirage-bg-secondary border border-mirage-border rounded px-3 py-1.5 text-xs text-white/70 focus:border-mirage-teal outline-none"
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={activeSector}
          onChange={(e) => setSector(e.target.value)}
          className="bg-mirage-bg-secondary border border-mirage-border rounded px-3 py-1.5 text-xs text-white/70 focus:border-mirage-teal outline-none"
        >
          <option value="">All Sectors</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {loading && (
          <span className="text-xs text-mirage-teal animate-pulse">Loading...</span>
        )}
      </div>

      {!hasData && !loading ? (
        <div className="border border-mirage-border rounded-lg p-12 text-center">
          <p className="text-white/30 text-sm">No hiring data for this filter. Try a wider range or different city.</p>
        </div>
      ) : (
        <>
          {/* Weekly Trend Chart */}
          {weeklyData.length > 0 && (
            <div className="border border-mirage-border rounded-lg p-6">
              <h3 className="text-sm font-mono text-mirage-teal mb-1">WEEKLY JOB POSTING VOLUME</h3>
              <p className="text-xs text-white/30 mb-4">
                {weeklyData.reduce((s, w) => s + w.count, 0).toLocaleString()} total listings over {weeklyData.length} weeks
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={formatNumber} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                    labelStyle={{ color: '#00d4aa' }}
                    formatter={(value: number) => [value.toLocaleString(), 'Jobs']}
                  />
                  <Area type="monotone" dataKey="count" stroke="#00d4aa" fill="url(#tealGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* City Bar Chart */}
          {cityData.length > 0 && (
            <div className="border border-mirage-border rounded-lg p-6">
              <h3 className="text-sm font-mono text-mirage-teal mb-1">JOB POSTINGS BY CITY</h3>
              <p className="text-xs text-white/30 mb-4">{cityData.length} cities with active listings</p>
              <ResponsiveContainer width="100%" height={Math.max(300, cityData.length * 28)}>
                <BarChart data={cityData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={formatNumber} />
                  <YAxis type="category" dataKey="city" stroke="rgba(255,255,255,0.3)" fontSize={11} width={95} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                    labelStyle={{ color: '#00d4aa' }}
                    formatter={(value: number, name: string) => [
                      name === 'jobs' ? value.toLocaleString() + ' jobs' : formatNumber(value),
                      name === 'jobs' ? 'Listings' : 'Avg Salary',
                    ]}
                  />
                  <Bar dataKey="jobs" fill="#00d4aa" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sector Breakdown */}
          {sectorData.length > 0 && (
            <div className="border border-mirage-border rounded-lg p-6">
              <h3 className="text-sm font-mono text-mirage-teal mb-4">SECTOR BREAKDOWN</h3>
              <div className="space-y-3">
                {sectorData.map((s, i) => {
                  const maxCount = sectorData[0]?.count || 1;
                  const pct = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={s.sector} className="flex items-center gap-4">
                      <span className="text-xs font-mono text-white/30 w-6">{i + 1}.</span>
                      <span className="text-sm text-white/70 w-32">{s.sector}</span>
                      <div className="flex-1 h-2 bg-mirage-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-mirage-teal transition-all duration-500"
                          style={{ width: `${pct}%`, opacity: 1 - i * 0.08 }}
                        />
                      </div>
                      <span className="text-xs font-mono text-white/50 w-20 text-right">{s.count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
