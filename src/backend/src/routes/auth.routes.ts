import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const authRoutes = Router();

authRoutes.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const result = await authService.register(email, password, name);
    res.status(201).json(result);
  } catch (err: any) {
    logger.error('Register error:', err.message);
    const status = err.message === 'Email already registered' ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

authRoutes.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    logger.error('Login error:', err.message);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

authRoutes.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await authService.getUser(req.user!.userId);
    res.json({ user });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

authRoutes.get('/github', (_req: Request, res: Response) => {
  if (!env.GITHUB_CLIENT_ID) {
    return res.status(503).json({ error: 'GitHub OAuth not configured' });
  }
  const url = authService.getGitHubAuthUrl();
  res.redirect(url);
});

authRoutes.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code parameter' });

    const result = await authService.handleGitHubCallback(code as string);
    // Redirect to frontend with token
    res.redirect(`${env.FRONTEND_URL}/login?token=${result.token}`);
  } catch (err: any) {
    logger.error('GitHub callback error:', err.message);
    res.redirect(`${env.FRONTEND_URL}/login?error=github_failed`);
  }
});
