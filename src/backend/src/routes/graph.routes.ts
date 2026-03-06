import { Router, Request, Response } from 'express';
import { graphService } from '../services/graph.service';
import { ragService } from '../services/rag.service';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export const graphRoutes = Router();

// ─── RAG Knowledge Base endpoints (must be before /:id catch-all) ───────────

graphRoutes.get('/rag/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const stats = await ragService.getUserStats(userId);
    res.json(stats);
  } catch (err: any) {
    logger.error('RAG stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch RAG stats' });
  }
});

graphRoutes.delete('/rag/clear', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await ragService.clearUser(userId);
    res.json({ message: 'Knowledge base cleared' });
  } catch (err: any) {
    logger.error('RAG clear error:', err.message);
    res.status(500).json({ error: 'Failed to clear knowledge base' });
  }
});

graphRoutes.post('/rag/query', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { query, topK } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });

    const results = await ragService.retrieve(userId, query, topK || 10);
    res.json({ results, count: results.length });
  } catch (err: any) {
    logger.error('RAG query error:', err.message);
    res.status(500).json({ error: 'Failed to query knowledge base' });
  }
});

// ─── GitHub & Graph endpoints ───────────────────────────────────────────────

graphRoutes.get('/github-repos/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    let userGithubToken: string | undefined;
    if (req.user?.userId) {
      const user = await User.findById(req.user.userId);
      if (user?.githubAccessToken) userGithubToken = user.githubAccessToken;
    }

    const repos = await graphService.fetchRepoList(username, userGithubToken);
    res.json({ repos });
  } catch (err: any) {
    logger.error('GitHub repos fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch GitHub repos' });
  }
});

graphRoutes.post('/build', async (req: Request, res: Response) => {
  try {
    const { resumeText, githubUsername, selectedRepos } = req.body;

    if (!resumeText && !githubUsername) {
      return res.status(400).json({ error: 'Provide at least a resume or GitHub username' });
    }

    // Pass user's GitHub access token for private repo access
    let userGithubToken: string | undefined;
    if (req.user?.userId) {
      const user = await User.findById(req.user.userId);
      if (user?.githubAccessToken) userGithubToken = user.githubAccessToken;
    }

    const graph = await graphService.buildGraph(
      resumeText || null,
      githubUsername || null,
      userGithubToken,
      selectedRepos,
      req.user?.userId
    );

    res.status(201).json({
      id: graph._id,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      metadata: graph.metadata,
    });
  } catch (err: any) {
    logger.error('Graph build error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to build knowledge graph', detail: err.message });
  }
});

graphRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const graph = await graphService.getGraph(req.params.id);
    if (!graph) return res.status(404).json({ error: 'Graph not found' });
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

graphRoutes.get('/:id/nodes', async (req: Request, res: Response) => {
  try {
    const nodes = await graphService.getNodes(req.params.id);
    res.json({ nodes });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

graphRoutes.get('/:id/edges', async (req: Request, res: Response) => {
  try {
    const edges = await graphService.getEdges(req.params.id);
    res.json({ edges });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});
