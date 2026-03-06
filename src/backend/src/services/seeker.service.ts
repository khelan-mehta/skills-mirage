import { User, IUser } from '../models/User';
import { WorkerProfile } from '../models/WorkerProfile';
import { JobListing, IJobListing } from '../models/JobListing';
import { workerService } from './worker.service';
import { geminiService } from './ai/gemini.service';
import { ragService } from './rag.service';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';

// ─── Skill normalization & synonym map ───────────────────────────────────────
const SKILL_ALIASES: Record<string, string[]> = {
  // ML / AI
  'machine learning': ['ml', 'machine-learning', 'machinelearning'],
  'deep learning': ['dl', 'deep-learning', 'deeplearning'],
  'artificial intelligence': ['ai', 'artificial-intelligence'],
  'natural language processing': ['nlp', 'natural-language-processing', 'text mining'],
  'computer vision': ['cv', 'image recognition', 'image processing'],
  'tensorflow': ['tf', 'tensor flow'],
  'pytorch': ['torch', 'py torch'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  'large language models': ['llm', 'llms', 'gpt', 'generative ai', 'genai'],

  // DevOps / Cloud
  'devops': ['dev-ops', 'dev ops', 'site reliability', 'sre'],
  'kubernetes': ['k8s', 'kube'],
  'docker': ['containerization', 'containers'],
  'ci/cd': ['cicd', 'ci cd', 'continuous integration', 'continuous deployment', 'continuous delivery', 'github actions', 'jenkins', 'gitlab ci'],
  'amazon web services': ['aws', 'amazon aws', 'ec2', 's3', 'lambda'],
  'google cloud': ['gcp', 'google cloud platform'],
  'microsoft azure': ['azure', 'ms azure'],
  'infrastructure as code': ['iac', 'terraform', 'ansible', 'pulumi'],

  // Frontend
  'javascript': ['js', 'java script', 'es6', 'es2015', 'ecmascript'],
  'typescript': ['ts', 'type script'],
  'react': ['reactjs', 'react.js', 'react js'],
  'next.js': ['nextjs', 'next js'],
  'vue': ['vuejs', 'vue.js', 'vue js'],
  'angular': ['angularjs', 'angular js'],
  'tailwind': ['tailwindcss', 'tailwind css'],

  // Backend
  'node.js': ['nodejs', 'node js', 'node'],
  'python': ['py', 'python3', 'python 3'],
  'golang': ['go', 'go lang', 'go language'],
  'rust': ['rust lang', 'rust language'],
  'java': ['java se', 'java ee', 'jvm'],
  'spring': ['spring boot', 'springboot'],
  'django': ['django rest', 'drf'],
  'fastapi': ['fast api'],

  // Databases
  'postgresql': ['postgres', 'psql', 'pg'],
  'mongodb': ['mongo', 'mongo db'],
  'mysql': ['my sql'],
  'redis': ['redis cache', 'redis db'],
  'elasticsearch': ['elastic search', 'elastic', 'opensearch'],

  // Data
  'data science': ['data scientist', 'data analytics', 'data analysis'],
  'data engineering': ['data engineer', 'etl', 'data pipeline'],
  'apache spark': ['spark', 'pyspark'],
  'apache kafka': ['kafka', 'event streaming'],
  'sql': ['structured query language', 'tsql', 't-sql', 'plsql', 'pl/sql'],
  'power bi': ['powerbi', 'power-bi', 'bi reporting'],
  'tableau': ['tableau desktop', 'tableau server'],

  // Mobile
  'react native': ['rn', 'react-native'],
  'flutter': ['dart flutter'],
  'android': ['android dev', 'android development', 'kotlin android'],
  'ios': ['swift ios', 'ios dev', 'ios development'],

  // Security
  'cybersecurity': ['cyber security', 'infosec', 'information security', 'security engineering'],
  'penetration testing': ['pentesting', 'pen testing', 'ethical hacking'],

  // General
  'git': ['github', 'gitlab', 'bitbucket', 'version control'],
  'agile': ['scrum', 'kanban', 'agile methodology'],
  'microservices': ['micro services', 'micro-services', 'service mesh'],
  'graphql': ['graph ql', 'graph-ql'],
  'rest api': ['restful', 'rest', 'restful api', 'rest apis'],
};

// Build reverse lookup: alias → canonical
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  ALIAS_TO_CANONICAL.set(canonical, canonical);
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias, canonical);
  }
}



