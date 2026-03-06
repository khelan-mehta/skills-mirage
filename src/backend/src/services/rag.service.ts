import { ChromaClient, type Collection } from 'chromadb';
import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── Text Chunking Utilities ────────────────────────────────────────────────

interface ChunkOptions {
  maxChunkSize: number;
  overlap: number;
}

const DEFAULT_CHUNK_OPTS: ChunkOptions = { maxChunkSize: 800, overlap: 150 };

/**
 * Recursively split text using a hierarchy of separators.
 * Tries to preserve semantic boundaries (paragraphs > sentences > words).
 */
function recursiveChunk(text: string, opts = DEFAULT_CHUNK_OPTS): string[] {
  if (text.length <= opts.maxChunkSize) return [text.trim()].filter(Boolean);

  const separators = ['\n\n', '\n', '. ', ', ', ' '];
  for (const sep of separators) {
    const parts = text.split(sep);
    if (parts.length <= 1) continue;

    const chunks: string[] = [];
    let current = '';

    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (candidate.length > opts.maxChunkSize && current) {
        chunks.push(current.trim());
        // Overlap: keep tail of previous chunk
        const overlapText = current.slice(-opts.overlap);
        current = overlapText + sep + part;
      } else {
        current = candidate;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    if (chunks.length > 1) return chunks.filter(Boolean);
  }

  // Hard split as last resort
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += opts.maxChunkSize - opts.overlap) {
    chunks.push(text.slice(i, i + opts.maxChunkSize).trim());
  }
  return chunks.filter(Boolean);
}

/**
 * Chunk code files by function/class boundaries, falling back to line-based splitting
 */
function chunkCode(code: string, filename: string, opts = DEFAULT_CHUNK_OPTS): string[] {
  // Try splitting on function/class boundaries
  const boundaries = /^(?:(?:export\s+)?(?:async\s+)?(?:function|class|const\s+\w+\s*=\s*(?:async\s+)?\(|def |fn |func |public |private |protected ))/gm;
  const matches = [...code.matchAll(boundaries)];

  if (matches.length > 1) {
    const chunks: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i + 1 < matches.length ? matches[i + 1].index! : code.length;
      const block = code.slice(start, end).trim();
      if (block.length > opts.maxChunkSize) {
        chunks.push(...recursiveChunk(block, opts));
      } else if (block) {
        chunks.push(block);
      }
    }
    // Include any preamble (imports, etc.) before first function
    if (matches[0].index! > 0) {
      const preamble = code.slice(0, matches[0].index!).trim();
      if (preamble.length > 50) {
        chunks.unshift(`[${filename} imports/setup]\n${preamble}`);
      }
    }
    return chunks.filter(Boolean);
  }

  // Fallback: line-based chunking
  return recursiveChunk(code, opts);
}

/**
 * Chunk README/markdown by headers
 */
