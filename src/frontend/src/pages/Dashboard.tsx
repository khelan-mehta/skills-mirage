import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../stores/dashboardStore';
import HiringTrends from '../components/dashboard/HiringTrends';
import SkillsIntel from '../components/dashboard/SkillsIntel';
import VulnerabilityIndex from '../components/dashboard/VulnerabilityIndex';
import { formatNumber } from '../utils/formatters';

const tabs = [
  { id: 'hiring', label: 'Hiring Trends', description: 'Volume by city, sector, time range' },
  { id: 'skills', label: 'Skills Intelligence', description: 'Rising & declining skills week-over-week' },
  { id: 'vulnerability', label: 'AI Vulnerability Index', description: 'Risk scores 0-100 with heatmap' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('hiring');
  const { stats, fetchAll, refresh, loading } = useDashboardStore();

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="pt-24 px-8 max-w-7xl mx-auto min-h-screen pb-24">
      {/* Section Header */}
      <p className="label-bracketed text-mirage-teal mb-4">[ LAYER 1 — DASHBOARD ]</p>
      <h1 className="heading-section text-4xl mb-2">Three Tabs. All Live. All Data-Derived.</h1>
      <p className="text-white/40 mb-8">
        Real job market data from Naukri + LinkedIn, analyzed with AI.
        {stats ? ` Last updated: ${new Date(stats.lastUpdated).toLocaleString('en-IN')}.` : ''}
      </p>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-mirage-border rounded-lg p-4 bg-mirage-card">
          <p className="text-xs text-white/40 mb-1">TOTAL JOB LISTINGS</p>
          <p className="text-2xl font-mono text-mirage-teal">
            {stats ? formatNumber(stats.totalJobs) : '—'}
          </p>
        </div>
        <div className="border border-mirage-border rounded-lg p-4 bg-mirage-card">
          <p className="text-xs text-white/40 mb-1">CITIES COVERED</p>
          <p className="text-2xl font-mono text-mirage-teal">
            {stats ? stats.totalCities : '—'}
          </p>
        </div>
        <div className="border border-mirage-border rounded-lg p-4 bg-mirage-card">
          <p className="text-xs text-white/40 mb-1">UNIQUE SKILLS TRACKED</p>
          <p className="text-2xl font-mono text-mirage-teal">
            {stats ? formatNumber(stats.totalSkills) : '—'}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 border-b border-mirage-border mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-6 py-3 nav-link transition-colors ${
              activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-mirage-teal"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'hiring' && <HiringTrends />}
          {activeTab === 'skills' && <SkillsIntel />}
          {activeTab === 'vulnerability' && <VulnerabilityIndex />}
        </motion.div>
      </AnimatePresence>

      {/* Live Refresh Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={refresh}
          disabled={loading}
          className="bg-mirage-teal text-black px-6 py-3 rounded font-body font-medium text-sm hover:bg-mirage-cyan transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <span className={`w-2 h-2 rounded-full bg-black ${loading ? 'animate-spin' : 'animate-pulse'}`} />
          {loading ? 'REFRESHING...' : 'REFRESH LIVE'}
        </button>
      </div>
    </div>
  );
}
