import { create } from 'zustand';
import api from '../utils/api';

interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  isPrivate: boolean;
  url: string;
}

interface GraphState {
  graphId: string | null;
  nodes: any[];
  edges: any[];
  metadata: any | null;
  selectedNode: any | null;
  loading: boolean;
  error: string | null;
  filterTypes: string[];

  // Repo selection
  availableRepos: GitHubRepo[];
  selectedRepos: string[];
  reposLoading: boolean;
  reposError: string | null;

  fetchRepos: (username: string) => Promise<void>;
  toggleRepo: (repoName: string) => void;
  selectAllRepos: () => void;
  deselectAllRepos: () => void;
  clearRepos: () => void;

  buildGraph: (resumeText: string | null, githubUsername: string | null) => Promise<void>;
  fetchGraph: (id: string) => Promise<void>;
  selectNode: (node: any | null) => void;
  toggleFilter: (type: string) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphId: null,
  nodes: [],
  edges: [],
  metadata: null,
  selectedNode: null,
  loading: false,
  error: null,
  filterTypes: [],

  availableRepos: [],
  selectedRepos: [],
  reposLoading: false,
  reposError: null,

  fetchRepos: async (username) => {
    set({ reposLoading: true, reposError: null, availableRepos: [], selectedRepos: [] });
    try {
      const { data } = await api.get(`/graph/github-repos/${encodeURIComponent(username)}`);
      const repos = data.repos || [];
      set({
        availableRepos: repos,
        selectedRepos: repos.map((r: GitHubRepo) => r.name),
        reposLoading: false,
      });
    } catch (err: any) {
      set({
        reposError: err.response?.data?.error || 'Failed to fetch repos',
        reposLoading: false,
      });
    }
  },

  toggleRepo: (repoName) => {
    const current = get().selectedRepos;
    set({
      selectedRepos: current.includes(repoName)
        ? current.filter((n) => n !== repoName)
        : [...current, repoName],
    });
  },

  selectAllRepos: () => {
    set({ selectedRepos: get().availableRepos.map((r) => r.name) });
  },

  deselectAllRepos: () => {
    set({ selectedRepos: [] });
  },

  clearRepos: () => {
    set({ availableRepos: [], selectedRepos: [], reposError: null });
  },

  buildGraph: async (resumeText, githubUsername) => {
    set({ loading: true, error: null });
    try {
      const { selectedRepos } = get();
      const { data } = await api.post('/graph/build', {
        resumeText,
        githubUsername,
        selectedRepos: githubUsername ? selectedRepos : undefined,
      }, { timeout: 180000 });
      set({ graphId: data.id });
      await get().fetchGraph(data.id);
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.response?.data?.detail || 'Failed to build graph', loading: false });
    }
  },

  fetchGraph: async (id) => {
    try {
      const { data } = await api.get(`/graph/${id}`);
      set({
        nodes: data.nodes || [],
        edges: data.edges || [],
        metadata: data.metadata,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  selectNode: (node) => set({ selectedNode: node }),
  toggleFilter: (type) => {
    const current = get().filterTypes;
    set({
      filterTypes: current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    });
  },
  reset: () => set({
    graphId: null, nodes: [], edges: [], metadata: null, selectedNode: null, error: null,
    availableRepos: [], selectedRepos: [], reposError: null,
  }),
}));
