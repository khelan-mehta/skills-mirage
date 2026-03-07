import { create } from 'zustand';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export interface ExtractedParams {
  requiredSkills: string[];
  domain: string;
  skillLevel: 'junior' | 'mid' | 'senior' | 'lead';
  preferredCity: string | null;
  minExperience: number;
  maxExperience: number;
}

export interface MatchedCandidate {
  profileId: string;
  userId: string;
  name: string;
  email: string;
  matchScore: number;
  matchedSkills: string[];
  city: string;
  yearsOfExperience: number;
  jobTitle: string;
  writeUpSnippet: string;
}

export interface CompanyJobResult {
  jobId: string;
  title: string;
  company: string;
  extractedParams: ExtractedParams;
  matchedCandidates: MatchedCandidate[];
  totalMatches: number;
}

export interface PastJob {
  _id: string;
  title: string;
  company: string;
  extractedParams: ExtractedParams;
  matchedCandidates: { matchScore: number }[];
  createdAt: string;
}

interface HiringState {
  currentJob: CompanyJobResult | null;
  pastJobs: PastJob[];
  loading: boolean;
  pastJobsLoading: boolean;
  error: string | null;

  analyzeJD: (data: { rawDescription: string; title: string; company: string }) => Promise<void>;
  fetchPastJobs: () => Promise<void>;
  loadJob: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

export const useHiringStore = create<HiringState>((set) => ({
  currentJob: null,
  pastJobs: [],
  loading: false,
  pastJobsLoading: false,
  error: null,

  analyzeJD: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/hiring/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Analysis failed');
      }
      const result: CompanyJobResult = await res.json();
      set({ currentJob: result, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Analysis failed', loading: false });
    }
  },

  fetchPastJobs: async () => {
    set({ pastJobsLoading: true });
    try {
      const res = await fetch(`${API_BASE}/hiring/jobs`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      set({ pastJobs: data.jobs || [], pastJobsLoading: false });
    } catch {
      set({ pastJobsLoading: false });
    }
  },

  loadJob: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/hiring/jobs/${id}`);
      if (!res.ok) throw new Error('Job not found');
      const job = await res.json();
      set({
        currentJob: {
          jobId: job._id,
          title: job.title,
          company: job.company,
          extractedParams: job.extractedParams,
          matchedCandidates: job.matchedCandidates,
          totalMatches: job.matchedCandidates?.length || 0,
        },
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  clearCurrent: () => set({ currentJob: null, error: null }),
}));
