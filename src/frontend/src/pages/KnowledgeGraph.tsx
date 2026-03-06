import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../stores/graphStore';
import { useAuthStore } from '../stores/authStore';
import GraphCanvas from '../components/knowledge-graph/GraphCanvas';
import NodeDetail from '../components/knowledge-graph/NodeDetail';

const NODE_TYPES = [
  { type: 'skill', color: '#00bcd4', label: 'Skill' },
  { type: 'project', color: '#4dd0e1', label: 'Project' },
  { type: 'language', color: '#00e676', label: 'Language' },
  { type: 'certification', color: '#ffd740', label: 'Certification' },
  { type: 'repo', color: '#40c4ff', label: 'Repository' },
  { type: 'company', color: '#7c4dff', label: 'Company' },
  { type: 'education', color: '#ff6e40', label: 'Education' },
  { type: 'tool', color: '#b2ff59', label: 'Tool' },
  { type: 'domain', color: '#ea80fc', label: 'Domain' },
];

export default function KnowledgeGraph() {
  const { nodes, loading, error, buildGraph, filterTypes, toggleFilter, reset } = useGraphStore();
  const hasData = nodes.length > 0;

  return (
    <div className="pt-24 px-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <p className="label-bracketed text-mirage-teal mb-4">KNOWLEDGE GRAPH</p>
        <h1 className="heading-section text-4xl mb-2">Your Professional Universe</h1>
        <p className="text-white/40 mb-12">
          Upload your resume + GitHub URL. See your skills, projects, and repos as an interactive 3D graph.
        </p>
      </div>

      {!hasData ? (
        <UploadForm />
      ) : (
        <div className="relative">
          <GraphCanvas />
          <NodeDetail />

          {/* Controls */}
          <div className="absolute top-4 left-4 space-y-2">
            <div className="bg-mirage-bg/90 backdrop-blur border border-mirage-border rounded px-4 py-3">
              <p className="text-xs text-white/40 font-mono mb-2">FILTER BY TYPE</p>
              <div className="space-y-1">
                {NODE_TYPES.map((nt) => (
                  <label key={nt.type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!filterTypes.includes(nt.type)}
                      onChange={() => toggleFilter(nt.type)}
                      className="accent-[#00d4aa]"
                    />
                    <span className="w-2 h-2 rounded-full" style={{ background: nt.color }} />
                    <span className="text-xs text-white/60">{nt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="absolute top-4 right-4 bg-mirage-bg/90 backdrop-blur border border-mirage-border rounded px-4 py-3">
            <p className="text-xs text-white/40 font-mono mb-1">GRAPH STATS</p>
            <p className="text-sm font-mono text-mirage-teal">{nodes.length} nodes</p>
            <button
              onClick={reset}
              className="text-xs text-white/30 hover:text-white/60 mt-2 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-mirage-bg/90 backdrop-blur border border-mirage-border rounded px-4 py-3">
            <p className="text-xs text-white/40 font-mono mb-2">NODE TYPES</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00d4aa]" /> Person</span>
              {NODE_TYPES.map((nt) => (
                <span key={nt.type} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: nt.color }} /> {nt.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadForm() {
  const [resumeText, setResumeText] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const {
    buildGraph, loading, error,
    availableRepos, selectedRepos, reposLoading, reposError,
    fetchRepos, toggleRepo, selectAllRepos, deselectAllRepos, clearRepos,
  } = useGraphStore();
  const user = useAuthStore((s) => s.user);

  const defaultGithubUrl = user?.githubUsername ? `https://github.com/${user.githubUsername}` : '';

  useState(() => {
    if (defaultGithubUrl && !githubUrl) {
      setGithubUrl(defaultGithubUrl);
    }
  });

  const username = githubUrl.replace(/https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const hasReposFetched = availableRepos.length > 0;

  async function handleFetchRepos() {
    if (!username) return;
    await fetchRepos(username);
  }

  async function handleSubmit() {
    await buildGraph(resumeText || null, username || null);
  }

  function handleGithubUrlChange(url: string) {
    setGithubUrl(url);
    if (hasReposFetched) clearRepos();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="border border-mirage-border rounded-lg p-8 space-y-6">
        {/* GitHub connection hint */}
        {user?.githubUsername && (
          <div className="border border-mirage-teal/20 rounded p-3 bg-mirage-teal/5 text-sm text-mirage-teal">
            GitHub connected as <strong>{user.githubUsername}</strong> — private repos will be included.
          </div>
        )}
        {!user?.githubUsername && (
          <div className="border border-mirage-border rounded p-3 text-sm text-white/40">
            <Link to="/settings" className="text-mirage-teal hover:text-mirage-cyan">Connect GitHub</Link> in Settings to include private repos.
          </div>
        )}

        {/* Resume Input */}
        <div>
          <label className="text-mirage-teal text-sm font-mono block mb-3">RESUME TEXT</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={6}
            placeholder="Paste your resume text here (or leave blank and use GitHub only)..."
            className="w-full bg-transparent border border-mirage-border rounded p-3 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none resize-none text-sm"
          />
          <p className="text-white/20 text-xs mt-1">Paste resume content — PDF upload coming soon</p>
        </div>

        {/* GitHub URL */}
        <div>
          <label className="text-mirage-teal text-sm font-mono block mb-3">GITHUB PROFILE URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => handleGithubUrlChange(e.target.value)}
              placeholder="https://github.com/username"
              className="flex-1 bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
            />
            {username && !hasReposFetched && (
              <button
                onClick={handleFetchRepos}
                disabled={reposLoading}
                className="px-4 py-2 border border-mirage-teal text-mirage-teal text-sm hover:bg-mirage-teal/10 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {reposLoading ? 'LOADING...' : 'FETCH REPOS'}
              </button>
            )}
          </div>
          <p className="text-white/30 text-xs mt-2">
            {hasReposFetched
              ? `${selectedRepos.length} of ${availableRepos.length} repos selected`
              : 'Enter a GitHub URL and fetch repos to choose which ones to include'
            }
          </p>
        </div>

        {/* Repo Selection */}
        {reposError && (
          <div className="border border-red-400/30 rounded p-3 bg-red-400/5 text-red-400 text-sm">
            {reposError}
          </div>
        )}

        <AnimatePresence>
          {hasReposFetched && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border border-mirage-border rounded-lg">
                <div className="flex items-center justify-between px-4 py-3 border-b border-mirage-border">
                  <p className="text-mirage-teal text-sm font-mono">SELECT REPOSITORIES</p>
                  <div className="flex gap-3 text-xs">
                    <button
                      onClick={selectAllRepos}
                      className="text-white/40 hover:text-mirage-teal transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllRepos}
                      className="text-white/40 hover:text-white/60 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {availableRepos.map((repo) => (
                    <label
                      key={repo.name}
                      className="flex items-start gap-3 px-4 py-3 border-b border-mirage-border/50 last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRepos.includes(repo.name)}
                        onChange={() => toggleRepo(repo.name)}
                        className="accent-[#00d4aa] mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-mono truncate">{repo.name}</span>
                          {repo.isPrivate && (
                            <span className="text-[10px] px-1.5 py-0.5 border border-white/10 rounded text-white/30">PRIVATE</span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-white/30 mt-0.5 truncate">{repo.description}</p>
                        )}
                        <div className="flex gap-3 mt-1 text-[10px] text-white/20">
                          {repo.language && <span>{repo.language}</span>}
                          {repo.stars > 0 && <span>{repo.stars} stars</span>}
                          {repo.forks > 0 && <span>{repo.forks} forks</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="border border-red-400/30 rounded p-3 bg-red-400/5 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || (!resumeText && !githubUrl) || (!!username && hasReposFetched && selectedRepos.length === 0)}
          className="w-full bg-mirage-teal text-black py-3 font-body font-medium hover:bg-mirage-cyan transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              BUILDING GRAPH...
            </>
          ) : (
            'BUILD MY KNOWLEDGE GRAPH'
          )}
        </button>
      </div>
    </motion.div>
  );
}
