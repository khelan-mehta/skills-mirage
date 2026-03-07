import mongoose, { Schema, Document } from 'mongoose';

export interface IExtractedParams {
  requiredSkills: string[];
  domain: string;
  skillLevel: 'junior' | 'mid' | 'senior' | 'lead';
  preferredCity: string | null;
  minExperience: number;
  maxExperience: number;
}

export interface IMatchedCandidate {
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  matchScore: number;
  matchedSkills: string[];
  city: string;
  yearsOfExperience: number;
  jobTitle: string;
  writeUpSnippet: string;
}

export interface ICompanyJob extends Document {
  title: string;
  company: string;
  rawDescription: string;
  extractedParams: IExtractedParams;
  matchedCandidates: IMatchedCandidate[];
  createdAt: Date;
  updatedAt: Date;
}

const ExtractedParamsSchema = new Schema<IExtractedParams>(
  {
    requiredSkills: [{ type: String }],
    domain: { type: String, default: 'General' },
    skillLevel: {
      type: String,
      enum: ['junior', 'mid', 'senior', 'lead'],
      default: 'mid',
    },
    preferredCity: { type: String, default: null },
    minExperience: { type: Number, default: 0 },
    maxExperience: { type: Number, default: 20 },
  },
  { _id: false }
);

const MatchedCandidateSchema = new Schema<IMatchedCandidate>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'WorkerProfile' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: 'Anonymous' },
    email: { type: String, default: '' },
    matchScore: { type: Number, default: 0 },
    matchedSkills: [{ type: String }],
    city: { type: String, default: '' },
    yearsOfExperience: { type: Number, default: 0 },
    jobTitle: { type: String, default: '' },
    writeUpSnippet: { type: String, default: '' },
  },
  { _id: false }
);

const CompanyJobSchema = new Schema<ICompanyJob>(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    rawDescription: { type: String, required: true },
    extractedParams: { type: ExtractedParamsSchema, default: () => ({}) },
    matchedCandidates: { type: [MatchedCandidateSchema], default: [] },
  },
  { timestamps: true }
);

CompanyJobSchema.index({ createdAt: -1 });
CompanyJobSchema.index({ company: 1 });

export const CompanyJob = mongoose.model<ICompanyJob>('CompanyJob', CompanyJobSchema);
