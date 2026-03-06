import { GraphData, IGraphData } from '../models/GraphData';
import { geminiService } from './ai/gemini.service';
import { ragService, RAGChunk } from './rag.service';
import { logger } from '../utils/logger';

interface DeepRepoAnalysis {
  name: string;
  description: string;
  languages: Record<string, number>;
  topics: string[];
  stars: number;
  forks: number;
  url: string;
  readme?: string;
  dependencies?: string[];
  codeSnippets?: Array<{ filename: string; content: string }>;
}

class GraphService {
  async buildGraph(
    resumeText: string | null,
    githubUsername: string | null,
    userGithubToken?: string,
    selectedRepos?: string[],
    userId?: string
  ): Promise<IGraphData> {
    let resumeData = null;
    let githubData = null;
    const sources: string[] = [];

    // Parse resume if provided
    if (resumeText) {
      resumeData = await geminiService.parseResume(resumeText);
      sources.push('resume');
    }

    // Deep-scrape GitHub if provided
    if (githubUsername) {
      githubData = await this.fetchGitHubDataDeep(githubUsername, userGithubToken, selectedRepos);
      sources.push('github');
    }

    // Build graph using AI
    const graphResult = await geminiService.buildGraphFromData(resumeData, githubData);

    // Save to MongoDB
    const graph = new GraphData({
      nodes: graphResult.nodes || [],
      edges: graphResult.edges || [],
      metadata: {
        personName: resumeData?.name || githubUsername || 'Unknown',
        generatedAt: new Date(),
        sources,
      },
    });

    await graph.save();
    logger.info(`Knowledge graph built: ${graph._id} with ${graph.nodes.length} nodes`);

    // Index into RAG system if we have a userId
    if (userId) {
      this.indexToRAG(userId, resumeData, githubData, resumeText).catch(err =>
        logger.error(`[Graph] RAG indexing failed: ${err.message}`)
      );
    }

    return graph;
  }

  async fetchRepoList(username: string, userToken?: string) {
    try {
      const { Octokit } = await import('@octokit/rest');
      const fallbackToken = process.env.GITHUB_TOKEN;
      const token = userToken || (fallbackToken && !fallbackToken.startsWith('your_') ? fallbackToken : undefined);
      const octokit = new Octokit({ auth: token });

      const reposResp = await octokit.repos.listForUser({ username, sort: 'updated', per_page: 50 });

      return reposResp.data.map((repo) => ({
        name: repo.name,
        description: repo.description || '',
        language: repo.language || '',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
        isPrivate: repo.private,
        url: repo.html_url,
      }));
    } catch (err: any) {
      logger.error(`GitHub repos list failed for ${username}:`, err.message);
      throw new Error(`Could not fetch repos for "${username}". Check the username.`);
    }
  }

  async getGraph(id: string): Promise<IGraphData | null> {
    return GraphData.findById(id);
  }

  async getNodes(id: string) {
    const graph = await GraphData.findById(id);
    return graph?.nodes || [];
  }

  async getEdges(id: string) {
    const graph = await GraphData.findById(id);
    return graph?.edges || [];
  }

