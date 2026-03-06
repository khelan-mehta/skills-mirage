import { Star } from 'lucide-react';
import { getRiskColor, getRiskLevel } from '../../utils/riskColors';

interface JobCardProps {
  job: {
    _id: string;
    title: string;
    normalizedTitle?: string;
    company: string;
    city: string;
    skills: string[];
    salary?: { min: number; max: number };
    sourceUrl?: string;
    matchScore: number;
    totalSkills: number;
    matchPercent: number;
    riskScore: { score: number; level: string };
    isStarred: boolean;
  };
  starring: boolean;
  onStar: (jobId: string) => void;
  onUnstar: (jobId: string) => void;
}

export default function JobCard({ job, starring, onStar, onUnstar }: JobCardProps) {
  const riskColor = getRiskColor(job.riskScore.score);
  const riskLevel = getRiskLevel(job.riskScore.score);

  return (
    <div className="border border-mirage-border rounded-lg p-5 hover:border-white/15 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white/90 font-medium truncate">
            {job.normalizedTitle || job.title}
          </h3>
          <p className="text-white/40 text-sm truncate">{job.company}</p>
        </div>

        <button
          onClick={() => job.isStarred ? onUnstar(job._id) : onStar(job._id)}
          disabled={starring}
          className="ml-3 flex-shrink-0 transition-colors"
        >
          <Star
            className={`w-5 h-5 ${
              starring
                ? 'text-white/20 animate-pulse'
                : job.isStarred
                  ? 'text-mirage-teal fill-mirage-teal'
                  : 'text-white/20 hover:text-mirage-teal'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-white/40">
        <span>{job.city}</span>
        {job.salary && (
          <>
            <span className="text-white/20">|</span>
            <span>
              {job.salary.min > 0
                ? `₹${(job.salary.min / 100000).toFixed(1)}L - ₹${(job.salary.max / 100000).toFixed(1)}L`
                : 'Salary undisclosed'}
            </span>
          </>
        )}
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {job.skills.slice(0, 6).map((skill) => (
          <span
            key={skill}
            className="text-xs px-2 py-0.5 border border-mirage-border rounded text-white/50"
          >
            {skill}
          </span>
        ))}
        {job.skills.length > 6 && (
          <span className="text-xs px-2 py-0.5 text-white/30">+{job.skills.length - 6}</span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {/* Match score */}
          <span className="text-mirage-teal font-mono">
            {job.matchPercent}% match
          </span>
          <span className="text-white/20">|</span>
          <span className="text-white/40">
            {job.matchScore}/{job.totalSkills} skills
          </span>
        </div>

        {/* Risk badge */}
        <span
          className="font-mono px-2 py-0.5 rounded"
          style={{ color: riskColor, background: `${riskColor}15` }}
        >
          {riskLevel} {job.riskScore.score}%
        </span>
      </div>

      {job.sourceUrl && (
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs text-mirage-teal hover:text-mirage-cyan transition-colors"
        >
          View original listing
        </a>
      )}
    </div>
  );
}
