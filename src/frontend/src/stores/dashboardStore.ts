import { create } from 'zustand';
import api from '../utils/api';

interface DashboardState {
  hiringTrends: any;
  skillsTrends: { rising: any[]; declining: any[] };
  vulnerability: any[];
  heatmap: any[];
  methodology: any;
  stats: { totalJobs: number; totalCities: number; totalSkills: number; lastUpdated: string } | null;
  loading: boolean;
  activeRange: '7d' | '30d' | '90d' | '1yr';
  activeCity: string;
  activeSector: string;

  setRange: (range: '7d' | '30d' | '90d' | '1yr') => void;
  setCity: (city: string) => void;
  setSector: (sector: string) => void;
  fetchHiringTrends: () => Promise<void>;
  fetchSkillsTrends: () => Promise<void>;
  fetchVulnerability: () => Promise<void>;
  fetchHeatmap: () => Promise<void>;
  fetchMethodology: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  hiringTrends: null,
  skillsTrends: { rising: [], declining: [] },
  vulnerability: [],
  heatmap: [],
  methodology: null,
  stats: null,
  loading: false,
  activeRange: '90d',
  activeCity: '',
  activeSector: '',

  setRange: (range) => { set({ activeRange: range }); get().fetchHiringTrends(); },
  setCity: (city) => { set({ activeCity: city }); get().fetchHiringTrends(); },
  setSector: (sector) => { set({ activeSector: sector }); get().fetchHiringTrends(); },

  fetchHiringTrends: async () => {
    const { activeCity, activeSector, activeRange } = get();
    try {
      const params = new URLSearchParams();
      if (activeCity) params.set('city', activeCity);
      if (activeSector) params.set('sector', activeSector);
      params.set('range', activeRange);
      const { data } = await api.get(`/dashboard/hiring-trends?${params}`);
      if (data && (data.trends?.length > 0 || data.cities?.length > 0)) {
        set({ hiringTrends: data });
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch hiring trends:', err);
    }
  },

  fetchSkillsTrends: async () => {
    try {
      const [rising, declining] = await Promise.all([
        api.get('/dashboard/skills?type=rising&limit=20'),
        api.get('/dashboard/skills?type=declining&limit=20'),
      ]);
      set({
        skillsTrends: {
          rising: Array.isArray(rising.data) ? rising.data : [],
          declining: Array.isArray(declining.data) ? declining.data : [],
        },
      });
    } catch (err) {
      console.error('[Dashboard] Failed to fetch skills trends:', err);
    }
  },

  fetchVulnerability: async () => {
    try {
      const { data } = await api.get('/dashboard/vulnerability');
      if (Array.isArray(data) && data.length > 0) {
        set({ vulnerability: data });
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch vulnerability:', err);
    }
  },

  fetchHeatmap: async () => {
    try {
      const { data } = await api.get('/dashboard/vulnerability/heatmap');
      if (Array.isArray(data) && data.length > 0) {
        set({ heatmap: data });
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch heatmap:', err);
    }
  },

  fetchMethodology: async () => {
    try {
      const { data } = await api.get('/dashboard/methodology');
      set({ methodology: data });
    } catch (err) {
      console.error('[Dashboard] Failed to fetch methodology:', err);
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      if (data && data.totalJobs > 0) {
        set({ stats: data });
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch stats:', err);
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    // Fire all independently — don't let one failure block the rest
    await Promise.allSettled([
      get().fetchHiringTrends(),
      get().fetchSkillsTrends(),
      get().fetchVulnerability(),
      get().fetchHeatmap(),
      get().fetchMethodology(),
      get().fetchStats(),
    ]);
    set({ loading: false });
  },

  refresh: async () => {
    try {
      await api.post('/dashboard/refresh');
    } catch {}
    await get().fetchAll();
  },
}));
