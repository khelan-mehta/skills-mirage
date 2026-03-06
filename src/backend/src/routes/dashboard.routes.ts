import { Router, Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { logger } from '../utils/logger';

export const dashboardRoutes = Router();

dashboardRoutes.get('/hiring-trends', async (req: Request, res: Response) => {
  try {
    const { city, sector, range } = req.query;
    const data = await dashboardService.getHiringTrends(
      city as string,
      sector as string,
      (range as string) || '30d'
    );
    res.json(data);
  } catch (err: any) {
    logger.error('Hiring trends error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hiring trends' });
  }
});

dashboardRoutes.get('/skills', async (req: Request, res: Response) => {
  try {
    const { type, limit } = req.query;
    const data = await dashboardService.getSkillsTrends(
      (type as 'rising' | 'declining') || 'rising',
      parseInt(limit as string) || 20
    );
    res.json(data);
  } catch (err: any) {
    logger.error('Skills trends error:', err.message);
    res.status(500).json({ error: 'Failed to fetch skills trends' });
  }
});

dashboardRoutes.get('/vulnerability', async (req: Request, res: Response) => {
  try {
    const { city, role } = req.query;
    const data = await dashboardService.getVulnerabilityIndex(city as string, role as string);
    res.json(data);
  } catch (err: any) {
    logger.error('Vulnerability index error:', err.message);
    res.status(500).json({ error: 'Failed to fetch vulnerability index' });
  }
});

dashboardRoutes.get('/vulnerability/heatmap', async (_req: Request, res: Response) => {
  try {
    const data = await dashboardService.getVulnerabilityHeatmap();
    res.json(data);
  } catch (err: any) {
    logger.error('Heatmap error:', err.message);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

dashboardRoutes.get('/methodology', (_req: Request, res: Response) => {
  res.json({
    weights: {
      hiringDeclineRate: 0.30,
      aiToolMentionRate: 0.25,
      roleReplacementRatio: 0.20,
      automationFeasibility: 0.15,
      salaryCompression: 0.10,
    },
    description: 'AI Vulnerability Index computed from live scraped data. Each factor is derived from real job postings analysis.',
    factors: [
      { name: 'Hiring Decline Rate', weight: '30%', description: 'Percentage decline in job postings for this role/city over 30 days' },
      { name: 'AI Tool Mention Rate', weight: '25%', description: 'Percentage of JDs mentioning AI tools (ChatGPT, Copilot, etc.)' },
      { name: 'Role Replacement Ratio', weight: '20%', description: 'WEF-based automation feasibility score for the role' },
      { name: 'Automation Feasibility', weight: '15%', description: 'Experience-adjusted automation risk' },
      { name: 'Salary Compression', weight: '10%', description: 'Salary trend analysis as risk proxy' },
    ],
    lastUpdated: new Date(),
  });
});

dashboardRoutes.get('/stats', async (_req: Request, res: Response) => {
  try {
    const data = await dashboardService.getStats();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

dashboardRoutes.post('/refresh', async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard:refreshing', { timestamp: new Date() });
    }
    res.json({ message: 'Refresh triggered', timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to trigger refresh' });
  }
});
