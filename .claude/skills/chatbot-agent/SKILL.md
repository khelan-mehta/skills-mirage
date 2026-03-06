# Chatbot Agent — Context-Aware EN+HI Intelligence

## Role
You build the AI chatbot. Claude API powers the intelligence. Gemini handles Hindi translation.
The chatbot MUST handle 5 specific question types and be CONTEXT-AWARE (not generic LLM responses).

## Architecture
```
User Message (EN or HI)
       ↓
[Language Detection] → if Hindi: translate to EN (Gemini)
       ↓
[Context Assembly] → worker profile + Layer 1 data
       ↓
[Claude API Call] → with full context injected
       ↓
[Response Processing] → if Hindi input: translate response to HI (Gemini)
       ↓
Render in Chat UI (markdown)
```

## 5 Required Question Types

### Q1: "Why is my risk score so high?"
Must cite SPECIFIC Layer 1 signals:
```
System prompt injection:
"The worker's risk score is {score}/100 ({level}).
Contributing factors from live market data:
- {role} hiring in {city}: {trend}% change in 30 days
- AI tool mentions in {role} JDs: {percentage}%
- Role replacement ratio: {ratio}
- Peer comparison: top {percentile}% at-risk
Explain why their score is {score} using ONLY these real data points.
Do NOT make up statistics."
```

### Q2: "What jobs are safer for someone like me?"
Must query Layer 1 Vulnerability Index:
```
Context:
"Worker skills: {extractedSkills}
Worker aspirations: {aspirations}
Low-vulnerability roles actively hiring in {city}:
{list of roles with score < 30 AND active postings > 0}
Recommend roles that match their transferable skills."
```

### Q3: "Show me paths that take less than 3 months"
Must regenerate with time constraint:
```
Context:
"Generate reskilling paths under 12 weeks.
Available courses:
{filtered NPTEL/SWAYAM/PMKVY courses < 12 weeks}
Target roles must be verified as hiring in {city} from Layer 1 data.
Include specific course names, URLs, weekly schedule."
```

### Q4: "How many BPO jobs are in Indore right now?"
Must query LIVE Layer 1 data:
```
Context:
"Live job data for Indore:
{actual count from database for BPO roles in Indore}
Last scraped: {timestamp}
Do NOT guess or hallucinate a number. Use ONLY this data."
```

### Q5: "मुझे क्या करना चाहिए?" (Hindi)
Full Hindi support — detect language, process, respond in Hindi:
```
Pipeline:
1. Detect Hindi input (simple regex for Devanagari)
2. Translate to English via Gemini
3. Process through Claude with full context
4. Translate response back to Hindi via Gemini
5. Return Hindi response with Hindi markdown
```

## Claude API Integration
```typescript
// services/ai/claude.service.ts
import Anthropic from '@anthropic-ai/sdk';

class ClaudeChatService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }

  async chat(message: string, context: ChatContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...context.history.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ],
    });

    return response.content[0].type === 'text'
      ? response.content[0].text
      : '';
  }

  private buildSystemPrompt(ctx: ChatContext): string {
    return `You are a career advisor for Indian workers in the Skills Mirage system.

WORKER PROFILE:
- Name: ${ctx.worker.name || 'Worker'}
- Current Role: ${ctx.worker.jobTitle}
- City: ${ctx.worker.city}
- Experience: ${ctx.worker.yearsOfExperience} years
- Skills (from write-up): ${ctx.worker.extractedSkills.join(', ')}
- Aspirations: ${ctx.worker.extractedAspirations.join(', ')}
- Risk Score: ${ctx.worker.riskScore.current}/100 (${ctx.worker.riskScore.trend})

LIVE MARKET DATA (Layer 1):
- ${ctx.worker.jobTitle} hiring trend in ${ctx.worker.city}: ${ctx.marketData.hiringTrend}
- AI tool mention rate: ${ctx.marketData.aiMentionRate}%
- Top rising skills in ${ctx.worker.city}: ${ctx.marketData.risingSkills.join(', ')}
- Top declining roles in ${ctx.worker.city}: ${ctx.marketData.decliningRoles.join(', ')}
- Active job count for similar roles: ${ctx.marketData.activeJobCount}

RESKILLING RESOURCES:
${ctx.courses.map(c => `- ${c.name} (${c.provider}, ${c.duration}, ${c.url})`).join('\n')}

RULES:
1. ONLY use the data provided above. Never hallucinate statistics.
2. Be specific to their city, role, and skills.
3. When citing numbers, always mention the data source and recency.
4. If asked about jobs in a specific city, use ONLY the live count from Layer 1.
5. Recommend specific courses with real URLs.
6. Be encouraging but honest about risk levels.
7. Keep responses concise — max 3 paragraphs unless detailed path requested.`;
  }
}
```

## Hindi Language Pipeline
```typescript
// services/ai/gemini.service.ts — Hindi methods

async detectLanguage(text: string): Promise<'en' | 'hi'> {
  // Check for Devanagari characters
  const hindiRegex = /[\u0900-\u097F]/;
  return hindiRegex.test(text) ? 'hi' : 'en';
}

async translateToEnglish(hindiText: string): Promise<string> {
  const prompt = `Translate this Hindi text to English. Preserve technical terms.
  Only return the translation, nothing else.
  Hindi: ${hindiText}`;
  const result = await this.model.generateContent(prompt);
  return result.response.text();
}

async translateToHindi(englishText: string): Promise<string> {
  const prompt = `Translate this to Hindi (Devanagari script).
  Keep technical terms, course names, and URLs in English.
  Only return the translation.
  English: ${englishText}`;
  const result = await this.model.generateContent(prompt);
  return result.response.text();
}
```

## Chat UI Requirements (from ui-agent)
- Dark theme consistent with devxlabs
- User messages: right-aligned, teal border
- Bot messages: left-aligned, subtle gray bg
- Markdown rendering (tables, lists, bold)
- Typing indicator: 3 teal dots pulsing
- Quick action buttons for 5 question types
- Language toggle: EN | हिंदी
- Floating bubble in bottom-right corner (expandable)
- Chat history scrollable with auto-scroll to bottom
