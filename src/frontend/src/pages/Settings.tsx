import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import api from '../utils/api';

export default function Settings() {
  const { user, loadUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Editable fields
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [writeUp, setWriteUp] = useState('');

  useEffect(() => {
    api.get('/seeker/profile')
      .then(({ data }) => {
        setProfile(data);
        setJobTitle(data.jobTitle || '');
        setCity(data.city || '');
        setYearsOfExperience(String(data.yearsOfExperience ?? ''));
        setWriteUp(data.writeUp || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/seeker/profile', {
        jobTitle,
        city,
        yearsOfExperience: parseInt(yearsOfExperience),
        writeUp,
      });
      setMessage('Profile updated. Skills re-analyzed.');
      await loadUser();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Update failed');
    }
    setSaving(false);
  }

  async function handleConnectGitHub() {
    const serverIp = import.meta.env.VITE_SERVER_IP || 'localhost';
    window.location.href = `http://${serverIp}:3700/api/v1/auth/github`;
  }

  async function handleDisconnectGitHub() {
    try {
      await api.delete('/seeker/github/disconnect');
      await loadUser();
      setMessage('GitHub disconnected');
    } catch {
      setMessage('Failed to disconnect GitHub');
    }
  }

  if (loading) {
    return (
      <div className="pt-24 px-8 min-h-screen flex items-center justify-center">
        <div className="text-mirage-teal animate-pulse-teal">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 px-8 min-h-screen max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-bracketed text-mirage-teal mb-4">SETTINGS</p>
        <h1 className="heading-section text-3xl mb-10">Profile & Connections</h1>

        {message && (
          <div className="border border-mirage-teal/30 rounded p-3 bg-mirage-teal/5 text-mirage-teal text-sm mb-6">
            {message}
          </div>
        )}

        {/* Profile Edit */}
        <section className="mb-12">
          <h2 className="text-mirage-teal text-sm font-mono mb-6">PROFILE</h2>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-white/40 block mb-1">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full bg-transparent border-b border-mirage-border py-2 text-white focus:border-mirage-teal outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-transparent border-b border-mirage-border py-2 text-white focus:border-mirage-teal outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Years of Experience</label>
              <input
                type="number"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className="w-full bg-transparent border-b border-mirage-border py-2 text-white focus:border-mirage-teal outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">About Your Work</label>
              <textarea
                value={writeUp}
                onChange={(e) => setWriteUp(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-mirage-border rounded p-3 text-white focus:border-mirage-teal outline-none resize-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-mirage-teal text-black px-8 py-2.5 font-body font-medium hover:bg-mirage-cyan transition-colors disabled:opacity-40"
            >
              {saving ? 'SAVING...' : 'SAVE & RE-ANALYZE'}
            </button>
          </form>
        </section>

        {/* GitHub Connection */}
        <section className="border-t border-mirage-border pt-10">
          <h2 className="text-mirage-teal text-sm font-mono mb-6">GITHUB CONNECTION</h2>
          {user?.githubUsername ? (
            <div className="border border-mirage-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <div>
                    <p className="text-white font-medium">{user.githubUsername}</p>
                    <p className="text-xs text-white/30">Connected</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectGitHub}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-mirage-border rounded-lg p-6 text-center">
              <p className="text-white/40 text-sm mb-4">
                Connect your GitHub to include private repos in your Knowledge Graph.
              </p>
              <button
                onClick={handleConnectGitHub}
                className="border border-mirage-border px-6 py-2.5 text-sm text-white/70 hover:border-mirage-teal hover:text-white transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                CONNECT GITHUB
              </button>
            </div>
          )}
        </section>

        {/* Account Info */}
        <section className="border-t border-mirage-border pt-10 mt-10 mb-20">
          <h2 className="text-mirage-teal text-sm font-mono mb-4">ACCOUNT</h2>
          <div className="text-sm text-white/40 space-y-1">
            <p>Email: <span className="text-white/60">{user?.email}</span></p>
            <p>Name: <span className="text-white/60">{user?.name}</span></p>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
