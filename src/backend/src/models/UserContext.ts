import mongoose, { Schema, Document } from 'mongoose';

export interface IUserContext extends Document {
  userId: string;
  source: 'github' | 'resume' | 'graph';
  chunkType: 'repo_analysis' | 'code_skills' | 'project_summary' | 'resume_section' | 'skill_evidence';
  content: string;
  skills: string[];
  metadata: {
    repoName?: string;
    repoUrl?: string;
    language?: string;
    filename?: string;
    section?: string;
    confidence?: number;
  };
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const UserContextSchema = new Schema<IUserContext>(
  {
    userId: { type: String, required: true, index: true },
    source: { type: String, enum: ['github', 'resume', 'graph'], required: true },
    chunkType: {
      type: String,
      enum: ['repo_analysis', 'code_skills', 'project_summary', 'resume_section', 'skill_evidence'],
      required: true,
    },
    content: { type: String, required: true },
    skills: [{ type: String }],
    metadata: {
      repoName: String,
      repoUrl: String,
      language: String,
      filename: String,
      section: String,
      confidence: Number,
    },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

UserContextSchema.index({ userId: 1, source: 1 });
UserContextSchema.index({ userId: 1, skills: 1 });

export const UserContext = mongoose.model<IUserContext>('UserContext', UserContextSchema);
