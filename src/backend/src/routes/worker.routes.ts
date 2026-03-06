import { Router, Request, Response } from 'express';
import { workerService } from '../services/worker.service';
import { logger } from '../utils/logger';

export const workerRoutes = Router();

workerRoutes.post('/profile', async (req: Request, res: Response) => {
  try {
    const { jobTitle, city, yearsOfExperience, writeUp } = req.body;

    if (!jobTitle || !city || yearsOfExperience === undefined || !writeUp) {
      return res.status(400).json({
        error: 'Missing required fields: jobTitle, city, yearsOfExperience, writeUp',
      });
    }

    const profile = await workerService.createProfile({
      jobTitle,
      city,
      yearsOfExperience: parseInt(yearsOfExperience),
      writeUp,
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('worker:created', { id: profile._id, city: profile.city });
    }

    res.status(201).json(profile);
  } catch (err: any) {
    logger.error('Create profile error:', err.message);
    res.status(500).json({ error: 'Failed to create worker profile' });
  }
});

workerRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const profile = await workerService.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

workerRoutes.get('/:id/risk-score', async (req: Request, res: Response) => {
  try {
    const riskScore = await workerService.getRiskScore(req.params.id);
    if (!riskScore) return res.status(404).json({ error: 'Profile not found' });
    res.json(riskScore);
  } catch (err: any) {
    logger.error('Risk score error:', err.message);
    res.status(500).json({ error: 'Failed to fetch risk score' });
  }
});

workerRoutes.get('/:id/reskill-path', async (req: Request, res: Response) => {
  try {
    const path = await workerService.getReskillPath(req.params.id);
    if (!path) return res.status(404).json({ error: 'Profile not found or no path generated' });
    res.json(path);
  } catch (err: any) {
    logger.error('Reskill path error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reskilling path' });
  }
});

workerRoutes.put('/:id/profile', async (req: Request, res: Response) => {
  try {
    const profile = await workerService.updateProfile(req.params.id, req.body);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.id).emit('worker:risk-updated', profile.riskScore);
    }

    res.json(profile);
  } catch (err: any) {
    logger.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

workerRoutes.get('/:id/market-context', async (req: Request, res: Response) => {
  try {
    const profile = await workerService.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const context = await workerService.getMarketContext(profile);
    res.json(context);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch market context' });
  }
});