function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  return ALIAS_TO_CANONICAL.get(lower) ?? lower;
}

function expandSkillToAliases(skill: string): string[] {
  const canonical = normalizeSkill(skill);
  const aliases = SKILL_ALIASES[canonical] ?? [];
  // Return canonical + all aliases + original lowercased
  return [...new Set([canonical, ...aliases, skill.toLowerCase().trim()])];
}

// Simple Levenshtein for fuzzy fallback
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function fuzzySkillMatch(userSkill: string, jobSkill: string): boolean {
  const a = normalizeSkill(userSkill);
  const b = normalizeSkill(jobSkill);
  if (a === b) return true;
  // Allow 1 char edit distance for short skills, 2 for longer
  const threshold = a.length <= 5 ? 1 : 2;
  return levenshtein(a, b) <= threshold;
}

// WEF-based automation baselines (same as risk.service.ts)
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

class SeekerService {
  async completeOnboarding(userId: string, data: {
    jobTitle: string;
    city: string;
    yearsOfExperience: number;
    writeUp: string;
    resumeText?: string;
  }) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Reuse the existing worker profile creation pipeline
    const profile = await workerService.createProfile({
      jobTitle: data.jobTitle,
      city: data.city,
      yearsOfExperience: data.yearsOfExperience,
      writeUp: data.writeUp,
    });

    user.profileId = profile._id as any;
    user.onboardingComplete = true;
    await user.save();

