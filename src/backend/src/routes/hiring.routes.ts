import { Router, Request, Response } from 'express';
import { hiringService } from '../services/hiring.service';
import { logger } from '../utils/logger';

export const hiringRoutes = Router();

/**
 * POST /api/v1/hiring/analyze
 * Accepts a raw JD, extracts parameters via OpenAI, matches platform users, saves and returns result.
 */
hiringRoutes.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { rawDescription, title, company } = req.body;

    if (!rawDescription || rawDescription.trim().length < 50) {
      return res.status(400).json({
        error: 'rawDescription is required and must be at least 50 characters.',
      });
    }
    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required.' });
    }
    if (!company?.trim()) {
      return res.status(400).json({ error: 'company is required.' });
    }

    logger.info(`Analyzing JD for "${title}" at "${company}"`);
    const result = await hiringService.analyzeAndMatch({ rawDescription, title, company });

    res.status(201).json(result);
  } catch (err: any) {
    logger.error('Hiring analyze error:', err.message);
    res.status(500).json({ error: 'Failed to analyze job description. Please try again.' });
  }
});

/**
 * GET /api/v1/hiring/jobs
 * Returns all company JDs (summary view — no full candidate list).
 */
hiringRoutes.get('/jobs', async (_req: Request, res: Response) => {
  try {
    const jobs = await hiringService.getAllJobs();
    res.json({ jobs, count: jobs.length });
  } catch (err: any) {
    logger.error('Hiring jobs list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hiring jobs.' });
  }
});

/**
 * GET /api/v1/hiring/jobs/:id
 * Returns a single company JD with full candidate list.
 */
hiringRoutes.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const job = await hiringService.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    res.json(job);
  } catch (err: any) {
    logger.error('Hiring job detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch job details.' });
  }
});
