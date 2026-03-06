import { create } from 'zustand';
import api from '../utils/api';

interface WorkerState {
  profile: any | null;
  riskScore: any | null;
  reskillPath: any | null;
  loading: boolean;
  error: string | null;

  createProfile: (data: {
    jobTitle: string;
    city: string;
    yearsOfExperience: number;
    writeUp: string;
  }) => Promise<void>;
  fetchProfile: (id: string) => Promise<void>;
  fetchRiskScore: (id: string) => Promise<void>;
  fetchReskillPath: (id: string) => Promise<void>;
  reset: () => void;
}

export const useWorkerStore = create<WorkerState>((set) => ({
  profile: null,
  riskScore: null,
  reskillPath: null,
  loading: false,
  error: null,

  createProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const { data: profile } = await api.post('/worker/profile', data);
      set({
        profile,
        riskScore: profile.riskScore,
        reskillPath: profile.reskillPath,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create profile', loading: false });
    }
  },

  fetchProfile: async (id) => {
    try {
      const { data } = await api.get(`/worker/${id}`);
      set({ profile: data, riskScore: data.riskScore, reskillPath: data.reskillPath });
    } catch {}
  },

  fetchRiskScore: async (id) => {
    try {
      const { data } = await api.get(`/worker/${id}/risk-score`);
      set({ riskScore: data });
    } catch {}
  },

  fetchReskillPath: async (id) => {
    try {
      const { data } = await api.get(`/worker/${id}/reskill-path`);
      set({ reskillPath: data });
    } catch {}
  },

  reset: () => set({ profile: null, riskScore: null, reskillPath: null, error: null }),
}));
