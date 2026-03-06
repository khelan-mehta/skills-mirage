import { WorkerProfile, IWorkerProfile } from '../models/WorkerProfile';
import { JobListing } from '../models/JobListing';
import { geminiService } from './ai/gemini.service';
import { riskService } from './ai/risk.service';
import { logger } from '../utils/logger';

class WorkerService {
  async createProfile(data: {
    jobTitle: string;
    city: string;
    yearsOfExperience: number;
    writeUp: string;
  }): Promise<IWorkerProfile> {
    // 1. Normalize title
    const normalizedTitle = await geminiService.normalizeJobTitle(data.jobTitle);

    // 2. Extract skills from write-up
    const analysis = await geminiService.analyzeWorkerWriteUp(data.writeUp, data.jobTitle);

    // 2b. Tag skills to market
    let skills = [...(analysis.explicit_skills || []), ...(analysis.implicit_skills || [])];
    const topMarketSkills = await JobListing.aggregate([
      { $unwind: '$skills' },
      { $group: { _id: { $toLower: '$skills' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);
    const marketSkillNames = topMarketSkills.map((s: any) => s._id as string);
    skills = await geminiService.tagSkillsToMarket(skills, marketSkillNames);

    // 3. Create profile
    const profile = new WorkerProfile({
      jobTitle: data.jobTitle,
      normalizedTitle,
      city: data.city,
      yearsOfExperience: data.yearsOfExperience,
      writeUp: data.writeUp,
      extractedSkills: skills,
      extractedAspirations: analysis.aspirations || [],
      extractedTools: analysis.tools || [],
      riskScore: { current: 0, previous: 0, trend: 'stable', level: 'LOW', factors: [] },
    });

    await profile.save();

    // 4. Compute risk score
    const riskScore = await riskService.computeRiskScore(profile);
    profile.riskScore = riskScore as any;

    // 5. Generate reskilling path
    const targetRole = this.suggestTargetRole(analysis, data.city);
    const reskillPath = await geminiService.generateReskillPath(
      profile.extractedSkills,
      profile.extractedAspirations,
      data.city,
      targetRole
    );
    profile.reskillPath = reskillPath;

    await profile.save();
    logger.info(`Worker profile created: ${profile._id}`);

    return profile;
  }

  async getProfile(id: string): Promise<IWorkerProfile | null> {
    return WorkerProfile.findById(id);
  }

  async getRiskScore(id: string) {
    const profile = await WorkerProfile.findById(id);
    if (!profile) return null;
    return profile.riskScore;
  }

  async getReskillPath(id: string) {
    const profile = await WorkerProfile.findById(id);
    if (!profile) return null;
    return profile.reskillPath;
  }

  async updateProfile(id: string, data: Partial<{
    jobTitle: string;
    city: string;
    yearsOfExperience: number;
    writeUp: string;
  }>) {
    const profile = await WorkerProfile.findById(id);
    if (!profile) return null;

    if (data.jobTitle) {
      profile.jobTitle = data.jobTitle;
      profile.normalizedTitle = await geminiService.normalizeJobTitle(data.jobTitle);
    }
    if (data.city) profile.city = data.city;
    if (data.yearsOfExperience !== undefined) profile.yearsOfExperience = data.yearsOfExperience;
    if (data.writeUp) {
      profile.writeUp = data.writeUp;
      const analysis = await geminiService.analyzeWorkerWriteUp(data.writeUp, profile.jobTitle);
      let skills = [...(analysis.explicit_skills || []), ...(analysis.implicit_skills || [])];

      // Tag skills to market — fetch top skills from job listings and normalize
      const topMarketSkills = await JobListing.aggregate([
        { $unwind: '$skills' },
        { $group: { _id: { $toLower: '$skills' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]);
      const marketSkillNames = topMarketSkills.map((s: any) => s._id as string);
      skills = await geminiService.tagSkillsToMarket(skills, marketSkillNames);

      profile.extractedSkills = skills;
      profile.extractedAspirations = analysis.aspirations || [];
      profile.extractedTools = analysis.tools || [];
    }

    // Recalculate risk
    const riskScore = await riskService.computeRiskScore(profile);
    profile.riskScore = riskScore as any;

    await profile.save();
    return profile;
  }

  async getMarketContext(profile: IWorkerProfile) {
    const { JobListing } = await import('../models/JobListing');
    const roleRegex = new RegExp(
      profile.normalizedTitle.split(' ').filter(w => w.length > 2).join('|'), 'i'
    );

    const [activeJobCount, aiJobs, risingSkillsResult] = await Promise.all([
      JobListing.countDocuments({
        normalizedTitle: { $regex: roleRegex },
        city: profile.city,
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
      JobListing.countDocuments({
        normalizedTitle: { $regex: roleRegex },
        city: profile.city,
        'aiToolMentions.0': { $exists: true },
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
      JobListing.aggregate([
        { $match: { city: profile.city, scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) } } },
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const aiMentionRate = activeJobCount > 0 ? (aiJobs / activeJobCount) * 100 : 0;

    return {
      hiringTrend: activeJobCount > 10 ? 'stable' : activeJobCount > 5 ? 'declining' : 'low demand',
      aiMentionRate: Math.round(aiMentionRate),
      risingSkills: risingSkillsResult.map((s: any) => s._id),
      decliningRoles: ['data entry operator', 'telecaller', 'typist'],
      activeJobCount,
    };
  }

  private suggestTargetRole(analysis: any, city: string): string {
    const safeRoles = [
      'data analyst', 'cloud engineer', 'devops engineer', 'cybersecurity analyst',
      'full stack developer', 'product manager', 'ui/ux designer',
      'machine learning engineer', 'business analyst',
    ];

    if (analysis.aspirations?.length > 0) {
      return analysis.aspirations[0];
    }

    if (analysis.domain_tags?.includes('IT') || analysis.tools?.some((t: string) =>
      ['python', 'javascript', 'java'].includes(t.toLowerCase())
    )) {
      return 'data analyst';
    }

    return safeRoles[Math.floor(Math.random() * safeRoles.length)];
  }
}

export const workerService = new WorkerService();
