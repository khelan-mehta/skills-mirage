interface ProfileSummaryProps {
  extractedSkills: string[];
  extractedAspirations: string[];
  extractedTools: string[];
  normalizedTitle: string;
}

export default function ProfileSummary({
  extractedSkills, extractedAspirations, extractedTools, normalizedTitle,
}: ProfileSummaryProps) {
  return (
    <div className="border border-mirage-border rounded-lg p-6">
      <h3 className="text-mirage-teal text-sm font-mono mb-4">NLP-EXTRACTED PROFILE</h3>
      <p className="text-xs text-white/30 mb-6">AI-extracted from your write-up — no manual tagging</p>

      <div className="mb-4">
        <p className="text-xs text-white/40 mb-2">NORMALIZED TITLE</p>
        <span className="text-sm font-mono text-white bg-mirage-bg-secondary px-3 py-1.5 rounded">
          {normalizedTitle}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs text-white/40 mb-2">EXTRACTED SKILLS</p>
        <div className="flex flex-wrap gap-2">
          {extractedSkills.map((skill, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded border border-mirage-teal/30 text-mirage-teal bg-mirage-teal/5">
              {skill}
            </span>
          ))}
          {extractedSkills.length === 0 && <span className="text-xs text-white/30">Processing...</span>}
        </div>
      </div>

      {extractedTools.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-white/40 mb-2">TOOLS</p>
          <div className="flex flex-wrap gap-2">
            {extractedTools.map((tool, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded border border-mirage-cyan/30 text-mirage-cyan bg-mirage-cyan/5">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {extractedAspirations.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-2">ASPIRATIONS</p>
          <div className="flex flex-wrap gap-2">
            {extractedAspirations.map((asp, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded border border-white/10 text-white/60">
                {asp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
