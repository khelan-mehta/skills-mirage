import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import api from '../utils/api';

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Bhopal', 'Indore', 'Nagpur', 'Surat',
  'Kochi', 'Coimbatore', 'Visakhapatnam', 'Thiruvananthapuram',
  'Guwahati', 'Patna', 'Noida',
];

export default function Onboarding() {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [writeUp, setWriteUp] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const loadUser = useAuthStore((s) => s.loadUser);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/seeker/onboarding', {
        jobTitle,
        city,
        yearsOfExperience: parseInt(yearsOfExperience),
        writeUp,
        resumeText: resumeText || undefined,
      });
      await loadUser();
      navigate('/seeker');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Onboarding failed');
      setLoading(false);
    }
  }

  return (
    <div className="pt-24 px-8 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <p className="label-bracketed text-mirage-teal mb-4">ONBOARDING</p>
        <h1 className="heading-section text-3xl mb-2">Tell us about yourself</h1>
        <p className="text-white/40 mb-10">
          We'll analyze your profile, compute your automation risk, and find matching jobs.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-mirage-teal text-xs font-mono block mb-2">JOB TITLE</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                placeholder="e.g. Data Entry Operator"
                className="w-full bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
              />
            </div>

            <div>
              <label className="text-mirage-teal text-xs font-mono block mb-2">CITY</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full bg-mirage-bg border-b border-mirage-border py-2 text-white focus:border-mirage-teal outline-none"
              >
                <option value="" disabled>Select your city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-mirage-teal text-xs font-mono block mb-2">YEARS OF EXPERIENCE</label>
            <input
              type="number"
              min="0"
              max="50"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
              required
              placeholder="e.g. 3"
              className="w-full bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
            />
          </div>

          <div>
            <label className="text-mirage-teal text-xs font-mono block mb-2">ABOUT YOUR WORK</label>
            <textarea
              value={writeUp}
              onChange={(e) => setWriteUp(e.target.value)}
              required
              rows={4}
              placeholder="Describe what you do daily, tools you use, challenges you face..."
              className="w-full bg-transparent border border-mirage-border rounded p-3 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none resize-none text-sm"
            />
          </div>

          <div>
            <label className="text-mirage-teal text-xs font-mono block mb-2">RESUME TEXT (OPTIONAL)</label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={4}
              placeholder="Paste your resume content for better skill extraction..."
              className="w-full bg-transparent border border-mirage-border rounded p-3 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none resize-none text-sm"
            />
            <p className="text-white/20 text-xs mt-1">This helps us extract more skills for better job matching</p>
          </div>

          {error && (
            <div className="border border-red-400/30 rounded p-3 bg-red-400/5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mirage-teal text-black py-3 font-body font-medium hover:bg-mirage-cyan transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ANALYZING PROFILE...
              </>
            ) : (
              'COMPLETE ONBOARDING'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
