import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, X, Zap, Star } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSeekerStore } from '../stores/seekerStore';
import JobCard from '../components/seeker/JobCard';

type Tab = 'all' | 'matched' | 'starred';

export default function SeekerDashboard() {
  const user = useAuthStore((s) => s.user);
  const {
    matchedJobs, starredJobs, allJobs, allJobsTotal, allJobsTotalPages,
    filterOptions, filters, loading, allJobsLoading, starring, error,
    scraping, scrapeResult,
    fetchMatchedJobs, fetchStarredJobs, fetchAllJobs, fetchFilterOptions,
    setFilter, starJob, unstarJob, triggerScrape,
  } = useSeekerStore();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [scrapeCity, setScrapeCity] = useState('');
  const [showScrapePanel, setShowScrapePanel] = useState(false);

  useEffect(() => {
    fetchMatchedJobs();
    fetchStarredJobs();
    fetchAllJobs();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') fetchAllJobs();
  }, [filters]);

  const starredCount = starredJobs.length;
  const matchedCount = matchedJobs.length;
  const avgRisk = matchedJobs.length > 0
    ? Math.round(matchedJobs.reduce((sum, j) => sum + j.riskScore.score, 0) / matchedJobs.length)
    : 0;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const val = (e.currentTarget.elements.namedItem('search') as HTMLInputElement).value;
    setFilter('search', val);
  };

  const handleScrape = () => {
    if (!scrapeCity.trim()) return;
    triggerScrape(scrapeCity.trim());
  };

  const toggleSkillFilter = (skill: string) => {
    const current = filters.skills;
    if (current.includes(skill)) {
      setFilter('skills', current.filter(s => s !== skill));
    } else {
      setFilter('skills', [...current, skill]);
    }
  };

  return (
    <div className="pt-24 px-8 min-h-screen max-w-7xl mx-auto pb-20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="label-bracketed text-mirage-teal mb-4">[ JOB SEEKER PORTAL ]</p>
          <h1 className="heading-section text-4xl mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'Seeker'}
          </h1>
          <p className="text-white/40 mb-10">Your personalized job matches, all listings, and reskilling plans.</p>
        </div>

        {/* Scrape Button */}
        <button
          onClick={() => setShowScrapePanel(!showScrapePanel)}
          className="flex items-center gap-2 px-4 py-2 border border-mirage-teal/50 rounded-lg text-mirage-teal text-sm hover:bg-mirage-teal/10 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Live Scrape
        </button>
      </div>

      {/* Scrape Panel */}
      <AnimatePresence>
        {showScrapePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="border border-mirage-teal/30 rounded-lg p-5 bg-mirage-teal/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white/90 text-sm font-medium">Realtime Job Scraper</h3>
                <button onClick={() => setShowScrapePanel(false)} className="text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-white/30 text-xs mb-4">Scrape fresh job listings from Naukri and other sources in realtime.</p>
              <div className="flex gap-3">
                <select
                  value={scrapeCity}
                  onChange={(e) => setScrapeCity(e.target.value)}
                  className="flex-1 bg-mirage-bg border border-mirage-border rounded px-3 py-2 text-sm text-white/80 focus:border-mirage-teal/50 outline-none"
                >
                  <option value="">Select city to scrape</option>
                  {(filterOptions?.cities?.length
                    ? filterOptions.cities
                    : ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Indore']
                  ).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={handleScrape}
                  disabled={scraping || !scrapeCity}
                  className="px-5 py-2 bg-mirage-teal/20 border border-mirage-teal/50 rounded text-mirage-teal text-sm hover:bg-mirage-teal/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} />
                  {scraping ? 'Scraping...' : 'Scrape Now'}
                </button>
              </div>
              {scrapeResult && (
                <p className="text-mirage-teal text-xs mt-3">
                  Scraped {scrapeResult.count} new listings from {scrapeResult.city}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'All Jobs', value: allJobsTotal.toLocaleString(), color: '#ffffff' },
          { label: 'Matched Jobs', value: matchedCount, color: '#00d4aa' },
          { label: 'Starred Jobs', value: starredCount, color: '#00bcd4' },
          { label: 'Avg Risk Score', value: `${avgRisk}%`, color: avgRisk > 60 ? '#ff8800' : '#00d4aa' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="border border-mirage-border rounded-lg p-5 cursor-pointer hover:border-white/15 transition-colors"
            onClick={() => {
              if (i === 0) setActiveTab('all');
              if (i === 1) setActiveTab('matched');
              if (i === 2) setActiveTab('starred');
            }}
          >
            <p className="text-xs text-white/40 mb-1">{stat.label}</p>
            <p className="text-2xl font-mono" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {error && (
        <div className="border border-red-400/30 rounded p-3 bg-red-400/5 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-mirage-border">
        {([
          { key: 'all', label: 'All Jobs', count: allJobsTotal },
          { key: 'matched', label: 'My Matches', count: matchedCount },
          { key: 'starred', label: 'Starred', count: starredCount },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-mirage-teal'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-60 font-mono">{tab.count}</span>
            {activeTab === tab.key && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-px bg-mirage-teal"
              />
            )}
          </button>
        ))}

        {/* Filter toggle — only for All Jobs tab */}
        {activeTab === 'all' && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-auto flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
              showFilters ? 'text-mirage-teal bg-mirage-teal/10' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {(filters.city || filters.source || filters.skills.length > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-mirage-teal" />
            )}
          </button>
        )}
      </div>

      {/* Filters Panel — All Jobs tab */}
      <AnimatePresence>
        {activeTab === 'all' && showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="border border-mirage-border rounded-lg p-5 space-y-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    name="search"
                    placeholder="Search jobs by title, company..."
                    defaultValue={filters.search}
                    className="w-full bg-mirage-bg border border-mirage-border rounded pl-10 pr-4 py-2 text-sm text-white/80 focus:border-mirage-teal/50 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mirage-teal/20 border border-mirage-teal/50 rounded text-mirage-teal text-sm hover:bg-mirage-teal/30 transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Dropdowns row */}
              <div className="flex gap-3 flex-wrap">
                <select
                  value={filters.city}
                  onChange={(e) => setFilter('city', e.target.value)}
                  className="bg-mirage-bg border border-mirage-border rounded px-3 py-2 text-sm text-white/80 focus:border-mirage-teal/50 outline-none min-w-[160px]"
                >
                  <option value="">All Cities</option>
                  {filterOptions?.cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={filters.source}
                  onChange={(e) => setFilter('source', e.target.value)}
                  className="bg-mirage-bg border border-mirage-border rounded px-3 py-2 text-sm text-white/80 focus:border-mirage-teal/50 outline-none min-w-[140px]"
                >
                  <option value="">All Sources</option>
                  {filterOptions?.sources.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>

                <select
                  value={filters.sort}
                  onChange={(e) => setFilter('sort', e.target.value)}
                  className="bg-mirage-bg border border-mirage-border rounded px-3 py-2 text-sm text-white/80 focus:border-mirage-teal/50 outline-none min-w-[140px]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="salary">Highest Salary</option>
                </select>

                {/* Clear filters */}
                {(filters.city || filters.source || filters.search || filters.skills.length > 0) && (
                  <button
                    onClick={() => {
                      setFilter('city', '');
                      setFilter('source', '');
                      setFilter('search', '');
                      setFilter('skills', []);
                      setFilter('sort', 'newest');
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Skills chips */}
              {filterOptions?.skills && filterOptions.skills.length > 0 && (
                <div>
                  <p className="text-xs text-white/30 mb-2">Filter by skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.skills.map(s => (
                      <button
                        key={s.name}
                        onClick={() => toggleSkillFilter(s.name)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          filters.skills.includes(s.name)
                            ? 'border-mirage-teal/60 bg-mirage-teal/15 text-mirage-teal'
                            : 'border-mirage-border text-white/40 hover:border-white/20'
                        }`}
                      >
                        {s.name}
                        <span className="ml-1 opacity-50">{s.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      {activeTab === 'starred' && (
        <section>
          {starredJobs.length === 0 ? (
            <div className="text-center py-20 border border-mirage-border rounded-lg">
              <p className="text-white/40 mb-2">No starred jobs yet</p>
              <p className="text-white/20 text-sm">Star jobs from All Jobs or Matches to build your reskilling plans.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {starredJobs.map((s) => (
                <div key={s.job?._id} className="border border-mirage-teal/30 rounded-lg p-5 bg-mirage-teal/5">
                  <h3 className="text-white/90 font-medium mb-1">{s.job?.title || 'Job'}</h3>
                  <p className="text-white/40 text-sm mb-1">{s.job?.company}</p>
                  <p className="text-white/30 text-xs mb-3">{s.job?.city}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">
                      Starred {new Date(s.starredAt).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/reskill/${s.job?._id}`}
                      className="text-xs text-mirage-teal hover:text-mirage-cyan transition-colors"
                    >
                      View Reskill Plan
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'matched' && (
        <section>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-mirage-teal animate-pulse-teal">Loading matched jobs...</div>
            </div>
          ) : matchedJobs.length === 0 ? (
            <div className="text-center py-20 border border-mirage-border rounded-lg">
              <p className="text-white/40 mb-2">No matched jobs found yet</p>
              <p className="text-white/20 text-sm">Jobs are scraped daily. Check back soon or update your profile.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchedJobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  starring={starring === job._id}
                  onStar={starJob}
                  onUnstar={unstarJob}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'all' && (
        <section>
          {allJobsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-mirage-teal animate-pulse-teal">Loading jobs...</div>
            </div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-20 border border-mirage-border rounded-lg">
              <p className="text-white/40 mb-2">No jobs found</p>
              <p className="text-white/20 text-sm">Try adjusting your filters or scrape new jobs.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allJobs.map((job: any) => (
                  <AllJobCard
                    key={job._id}
                    job={job}
                    starring={starring === job._id}
                    onStar={starJob}
                    onUnstar={unstarJob}
                    isStarred={starredJobs.some(s => String(s.job?._id) === String(job._id))}
                  />
                ))}
              </div>

              {/* Pagination */}
              {allJobsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setFilter('page', Math.max(1, filters.page - 1))}
                    disabled={filters.page <= 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-white/40 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  <span className="text-sm text-white/40 font-mono">
                    Page {filters.page} of {allJobsTotalPages}
                  </span>
                  <button
                    onClick={() => setFilter('page', Math.min(allJobsTotalPages, filters.page + 1))}
                    disabled={filters.page >= allJobsTotalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-white/40 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-white/20 mt-3">
                Showing {(filters.page - 1) * 30 + 1}-{Math.min(filters.page * 30, allJobsTotal)} of {allJobsTotal.toLocaleString()} jobs
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/* Simplified job card for "All Jobs" tab (no match score) */
function AllJobCard({ job, starring, onStar, onUnstar, isStarred }: {
  job: any;
  starring: boolean;
  onStar: (id: string) => void;
  onUnstar: (id: string) => void;
  isStarred: boolean;
}) {
  return (
    <div className="border border-mirage-border rounded-lg p-5 hover:border-white/15 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white/90 font-medium truncate">
            {job.normalizedTitle || job.title}
          </h3>
          <p className="text-white/40 text-sm truncate">{job.company}</p>
        </div>
        <button
          onClick={() => isStarred ? onUnstar(job._id) : onStar(job._id)}
          disabled={starring}
          className="ml-3 flex-shrink-0 transition-colors"
        >
          <Star
            className={`w-5 h-5 ${
              starring ? 'text-white/20 animate-pulse'
                : isStarred ? 'text-mirage-teal fill-mirage-teal'
                : 'text-white/20 hover:text-mirage-teal'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-white/40">
        <span>{job.city}</span>
        {job.salary?.max > 0 && (
          <>
            <span className="text-white/20">|</span>
            <span>
              {`\u20B9${(job.salary.min / 100000).toFixed(1)}L - \u20B9${(job.salary.max / 100000).toFixed(1)}L`}
            </span>
          </>
        )}
        {job.source && (
          <>
            <span className="text-white/20">|</span>
            <span className="capitalize">{job.source}</span>
          </>
        )}
      </div>

      {/* Skills */}
      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills.slice(0, 6).map((skill: string) => (
            <span
              key={skill}
              className="text-xs px-2 py-0.5 border border-mirage-border rounded text-white/50"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 6 && (
            <span className="text-xs px-2 py-0.5 text-white/30">+{job.skills.length - 6}</span>
          )}
        </div>
      )}

      {/* Bottom */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/30">
          {new Date(job.scrapedAt).toLocaleDateString()}
        </span>
        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mirage-teal hover:text-mirage-cyan transition-colors"
          >
            View listing
          </a>
        )}
      </div>
    </div>
  );
}
