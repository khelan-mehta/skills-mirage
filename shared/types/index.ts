// ==========================================
// LAYER 1 — Dashboard Types
// ==========================================

export interface JobListing {
  id: string;
  title: string;
  normalizedTitle: string;
  company: string;
  city: string;
  sector: string;
  skills: string[];
  salary: { min: number; max: number };
  aiToolMentions: string[];
  source: 'naukri' | 'linkedin';
  scrapedAt: Date;
  rawDescription: string;
  vulnerabilitySignals: {
    aiReplacementRisk: number;
    hiringTrend: 'up' | 'down' | 'stable';
    automationKeywords: string[];
  };
}

export interface HiringTrend {
  city: string;
  sector: string;
  period: '7d' | '30d' | '90d' | '1yr';
  count: number;
  previousCount: number;
  changePercent: number;
}

export interface SkillTrend {
  skill: string;
  direction: 'rising' | 'declining';
  weekOverWeekChange: number;
  mentionCount: number;
  topCities: string[];
}

export interface VulnerabilityScore {
  role: string;
  city: string;
  score: number;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  factors: Array<{ signal: string; weight: number }>;
  methodology: Record<string, number>;
  trend: 'rising' | 'falling' | 'stable';
  computedAt: Date;
}

// ==========================================
// LAYER 2 — Worker Types
// ==========================================

export interface WorkerProfile {
  id: string;
  jobTitle: string;
  normalizedTitle: string;
  city: string;
  yearsOfExperience: number;
  writeUp: string;
  extractedSkills: string[];
  extractedAspirations: string[];
  extractedTools: string[];
  riskScore: {
    current: number;
    previous: number;
    trend: 'rising' | 'falling' | 'stable';
    factors: Array<{ signal: string; weight: number }>;
  };
  reskillPath?: ReskillPath;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReskillPath {
  targetRole: string;
  targetCity: string;
  isHiringVerified: boolean;
  totalWeeks: number;
  hoursPerWeek: number;
  steps: Array<{
    weekRange: string;
    courseName: string;
    provider: 'NPTEL' | 'SWAYAM' | 'PMKVY' | 'Coursera' | 'Other';
    institution?: string;
    url: string;
    duration: string;
    isFree: boolean;
  }>;
}

// ==========================================
// CHATBOT Types
// ==========================================

export interface ChatMessage {
  id: string;
  workerId: string;
  role: 'user' | 'assistant';
  content: string;
  language: 'en' | 'hi';
  timestamp: Date;
}

export interface ChatContext {
  worker: WorkerProfile;
  marketData: {
    hiringTrend: string;
    aiMentionRate: number;
    risingSkills: string[];
    decliningRoles: string[];
    activeJobCount: number;
  };
  courses: Array<{
    name: string;
    provider: string;
    duration: string;
    url: string;
  }>;
  history: ChatMessage[];
}

// ==========================================
// KNOWLEDGE GRAPH Types
// ==========================================

export type NodeType = 'person' | 'skill' | 'project' | 'language' | 'certification'
  | 'company' | 'education' | 'repo' | 'domain' | 'tool';

export type EdgeType = 'uses' | 'built_with' | 'skilled_at' | 'works_at'
  | 'studied_at' | 'certified_in' | 'contributes_to' | 'related_to';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  category: string;
  weight: number;
  metadata: Record<string, any>;
  position?: { x: number; y: number; z: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    personName: string;
    generatedAt: Date;
    sources: ('resume' | 'github')[];
  };
}

export interface GitHubProfile {
  username: string;
  bio: string;
  location: string;
  company: string;
  repos: Array<{
    name: string;
    description: string;
    languages: Record<string, number>;
    topics: string[];
    stars: number;
    forks: number;
    commits: number;
    url: string;
  }>;
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  education: Array<{
    institution: string;
    degree: string;
    year: number;
    gpa?: number;
  }>;
  experience: Array<{
    company: string;
    title: string;
    duration: string;
    description: string;
    skills: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
    languages: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    year: number;
  }>;
  projects: Array<{
    name: string;
    description: string;
    techStack: string[];
    url?: string;
  }>;
  summary: string;
}

// ==========================================
// CITIES
// ==========================================

export const TIER_1_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
];

export const TIER_2_CITIES = [
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore', 'Nagpur', 'Kochi', 'Coimbatore',
];

export const TIER_3_CITIES = [
  'Bhopal', 'Patna', 'Thiruvananthapuram', 'Visakhapatnam', 'Vadodara', 'Surat', 'Ranchi',
];

export const ALL_CITIES = [...TIER_1_CITIES, ...TIER_2_CITIES, ...TIER_3_CITIES];