    return { user, profile };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user?.profileId) return null;
    return WorkerProfile.findById(user.profileId);
  }

  async updateProfile(userId: string, data: Partial<{
    jobTitle: string;
    city: string;
    yearsOfExperience: number;
    writeUp: string;
  }>) {
    const user = await User.findById(userId);
    if (!user?.profileId) throw new Error('Complete onboarding first');

    const profile = await workerService.updateProfile(String(user.profileId), data);
    // Invalidate matched jobs cache
    await cacheService.del(`matched:${userId}`);
    return profile;
  }

  async getAllJobs(filters: {
    page?: number;
    limit?: number;
    city?: string;
    search?: string;
    skills?: string[];
    source?: string;
    sort?: string;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 30));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.city) query.city = filters.city;
    if (filters.source) query.source = filters.source;
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { normalizedTitle: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.skills && filters.skills.length > 0) {
      const skillRegexes = filters.skills.map(s => new RegExp(s, 'i'));
      query.skills = { $in: skillRegexes };
    }

    let sortObj: any = { scrapedAt: -1 };
    if (filters.sort === 'salary') sortObj = { 'salary.max': -1 };
    else if (filters.sort === 'oldest') sortObj = { scrapedAt: 1 };

    const [jobs, total] = await Promise.all([
      JobListing.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      JobListing.countDocuments(query),
    ]);

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilterOptions() {
    const [cities, sources, skills] = await Promise.all([
      JobListing.distinct('city'),
      JobListing.distinct('source'),
      JobListing.aggregate([
        { $unwind: '$skills' },
        { $group: { _id: { $toLower: '$skills' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 },
      ]),
    ]);

    return {
      cities: cities.sort(),
      sources,
      skills: skills.map((s: any) => ({ name: s._id, count: s.count })),
    };
  }

  async getMatchedJobs(userId: string) {
    await cacheService.del(`matched:${userId}`);

    const user = await User.findById(userId);
    if (!user?.profileId) return [];

    const profile = await WorkerProfile.findById(user.profileId);
    if (!profile) return [];

    // Expand every user skill into all its aliases for DB query
    const rawUserSkills: string[] = profile.extractedSkills || [];
    const expandedSkills = [...new Set(rawUserSkills.flatMap(expandSkillToAliases))];
    const normalizedUserSkills = rawUserSkills.map(normalizeSkill);

    console.log('raw skills:', rawUserSkills);
    console.log('expanded to:', expandedSkills);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

    let matchedJobs: any[];

    if (expandedSkills.length > 0) {
      // Fetch candidate jobs — match on expanded alias list, case-insensitive via $toLower
      matchedJobs = await JobListing.aggregate([
        {
          $match: {
            city: profile.city,
            scrapedAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $addFields: {
            skillsLower: {
              $map: { input: '$skills', as: 's', in: { $toLower: '$$s' } },
            },
          },
        },
        {
          // Match if any job skill (lowercased) is in the expanded alias set
          $match: {
            skillsLower: { $in: expandedSkills },
          },
        },
        {
          $addFields: {
            // Count how many of the expanded user skills appear in the job
            matchScore: {
              $size: { $setIntersection: ['$skillsLower', expandedSkills] },
            },
            totalSkills: { $size: '$skills' },
          },
        },
        { $sort: { matchScore: -1, scrapedAt: -1 } },
        { $limit: 150 }, // fetch more, we'll re-rank below
      ]);

      // ── Post-processing: fuzzy re-rank ────────────────────────────────────────
      matchedJobs = matchedJobs
        .map((job) => {
          const jobSkillsLower: string[] = (job.skills || []).map((s: string) =>
            s.toLowerCase().trim()
          );

          // For each job skill, check if it fuzzy-matches any user skill
          let fuzzyMatchCount = 0;
          for (const jobSkill of jobSkillsLower) {
            for (const userSkill of normalizedUserSkills) {
              if (fuzzySkillMatch(userSkill, jobSkill)) {
                fuzzyMatchCount++;
                break;
              }
            }
          }

          // Normalize job skills to canonical for accurate intersection
          const jobSkillsCanonical = jobSkillsLower.map(normalizeSkill);
          const exactCanonicalMatches = jobSkillsCanonical.filter((s) =>
            normalizedUserSkills.includes(s)
          ).length;

          // Weighted score: canonical matches worth more than alias/fuzzy matches
          const weightedScore =
            exactCanonicalMatches * 3 +
            (job.matchScore - exactCanonicalMatches) * 2 +
            fuzzyMatchCount * 1;

          return { ...job, matchScore: job.matchScore, fuzzyMatchCount, weightedScore };
        })
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .slice(0, 50);

    } else {
      // No skills — fallback to city + recency
      const raw = await JobListing.find({
        city: profile.city,
        scrapedAt: { $gte: thirtyDaysAgo },
      })
        .sort({ scrapedAt: -1 })
        .limit(50)
        .lean();

      matchedJobs = raw.map((j: any) => ({
        ...j,
        matchScore: 0,
        totalSkills: j.skills?.length || 0,
        weightedScore: 0,
      }));
    }

    console.log('matchedJobs after fuzzy re-rank:', matchedJobs.length);

    const starredIds = new Set(user.starredJobs.map((s: any) => String(s.jobListingId)));
    const results = matchedJobs.map((job: any) => ({
      ...job,
      riskScore: this.mockRiskScoreForJob(job),
      isStarred: starredIds.has(String(job._id)),
      matchPercent:
        job.totalSkills > 0 ? Math.round((job.matchScore / job.totalSkills) * 100) : 0,
    }));

    await cacheService.set(`matched:${userId}`, results, 1800);
    return results;
  }

  async starJob(userId: string, jobListingId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.profileId) throw new Error('Complete onboarding first');

    // Check if already starred
    const existing = user.starredJobs.find((s) => String(s.jobListingId) === jobListingId);
    if (existing) return existing;

    const job = await JobListing.findById(jobListingId);
    if (!job) throw new Error('Job not found');

    const profile = await WorkerProfile.findById(user.profileId);
    if (!profile) throw new Error('Profile not found');

    // Generate reskilling plan via OpenAI + RAG context
    const reskillPlan = await this.generateJobReskillPlan(userId, profile, job);

    const starred = {
      jobListingId: job._id as any,
      starredAt: new Date(),
      reskillPlan,
    };

    user.starredJobs.push(starred);
    await user.save();

    // Invalidate cache
    await cacheService.del(`matched:${userId}`);

    return { job, reskillPlan };
  }

  async unstarJob(userId: string, jobListingId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.starredJobs = user.starredJobs.filter((s) => String(s.jobListingId) !== jobListingId);
    await user.save();

    await cacheService.del(`matched:${userId}`);
  }

  async getStarredJobs(userId: string) {
    const user = await User.findById(userId).populate('starredJobs.jobListingId');
    if (!user) return [];

    return user.starredJobs.map((s) => ({
      job: s.jobListingId,
      starredAt: s.starredAt,
      reskillPlan: s.reskillPlan,
    }));
  }

  async getReskillPlan(userId: string, jobListingId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const starred = user.starredJobs.find((s) => String(s.jobListingId) === jobListingId);
    if (!starred) throw new Error('Job not starred');

    const job = await JobListing.findById(jobListingId);
    return { job, reskillPlan: starred.reskillPlan };
  }

  async connectGitHub(userId: string, accessToken: string, username: string) {
    await User.findByIdAndUpdate(userId, {
      githubAccessToken: accessToken,
      githubUsername: username,
    });
  }

  async disconnectGitHub(userId: string) {
    await User.findByIdAndUpdate(userId, {
      $unset: { githubAccessToken: 1, githubUsername: 1, githubId: 1 },
    });
  }

  async getDashboard(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const profile = user.profileId ? await WorkerProfile.findById(user.profileId) : null;
    const matchedJobs = await this.getMatchedJobs(userId);

    return {
      profile: profile ? {
        jobTitle: profile.jobTitle,
        normalizedTitle: profile.normalizedTitle,
        city: profile.city,
        yearsOfExperience: profile.yearsOfExperience,
        extractedSkills: profile.extractedSkills,
        riskScore: profile.riskScore,
      } : null,
      matchedJobCount: matchedJobs.length,
      starredJobCount: user.starredJobs.length,
      onboardingComplete: user.onboardingComplete,
    };
  }

  async getRAGInsights(userId: string) {
    const user = await User.findById(userId);
    if (!user?.profileId) return null;

    const profile = await WorkerProfile.findById(user.profileId);
    if (!profile) return null;

    const userSkills = profile.extractedSkills || [];
    const ragChunks = await ragService.retrieve(userId, `Skills and experience: ${userSkills.join(', ')}`, 15).catch(() => []);

    if (ragChunks.length === 0) {
      // Fallback: check if any starred job already has embedded RAG insights
      const embeddedInsights = user.starredJobs
        ?.map((s: any) => s.reskillPlan?.ragInsights)
        .find((ri: any) => ri && (ri.insights?.length > 0 || ri.hiddenStrengths?.length > 0));

      if (embeddedInsights) {
        logger.info(`[RAG] ChromaDB returned 0 chunks but found embedded insights from starred job`);
        return embeddedInsights;
      }

      return { insights: [], summary: 'No knowledge base data. Upload your resume or connect GitHub to get personalized insights.' };
    }

    const insights = await geminiService.parseRAGInsights(ragChunks, userSkills);
    return { ...insights, chunksUsed: ragChunks.length, rawChunks: ragChunks.slice(0, 10) };
  }

  private async generateJobReskillPlan(userId: string, profile: any, job: IJobListing) {
    try {
      const userSkills = profile.extractedSkills || [];
      const jobSkills = job.skills || [];
      const missingSkills = jobSkills.filter((s: string) =>
        !userSkills.some((us: string) => fuzzySkillMatch(us, s))
      );
      const matchingSkills = jobSkills.filter((s: string) =>
        userSkills.some((us: string) => fuzzySkillMatch(us, s))
      );

      // Try RAG-enhanced reskilling first — retrieve from ChromaDB
      const ragChunks = await ragService.retrieveBySkills(
        userId,
        [...userSkills, ...missingSkills],
        15
      ).catch((err) => {
        logger.warn(`[Reskill] RAG retrieval failed: ${err.message}`);
        return [];
      });

      if (ragChunks.length > 0) {
        const ragContext = ragService.buildContextString(ragChunks);
        logger.info(`[Reskill] Using ${ragChunks.length} ChromaDB RAG chunks for personalized plan`);

        const plan = await geminiService.generateReskillPathWithRAG(
          userSkills,
          missingSkills,
          profile.city,
          job.normalizedTitle || job.title,
          ragContext,
          job.rawDescription
        );

        // Parse RAG insights in parallel (fire-and-forget enrichment)
        const ragInsights = await geminiService.parseRAGInsights(ragChunks, userSkills).catch(() => null);

        return {
          ...plan,
          ragEnhanced: true,
          ragChunksUsed: ragChunks.length,
          ragInsights,
          matchingSkills,
          missingSkills,
          generatedAt: new Date(),
        };
      }

      // Fallback to standard reskilling (no RAG data)
      logger.info('[Reskill] No RAG data available, using standard generation');
      const plan = await geminiService.generateReskillPath(
        userSkills,
        missingSkills,
        profile.city,
        job.normalizedTitle || job.title
      );

      return { ...plan, ragEnhanced: false, matchingSkills, missingSkills, generatedAt: new Date() };
    } catch (err: any) {
      logger.error('Reskill plan generation failed:', err.message);
      return {
        targetRole: job.title,
        targetCity: profile.city,
        isHiringVerified: true,
        totalWeeks: 8,
        hoursPerWeek: 10,
        ragEnhanced: false,
        matchingSkills: [],
        missingSkills: job.skills || [],
        steps: [
          { weekRange: 'Week 1-2', courseName: 'Foundation Skills', provider: 'NPTEL', url: 'https://nptel.ac.in', duration: '2 weeks', estimatedHours: 20, difficulty: 'beginner', isFree: true, skillsGained: [], reasoning: 'Start with fundamentals to build a strong base.', milestones: ['Complete introductory modules'] },
          { weekRange: 'Week 3-5', courseName: 'Core Skills Training', provider: 'SWAYAM', url: 'https://swayam.gov.in', duration: '3 weeks', estimatedHours: 30, difficulty: 'intermediate', isFree: true, skillsGained: [], reasoning: 'Build on foundations with industry-relevant skills.', milestones: ['Complete hands-on assignments'] },
          { weekRange: 'Week 6-8', courseName: 'Industry Certification', provider: 'Coursera', url: 'https://coursera.org', duration: '3 weeks', estimatedHours: 30, difficulty: 'intermediate', isFree: false, skillsGained: [], reasoning: 'Validate your skills with an industry-recognized certification.', milestones: ['Pass certification exam'] },
        ],
        generatedAt: new Date(),
      };
    }
  }

  private mockRiskScoreForJob(job: any): { score: number; level: string } {
    const title = (job.normalizedTitle || job.title || '').toLowerCase();
    const baseKey = Object.keys(AUTOMATION_BASELINES).find((k) => title.includes(k));
    const base = baseKey ? AUTOMATION_BASELINES[baseKey] : 40;
    const aiBoost = (job.aiToolMentions?.length || 0) * 5;
    const score = Math.min(100, Math.max(0, base + aiBoost));
    const level = score > 80 ? 'CRITICAL' : score > 60 ? 'HIGH' : score > 40 ? 'MEDIUM' : 'LOW';
    return { score, level };
  }
}

export const seekerService = new SeekerService();
