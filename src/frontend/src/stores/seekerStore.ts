import { create } from 'zustand';
import api from '../utils/api';

interface MatchedJob {
  _id: string;
  title: string;
  normalizedTitle?: string;
  company: string;
  city: string;
  skills: string[];
  salary?: { min: number; max: number };
  sourceUrl?: string;
  source?: string;
  matchScore: number;
  totalSkills: number;
  matchPercent: number;
  riskScore: { score: number; level: string };
  isStarred: boolean;
  scrapedAt: string;
}

interface StarredJob {
  job: any;
  starredAt: string;
  reskillPlan: any;
}

interface FilterOptions {
  cities: string[];
  sources: string[];
  skills: { name: string; count: number }[];
}

interface AllJobsFilters {
  page: number;
  city: string;
  search: string;
  skills: string[];
  source: string;
  sort: string;
}

interface SeekerState {
  matchedJobs: MatchedJob[];
  starredJobs: StarredJob[];
  allJobs: any[];
  allJobsTotal: number;
  allJobsTotalPages: number;
  filterOptions: FilterOptions | null;
  filters: AllJobsFilters;
  loading: boolean;
  allJobsLoading: boolean;
  starring: string | null;
  error: string | null;
  scraping: boolean;
  scrapeResult: { count: number; city: string } | null;

  fetchMatchedJobs: () => Promise<void>;
  fetchStarredJobs: () => Promise<void>;
  fetchAllJobs: () => Promise<void>;
  fetchFilterOptions: () => Promise<void>;
  setFilter: (key: keyof AllJobsFilters, value: any) => void;
  starJob: (jobId: string) => Promise<void>;
  unstarJob: (jobId: string) => Promise<void>;
  fetchReskillPlan: (jobId: string) => Promise<any>;
  triggerScrape: (city: string, source?: string) => Promise<void>;
}

export const useSeekerStore = create<SeekerState>((set, get) => ({
  matchedJobs: [],
  starredJobs: [],
  allJobs: [],
  allJobsTotal: 0,
  allJobsTotalPages: 0,
  filterOptions: null,
  filters: {
    page: 1,
    city: '',
    search: '',
    skills: [],
    source: '',
    sort: 'newest',
  },
  loading: false,
  allJobsLoading: false,
  starring: null,
  error: null,
  scraping: false,
  scrapeResult: null,

  fetchMatchedJobs: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/seeker/matched-jobs');
      set({ matchedJobs: data.jobs, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch jobs', loading: false });
    }
  },

  fetchStarredJobs: async () => {
    try {
      const { data } = await api.get('/seeker/starred');
      set({ starredJobs: data.starred });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch starred jobs' });
    }
  },

  fetchAllJobs: async () => {
    set({ allJobsLoading: true, error: null });
    try {
      const { filters } = get();
      const params: any = { page: filters.page, limit: 30 };
      if (filters.city) params.city = filters.city;
      if (filters.search) params.search = filters.search;
      if (filters.skills.length) params.skills = filters.skills.join(',');
      if (filters.source) params.source = filters.source;
      if (filters.sort) params.sort = filters.sort;

      const { data } = await api.get('/seeker/all-jobs', { params });
      set({
        allJobs: data.jobs,
        allJobsTotal: data.total,
        allJobsTotalPages: data.totalPages,
        allJobsLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch jobs', allJobsLoading: false });
    }
  },

  fetchFilterOptions: async () => {
    try {
      const { data } = await api.get('/seeker/filter-options');
      set({ filterOptions: data });
    } catch {
      // silent fail
    }
  },

  setFilter: (key, value) => {
    const filters = { ...get().filters, [key]: value };
    if (key !== 'page') filters.page = 1;
    set({ filters });
  },

  starJob: async (jobId) => {
    set({ starring: jobId });
    try {
      await api.post(`/seeker/star/${jobId}`);
      const jobs = get().matchedJobs.map((j) =>
        j._id === jobId ? { ...j, isStarred: true } : j
      );
      set({ matchedJobs: jobs, starring: null });
      await get().fetchStarredJobs();
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to star job', starring: null });
    }
  },

  unstarJob: async (jobId) => {
    set({ starring: jobId });
    try {
      await api.delete(`/seeker/star/${jobId}`);
      const jobs = get().matchedJobs.map((j) =>
        j._id === jobId ? { ...j, isStarred: false } : j
      );
      set({ matchedJobs: jobs, starring: null });
      await get().fetchStarredJobs();
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to unstar job', starring: null });
    }
  },

  fetchReskillPlan: async (jobId) => {
    const { data } = await api.get(`/seeker/starred/${jobId}/reskill-plan`);
    return data;
  },

  triggerScrape: async (city, source) => {
    set({ scraping: true, scrapeResult: null, error: null });
    try {
      const { data } = await api.post('/scrape/direct', { city, source }, { timeout: 120000 });
      set({ scraping: false, scrapeResult: { count: data.count, city: data.city } });
      // Refresh jobs after scrape
      await get().fetchAllJobs();
      await get().fetchFilterOptions();
    } catch (err: any) {
      set({ scraping: false, error: err.response?.data?.error || 'Scrape failed' });
    }
  },
}));
