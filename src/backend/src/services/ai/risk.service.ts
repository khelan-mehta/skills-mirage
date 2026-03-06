import { JobListing } from '../../models/JobListing';
import { IWorkerProfile } from '../../models/WorkerProfile';
import { cacheService } from '../cache.service';
import { TUNING } from '../../config/tuning';

const WEIGHTS = {
  hiringDecline: 0.30,
  aiToolMentionRate: 0.25,
  roleReplacementRatio: 0.20,
  automationFeasibility: 0.15,
  salaryCompression: 0.10,
};

// WEF-based automation baselines for common Indian roles
const AUTOMATION_BASELINES: Record<string, number> = {
  'bpo': 82, 'data entry': 78, 'telecaller': 75, 'receptionist': 65,
  'clerk': 70, 'typist': 72, 'cashier': 68, 'teller': 66,
  'accountant': 55, 'bookkeeper': 60, 'content writer': 45,
  'copywriter': 42, 'translator': 50, 'transcriptionist': 72,
  'web developer': 20, 'frontend developer': 18, 'backend developer': 15,
  'full stack developer': 17, 'software developer': 15,
  'data analyst': 25, 'data scientist': 12, 'machine learning': 8,
  'devops': 12, 'cloud engineer': 10, 'cybersecurity': 8,
  'product manager': 15, 'project manager': 30,
  'ui designer': 22, 'ux designer': 20, 'graphic designer': 35,
  'marketing executive': 40, 'sales executive': 35,
  'hr executive': 45, 'hr manager': 30,
  'teacher': 20, 'professor': 10, 'researcher': 8,
  'doctor': 5, 'nurse': 12, 'pharmacist': 30,
  'driver': 60, 'delivery': 55, 'warehouse': 65,
};

class RiskService {
  async computeRiskScore(worker: IWorkerProfile) {
    const cacheKey = `risk:${worker.normalizedTitle}:${worker.city}`;
    const cached = await cacheService.get<any>(cacheKey);

    const [hiringStats, aiMentions, replacement] = await Promise.all([
      this.getHiringTrend(worker.normalizedTitle, worker.city),
      this.getAIMentionRate(worker.normalizedTitle, worker.city),
      this.getReplacementRatio(worker.normalizedTitle),
    ]);

    const factors: Array<{ signal: string; weight: number }> = [];
    let raw = 0;

    // Factor 1: Hiring decline
    const declineScore = Math.max(0, Math.min(100, hiringStats.declinePercent));
    raw += declineScore * WEIGHTS.hiringDecline;
    factors.push({
      signal: `${worker.normalizedTitle} hiring in ${worker.city}: ${hiringStats.declinePercent > 0 ? '-' : '+'}${Math.abs(hiringStats.declinePercent).toFixed(0)}% over 30d`,
      weight: Math.round(declineScore * WEIGHTS.hiringDecline),
    });

    // Factor 2: AI tool mentions
    const aiScore = Math.min(100, aiMentions.rate * 1.5);
    raw += aiScore * WEIGHTS.aiToolMentionRate;
    factors.push({
      signal: `AI tool mentions in JDs: ${aiMentions.rate.toFixed(0)}%`,
      weight: Math.round(aiScore * WEIGHTS.aiToolMentionRate),
    });

    // Factor 3: Role replacement ratio
    raw += replacement.score * WEIGHTS.roleReplacementRatio;
    factors.push({
      signal: `Automation feasibility: ${replacement.score}/100`,
      weight: Math.round(replacement.score * WEIGHTS.roleReplacementRatio),
    });

    // Factor 4: Automation feasibility (experience-adjusted)
    const expFactor = Math.max(0, 100 - worker.yearsOfExperience * 5);
    const autoScore = replacement.score * (expFactor / 100);
    raw += autoScore * WEIGHTS.automationFeasibility;
    factors.push({
      signal: `Experience-adjusted automation risk: ${autoScore.toFixed(0)}/100`,
      weight: Math.round(autoScore * WEIGHTS.automationFeasibility),
    });

    // Factor 5: Salary compression (simplified — using decline as proxy)
    const salaryScore = Math.max(0, hiringStats.declinePercent * 0.5);
    raw += salaryScore * WEIGHTS.salaryCompression;
    factors.push({
      signal: `Salary compression signal: ${salaryScore.toFixed(0)}/100`,
      weight: Math.round(salaryScore * WEIGHTS.salaryCompression),
    });

    const finalScore = Math.round(Math.min(100, Math.max(0, raw)));

    const result = {
      current: finalScore,
      previous: worker.riskScore?.current ?? finalScore,
      trend: finalScore > (worker.riskScore?.current ?? 0) ? 'rising' as const
        : finalScore < (worker.riskScore?.current ?? 0) ? 'falling' as const : 'stable' as const,
      level: (finalScore > 80 ? 'CRITICAL' : finalScore > 60 ? 'HIGH'
        : finalScore > 40 ? 'MEDIUM' : 'LOW') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
      factors,
      methodology: WEIGHTS,
      computedAt: new Date(),
    };

    await cacheService.set(cacheKey, result, TUNING.CACHE_TTL_VULNERABILITY);
    return result;
  }

  private async getHiringTrend(role: string, city: string) {
    const roleRegex = new RegExp(role.split(' ').filter(w => w.length > 2).join('|'), 'i');
    const [current, previous] = await Promise.all([
      JobListing.countDocuments({
        normalizedTitle: { $regex: roleRegex },
        city,
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
      JobListing.countDocuments({
        normalizedTitle: { $regex: roleRegex },
        city,
        scrapedAt: {
          $gte: new Date(Date.now() - 60 * 86400_000),
          $lt: new Date(Date.now() - 30 * 86400_000),
        },
      }),
    ]);
    return {
      current,
      previous,
      declinePercent: previous > 0 ? ((previous - current) / previous) * 100 : 0,
    };
  }

  private async getAIMentionRate(role: string, city: string) {
    const roleRegex = new RegExp(role.split(' ').filter(w => w.length > 2).join('|'), 'i');
    const [total, withAI] = await Promise.all([
      JobListing.countDocuments({
        normalizedTitle: { $regex: roleRegex },
        city,
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
      JobListing.countDocuments({
        normalizedTitle: { $regex: roleRegex },
        city,
        'aiToolMentions.0': { $exists: true },
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
    ]);
    return { rate: total > 0 ? (withAI / total) * 100 : 0 };
  }

  private async getReplacementRatio(role: string) {
    const key = Object.keys(AUTOMATION_BASELINES).find((k) =>
      role.toLowerCase().includes(k)
    );
    return { score: key ? AUTOMATION_BASELINES[key] : 40 };
  }
}

export const riskService = new RiskService();
