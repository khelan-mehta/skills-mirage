import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Briefcase, Search, ChevronDown, ChevronUp,
    Users, Star, MapPin, Clock, ArrowRight, Sparkles,
    RotateCcw, X, CheckCircle,
} from 'lucide-react';
import { useHiringStore, MatchedCandidate, PastJob, ExtractedParams } from '../stores/hiringStore';

const LEVEL_COLORS: Record<string, string> = {
    junior: '#00d4aa',
    mid: '#00bcd4',
    senior: '#ffcc00',
    lead: '#ff8800',
};

const LEVEL_LABELS: Record<string, string> = {
    junior: 'Junior',
    mid: 'Mid-Level',
    senior: 'Senior',
    lead: 'Lead / Principal',
};

function SkillBadge({ skill, matched }: { skill: string; matched?: boolean }) {
    return (
        <span
            className={`text-xs px-2.5 py-1 rounded border transition-all ${matched
                ? 'border-mirage-teal/60 bg-mirage-teal/15 text-mirage-teal'
                : 'border-white/10 text-white/40'
                }`}
        >
            {skill}
        </span>
    );
}

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 80 ? '#00d4aa' : score >= 60 ? '#00bcd4' : score >= 40 ? '#ffcc00' : '#ff8800';
    return (
        <span
            className="text-xs font-mono font-bold px-2.5 py-1 rounded border"
            style={{ color, borderColor: `${color}40`, background: `${color}15` }}
        >
            {score}% match
        </span>
    );
}

function CandidateCard({ candidate }: { candidate: MatchedCandidate }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white/8 rounded-lg p-5 hover:border-white/15 transition-all bg-white/[0.02] group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-white/90 font-medium truncate">{candidate.name}</h3>
                        <ScoreBadge score={candidate.matchScore} />
                    </div>
                    <p className="text-white/40 text-sm truncate">{candidate.jobTitle}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 mb-3 text-xs text-white/35">
                <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {candidate.city || 'N/A'}
                </span>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {candidate.yearsOfExperience}y exp
                </span>
            </div>

            {/* Matched skills */}
            {candidate.matchedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {candidate.matchedSkills.slice(0, 5).map((s) => (
                        <SkillBadge key={s} skill={s} matched />
                    ))}
                    {candidate.matchedSkills.length > 5 && (
                        <span className="text-xs text-white/30 self-center">
                            +{candidate.matchedSkills.length - 5} more
                        </span>
                    )}
                </div>
            )}

            {/* Write-up snippet toggle */}
            {candidate.writeUpSnippet && (
                <>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mt-1"
                    >
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expanded ? 'Hide profile' : 'View profile snippet'}
                    </button>
                    <AnimatePresence>
                        {expanded && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-white/50 mt-2 leading-relaxed overflow-hidden"
                            >
                                {candidate.writeUpSnippet}
                                {candidate.writeUpSnippet.length >= 200 ? '...' : ''}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </>
            )}
        </motion.div>
    );
}