function chunkMarkdown(md: string, opts = DEFAULT_CHUNK_OPTS): string[] {
  const sections = md.split(/^(?=#{1,3}\s)/m);
  const chunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    if (trimmed.length > opts.maxChunkSize) {
      chunks.push(...recursiveChunk(trimmed, opts));
    } else {
      chunks.push(trimmed);
    }
  }

  return chunks.filter(Boolean);
}

// ─── RAG Chunk types ────────────────────────────────────────────────────────

export type ChunkSource = 'github' | 'resume' | 'graph';
export type ChunkType = 'repo_overview' | 'readme_section' | 'code_block' | 'dependency_analysis' |
  'resume_summary' | 'work_experience' | 'education' | 'project' | 'skill_evidence';

export interface RAGChunk {
  source: ChunkSource;
  chunkType: ChunkType;
  content: string;
  skills: string[];
  metadata: Record<string, string>;
}

// ─── ChromaDB RAG Service ───────────────────────────────────────────────────

class RAGService {
  private chroma: ChromaClient;
  private _openai: OpenAI | null = null;
  private _openaiInitialized = false;
  private embeddingModel = 'text-embedding-3-small';
  private ready = false;

  constructor() {
    this.chroma = new ChromaClient({
      host: process.env.CHROMA_HOST || 'localhost',
      port: parseInt(process.env.CHROMA_PORT || '8000', 10),
    });
  }

  /** Lazy-init OpenAI so dotenv has time to load before we read the key */
  private get openai(): OpenAI | null {
    if (!this._openaiInitialized) {
      const key = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
      this._openai = key ? new OpenAI({ apiKey: key }) : null;
      this._openaiInitialized = true;
      if (this._openai) logger.info('[RAG] OpenAI client initialized for embeddings');
      else logger.warn('[RAG] No OPENAI_API_KEY found — embedding-based queries will be unavailable');
    }
    return this._openai;
  }

  /**
   * Get or create a user-specific ChromaDB collection
   */
  private async getCollection(userId: string): Promise<Collection> {
    const name = `user_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 63);
    return this.chroma.getOrCreateCollection({
      name,
      metadata: { userId, createdAt: new Date().toISOString() },
    });
  }

  /**
   * Generate embeddings via OpenAI
   */
  private async embed(texts: string[]): Promise<number[][]> {
    if (!this.openai || texts.length === 0) return texts.map(() => []);

    try {
      // Batch in groups of 100 (OpenAI limit)
      const allEmbeddings: number[][] = [];
      for (let i = 0; i < texts.length; i += 100) {
        const batch = texts.slice(i, i + 100).map(t => t.slice(0, 8000));
        const resp = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: batch,
        });
        allEmbeddings.push(...resp.data.map(d => d.embedding));
      }
      return allEmbeddings;
    } catch (err: any) {
      logger.error('[RAG] Embedding generation failed:', err.message);
      return texts.map(() => []);
    }
  }

  // ─── Intelligent Chunking Pipeline ──────────────────────────────────────

  /**
   * Chunk a GitHub repo into semantically meaningful pieces
   */
  chunkRepo(repo: {
    name: string;
    description?: string;
    languages?: Record<string, number>;
    topics?: string[];
    stars?: number;
    forks?: number;
    url?: string;
    readme?: string;
    dependencies?: string[];
    codeSnippets?: Array<{ filename: string; content: string }>;
  }): RAGChunk[] {
    const chunks: RAGChunk[] = [];
    const langs = Object.keys(repo.languages || {});
    const deps = repo.dependencies || [];
    const repoSkills = [...langs, ...deps, ...(repo.topics || [])].map(s => s.toLowerCase());
    const baseMeta = { repoName: repo.name, repoUrl: repo.url || '' };

    // 1. Repo overview (always one chunk)
    const overviewParts = [
      `Repository: ${repo.name}`,
      repo.description ? `Description: ${repo.description}` : '',
      langs.length ? `Languages: ${langs.join(', ')}` : '',
      deps.length ? `Key dependencies: ${deps.slice(0, 25).join(', ')}` : '',
      repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : '',
      `Stars: ${repo.stars || 0}, Forks: ${repo.forks || 0}`,
    ].filter(Boolean);

    chunks.push({
      source: 'github',
      chunkType: 'repo_overview',
      content: overviewParts.join('\n'),
      skills: repoSkills,
      metadata: { ...baseMeta, type: 'overview' },
    });

    // 2. Dependency analysis — extract what the tech stack tells us
    if (deps.length > 0) {
      const depAnalysis = this.analyzeDependencies(deps, repo.name);
      if (depAnalysis) {
        chunks.push({
          source: 'github',
          chunkType: 'dependency_analysis',
          content: depAnalysis,
          skills: repoSkills,
          metadata: { ...baseMeta, type: 'dependencies' },
        });
      }
    }

    // 3. README — split by markdown headers for semantic coherence
    if (repo.readme && repo.readme.length > 50) {
      const readmeChunks = chunkMarkdown(repo.readme);
      for (let i = 0; i < readmeChunks.length; i++) {
        chunks.push({
          source: 'github',
          chunkType: 'readme_section',
          content: `[${repo.name} README, section ${i + 1}/${readmeChunks.length}]\n${readmeChunks[i]}`,
          skills: repoSkills,
          metadata: { ...baseMeta, type: 'readme', section: String(i + 1) },
        });
      }
    }

    // 4. Code files — split by function/class boundaries
    if (repo.codeSnippets?.length) {
      for (const snippet of repo.codeSnippets) {
        const codeChunks = chunkCode(snippet.content, snippet.filename);
        for (let i = 0; i < codeChunks.length; i++) {
          chunks.push({
            source: 'github',
            chunkType: 'code_block',
            content: `[${repo.name}/${snippet.filename}, block ${i + 1}/${codeChunks.length}]\n${codeChunks[i]}`,
            skills: [...repoSkills, this.inferLangFromFile(snippet.filename)].filter(Boolean),
            metadata: { ...baseMeta, filename: snippet.filename, type: 'code', block: String(i + 1) },
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Chunk resume data into meaningful pieces
   */
  chunkResume(resumeData: any, rawText?: string): RAGChunk[] {
    const chunks: RAGChunk[] = [];
    const allSkills = [
      ...(resumeData.skills?.technical || []),
      ...(resumeData.skills?.soft || []),
      ...(resumeData.skills?.tools || []),
      ...(resumeData.skills?.languages || []),
    ].map((s: string) => s.toLowerCase());

    // 1. Professional summary
    const summaryContent = [
      resumeData.name ? `Name: ${resumeData.name}` : '',
      resumeData.summary ? `Summary: ${resumeData.summary}` : '',
      allSkills.length ? `Technical skills: ${allSkills.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    if (summaryContent) {
      chunks.push({
        source: 'resume',
        chunkType: 'resume_summary',
        content: summaryContent,
        skills: allSkills,
        metadata: { section: 'summary' },
      });
    }

    // 2. Work experience — one chunk per role
    for (const exp of (resumeData.experience || [])) {
      const expContent = [
        `Role: ${exp.title} at ${exp.company}`,
        exp.duration ? `Duration: ${exp.duration}` : '',
        exp.description ? `Responsibilities: ${exp.description}` : '',
        exp.skills?.length ? `Skills used: ${exp.skills.join(', ')}` : '',
      ].filter(Boolean).join('\n');

      chunks.push({
        source: 'resume',
        chunkType: 'work_experience',
        content: expContent,
        skills: (exp.skills || []).map((s: string) => s.toLowerCase()),
        metadata: { section: 'experience', company: exp.company || '' },
      });
    }

    // 3. Education
    for (const edu of (resumeData.education || [])) {
      chunks.push({
        source: 'resume',
        chunkType: 'education',
        content: `Education: ${edu.degree} from ${edu.institution} (${edu.year})`,
        skills: [],
        metadata: { section: 'education', institution: edu.institution || '' },
      });
    }

    // 4. Projects
    for (const proj of (resumeData.projects || [])) {
      const projContent = [
        `Project: ${proj.name}`,
        proj.description ? `Description: ${proj.description}` : '',
        proj.techStack?.length ? `Tech stack: ${proj.techStack.join(', ')}` : '',
      ].filter(Boolean).join('\n');

      chunks.push({
        source: 'resume',
        chunkType: 'project',
        content: projContent,
        skills: (proj.techStack || []).map((s: string) => s.toLowerCase()),
        metadata: { section: 'projects', projectName: proj.name || '' },
      });
    }

    // 5. Certifications as skill evidence
    for (const cert of (resumeData.certifications || [])) {
      chunks.push({
        source: 'resume',
        chunkType: 'skill_evidence',
        content: `Certification: ${cert.name} by ${cert.issuer} (${cert.year || 'N/A'})`,
        skills: [cert.name?.toLowerCase()].filter(Boolean),
        metadata: { section: 'certifications' },
      });
    }

    // 6. Raw resume text as fallback chunks (if structured extraction missed things)
    if (rawText && rawText.length > 200) {
      const rawChunks = recursiveChunk(rawText, { maxChunkSize: 600, overlap: 100 });
      // Only add first few raw chunks as supplementary context
      for (let i = 0; i < Math.min(rawChunks.length, 5); i++) {
        chunks.push({
          source: 'resume',
          chunkType: 'resume_summary',
          content: `[Resume raw text, section ${i + 1}]\n${rawChunks[i]}`,
          skills: allSkills,
          metadata: { section: 'raw', block: String(i + 1) },
        });
      }
    }

    return chunks;
  }

  // ─── Storage ──────────────────────────────────────────────────────────────

  /**
   * Store chunks for a user in ChromaDB with embeddings
   */
  async storeChunks(userId: string, chunks: RAGChunk[]): Promise<number> {
    if (chunks.length === 0) return 0;

    try {
      const collection = await this.getCollection(userId);

      // Process in batches of 50
      let stored = 0;
      for (let i = 0; i < chunks.length; i += 50) {
        const batch = chunks.slice(i, i + 50);
        const ids = batch.map((_, idx) => `${userId}_${i + idx}_${Date.now()}`);
        const documents = batch.map(c => c.content);
        const metadatas = batch.map(c => ({
          source: c.source,
          chunkType: c.chunkType,
          skills: c.skills.join(','),
          ...c.metadata,
        }));

        // Generate embeddings
        const embeddings = await this.embed(documents);
        const hasEmbeddings = embeddings.some(e => e.length > 0);

        if (hasEmbeddings) {
          await collection.add({
            ids,
            documents,
            embeddings,
            metadatas,
          });
        } else {
          // Store without embeddings — ChromaDB will use default embedding
          await collection.add({
            ids,
            documents,
            metadatas,
          });
        }

        stored += batch.length;
      }

      logger.info(`[RAG] Stored ${stored} chunks for user ${userId} in ChromaDB`);
      return stored;
    } catch (err: any) {
      logger.error(`[RAG] ChromaDB store failed: ${err.message}`);
      // Fallback: try without embeddings
      return this.storeChunksFallback(userId, chunks);
    }
  }

  /**
   * Fallback storage without embeddings (uses ChromaDB default embedding)
   */
  private async storeChunksFallback(userId: string, chunks: RAGChunk[]): Promise<number> {
    try {
      const collection = await this.getCollection(userId);
      const ids = chunks.map((_, idx) => `${userId}_fb_${idx}_${Date.now()}`);
      const documents = chunks.map(c => c.content);
      const metadatas = chunks.map(c => ({
        source: c.source,
        chunkType: c.chunkType,
        skills: c.skills.join(','),
        ...c.metadata,
      }));

      await collection.add({ ids, documents, metadatas });
      logger.info(`[RAG] Fallback stored ${chunks.length} chunks for user ${userId}`);
      return chunks.length;
    } catch (err: any) {
      logger.error(`[RAG] Fallback store also failed: ${err.message}`);
      return 0;
    }
  }

  // ─── Retrieval ────────────────────────────────────────────────────────────

  /**
   * Semantic search: retrieve the most relevant chunks for a query
   */
  async retrieve(userId: string, query: string, topK = 10): Promise<Array<{
    content: string;
    source: string;
    chunkType: string;
    skills: string[];
    metadata: Record<string, any>;
    score: number;
  }>> {
    try {
      const collection = await this.getCollection(userId);
      const count = await collection.count();
      if (count === 0) return [];

      const k = Math.min(topK, count);

      // Try semantic search with embedding
      const queryEmbedding = await this.embed([query]);
      let results;

      if (queryEmbedding[0]?.length > 0) {
        results = await collection.query({
          queryEmbeddings: queryEmbedding,
          nResults: k,
          include: ['documents', 'metadatas', 'distances'],
        });
      } else {
        // No OpenAI embeddings available — fall back to fetching all chunks
        // (queryTexts would fail if default embedder dimension != stored dimension)
        logger.warn('[RAG] No OpenAI embeddings, falling back to get() for retrieval');
        const allDocs = await collection.get({
          limit: k,
          include: ['documents', 'metadatas'],
        });

        return (allDocs.documents || []).map((doc, idx) => {
          const meta = allDocs.metadatas?.[idx] || {};
          return {
            content: doc || '',
            source: String(meta.source || ''),
            chunkType: String(meta.chunkType || ''),
            skills: String(meta.skills || '').split(',').filter(Boolean),
            metadata: meta as Record<string, any>,
            score: 0.5, // uniform score since we can't rank without embeddings
          };
        });
      }

      if (!results.documents?.[0]) return [];

      return results.documents[0].map((doc, idx) => {
        const meta = results.metadatas?.[0]?.[idx] || {};
        const distance = results.distances?.[0]?.[idx] || 1;
        // ChromaDB returns L2 distance; convert to similarity score (0-1)
        const score = 1 / (1 + distance);

        return {
          content: doc || '',
          source: String(meta.source || ''),
          chunkType: String(meta.chunkType || ''),
          skills: String(meta.skills || '').split(',').filter(Boolean),
          metadata: meta as Record<string, any>,
          score,
        };
      });
    } catch (err: any) {
      logger.error(`[RAG] ChromaDB retrieve failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Retrieve chunks filtered by source type (github, resume)
   */
  async retrieveBySource(
    userId: string,
    query: string,
    source: ChunkSource,
    topK = 10
  ): Promise<Array<{ content: string; score: number; metadata: Record<string, any> }>> {
    try {
      const collection = await this.getCollection(userId);
      const count = await collection.count();
      if (count === 0) return [];

      const k = Math.min(topK, count);
      const queryEmbedding = await this.embed([query]);

      let results;
      const where = { source };

      if (queryEmbedding[0]?.length > 0) {
        results = await collection.query({
          queryEmbeddings: queryEmbedding,
          nResults: k,
          where,
          include: ['documents', 'metadatas', 'distances'],
        });
      } else {
        // Fallback: get all chunks filtered by source (no embedding needed)
        logger.warn('[RAG] No OpenAI embeddings, falling back to get() for source-filtered retrieval');
        const allDocs = await collection.get({
          limit: k,
          where,
          include: ['documents', 'metadatas'],
        });

        return (allDocs.documents || []).map((doc, idx) => ({
          content: doc || '',
          score: 0.5,
          metadata: (allDocs.metadatas?.[idx] || {}) as Record<string, any>,
        }));
      }

      if (!results.documents?.[0]) return [];

      return results.documents[0].map((doc, idx) => ({
        content: doc || '',
        score: 1 / (1 + (results.distances?.[0]?.[idx] || 1)),
        metadata: (results.metadatas?.[0]?.[idx] || {}) as Record<string, any>,
      }));
    } catch (err: any) {
      logger.error(`[RAG] Source-filtered retrieve failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Retrieve chunks relevant to a set of skills
   */
  async retrieveBySkills(userId: string, skills: string[], topK = 15): Promise<Array<{
    content: string;
    source: string;
    chunkType: string;
    skills: string[];
    metadata: Record<string, any>;
    score: number;
  }>> {
    const query = `Skills and technologies: ${skills.join(', ')}. Projects and experience using these skills.`;
    return this.retrieve(userId, query, topK);
  }

  // ─── Context Building ────────────────────────────────────────────────────

  /**
   * Build a formatted context string from retrieved chunks for LLM injection
   */
  buildContextString(chunks: Array<{ content: string; source: string; chunkType: string; score: number }>): string {
    if (chunks.length === 0) return '';

    const sections: string[] = [];
    const githubChunks = chunks.filter(c => c.source === 'github');
    const resumeChunks = chunks.filter(c => c.source === 'resume');

    if (githubChunks.length > 0) {
      sections.push('=== GITHUB PROJECT EXPERIENCE (from actual repos) ===');
      for (const chunk of githubChunks) {
        sections.push(chunk.content);
      }
    }

    if (resumeChunks.length > 0) {
      sections.push('\n=== RESUME & PROFESSIONAL BACKGROUND ===');
      for (const chunk of resumeChunks) {
        sections.push(chunk.content);
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Build RAG context specifically for chatbot use — includes relevance hints
   */
  buildChatContext(
    chunks: Array<{ content: string; source: string; chunkType: string; score: number; metadata: Record<string, any> }>
  ): string {
    if (chunks.length === 0) return '';

    const sections: string[] = [
      '=== USER\'S PERSONAL KNOWLEDGE BASE (Retrieved from their GitHub repos, resume, and projects) ==='
    ];

    // Group by source for cleaner presentation
    const bySource: Record<string, typeof chunks> = {};
    for (const chunk of chunks) {
      const key = chunk.source;
      if (!bySource[key]) bySource[key] = [];
      bySource[key].push(chunk);
    }

    if (bySource.github?.length) {
      sections.push('\n--- GitHub Projects & Code ---');
      for (const chunk of bySource.github) {
        const repoName = chunk.metadata.repoName || 'unknown';
        sections.push(`[Repo: ${repoName}] ${chunk.content}`);
      }
    }

    if (bySource.resume?.length) {
      sections.push('\n--- Resume & Professional Experience ---');
      for (const chunk of bySource.resume) {
        sections.push(chunk.content);
      }
    }

    sections.push('\n=== END KNOWLEDGE BASE ===');
    return sections.join('\n');
  }

  // ─── Management ───────────────────────────────────────────────────────────

  /**
   * Clear all RAG data for a user
   */
  async clearUser(userId: string): Promise<void> {
    try {
      const name = `user_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 63);
      await this.chroma.deleteCollection({ name });
      logger.info(`[RAG] Cleared ChromaDB collection for user ${userId}`);
    } catch (err: any) {
      // Collection might not exist
      logger.warn(`[RAG] Clear user failed (may not exist): ${err.message}`);
    }
  }

  /**
   * Get stats about a user's RAG knowledge base
   */
  async getUserStats(userId: string): Promise<{
    totalChunks: number;
    sources: Record<string, number>;
    hasData: boolean;
  }> {
    try {
      const collection = await this.getCollection(userId);
      const count = await collection.count();

      if (count === 0) return { totalChunks: 0, sources: {}, hasData: false };

      // Sample to get source distribution
      const sample = await collection.get({
        limit: Math.min(count, 500),
        include: ['metadatas'],
      });

      const sources: Record<string, number> = {};
      for (const meta of (sample.metadatas || [])) {
        const src = String(meta?.source || 'unknown');
        sources[src] = (sources[src] || 0) + 1;
      }

      return { totalChunks: count, sources, hasData: count > 0 };
    } catch (err: any) {
      logger.error(`[RAG] Stats failed: ${err.message}`);
      return { totalChunks: 0, sources: {}, hasData: false };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Analyze dependencies to infer what kind of project this is
   */
  private analyzeDependencies(deps: string[], repoName: string): string | null {
    const categories: Record<string, string[]> = {
      'Web Frontend': ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby', 'tailwindcss', 'styled-components'],
      'Web Backend': ['express', 'fastify', 'koa', 'nestjs', 'django', 'flask', 'fastapi', 'spring', 'gin'],
      'Database': ['mongoose', 'sequelize', 'prisma', 'typeorm', 'knex', 'pg', 'mysql2', 'redis', 'ioredis'],
      'Machine Learning': ['tensorflow', 'torch', 'scikit-learn', 'pandas', 'numpy', 'keras', 'transformers', 'openai'],
      'Mobile': ['react-native', 'expo', 'flutter', 'ionic'],
      'DevOps/Infra': ['docker', 'kubernetes', 'terraform', 'ansible', 'aws-sdk'],
      'Testing': ['jest', 'mocha', 'pytest', 'vitest', 'cypress', 'playwright'],
      'Real-time': ['socket.io', 'ws', 'graphql-ws', 'pusher'],
    };

    const found: string[] = [];
    const depsLower = deps.map(d => d.toLowerCase());

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(k => depsLower.some(d => d.includes(k)));
      if (matches.length > 0) {
        found.push(`${category}: ${matches.join(', ')}`);
      }
    }

    if (found.length === 0) return null;

    return `[${repoName}] Technology stack analysis from dependencies:\n${found.join('\n')}\nAll dependencies: ${deps.slice(0, 30).join(', ')}`;
  }

  private inferLangFromFile(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', go: 'golang', rs: 'rust', java: 'java', kt: 'kotlin',
      rb: 'ruby', php: 'php', cs: 'csharp', cpp: 'cpp', c: 'c',
    };
    return map[ext || ''] || '';
  }
}

export const ragService = new RAGService();
