import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getRiskColor, getRiskLevel } from '../../utils/riskColors';

interface RiskScoreProps {
  score: number;
  previous?: number;
  trend?: 'rising' | 'falling' | 'stable';
  factors?: Array<{ signal: string; weight: number }>;
}

export default function RiskScore({ score, previous, trend, factors }: RiskScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = getRiskColor(score);
  const level = getRiskLevel(score);

  useEffect(() => {
    let frame: number;
    const start = 0;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(start + (score - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - animatedScore / 100);

  return (
    <div className="border border-mirage-border rounded-lg p-6">
      <h3 className="text-mirage-teal text-sm font-mono mb-6">AI RISK SCORE</h3>

      {/* Gauge */}
      <div className="flex justify-center mb-6">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            {/* Score arc */}
            <motion.circle
              cx="50" cy="50" r="45" fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold" style={{ color }}>{animatedScore}</span>
            <span className="text-xs text-white/40">/100</span>
          </div>
          {/* Glow */}
          {score > 60 && (
            <div
              className="absolute inset-0 rounded-full animate-pulse-teal"
              style={{ boxShadow: `0 0 30px ${color}20, 0 0 60px ${color}10` }}
            />
          )}
        </div>
      </div>

      {/* Level Badge */}
      <div className="text-center mb-4">
        <span
          className="text-sm font-mono font-bold px-4 py-1.5 rounded"
          style={{ color, background: `${color}15` }}
        >
          {level}
        </span>
        {trend && trend !== 'stable' && (
          <span className={`ml-2 text-xs font-mono ${trend === 'rising' ? 'text-red-400' : 'text-green-400'}`}>
            {trend === 'rising' ? 'RISING' : 'FALLING'}
            {previous !== undefined && ` (was ${previous})`}
          </span>
        )}
      </div>

      {/* Factors */}
      {factors && factors.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-mono text-white/40">CONTRIBUTING FACTORS</p>
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 text-right">
                <span className="text-xs font-mono" style={{ color }}>{f.weight}</span>
              </div>
              <div className="flex-1 h-1 bg-mirage-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, f.weight * 3)}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs text-white/50 flex-shrink-0 max-w-[60%] truncate">{f.signal}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
