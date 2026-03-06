import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkerStore } from '../stores/workerStore';
import RiskScore from '../components/worker/RiskScore';
import ReskillPath from '../components/worker/ReskillPath';
import ProfileSummary from '../components/worker/ProfileSummary';
import ChatInterface from '../components/chatbot/ChatInterface';

const ALL_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore', 'Nagpur', 'Kochi',
  'Coimbatore', 'Bhopal', 'Patna', 'Thiruvananthapuram', 'Visakhapatnam', 'Vadodara',
  'Surat', 'Ranchi',
];

export default function WorkerEngine() {
  const [step, setStep] = useState<'form' | 'results'>('form');

  return (
    <div className="pt-24 px-8 max-w-6xl mx-auto min-h-screen">
      <p className="label-bracketed text-mirage-teal mb-4">LAYER 2 — WORKER ENGINE</p>
      <h1 className="heading-section text-4xl mb-2">What the Worker Tells You</h1>
      <p className="text-white/40 mb-12">No CV. No long forms. Four inputs — the system does the heavy lifting.</p>

      {step === 'form' ? (
        <WorkerForm onSubmit={() => setStep('results')} />
      ) : (
        <WorkerResults onBack={() => setStep('form')} />
      )}
    </div>
  );
}

function WorkerForm({ onSubmit }: { onSubmit: () => void }) {
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [writeUp, setWriteUp] = useState('');
  const { createProfile, loading, error } = useWorkerStore();

  async function handleSubmit() {
    if (!jobTitle || !city || !yearsOfExperience || !writeUp) return;
    await createProfile({
      jobTitle,
      city,
      yearsOfExperience: parseInt(yearsOfExperience),
      writeUp,
    });
    onSubmit();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid md:grid-cols-3 gap-6">
        {/* Input 1: Job Title */}
        <div className="border border-mirage-border rounded-lg p-6">
          <label className="text-mirage-teal text-sm font-mono block mb-3">1. Current Job Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="E.g. Senior Executive, BPO"
            className="w-full bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none transition-colors"
          />
          <p className="text-white/30 text-xs mt-2">Free text — NLP normalizes it</p>
        </div>

        {/* Input 2: City */}
        <div className="border border-mirage-border rounded-lg p-6">
          <label className="text-mirage-teal text-sm font-mono block mb-3">2. City</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-transparent border-b border-mirage-border py-2 text-white focus:border-mirage-teal outline-none [&>option]:bg-[#111]"
          >
            <option value="">Select city</option>
            {ALL_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-white/30 text-xs mt-2">Tier 2 + Tier 3 fully supported</p>
        </div>

        {/* Input 3: Years of Experience */}
        <div className="border border-mirage-border rounded-lg p-6">
          <label className="text-mirage-teal text-sm font-mono block mb-3">3. Years of Experience</label>
          <input
            type="number"
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            min={0}
            max={40}
            placeholder="e.g. 8"
            className="w-full bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
          />
          <p className="text-white/30 text-xs mt-2">Weighted in risk scoring</p>
        </div>
      </div>

      {/* Input 4: Write-Up */}
      <div className="border border-mirage-teal/30 rounded-lg p-6 bg-mirage-teal/5">
        <label className="text-mirage-teal text-sm font-mono block mb-1">
          4. Short Write-Up (100-200 words)
        </label>
        <p className="text-mirage-teal/60 text-xs mb-4">THE MOST IMPORTANT INPUT</p>
        <textarea
          value={writeUp}
          onChange={(e) => setWriteUp(e.target.value)}
          rows={5}
          placeholder="What do you do day-to-day? What are you good at? What work do you want to move toward?"
          className="w-full bg-transparent border border-mirage-border rounded p-3 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none resize-none"
        />
        <p className="text-white/30 text-xs mt-2">
          Two 'Senior Executives' can have completely different skills. Your write-up extracts implicit skills,
          tools, soft skills, and aspirations no job title reveals.
        </p>
      </div>

      {error && (
        <div className="border border-red-400/30 rounded p-3 bg-red-400/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || !jobTitle || !city || !yearsOfExperience || !writeUp}
          className="bg-mirage-teal text-black px-8 py-3 font-body font-medium hover:bg-mirage-cyan transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ANALYZING...
            </>
          ) : (
            'ANALYZE MY PROFILE'
          )}
        </button>
      </div>
    </motion.div>
  );
}

function WorkerResults({ onBack }: { onBack: () => void }) {
  const { profile, riskScore, reskillPath } = useWorkerStore();

  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Top Row: Risk Score + Profile Summary */}
      <div className="grid md:grid-cols-2 gap-8">
        <RiskScore
          score={riskScore?.current || 0}
          previous={riskScore?.previous}
          trend={riskScore?.trend}
          factors={riskScore?.factors}
        />
        <ProfileSummary
          extractedSkills={profile.extractedSkills || []}
          extractedAspirations={profile.extractedAspirations || []}
          extractedTools={profile.extractedTools || []}
          normalizedTitle={profile.normalizedTitle || ''}
        />
      </div>

      {/* Reskilling Path */}
      {reskillPath && (
        <ReskillPath
          targetRole={reskillPath.targetRole}
          targetCity={reskillPath.targetCity}
          isHiringVerified={reskillPath.isHiringVerified}
          totalWeeks={reskillPath.totalWeeks}
          hoursPerWeek={reskillPath.hoursPerWeek}
          steps={reskillPath.steps || []}
          ragEnhanced={reskillPath.ragEnhanced}
          ragChunksUsed={reskillPath.ragChunksUsed}
          personalizedInsight={reskillPath.personalizedInsight}
          strengthsLeveraged={reskillPath.strengthsLeveraged}
          skillGapAnalysis={reskillPath.skillGapAnalysis}
          matchingSkills={reskillPath.matchingSkills}
          missingSkills={reskillPath.missingSkills}
        />
      )}

      {/* AI Chatbot */}
      <div>
        <h3 className="text-mirage-teal text-sm font-mono mb-4">AI CHATBOT (EN + HI)</h3>
        <ChatInterface workerId={profile._id} />
      </div>

      <button
        onClick={onBack}
        className="text-white/40 hover:text-white transition-colors nav-link"
      >
        EDIT PROFILE
      </button>
    </motion.div>
  );
}
