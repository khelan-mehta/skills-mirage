import { Router, Request, Response } from 'express';
import { seekerService } from '../services/seeker.service';
import { ragService } from '../services/rag.service';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

export const seekerRoutes = Router();

// Complete onboarding questionnaire
seekerRoutes.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const { jobTitle, city, yearsOfExperience, writeUp, resumeText } = req.body;
    if (!jobTitle || !city || yearsOfExperience === undefined || !writeUp) {
      return res.status(400).json({ error: 'jobTitle, city, yearsOfExperience, and writeUp are required' });
    }

    const result = await seekerService.completeOnboarding(req.user!.userId, {
      jobTitle, city, yearsOfExperience, writeUp, resumeText,
    });

    const io = req.app.get('io');
    if (io) io.emit('seeker:onboarded', { userId: req.user!.userId });

    res.status(201).json(result);
  } catch (err: any) {
    logger.error('Onboarding error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get user's profile
seekerRoutes.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await seekerService.getProfile(req.user!.userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
seekerRoutes.put('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await seekerService.updateProfile(req.user!.userId, req.body);
    res.json(profile);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get all jobs with filters & pagination
seekerRoutes.get('/all-jobs', async (req: Request, res: Response) => {
  try {
    const { page, limit, city, search, skills, source, sort } = req.query;
    const result = await seekerService.getAllJobs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      city: city as string,
      search: search as string,
      skills: skills ? (skills as string).split(',') : undefined,
      source: source as string,
      sort: sort as string,
    });
    res.json(result);
  } catch (err: any) {
    logger.error('All jobs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get filter options (cities, sources, top skills)
seekerRoutes.get('/filter-options', async (_req: Request, res: Response) => {
  try {
    const options = await seekerService.getFilterOptions();
    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// Get matched jobs
seekerRoutes.get('/matched-jobs', async (req: Request, res: Response) => {
  try {
    console.log('=== MATCHED JOBS DEBUG ===');
    console.log('userId:', req.user!.userId);

    const jobs = await seekerService.getMatchedJobs(req.user!.userId);
    
    console.log('jobs returned:', jobs.length);
    res.json({ jobs, count: jobs.length });
  } catch (err: any) {
    logger.error('Matched jobs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch matched jobs' });
  }
});

// Star a job
seekerRoutes.post('/star/:jobId', async (req: Request, res: Response) => {
  try {
    const result = await seekerService.starJob(req.user!.userId, req.params.jobId);
    res.status(201).json(result);
  } catch (err: any) {
    logger.error('Star job error:', err.message);
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// Unstar a job
seekerRoutes.delete('/star/:jobId', async (req: Request, res: Response) => {
  try {
    await seekerService.unstarJob(req.user!.userId, req.params.jobId);
    res.json({ message: 'Job unstarred' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all starred jobs
seekerRoutes.get('/starred', async (req: Request, res: Response) => {
  try {
    const starred = await seekerService.getStarredJobs(req.user!.userId);
    res.json({ starred, count: starred.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch starred jobs' });
  }
});

// Get reskill plan for a starred job
seekerRoutes.get('/starred/:jobId/reskill-plan', async (req: Request, res: Response) => {
  try {
    const result = await seekerService.getReskillPlan(req.user!.userId, req.params.jobId);
    res.json(result);
  } catch (err: any) {
    const status = err.message.includes('not starred') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// RAG context stats
seekerRoutes.get('/rag-stats', async (req: Request, res: Response) => {
  try {
    const stats = await ragService.getUserStats(req.user!.userId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch RAG stats' });
  }
});

// RAG insights — parsed through LLM into actionable insights
seekerRoutes.get('/rag-insights', async (req: Request, res: Response) => {
  try {
    const insights = await seekerService.getRAGInsights(req.user!.userId);
    res.json(insights || { insights: [], summary: 'No data available' });
  } catch (err: any) {
    logger.error('RAG insights error:', err.message);
    res.status(500).json({ error: 'Failed to generate RAG insights' });
  }
});

// Dashboard summary
seekerRoutes.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const data = await seekerService.getDashboard(req.user!.userId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Connect GitHub
seekerRoutes.put('/github/connect', async (req: Request, res: Response) => {
  try {
    const { accessToken, username } = req.body;
    if (!accessToken || !username) {
      return res.status(400).json({ error: 'accessToken and username required' });
    }
    await seekerService.connectGitHub(req.user!.userId, accessToken, username);
    res.json({ message: 'GitHub connected', username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect GitHub
seekerRoutes.delete('/github/disconnect', async (req: Request, res: Response) => {
  try {
    await seekerService.disconnectGitHub(req.user!.userId);
    res.json({ message: 'GitHub disconnected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Quiz Generation ───────────────────────────────────────────────────────────

const openaiQuiz = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/v1/seeker/quiz/generate
 * Generates 5 MCQ questions on-the-fly based on a reskilling step context.
 * Body: { courseName, skillsGained, difficulty, stepIndex, totalSteps, targetRole }
 */
seekerRoutes.post('/quiz/generate', async (req: Request, res: Response) => {
  try {
    const { courseName, skillsGained, difficulty, stepIndex, totalSteps, targetRole } = req.body;

    if (!courseName) {
      return res.status(400).json({ error: 'courseName is required' });
    }

    const skillsList = Array.isArray(skillsGained) && skillsGained.length > 0
      ? skillsGained.slice(0, 8).join(', ')
      : 'core concepts';

    const levelLabel = difficulty === 'beginner' ? 'foundational'
      : difficulty === 'advanced' ? 'advanced'
      : 'intermediate';

    const progressNote = totalSteps > 0
      ? `This is checkpoint ${stepIndex + 1} of ${totalSteps} in the learning path.`
      : '';

    const prompt = `You are an expert technical trainer creating a concise knowledge check quiz.

Context:
- Course: "${courseName}"
- Skills covered: ${skillsList}
- Difficulty: ${levelLabel}
- Target role: ${targetRole || 'a tech professional'}
- ${progressNote}

Generate exactly 5 multiple-choice questions to test understanding of this course material.
Each question should:
- Be clear, specific, and directly testable from the course content
- Have exactly 4 options (A, B, C, D)
- Have exactly one correct answer
- Be appropriate for ${levelLabel} level

Return ONLY valid JSON in this exact format (no markdown, no explanation):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of why this is correct (1-2 sentences)"
  }
]

correctIndex is 0-indexed (0=A, 1=B, 2=C, 3=D).`;

    const response = await openaiQuiz.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1200,
    });

    const text = response.choices[0].message.content?.trim() || '[]';
    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid quiz format returned');
    }

    res.json({
      questions,
      courseName,
      difficulty: difficulty || 'intermediate',
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Quiz generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});
