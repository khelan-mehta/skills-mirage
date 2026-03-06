import OpenAI from 'openai';
import { Semaphore } from '../../lib/concurrency';
import { TUNING } from '../../config/tuning';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface ChatContext {
  worker: {
    jobTitle: string;
    city: string;
    yearsOfExperience: number;
    extractedSkills: string[];
    extractedAspirations: string[];
    riskScore: { current: number; trend: string };
  };
  marketData: {
    hiringTrend: string;
    aiMentionRate: number;
    risingSkills: string[];
    decliningRoles: string[];
    activeJobCount: number;
  };
  courses: Array<{ name: string; provider: string; duration: string; url: string }>;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  ragContext?: string;
}

class ClaudeChatService {
  private client: OpenAI | null;
  private semaphore: Semaphore;
  private model: string;

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    } else {
      this.client = null;
    }
    this.model = 'gpt-4o-mini';
    this.semaphore = new Semaphore(TUNING.CLAUDE_MAX_CONCURRENT);
  }

  async chat(message: string, context: ChatContext): Promise<string> {
    if (!this.client) {
      return this.fallbackResponse(message, context);
    }

    return this.semaphore.acquire(async () => {
      try {
        const systemPrompt = this.buildSystemPrompt(context);
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...context.history.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: message },
        ];

        const resp = await this.client!.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        });

        return resp.choices[0]?.message?.content?.trim() || '';
      } catch (err: any) {
        logger.error('OpenAI chat error:', err.message);
        return this.fallbackResponse(message, context);
      }
    });
  }

  private buildSystemPrompt(ctx: ChatContext): string {
    const ragSection = ctx.ragContext
      ? `\n${ctx.ragContext}\n\nIMPORTANT: The above knowledge base contains the worker's ACTUAL projects, code, and experience retrieved from their GitHub repos and resume. Use this to give hyper-personalized advice. Reference their specific projects, repos, and technologies when relevant. For example, if they ask about reskilling, suggest paths that build on projects they've already built.\n`
      : '';

    return `You are a career advisor for Indian workers in the Skills Mirage system. You have access to the worker's personal knowledge base built from their GitHub repos and resume.

WORKER PROFILE:
- Current Role: ${ctx.worker.jobTitle}
- City: ${ctx.worker.city}
- Experience: ${ctx.worker.yearsOfExperience} years
- Skills: ${ctx.worker.extractedSkills.join(', ')}
- Aspirations: ${ctx.worker.extractedAspirations.join(', ')}
- Risk Score: ${ctx.worker.riskScore.current}/100 (${ctx.worker.riskScore.trend})

LIVE MARKET DATA (Layer 1):
- Hiring trend: ${ctx.marketData.hiringTrend}
- AI tool mention rate: ${ctx.marketData.aiMentionRate}%
- Rising skills: ${ctx.marketData.risingSkills.join(', ')}
- Declining roles: ${ctx.marketData.decliningRoles.join(', ')}
- Active jobs: ${ctx.marketData.activeJobCount}

RESKILLING RESOURCES:
${ctx.courses.map((c) => `- ${c.name} (${c.provider}, ${c.duration}, ${c.url})`).join('\n')}
${ragSection}
RULES:
1. Use the worker's PERSONAL KNOWLEDGE BASE above to personalize every response. Reference their actual repos, projects, and code when giving advice.
2. Be specific to their city, role, and skills.
3. When citing numbers, mention data source and recency.
4. Recommend specific courses with real URLs.
5. Be encouraging but honest about risk levels.
6. When suggesting reskilling, always connect it to what they've already built — e.g., "Since you built X with React in your Y repo, you could extend that to learn Z."
7. Keep responses concise — max 3 paragraphs unless detailed path requested.`;
  }

  private fallbackResponse(message: string, context: ChatContext): string {
    const msg = message.toLowerCase();
    const { worker, marketData } = context;
    const hasRAG = !!context.ragContext;
    const ragHint = hasRAG ? '\n\n*I also have access to your GitHub projects and resume for personalized advice.*' : '';

    if (msg.includes('risk') || msg.includes('score') || msg.includes('why')) {
      return `Your current AI risk score is **${worker.riskScore.current}/100** (${worker.riskScore.trend}).

Based on our live market analysis:
- ${worker.jobTitle} hiring trend in ${worker.city}: ${marketData.hiringTrend}
- AI tool mentions in similar job descriptions: ${marketData.aiMentionRate}%
- Active job postings for your profile: ${marketData.activeJobCount}

Rising skills in your area include: ${marketData.risingSkills.slice(0, 5).join(', ')}. Consider upskilling in these areas to improve your score.${ragHint}`;
    }

    if (msg.includes('safe') || msg.includes('job')) {
      return `Based on current market data in **${worker.city}**, roles with lower AI vulnerability include positions requiring skills in: ${marketData.risingSkills.slice(0, 5).join(', ')}.

Given your background in ${worker.jobTitle} with skills in ${worker.extractedSkills.slice(0, 3).join(', ')}, you could transition to roles that leverage these transferable skills while building new competencies.${ragHint}`;
    }

    if (msg.includes('path') || msg.includes('reskill') || msg.includes('course')) {
      return `Here's a recommended approach for reskilling:

1. **Foundation** (Weeks 1-3): Start with NPTEL courses on fundamental skills
2. **Specialization** (Weeks 4-8): SWAYAM courses aligned with rising demand
3. **Certification** (Weeks 9-12): Industry-recognized certification

All courses from NPTEL and SWAYAM are **free** and accessible in ${worker.city}. Visit https://nptel.ac.in and https://swayam.gov.in to get started.${ragHint}`;
    }

    return `I'm your AI career advisor. I can help you with:
- **Risk analysis**: Understanding your AI vulnerability score
- **Job recommendations**: Safer roles matching your skills
- **Reskilling paths**: Week-by-week plans with free courses
- **Market data**: Live job statistics for ${worker.city}
${hasRAG ? '- **Project-based advice**: Personalized guidance based on your GitHub repos' : ''}

What would you like to know?`;
  }
}

export const claudeService = new ClaudeChatService();
