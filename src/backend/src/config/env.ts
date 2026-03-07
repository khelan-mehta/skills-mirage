export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/skills-mirage',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  APIFY_TOKEN: process.env.APIFY_TOKEN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'skills-mirage-dev-secret-change-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // GitHub OAuth (env vars use GH_ prefix)
  GITHUB_CLIENT_ID: process.env.GH_CLIENT_ID || process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GH_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '',
  GITHUB_CALLBACK_URL: process.env.GH_CALLBACK_URL || process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/github/callback',
  // ChromaDB
  CHROMA_HOST: process.env.CHROMA_HOST || 'localhost',
  CHROMA_PORT: parseInt(process.env.CHROMA_PORT || '8000', 10),
} as const;
