import OpenAI from 'openai';
import { TUNING } from '../../config/tuning';
import { Semaphore, SlidingWindowLimiter } from '../../lib/concurrency';
import { withRetry } from '../../lib/retry';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface SkillExtraction {
  required_skills: string[];
  ai_tool_mentions: string[];
  automation_risk_signals: string[];
  seniority_level: string;
  sector: string;
}

interface ProfileAnalysis {
  explicit_skills: string[];
  implicit_skills: string[];
  tools: string[];
  soft_skills: string[];
  aspirations: string[];
  experience_level: string;
  domain_tags: string[];
}

class GeminiService {
  private client: OpenAI | null;
  private semaphore: Semaphore;
  private rateLimiter: SlidingWindowLimiter;
  private available: boolean;
  private model: string;

  constructor() {
    this.available = !!env.OPENAI_API_KEY;
    if (this.available) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    } else {
      this.client = null;
    }
    this.model = 'gpt-4o-mini';
    this.semaphore = new Semaphore(TUNING.GEMINI_MAX_CONCURRENT);
    this.rateLimiter = new SlidingWindowLimiter(TUNING.GEMINI_RPM_LIMIT, 60_000);
  }

  private async chatCompletion(prompt: string): Promise<string> {
    const resp = await this.client!.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    return resp.choices[0]?.message?.content?.trim() || '';
  }

  async extractSkillsFromJD(description: string): Promise<SkillExtraction> {
    if (!this.available) return this.fallbackSkillExtraction(description);

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      return withRetry(
        async () => {
          const prompt = `Analyze this Indian job description. Extract:
1. required_skills: string[]
2. ai_tool_mentions: string[] (ChatGPT, Copilot, AutoML, etc.)
3. automation_risk_signals: string[]
4. seniority_level: "junior" | "mid" | "senior" | "lead"
5. sector: string

Return ONLY valid JSON, no markdown.

JD: ${description.slice(0, 1000)}`;

          const text = await this.chatCompletion(prompt);
          return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
        },
        { attempts: TUNING.GEMINI_RETRY_ATTEMPTS, baseDelayMs: TUNING.GEMINI_RETRY_BASE_MS }
      );
    });
  }

  async analyzeWorkerWriteUp(writeUp: string, title: string): Promise<ProfileAnalysis> {
    if (!this.available) return this.fallbackProfileAnalysis(writeUp, title);

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      return withRetry(
        async () => {
          const text = await this.chatCompletion(
            `You are an Indian job market expert. Analyze this worker's self-description:
Title: ${title}
Write-up: ${writeUp}

Extract as JSON:
{
  "explicit_skills": [],
  "implicit_skills": [],
  "tools": [],
  "soft_skills": [],
  "aspirations": [],
  "experience_level": "junior|mid|senior",
  "domain_tags": []
}
The write-up is the most important signal. Be thorough. Return ONLY JSON.`
          );
          return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
        },
        { attempts: TUNING.GEMINI_RETRY_ATTEMPTS, baseDelayMs: TUNING.GEMINI_RETRY_BASE_MS }
      );
    });
  }

  async normalizeJobTitle(rawTitle: string): Promise<string> {
    if (!this.available) return rawTitle.toLowerCase().trim();

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      const text = await this.chatCompletion(
        `Normalize this Indian job title to a standard form. Return ONLY the normalized title, nothing else.
Examples: "Sr. Executive - BPO" → "senior executive bpo", "Jr. Software Dev" → "junior software developer"
Title: ${rawTitle}`
      );
      return text.toLowerCase();
    });
  }

  async generateReskillPath(
    skills: string[],
    aspirations: string[],
    city: string,
    targetRole: string
  ): Promise<any> {
    if (!this.available) return this.fallbackReskillPath(targetRole, city);

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      const text = await this.chatCompletion(
        `Generate a reskilling path for an Indian worker.

Current skills: ${skills.join(', ')}
Aspirations: ${aspirations.join(', ')}
City: ${city}
Target role: ${targetRole}

Create a week-by-week plan using ONLY these Indian course platforms:
- NPTEL (IIT/IISc courses, free)
- SWAYAM (government platform, free)
- PMKVY (Pradhan Mantri Kaushal Vikas Yojana, free)
- Coursera (some free courses)

Return JSON:
{
  "targetRole": "${targetRole}",
  "targetCity": "${city}",
  "isHiringVerified": true,
  "totalWeeks": number,
  "hoursPerWeek": number,
  "steps": [
    {
      "weekRange": "Week 1-2",
      "courseName": "course name",
      "provider": "NPTEL|SWAYAM|PMKVY|Coursera",
      "institution": "IIT Madras",
      "url": "https://...",
      "duration": "4 weeks",
      "isFree": true
    }
  ]
}
Return ONLY JSON.`
      );
      return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    });
  }

  async generateReskillPathWithRAG(
    skills: string[],
    missingSkills: string[],
    city: string,
    targetRole: string,
    ragContext: string,
    jobDescription?: string
  ): Promise<any> {
    if (!this.available) return this.fallbackReskillPath(targetRole, city);

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      const text = await this.chatCompletion(
        `You are an elite career reskilling advisor for Indian workers. Generate a HYPER-PERSONALIZED, deeply reasoned reskilling plan.

=== WORKER'S VERIFIED SKILLS & PROJECT EXPERIENCE (from their GitHub/resume) ===
${ragContext}

=== CURRENT PROFILE ===
Current skills: ${skills.join(', ')}
City: ${city}

=== TARGET JOB ===
Target role: ${targetRole}
Skills gap (missing skills): ${missingSkills.join(', ')}
${jobDescription ? `Job description: ${jobDescription.slice(0, 800)}` : ''}

=== CRITICAL INSTRUCTIONS ===
1. Perform a DEEP SKILL GAP ANALYSIS — for each missing skill, rate how close the worker already is (0-100%) based on their actual repos/resume
2. Group skills by priority: "critical" (must learn first), "important" (accelerates career), "nice-to-have" (differentiators)
3. For EACH step in the plan, provide detailed REASONING: WHY this step comes at this point, WHAT foundation it builds on, HOW it connects to the worker's existing projects
4. Identify TRANSFERABLE PATTERNS from their existing code (e.g. "You built REST APIs in Express → FastAPI will take 60% less time")
5. Include PRACTICAL PROJECTS for each step — hands-on exercises that extend their existing repos
6. Compute realistic difficulty and estimated hours per step
7. Generate actual calendar dates starting from today (${new Date().toISOString().split('T')[0]})

Use ONLY these Indian course platforms:
- NPTEL (IIT/IISc courses, free)
- SWAYAM (government platform, free)
- PMKVY (Pradhan Mantri Kaushal Vikas Yojana, free)
- Coursera (some free courses)
- freeCodeCamp, GitHub Learning Lab (free)
- Udemy (affordable paid)

Return JSON:
{
  "targetRole": "${targetRole}",
  "targetCity": "${city}",
  "isHiringVerified": true,
  "totalWeeks": number,
  "hoursPerWeek": number,
  "personalizedInsight": "3-4 sentence deep analysis of why this plan is uniquely tailored to this worker",
  "strengthsLeveraged": ["specific existing skills/projects that accelerate this path"],
  "skillGapAnalysis": [
    {
      "skill": "skill name",
      "currentProficiency": 0-100,
      "priority": "critical|important|nice-to-have",
      "reasoning": "Why this gap exists and how close they already are based on their projects",
      "transferableFrom": "existing skill or project that helps bridge this gap"
    }
  ],
  "steps": [
    {
      "weekRange": "Week 1-2",
      "startDate": "2026-03-10",
      "endDate": "2026-03-23",
      "courseName": "course name",
      "provider": "NPTEL|SWAYAM|PMKVY|Coursera|freeCodeCamp|Udemy",
      "institution": "IIT Madras",
      "url": "https://...",
      "duration": "2 weeks",
      "estimatedHours": 20,
      "difficulty": "beginner|intermediate|advanced",
      "isFree": true,
      "skillsGained": ["skill1", "skill2"],
      "reasoning": "Detailed 2-3 sentence explanation of WHY this step is here, WHAT it builds on from previous steps, and HOW it connects to the worker's existing experience",
      "personalNote": "Based on your X project, this will be easier because you already understand Y",
      "practicalProject": "Extend your existing Z repo to add A feature, which will solidify B skill",
      "prerequisiteSteps": [],
      "milestones": ["Complete module X", "Build feature Y", "Pass assessment Z"]
    }
  ],
  "weeklyBreakdown": [
    {
      "week": 1,
      "date": "2026-03-10",
      "focus": "What to focus on this week",
      "hoursRequired": 10,
      "deliverables": ["deliverable 1", "deliverable 2"]
    }
  ]
}
Return ONLY valid JSON.`
      );
      return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    });
  }

  /**
   * Parse RAG chunks into actionable insights via LLM
   */
  async parseRAGInsights(ragChunks: Array<{ content: string; source: string; chunkType: string; score: number }>, userSkills: string[]): Promise<any> {
    if (!this.available || ragChunks.length === 0) {
      return { insights: [], summary: 'No knowledge base data available.' };
    }

    const chunksText = ragChunks.map((c, i) =>
      `[Chunk ${i + 1} | source: ${c.source} | type: ${c.chunkType} | relevance: ${(c.score * 100).toFixed(0)}%]\n${c.content}`
    ).join('\n\n');

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      const text = await this.chatCompletion(
        `You are analyzing a worker's personal knowledge base (from their GitHub repos and resume) to extract actionable career insights.

=== RAW KNOWLEDGE BASE CHUNKS ===
${chunksText.slice(0, 5000)}

=== WORKER'S DECLARED SKILLS ===
${userSkills.join(', ')}

=== TASK ===
Parse these raw chunks into structured, actionable insights. For each insight:
1. Identify the KEY FINDING from the chunk (what does this tell us about the worker?)
2. Rate its CAREER IMPACT (how much does this affect their career trajectory?)
3. Provide an ACTIONABLE RECOMMENDATION based on this finding
4. Tag relevant skills

Return JSON:
{
  "summary": "2-3 sentence overall assessment of the worker's profile based on their knowledge base",
  "totalProjects": number,
  "dominantTechStack": ["top 5 technologies"],
  "hiddenStrengths": ["skills evident from code but not explicitly listed"],
  "insights": [
    {
      "title": "Short title for this insight",
      "finding": "What this chunk reveals about the worker",
      "impact": "high|medium|low",
      "recommendation": "Actionable next step based on this finding",
      "skills": ["relevant", "skills"],
      "source": "github|resume",
      "repoName": "if from github"
    }
  ]
}
Return ONLY valid JSON.`
      );
      return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    });
  }

  async tagSkillsToMarket(
    extractedSkills: string[],
    marketSkills: string[]
  ): Promise<string[]> {
    if (!this.available || extractedSkills.length === 0 || marketSkills.length === 0) {
      return extractedSkills;
    }

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      return withRetry(
        async () => {
          const text = await this.chatCompletion(
            `You are a skill-matching expert for the Indian job market.

Given a worker's extracted skills and the top skills currently demanded in the job market, map each extracted skill to the MOST relevant market skill it corresponds to.

Worker's extracted skills: ${JSON.stringify(extractedSkills)}
Market skills (from job listings): ${JSON.stringify(marketSkills)}

Rules:
- For each extracted skill, find the closest matching market skill (e.g. "react.js" → "react", "amazon web services" → "aws", "nodejs" → "node.js", "communication skills" → "communication", "python programming" → "python", "java developer" → "java")
- Strip qualifiers like "skills", "programming", "developer", "engineer" when the base skill exists in market skills
- If an extracted skill has no reasonable match in market skills, keep it as-is
- Do NOT drop any skills — every extracted skill must appear in the output
- Do NOT add skills the worker doesn't have
- Return lowercase strings
- Return ONLY a JSON array of strings, no markdown, no explanation

Example: ["react", "python", "aws", "docker", "communication"]`
          );
          const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
          if (Array.isArray(parsed)) return parsed.map((s: string) => s.toLowerCase().trim());
          return extractedSkills;
        },
        { attempts: TUNING.GEMINI_RETRY_ATTEMPTS, baseDelayMs: TUNING.GEMINI_RETRY_BASE_MS }
      );
    });
  }

  async detectLanguage(text: string): Promise<'en' | 'hi'> {
    const hindiRegex = /[\u0900-\u097F]/;
    return hindiRegex.test(text) ? 'hi' : 'en';
  }

  async translateToEnglish(hindiText: string): Promise<string> {
    if (!this.available) return hindiText;
    return this.chatCompletion(
      `Translate this Hindi text to English. Preserve technical terms. Only return the translation:\n${hindiText}`
    );
  }

  async translateToHindi(englishText: string): Promise<string> {
    if (!this.available) return englishText;
    return this.chatCompletion(
      `Translate this to Hindi (Devanagari script). Keep technical terms, course names, URLs in English. Only return the translation:\n${englishText}`
    );
  }

  async parseResume(resumeText: string): Promise<any> {
    if (!this.available) {
      return {
        name: 'Unknown', skills: { technical: [], soft: [], tools: [], languages: [] },
        experience: [], education: [], certifications: [], projects: [], summary: resumeText.slice(0, 200),
      };
    }

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      const text = await this.chatCompletion(
        `Parse this resume into structured JSON:
{
  "name": "", "email": "", "phone": "", "location": "",
  "education": [{ "institution": "", "degree": "", "year": 0 }],
  "experience": [{ "company": "", "title": "", "duration": "", "description": "", "skills": [] }],
  "skills": { "technical": [], "soft": [], "tools": [], "languages": [] },
  "certifications": [{ "name": "", "issuer": "", "year": 0 }],
  "projects": [{ "name": "", "description": "", "techStack": [] }],
  "summary": ""
}
Return ONLY JSON.

Resume text: ${resumeText.slice(0, 3000)}`
      );
      return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    });
  }

  async buildGraphFromData(resumeData: any, githubData: any): Promise<any> {
    if (!this.available) return this.fallbackGraphBuild(resumeData, githubData);

    // Prepare a rich but concise summary for the LLM
    const context = this.prepareGraphContext(resumeData, githubData);

    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      const text = await this.chatCompletion(
        `You are an expert knowledge graph builder for professional profiles. Build a rich, interconnected graph from this data.

${context}

=== GRAPH CONSTRUCTION RULES ===
Node types: person, skill, project, language, certification, company, education, repo, domain, tool
Edge types: uses, built_with, skilled_at, works_at, studied_at, certified_in, contributes_to, related_to, depends_on, similar_to

Rules:
1. Create ONE "person" node with weight 10
2. Create nodes for EVERY unique skill, language, tool, repo, company, education, certification, project, and domain
3. Create edges between related nodes — connect skills to repos that use them, connect repos to languages, connect projects to tools
4. Cross-link related skills (e.g., React → JavaScript via "related_to", Docker → Kubernetes via "related_to")
5. Cross-link repos that share technologies (via "similar_to")
6. Weights: 10=central/strong, 7-9=important, 4-6=moderate, 1-3=minor
7. Extract skills from dependencies too (e.g., "express" dependency → "node.js" skill, "pandas" → "data science")
8. Aim for 30-60 nodes and 40-80 edges for a rich graph
9. Each node MUST have a unique "id" (use format: type_label, e.g. "skill_react", "repo_myproject")

Return ONLY valid JSON:
{
  "nodes": [{ "id": "person_name", "label": "Name", "type": "person", "category": "person", "weight": 10, "metadata": {} }],
  "edges": [{ "id": "edge_0", "source": "person_name", "target": "skill_react", "type": "skilled_at", "weight": 8 }]
}`
      );
      return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    });
  }

  private prepareGraphContext(resumeData: any, githubData: any): string {
    const parts: string[] = [];

    if (resumeData) {
      parts.push('=== RESUME DATA ===');
      if (resumeData.name) parts.push(`Name: ${resumeData.name}`);
      if (resumeData.summary) parts.push(`Summary: ${resumeData.summary}`);
      if (resumeData.skills?.technical?.length) parts.push(`Technical Skills: ${resumeData.skills.technical.join(', ')}`);
      if (resumeData.skills?.tools?.length) parts.push(`Tools: ${resumeData.skills.tools.join(', ')}`);
      if (resumeData.skills?.soft?.length) parts.push(`Soft Skills: ${resumeData.skills.soft.join(', ')}`);
      if (resumeData.skills?.languages?.length) parts.push(`Languages: ${resumeData.skills.languages.join(', ')}`);
      for (const exp of (resumeData.experience || []).slice(0, 5)) {
        parts.push(`Work: ${exp.title} at ${exp.company} (${exp.duration}) — Skills: ${(exp.skills || []).join(', ')}`);
      }
      for (const edu of (resumeData.education || []).slice(0, 3)) {
        parts.push(`Education: ${edu.degree} from ${edu.institution} (${edu.year})`);
      }
      for (const cert of (resumeData.certifications || []).slice(0, 5)) {
        parts.push(`Certification: ${cert.name} by ${cert.issuer}`);
      }
      for (const proj of (resumeData.projects || []).slice(0, 5)) {
        parts.push(`Project: ${proj.name} — ${proj.description?.slice(0, 100)} — Tech: ${(proj.techStack || []).join(', ')}`);
      }
    }

    if (githubData?.repos?.length) {
      parts.push('\n=== GITHUB REPOS ===');
      parts.push(`Username: ${githubData.username}`);
      if (githubData.bio) parts.push(`Bio: ${githubData.bio}`);

      for (const repo of githubData.repos.slice(0, 15)) {
        const langs = Object.keys(repo.languages || {});
        const deps = (repo.dependencies || []).slice(0, 20);
        const repoLines = [
          `Repo: ${repo.name} (${repo.stars} stars)`,
          repo.description ? `  Desc: ${repo.description}` : '',
          langs.length ? `  Languages: ${langs.join(', ')}` : '',
          deps.length ? `  Dependencies: ${deps.join(', ')}` : '',
          repo.topics?.length ? `  Topics: ${repo.topics.join(', ')}` : '',
        ].filter(Boolean);
        parts.push(repoLines.join('\n'));

        // Include README summary if available
        if (repo.readme) {
          const readmeSummary = repo.readme
            .replace(/[#*`\[\]]/g, '')
            .replace(/\n+/g, ' ')
            .trim()
            .slice(0, 300);
          if (readmeSummary.length > 50) {
            parts.push(`  README: ${readmeSummary}`);
          }
        }
      }
    }

    return parts.join('\n').slice(0, 6000);
  }

  // Fallback methods when API is not available
  private fallbackSkillExtraction(description: string): SkillExtraction {
    const skills = this.extractKeywords(description, [
      'python', 'javascript', 'java', 'react', 'node', 'sql', 'aws', 'docker',
      'kubernetes', 'typescript', 'mongodb', 'redis', 'git', 'linux', 'html', 'css',
      'excel', 'powerpoint', 'communication', 'leadership', 'management',
    ]);
    const aiTools = this.extractKeywords(description, [
      'chatgpt', 'copilot', 'gemini', 'ai', 'machine learning', 'automation', 'automl',
    ]);
    return {
      required_skills: skills,
      ai_tool_mentions: aiTools,
      automation_risk_signals: aiTools.length > 0 ? ['AI tools mentioned in JD'] : [],
      seniority_level: description.toLowerCase().includes('senior') ? 'senior' :
        description.toLowerCase().includes('junior') ? 'junior' : 'mid',
      sector: 'IT',
    };
  }

  private fallbackProfileAnalysis(writeUp: string, title: string): ProfileAnalysis {
    const combined = `${title} ${writeUp}`.toLowerCase();
    return {
      explicit_skills: this.extractKeywords(combined, [
        'python', 'javascript', 'java', 'react', 'node', 'sql', 'excel', 'communication',
      ]),
      implicit_skills: [],
      tools: this.extractKeywords(combined, ['excel', 'powerpoint', 'git', 'jira', 'slack']),
      soft_skills: this.extractKeywords(combined, [
        'communication', 'leadership', 'teamwork', 'problem solving', 'analytical',
      ]),
      aspirations: [],
      experience_level: 'mid',
      domain_tags: [],
    };
  }

  private fallbackReskillPath(targetRole: string, city: string) {
    return {
      targetRole,
      targetCity: city,
      isHiringVerified: true,
      totalWeeks: 12,
      hoursPerWeek: 10,
      steps: [
        { weekRange: 'Week 1-3', courseName: 'Programming Fundamentals', provider: 'NPTEL', institution: 'IIT Madras', url: 'https://nptel.ac.in', duration: '3 weeks', isFree: true },
        { weekRange: 'Week 4-6', courseName: 'Data Analysis with Python', provider: 'SWAYAM', institution: 'IIT Bombay', url: 'https://swayam.gov.in', duration: '3 weeks', isFree: true },
        { weekRange: 'Week 7-9', courseName: 'Industry Skills Training', provider: 'PMKVY', url: 'https://pmkvyofficial.org', duration: '3 weeks', isFree: true },
        { weekRange: 'Week 10-12', courseName: 'Professional Certification', provider: 'Coursera', url: 'https://coursera.org', duration: '3 weeks', isFree: false },
      ],
    };
  }

  private fallbackGraphBuild(resumeData: any, githubData: any) {
    const nodes: any[] = [];
    const edges: any[] = [];
    let nodeId = 0;

    const personId = `node_${nodeId++}`;
    nodes.push({
      id: personId, label: resumeData?.name || 'User', type: 'person',
      category: 'person', weight: 10, metadata: {},
    });

    const addedSkills = new Set<string>();
    for (const skill of (resumeData?.skills?.technical || [])) {
      if (addedSkills.has(skill)) continue;
      addedSkills.add(skill);
      const id = `node_${nodeId++}`;
      nodes.push({ id, label: skill, type: 'skill', category: 'skill', weight: 5, metadata: {} });
      edges.push({ id: `edge_${edges.length}`, source: personId, target: id, type: 'skilled_at', weight: 5 });
    }

    for (const repo of (githubData?.repos || [])) {
      const id = `node_${nodeId++}`;
      nodes.push({ id, label: repo.name, type: 'repo', category: 'repo', weight: 4, metadata: repo });
      edges.push({ id: `edge_${edges.length}`, source: personId, target: id, type: 'contributes_to', weight: 3 });
    }

    return { nodes, edges };
  }

  private extractKeywords(text: string, keywords: string[]): string[] {
    const lower = text.toLowerCase();
    return keywords.filter((k) => lower.includes(k));
  }
}

export const geminiService = new GeminiService();