  /**
   * Deep GitHub fetch — gets README, package.json, key source files for each repo
   */
  private async fetchGitHubDataDeep(
    username: string,
    userToken?: string,
    selectedRepos?: string[]
  ) {
    try {
      const { Octokit } = await import('@octokit/rest');
      const fallbackToken = process.env.GITHUB_TOKEN;
      const token = userToken || (fallbackToken && !fallbackToken.startsWith('your_') ? fallbackToken : undefined);
      const octokit = new Octokit({ auth: token });

      const [userResp, reposResp] = await Promise.all([
        octokit.users.getByUsername({ username }),
        octokit.repos.listForUser({ username, sort: 'updated', per_page: 50 }),
      ]);

      // Filter to selected repos if provided, otherwise take top 10
      let repoList = reposResp.data;
      if (selectedRepos && selectedRepos.length > 0) {
        repoList = repoList.filter((r) => selectedRepos.includes(r.name));
      } else {
        repoList = repoList.slice(0, 10);
      }
      // Cap at 10 repos for speed
      repoList = repoList.slice(0, 10);

      // Process repos in batches of 4 to avoid rate limiting
      const repos: DeepRepoAnalysis[] = [];
      for (let i = 0; i < repoList.length; i += 4) {
        const batch = repoList.slice(i, i + 4);
        const batchResults = await Promise.all(batch.map(async (repo) => {
          const repoData: DeepRepoAnalysis = {
            name: repo.name,
            description: repo.description || '',
            languages: {},
            topics: repo.topics || [],
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            url: repo.html_url,
          };

          try {
            // Fetch languages
            const langResp = await octokit.repos.listLanguages({ owner: username, repo: repo.name });
            repoData.languages = langResp.data;
          } catch {}

          // Fetch README
          try {
            const readmeResp = await octokit.repos.getReadme({ owner: username, repo: repo.name });
            const readmeContent = Buffer.from((readmeResp.data as any).content, 'base64').toString('utf-8');
            repoData.readme = readmeContent.slice(0, 3000);
          } catch {}

          // Fetch package.json / requirements.txt / Cargo.toml etc. for dependencies
          const depFiles = ['package.json', 'requirements.txt', 'Pipfile', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle'];
          for (const depFile of depFiles) {
            try {
              const fileResp = await octokit.repos.getContent({ owner: username, repo: repo.name, path: depFile });
              if ('content' in fileResp.data) {
                const content = Buffer.from(fileResp.data.content, 'base64').toString('utf-8');
                repoData.dependencies = this.extractDependencies(depFile, content);
                break; // Found one, no need to check others
              }
            } catch {} // File doesn't exist, try next
          }

          // Fetch a few key source files for code-level analysis
          repoData.codeSnippets = await this.fetchKeySourceFiles(octokit, username, repo.name);

          return repoData;
        }));
        repos.push(...batchResults);
      }

      return {
        username,
        bio: userResp.data.bio || '',
        location: userResp.data.location || '',
        company: userResp.data.company || '',
        repos,
      };
    } catch (err: any) {
      logger.error(`GitHub deep scrape failed for ${username}:`, err.message);
      return { username, bio: '', location: '', company: '', repos: [] };
    }
  }

  /**
   * Fetch up to 3 key source files from a repo for code analysis
   */
  private async fetchKeySourceFiles(octokit: any, owner: string, repo: string) {
    const snippets: Array<{ filename: string; content: string }> = [];
    try {
      // Get repo tree (top level)
      const treeResp = await octokit.git.getTree({ owner, repo, tree_sha: 'HEAD' });
      const files = treeResp.data.tree || [];

      // Priority: main entry files, then src/ files
      const priorities = [
        'app.ts', 'app.js', 'main.ts', 'main.py', 'index.ts', 'index.js',
        'server.ts', 'server.js', 'main.go', 'main.rs', 'App.tsx', 'App.jsx',
      ];

      const targetFiles: string[] = [];
      for (const p of priorities) {
        const found = files.find((f: any) => f.path === p || f.path === `src/${p}`);
        if (found && found.type === 'blob') {
          targetFiles.push(found.path);
          if (targetFiles.length >= 3) break;
        }
      }

      // If we didn't find priority files, grab any source files
      if (targetFiles.length < 3) {
        const sourceExts = ['.ts', '.js', '.py', '.go', '.rs', '.java', '.tsx', '.jsx'];
        for (const f of files) {
          if (f.type === 'blob' && sourceExts.some(ext => f.path.endsWith(ext)) && !targetFiles.includes(f.path)) {
            targetFiles.push(f.path);
            if (targetFiles.length >= 3) break;
          }
        }
      }

      // Fetch content of each file
      for (const filepath of targetFiles) {
        try {
          const fileResp = await octokit.repos.getContent({ owner, repo, path: filepath });
          if ('content' in fileResp.data) {
            const content = Buffer.from(fileResp.data.content, 'base64').toString('utf-8');
            snippets.push({ filename: filepath, content: content.slice(0, 2000) });
          }
        } catch {}
      }
    } catch {}

    return snippets;
  }

  /**
   * Extract dependencies from various package manager files
   */
  private extractDependencies(filename: string, content: string): string[] {
    try {
      if (filename === 'package.json') {
        const pkg = JSON.parse(content);
        return [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ];
      }
      if (filename === 'requirements.txt' || filename === 'Pipfile') {
        return content.split('\n')
          .map(l => l.trim().split(/[=<>!~]/)[0].trim())
          .filter(l => l && !l.startsWith('#') && !l.startsWith('['));
      }
      if (filename === 'go.mod') {
        return content.split('\n')
          .filter(l => l.trim().startsWith('require') || l.includes('/'))
          .map(l => l.trim().split(/\s+/)[0])
          .filter(l => l.includes('/'));
      }
    } catch {}
    return [];
  }

  /**
   * Index resume + GitHub data into the RAG system using ChromaDB chunking pipeline
   */
  private async indexToRAG(
    userId: string,
    resumeData: any,
    githubData: any,
    rawResume: string | null
  ) {
    logger.info(`[Graph] Indexing RAG chunks for user ${userId} via ChromaDB`);

    // Clear old data first so we don't accumulate stale chunks
    await ragService.clearUser(userId);

    const allChunks: RAGChunk[] = [];

    // Chunk resume using the intelligent pipeline
    if (resumeData) {
      const resumeChunks = ragService.chunkResume(resumeData, rawResume || undefined);
      allChunks.push(...resumeChunks);
      logger.info(`[Graph] Resume produced ${resumeChunks.length} chunks`);
    }

    // Chunk each GitHub repo using the intelligent pipeline
    if (githubData?.repos) {
      for (const repo of githubData.repos) {
        const repoChunks = ragService.chunkRepo(repo);
        allChunks.push(...repoChunks);
        logger.info(`[Graph] Repo "${repo.name}" produced ${repoChunks.length} chunks`);
      }
    }

    if (allChunks.length > 0) {
      const stored = await ragService.storeChunks(userId, allChunks);
      logger.info(`[Graph] RAG indexed ${stored} total chunks for user ${userId}`);
    }
  }
}

export const graphService = new GraphService();