function ExtractedParamsPanel({ params }: { params: ExtractedParams }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-mirage-teal/30 rounded-lg p-6 bg-mirage-teal/5 mb-6"
        >
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-mirage-teal" />
                <p className="label-bracketed text-mirage-teal text-xs">[ AI EXTRACTED PARAMETERS ]</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                <div>
                    <p className="text-xs text-white/30 mb-1">Domain</p>
                    <p className="text-white/90 font-medium text-sm">{params.domain}</p>
                </div>
                <div>
                    <p className="text-xs text-white/30 mb-1">Skill Level</p>
                    <span
                        className="text-sm font-medium"
                        style={{ color: LEVEL_COLORS[params.skillLevel] || '#00d4aa' }}
                    >
                        {LEVEL_LABELS[params.skillLevel] || params.skillLevel}
                    </span>
                </div>
                <div>
                    <p className="text-xs text-white/30 mb-1">Experience</p>
                    <p className="text-white/90 text-sm font-mono">
                        {params.minExperience}–{params.maxExperience === 30 ? '10+' : params.maxExperience} yrs
                    </p>
                </div>
                <div>
                    <p className="text-xs text-white/30 mb-1">Preferred City</p>
                    <p className="text-white/90 text-sm">{params.preferredCity || 'Any city'}</p>
                </div>
                <div className="col-span-2 md:col-span-2">
                    <p className="text-xs text-white/30 mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                        {params.requiredSkills.map((s) => (
                            <SkillBadge key={s} skill={s} matched />
                        ))}
                        {params.requiredSkills.length === 0 && (
                            <span className="text-xs text-white/30">No specific skills extracted</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function PastJobCard({ job, onLoad }: { job: PastJob; onLoad: (id: string) => void }) {
    const topScore = job.matchedCandidates.length
        ? Math.max(...job.matchedCandidates.map((c) => c.matchScore))
        : 0;

    return (
        <div
            onClick={() => onLoad(job._id)}
            className="border border-white/8 rounded-lg p-4 hover:border-mirage-teal/30 transition-all cursor-pointer group bg-white/[0.01]"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <h4 className="text-white/80 text-sm font-medium truncate group-hover:text-white transition-colors">
                        {job.title}
                    </h4>
                    <p className="text-white/35 text-xs truncate">{job.company}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-mirage-teal flex-shrink-0 ml-2 transition-colors" />
            </div>
            <div className="flex items-center gap-3 text-xs text-white/30">
                <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {job.matchedCandidates.length} matches
                </span>
                {topScore > 0 && (
                    <span className="text-mirage-teal/70">Top {topScore}%</span>
                )}
                <span className="ml-auto">
                    {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
            </div>
        </div>
    );
}

export default function HiringDashboard() {
    const {
        currentJob, pastJobs, loading, pastJobsLoading, error,
        analyzeJD, fetchPastJobs, loadJob, clearCurrent,
    } = useHiringStore();

    const [form, setForm] = useState({ title: '', company: '', rawDescription: '' });
    const [charCount, setCharCount] = useState(0);

    useEffect(() => {
        fetchPastJobs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.company || form.rawDescription.trim().length < 50) return;
        await analyzeJD(form);
        fetchPastJobs(); // refresh list
    };

    const handleReset = () => {
        clearCurrent();
        setForm({ title: '', company: '', rawDescription: '' });
        setCharCount(0);
    };

    return (
        <div className="pt-24 pb-20 min-h-screen">
            <div className="max-w-7xl mx-auto px-8">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <p className="label-bracketed text-mirage-teal mb-4">[ COMPANY HIRING PORTAL ]</p>
                    <h1 className="heading-section text-4xl mb-3">
                        AI-Powered<br />
                        <span className="text-white/50 italic font-display">Talent Matching</span>
                    </h1>
                    <p className="text-white/35 max-w-xl">
                        Paste your job description and our AI will extract key parameters, then match you with
                        the most qualified candidates on the platform — in seconds.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">

                    {/* LEFT — JD Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1"
                    >
                        <div className="border border-white/8 rounded-lg p-6 bg-white/[0.02] sticky top-28">
                            <div className="flex items-center gap-2 mb-5">
                                <Briefcase className="w-4 h-4 text-mirage-teal" />
                                <h2 className="text-white/80 text-sm font-medium uppercase tracking-widest">
                                    Post a JD
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Job Title */}
                                <div>
                                    <label className="block text-xs text-white/30 mb-1.5">Job Title *</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. Senior React Developer"
                                        className="w-full bg-mirage-bg border border-white/10 rounded px-3 py-2.5 text-sm text-white/80 focus:border-mirage-teal/50 focus:outline-none transition-colors placeholder:text-white/20"
                                        required
                                    />
                                </div>

                                {/* Company Name */}
                                <div>
                                    <label className="block text-xs text-white/30 mb-1.5">Company Name *</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                                        <input
                                            type="text"
                                            value={form.company}
                                            onChange={(e) => setForm({ ...form, company: e.target.value })}
                                            placeholder="e.g. TechCorp India"
                                            className="w-full bg-mirage-bg border border-white/10 rounded pl-9 pr-3 py-2.5 text-sm text-white/80 focus:border-mirage-teal/50 focus:outline-none transition-colors placeholder:text-white/20"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* JD Text */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs text-white/30">Job Description *</label>
                                        <span className="text-xs text-white/20 font-mono">{charCount} chars</span>
                                    </div>
                                    <textarea
                                        value={form.rawDescription}
                                        onChange={(e) => {
                                            setForm({ ...form, rawDescription: e.target.value });
                                            setCharCount(e.target.value.length);
                                        }}
                                        placeholder="Paste the full job description here...&#10;&#10;Include required skills, experience, location, responsibilities and any other relevant details."
                                        rows={12}
                                        className="w-full bg-mirage-bg border border-white/10 rounded px-3 py-2.5 text-sm text-white/70 focus:border-mirage-teal/50 focus:outline-none transition-colors placeholder:text-white/20 resize-none leading-relaxed"
                                        required
                                        minLength={50}
                                    />
                                    {charCount > 0 && charCount < 50 && (
                                        <p className="text-xs text-red-400/70 mt-1">Enter at least 50 characters</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 p-3 border border-red-400/30 rounded bg-red-400/5">
                                        <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-400">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={loading || !form.title || !form.company || charCount < 50}
                                        className="flex-1 py-2.5 bg-mirage-teal/20 border border-mirage-teal/50 rounded text-mirage-teal text-sm hover:bg-mirage-teal/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border border-mirage-teal/50 border-t-mirage-teal rounded-full animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-3.5 h-3.5" />
                                                Analyze & Match
                                            </>
                                        )}
                                    </button>

                                    {currentJob && (
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="px-3 py-2.5 border border-white/15 rounded text-white/40 hover:text-white/70 hover:border-white/25 transition-all"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </motion.div>

                    {/* RIGHT — Results */}
                    <div className="lg:col-span-2">
                        <AnimatePresence mode="wait">

                            {/* Loading state */}
                            {loading && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-32"
                                >
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-2 border-mirage-teal/20 border-t-mirage-teal rounded-full animate-spin" />
                                        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-mirage-teal" />
                                    </div>
                                    <p className="text-white/60 text-sm mb-1">AI is analyzing your job description</p>
                                    <p className="text-white/25 text-xs">Extracting parameters and matching candidates...</p>
                                </motion.div>
                            )}

                            {/* Results */}
                            {!loading && currentJob && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {/* Job header */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle className="w-4 h-4 text-mirage-teal" />
                                                <h2 className="text-white/90 font-medium">{currentJob.title}</h2>
                                            </div>
                                            <p className="text-white/40 text-sm">{currentJob.company}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-mono text-mirage-teal font-bold">
                                                {currentJob.totalMatches}
                                            </span>
                                            <span className="text-white/35 text-sm">candidates matched</span>
                                        </div>
                                    </div>

                                    {/* Extracted params */}
                                    <ExtractedParamsPanel params={currentJob.extractedParams} />

                                    {/* Candidate grid */}
                                    {currentJob.matchedCandidates.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="border border-white/8 rounded-lg p-12 text-center"
                                        >
                                            <Users className="w-10 h-10 text-white/15 mx-auto mb-3" />
                                            <p className="text-white/40 mb-1">No matches found yet</p>
                                            <p className="text-white/20 text-sm">
                                                As more users join and complete their profiles, matches will appear here.
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-xs text-white/30 uppercase tracking-widest">
                                                    Top Candidates
                                                </p>
                                                <p className="text-xs text-white/20 font-mono">
                                                    Ranked by skill overlap
                                                </p>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {currentJob.matchedCandidates.map((candidate, i) => (
                                                    <CandidateCard key={`${candidate.profileId}-${i}`} candidate={candidate} />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* Empty state */}
                            {!loading && !currentJob && (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {/* How it works */}
                                    <div className="border border-white/8 rounded-lg p-8 bg-white/[0.01] mb-8">
                                        <p className="label-bracketed text-mirage-teal mb-5 text-xs">[ HOW IT WORKS ]</p>
                                        <div className="grid md:grid-cols-3 gap-6">
                                            {[
                                                {
                                                    n: '01',
                                                    title: 'Paste your JD',
                                                    desc: 'Paste any job description — raw text, copied from any source',
                                                },
                                                {
                                                    n: '02',
                                                    title: 'AI extracts parameters',
                                                    desc: 'OpenAI extracts skills, domain, level, city, and experience range',
                                                },
                                                {
                                                    n: '03',
                                                    title: 'See ranked matches',
                                                    desc: 'Platform users with the best skill overlap are ranked and displayed',
                                                },
                                            ].map((step) => (
                                                <div key={step.n}>
                                                    <p className="text-sm font-mono text-mirage-teal/60 mb-2">[{step.n}]</p>
                                                    <h3 className="text-white/80 font-medium mb-1">{step.title}</h3>
                                                    <p className="text-white/35 text-xs leading-relaxed">{step.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Past analyses in empty state too */}
                                    {pastJobs.length > 0 && (
                                        <div>
                                            <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
                                                Previous Analyses
                                            </p>
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {pastJobs.slice(0, 4).map((job) => (
                                                    <PastJobCard key={job._id} job={job} onLoad={loadJob} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Past JDs Section — only when results ARE shown */}
                {!loading && currentJob && pastJobs.length > 1 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-16 border-t border-white/8 pt-10"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-xs text-white/30 uppercase tracking-widest">
                                Previous JD Analyses
                            </p>
                            <Star className="w-3.5 h-3.5 text-white/20" />
                        </div>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {pastJobs
                                .filter((j: PastJob) => j._id !== currentJob.jobId)
                                .slice(0, 8)
                                .map((job) => (
                                    <PastJobCard key={job._id} job={job} onLoad={loadJob} />
                                ))}
                        </div>
                    </motion.section>
                )}
            </div>
        </div>
    );
}
