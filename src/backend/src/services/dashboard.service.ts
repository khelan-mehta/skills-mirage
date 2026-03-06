import { JobListing } from '../models/JobListing';
import { cacheService } from './cache.service';
import { TUNING } from '../config/tuning';

class DashboardService {
  async getHiringTrends(city?: string, sector?: string, range = '30d') {
    const cacheKey = `hiring:${city || 'all'}:${sector || 'all'}:${range}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached && cached.trends?.length > 0) return cached;

    const rangeMs = ({ '7d': 7, '30d': 30, '90d': 90, '1yr': 365 }[range] ?? 30) * 86400_000;

    const match: any = {
      scrapedAt: { $gte: new Date(Date.now() - rangeMs) },
    };
    if (city) match.city = city;
    if (sector) match.sector = sector;

    const result = await JobListing.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            city: '$city',
            sector: '$sector',
            week: { $isoWeek: '$scrapedAt' },
            year: { $isoWeekYear: '$scrapedAt' },
          },
          count: { $sum: 1 },
          avgSalaryMin: { $avg: '$salary.min' },
          avgSalaryMax: { $avg: '$salary.max' },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    const citySummary = await JobListing.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$city',
          totalJobs: { $sum: 1 },
          avgSalary: { $avg: '$salary.min' },
          topSectors: { $addToSet: '$sector' },
        },
      },
      { $sort: { totalJobs: -1 } },
    ]);

    const data = { trends: result, cities: citySummary };
    // Only cache non-empty results
    if (result.length > 0) {
      await cacheService.set(cacheKey, data, TUNING.CACHE_TTL_JOB_LISTINGS);
    }
    return data;
  }

  async getSkillsTrends(type: 'rising' | 'declining' = 'rising', limit = 20) {
    const cacheKey = `skills:${type}:${limit}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400_000);

    const currentSkills = await JobListing.aggregate([
      { $match: { scrapedAt: { $gte: thirtyDaysAgo } } },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 }, cities: { $addToSet: '$city' } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    const prevSkills = await JobListing.aggregate([
      { $match: { scrapedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
    ]);

    const prevMap = new Map(prevSkills.map((s: any) => [s._id, s.count]));

    const trends = currentSkills.map((s: any) => {
      const prevCount = prevMap.get(s._id) || 0;
      const change = prevCount > 0 ? ((s.count - prevCount) / prevCount) * 100 : 100;
      return {
        skill: s._id,
        direction: change > 0 ? 'rising' : 'declining',
        weekOverWeekChange: Math.round(change),
        mentionCount: s.count,
        topCities: s.cities.slice(0, 5),
      };
    });

    const filtered = trends
      .filter((t: any) => (type === 'rising' ? t.weekOverWeekChange > 0 : t.weekOverWeekChange < 0))
      .sort((a: any, b: any) =>
        type === 'rising'
          ? b.weekOverWeekChange - a.weekOverWeekChange
          : a.weekOverWeekChange - b.weekOverWeekChange
      )
      .slice(0, limit);

    if (filtered.length > 0) {
      await cacheService.set(cacheKey, filtered, TUNING.CACHE_TTL_SKILLS_TRENDS);
    }
    return filtered;
  }

  async getVulnerabilityIndex(city?: string, role?: string) {
    const cacheKey = `vuln:${city || 'all'}:${role || 'all'}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;

    const match: any = { scrapedAt: { $gte: new Date(Date.now() - 90 * 86400_000) } };
    if (city) match.city = city;
    if (role) match.normalizedTitle = { $regex: role, $options: 'i' };

    const result = await JobListing.aggregate([
      { $match: match },
      {
        $group: {
          _id: { city: '$city', role: '$normalizedTitle' },
          totalListings: { $sum: 1 },
          aiMentionCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ['$aiToolMentions', []] } }, 0] }, 1, 0],
            },
          },
          avgRisk: { $avg: '$vulnerabilitySignals.aiReplacementRisk' },
        },
      },
      {
        $addFields: {
          aiMentionRate: {
            $multiply: [
              { $divide: ['$aiMentionCount', { $max: ['$totalListings', 1] }] },
              100,
            ],
          },
        },
      },
      { $sort: { aiMentionRate: -1 } },
    ]);

    if (result.length > 0) {
      await cacheService.set(cacheKey, result, TUNING.CACHE_TTL_VULNERABILITY);
    }
    return result;
  }

  async getVulnerabilityHeatmap() {
    const cacheKey = 'vuln:heatmap';
    const cached = await cacheService.get<any>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;

    const result = await JobListing.aggregate([
      { $match: { scrapedAt: { $gte: new Date(Date.now() - 90 * 86400_000) } } },
      {
        $group: {
          _id: '$city',
          totalListings: { $sum: 1 },
          aiMentionCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ['$aiToolMentions', []] } }, 0] }, 1, 0],
            },
          },
          avgRisk: { $avg: '$vulnerabilitySignals.aiReplacementRisk' },
          topRoles: { $addToSet: '$normalizedTitle' },
        },
      },
      {
        $addFields: {
          aiMentionRate: {
            $multiply: [
              { $divide: ['$aiMentionCount', { $max: ['$totalListings', 1] }] },
              100,
            ],
          },
          vulnerabilityScore: {
            $add: [
              { $multiply: [{ $divide: ['$aiMentionCount', { $max: ['$totalListings', 1] }] }, 50] },
              { $ifNull: ['$avgRisk', 25] },
            ],
          },
        },
      },
      { $sort: { vulnerabilityScore: -1 } },
    ]);

    if (result.length > 0) {
      await cacheService.set(cacheKey, result, TUNING.CACHE_TTL_VULNERABILITY);
    }
    return result;
  }

  async getStats() {
    const range = new Date(Date.now() - 90 * 86400_000);
    const [totalJobs, totalCities, totalSkills] = await Promise.all([
      JobListing.countDocuments({ scrapedAt: { $gte: range } }),
      JobListing.distinct('city', { scrapedAt: { $gte: range } }),
      JobListing.distinct('skills', { scrapedAt: { $gte: range } }),
    ]);
    return {
      totalJobs,
      totalCities: totalCities.length,
      totalSkills: totalSkills.length,
      lastUpdated: new Date(),
    };
  }
}

export const dashboardService = new DashboardService();
