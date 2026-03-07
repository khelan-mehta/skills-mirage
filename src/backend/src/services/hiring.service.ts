import OpenAI from 'openai';
import { CompanyJob, IExtractedParams, IMatchedCandidate } from '../models/CompanyJob';
import { WorkerProfile } from '../models/WorkerProfile';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class HiringService {
  /**
   * Extract structured hiring parameters from a raw job description using OpenAI.
   */
  async extractJDParams(description: string): Promise<IExtractedParams> {
    const prompt = `You are an expert technical recruiter. Analyze this job description and extract structured parameters.
Return ONLY valid JSON (no markdown, no explanation):
{
  "required_skills": ["skill1", "skill2"],
  "domain": "e.g. Software Engineering / Data Science / Product Management",
  "skill_level": "junior|mid|senior|lead",
  "preferred_city": "city name or null if not specified",
  "min_experience": 0,
  "max_experience": 10
}

Rules:
- required_skills: list specific technical skills, tools, frameworks (max 15)
- domain: concise 2-3 word domain label
- skill_level: infer from years mentioned or seniority words
- preferred_city: extract Indian city name if mentioned, else null
- min/max_experience: extract from years mentioned (e.g. "3-5 years" → min:3 max:5, "5+ years" → min:5 max:30)

Job Description:
${description.slice(0, 3000)}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      });

      const text = response.choices[0].message.content?.trim() || '{}';
      // Strip markdown code fences if any
      const cleaned = text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        requiredSkills: Array.isArray(parsed.required_skills) ? parsed.required_skills : [],
        domain: parsed.domain || 'General',
        skillLevel: (['junior', 'mid', 'senior', 'lead'].includes(parsed.skill_level)
          ? parsed.skill_level
          : 'mid') as IExtractedParams['skillLevel'],
        preferredCity: parsed.preferred_city || null,
        minExperience: Number(parsed.min_experience) || 0,
        maxExperience: Number(parsed.max_experience) || 20,
      };
    } catch (err: any) {
      logger.error('OpenAI JD extraction failed:', err.message);
      // Return safe defaults so the flow doesn't break
      return {
        requiredSkills: [],
        domain: 'General',
        skillLevel: 'mid',
        preferredCity: null,
        minExperience: 0,
        maxExperience: 20,
      };
    }
  }

  /**
   * Match platform users (WorkerProfiles) against the extracted JD parameters.
   * Returns up to 20 best-matched candidates with scores.
   */
  async matchCandidates(params: IExtractedParams): Promise<IMatchedCandidate[]> {
    try {
      // Build filter: experience range (allow ±2 year tolerance)
      const expFilter: any = {
        yearsOfExperience: {
          $gte: Math.max(0, params.minExperience - 1),
          $lte: params.maxExperience + 2,
        },
      };

      // Fetch all profiles in range (limit to 500 for performance)
      const profiles = await WorkerProfile.find(expFilter).limit(500).lean();

      if (!profiles.length) return [];

      // Normalize required skills for comparison
      const requiredSkillsLower = params.requiredSkills.map((s) => s.toLowerCase().trim());

      // Score each profile
      const scored = profiles.map((profile) => {
        const profileSkills = [
          ...(profile.extractedSkills || []),
          ...(profile.extractedTools || []),
        ].map((s) => s.toLowerCase().trim());

        // Skill overlap
        const matchedSkills = params.requiredSkills.filter((reqSkill) => {
          const reqLower = reqSkill.toLowerCase();
          return profileSkills.some(
            (ps) => ps.includes(reqLower) || reqLower.includes(ps) || ps === reqLower
          );
        });

        const skillScore =
          requiredSkillsLower.length > 0
            ? (matchedSkills.length / requiredSkillsLower.length) * 100
            : 50;

        // City bonus
        let cityBonus = 0;
        if (
          params.preferredCity &&
          profile.city.toLowerCase().includes(params.preferredCity.toLowerCase())
        ) {
          cityBonus = 15;
        }

        // Skill level bonus
        let levelBonus = 0;
        const levelMap: Record<string, number> = {
          junior: 1,
          mid: 2,
          senior: 3,
          lead: 4,
        };
        const requiredLevel = levelMap[params.skillLevel] || 2;
        const profileLevel = profile.yearsOfExperience <= 2
          ? 1
          : profile.yearsOfExperience <= 5
          ? 2
          : profile.yearsOfExperience <= 9
          ? 3
          : 4;

        if (profileLevel === requiredLevel) levelBonus = 10;
        else if (Math.abs(profileLevel - requiredLevel) === 1) levelBonus = 5;

        const finalScore = Math.min(100, Math.round(skillScore + cityBonus + levelBonus));

        return {
          profile,
          matchedSkills,
          matchScore: finalScore,
        };
      });

      // Sort by match score desc, keep top 20 with any skill matches
      const top20 = scored
        .filter((s) => s.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 20);

      if (!top20.length) return [];

      // Fetch User info for matched profiles
      const profileIds = top20.map((s) => s.profile._id);

      // Find users linked to these profiles
      const users = await User.find({ profileId: { $in: profileIds } })
        .select('name email profileId')
        .lean();

      const userMap = new Map(users.map((u) => [String(u.profileId), u]));

      return top20.map(({ profile, matchedSkills, matchScore }) => {
        const user = userMap.get(String(profile._id));
        return {
          profileId: profile._id as any,
          userId: user?._id as any,
          name: user?.name || 'Platform User',
          email: user?.email || '',
          matchScore,
          matchedSkills,
          city: profile.city,
          yearsOfExperience: profile.yearsOfExperience,
          jobTitle: profile.jobTitle,
          writeUpSnippet: profile.writeUp?.slice(0, 200) || '',
        };
      });
    } catch (err: any) {
      logger.error('Candidate matching failed:', err.message);
      return [];
    }
  }

  /**
   * Full pipeline: extract JD params → match candidates → save CompanyJob → return result.
   */
  async analyzeAndMatch(data: {
    rawDescription: string;
    title: string;
    company: string;
  }): Promise<ICompanyJobResult> {
    const extractedParams = await this.extractJDParams(data.rawDescription);
    const matchedCandidates = await this.matchCandidates(extractedParams);

    const job = await CompanyJob.create({
      title: data.title,
      company: data.company,
      rawDescription: data.rawDescription,
      extractedParams,
      matchedCandidates,
    });

    return {
      jobId: String(job._id),
      title: job.title,
      company: job.company,
      extractedParams,
      matchedCandidates,
      totalMatches: matchedCandidates.length,
    };
  }

  /**
   * Fetch all past company JDs (summary view).
   */
  async getAllJobs() {
    return CompanyJob.find()
      .select('title company extractedParams createdAt matchedCandidates')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Fetch a single company JD with full candidate list.
   */
  async getJobById(id: string) {
    return CompanyJob.findById(id).lean();
  }
}

export interface ICompanyJobResult {
  jobId: string;
  title: string;
  company: string;
  extractedParams: IExtractedParams;
  matchedCandidates: IMatchedCandidate[];
  totalMatches: number;
}

export const hiringService = new HiringService();
