import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import api from '../../utils/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: 'en' | 'hi';
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: 'Why is my risk score high?', emoji: '' },
  { label: 'What jobs are safer for me?', emoji: '' },
  { label: 'Paths under 3 months', emoji: '' },
  { label: 'How many jobs in my city?', emoji: '' },
  { label: '\u092E\u0941\u091D\u0947 \u0915\u094D\u092F\u093E \u0915\u0930\u0928\u093E \u091A\u093E\u0939\u093F\u090F?', emoji: '' },
];

interface ChatInterfaceProps {
  workerId: string;
  compact?: boolean;
}

export default function ChatInterface({ workerId, compact }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workerId) loadHistory();
  }, [workerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadHistory() {
    try {
      const { data } = await api.get('/chat/history');
      setMessages(data.messages || []);
    } catch {}
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      language,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', {
        workerId,
        message: text,
        language,
      });

      const botMsg: Message = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        language: data.language || language,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        language: 'en',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-[400px]' : 'h-[60vh]'} border border-mirage-border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mirage-border bg-mirage-bg-secondary">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-mirage-teal animate-pulse" />
          <span className="text-xs font-mono text-white/60">AI CAREER ADVISOR</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setLanguage('en')}
            className={`text-xs px-2 py-1 rounded ${language === 'en' ? 'bg-mirage-teal text-black' : 'text-white/40'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`text-xs px-2 py-1 rounded ${language === 'hi' ? 'bg-mirage-teal text-black' : 'text-white/40'}`}
          >
            HI
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/30 text-sm mb-6">Ask me about your risk score, job market, or reskilling paths</p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.label)}
                  className="text-xs px-3 py-2 border border-mirage-border rounded-lg text-white/50 hover:border-mirage-teal/30 hover:text-mirage-teal transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-mirage-teal/10 border border-mirage-teal/30 text-white'
                    : 'bg-mirage-bg-secondary border border-mirage-border text-white/80'
                }`}
              >
                <ReactMarkdown
                  className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:text-white/70 [&_strong]:text-white [&_a]:text-mirage-teal"
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-mirage-bg-secondary border border-mirage-border rounded-lg px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-mirage-teal animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-mirage-border p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder={language === 'hi' ? '\u0905\u092A\u0928\u093E \u0938\u0935\u093E\u0932 \u092A\u0942\u091B\u0947\u0902...' : 'Ask about your risk, reskilling paths, or job market...'}
          className="flex-1 bg-transparent border border-mirage-border rounded px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-mirage-teal text-black px-4 py-2 text-xs font-mono font-medium hover:bg-mirage-cyan transition-colors disabled:opacity-40 rounded"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
