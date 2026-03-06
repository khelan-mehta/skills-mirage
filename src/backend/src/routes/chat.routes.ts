import { Router, Request, Response } from 'express';
import { claudeService } from '../services/ai/claude.service';
import { geminiService } from '../services/ai/gemini.service';
import { ragService } from '../services/rag.service';
import { workerService } from '../services/worker.service';
import { User } from '../models/User';
import { ChatMessage } from '../models/ChatMessage';
import { logger } from '../utils/logger';

export const chatRoutes = Router();

chatRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { message, language } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // Resolve workerId from authenticated user's profile
    const user = await User.findById(req.user!.userId);
    if (!user?.profileId) {
      return res.status(400).json({ error: 'Complete onboarding first' });
    }
    const userId = String(req.user!.userId);
    const workerId = String(user.profileId);

    // Get worker profile
    const profile = await workerService.getProfile(workerId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Detect language
    const detectedLang = language || await geminiService.detectLanguage(message);

    // Translate Hindi to English if needed
    let processedMessage = message;
    if (detectedLang === 'hi') {
      processedMessage = await geminiService.translateToEnglish(message);
    }

    // Retrieve RAG context from user's ChromaDB knowledge base (parallel with market data)
    const [marketData, ragChunks, chatHistory] = await Promise.all([
      workerService.getMarketContext(profile),
      ragService.retrieve(userId, processedMessage, 8).catch((err) => {
        logger.warn(`[Chat] RAG retrieval failed: ${err.message}`);
        return [];
      }),
      ChatMessage.find({ workerId }).sort({ timestamp: -1 }).limit(10).lean(),
    ]);

    // Build RAG context string for the LLM
    const ragContext = ragChunks.length > 0
      ? ragService.buildChatContext(ragChunks)
      : undefined;

    if (ragChunks.length > 0) {
      logger.info(`[Chat] Injecting ${ragChunks.length} RAG chunks into chatbot context for user ${userId}`);
    }

    // Build context for Claude
    const chatContext = {
      worker: {
        jobTitle: profile.jobTitle,
        city: profile.city,
        yearsOfExperience: profile.yearsOfExperience,
        extractedSkills: profile.extractedSkills,
        extractedAspirations: profile.extractedAspirations,
        riskScore: { current: profile.riskScore.current, trend: profile.riskScore.trend },
      },
      marketData,
      courses: profile.reskillPath?.steps?.map((s) => ({
        name: s.courseName,
        provider: s.provider,
        duration: s.duration,
        url: s.url,
      })) || [],
      history: chatHistory.reverse().map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      ragContext,
    };

    // Call Claude
    let response = await claudeService.chat(processedMessage, chatContext);

    // Translate response to Hindi if input was Hindi
    if (detectedLang === 'hi') {
      response = await geminiService.translateToHindi(response);
    }

    // Save messages
    await ChatMessage.insertMany([
      { workerId, role: 'user', content: message, language: detectedLang, timestamp: new Date() },
      { workerId, role: 'assistant', content: response, language: detectedLang, timestamp: new Date() },
    ]);

    res.json({
      response,
      language: detectedLang,
      ragChunksUsed: ragChunks.length,
      timestamp: new Date(),
    });
  } catch (err: any) {
    logger.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

chatRoutes.get('/history', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user?.profileId) return res.json({ messages: [] });
    const workerId = String(user.profileId);

    const messages = await ChatMessage.find({ workerId })
      .sort({ timestamp: 1 })
      .limit(50)
      .lean();
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});
