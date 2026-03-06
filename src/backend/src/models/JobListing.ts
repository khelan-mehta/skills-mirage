import mongoose, { Schema, Document } from 'mongoose';

export interface IJobListing extends Document {
  title: string;
  normalizedTitle: string;
  company: string;
  city: string;
  sector: string;
  skills: string[];
  salary: { min: number; max: number };
  aiToolMentions: string[];
  source: 'naukri' | 'linkedin';
  scrapedAt: Date;
  rawDescription: string;
  sourceUrl: string;
  vulnerabilitySignals: {
    aiReplacementRisk: number;
    hiringTrend: 'up' | 'down' | 'stable';
    automationKeywords: string[];
  };
}

const JobListingSchema = new Schema<IJobListing>(
  {
    title: { type: String, required: true },
    normalizedTitle: { type: String, required: true, index: true },
    company: { type: String, required: true },
    city: { type: String, required: true, index: true },
    sector: { type: String, default: 'General' },
    skills: [{ type: String }],
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    aiToolMentions: [{ type: String }],
    source: { type: String, enum: ['naukri', 'linkedin'], required: true },
    scrapedAt: { type: Date, default: Date.now, index: true },
    rawDescription: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    vulnerabilitySignals: {
      aiReplacementRisk: { type: Number, default: 0 },
      hiringTrend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
      automationKeywords: [{ type: String }],
    },
  },
  { timestamps: true }
);

// Compound indexes for dashboard queries
JobListingSchema.index({ city: 1, scrapedAt: -1 });
JobListingSchema.index({ normalizedTitle: 1, city: 1, scrapedAt: -1 });
JobListingSchema.index({ skills: 1 });
JobListingSchema.index({ source: 1, scrapedAt: -1 });
JobListingSchema.index({ 'aiToolMentions': 1, city: 1 });

export const JobListing = mongoose.model<IJobListing>('JobListing', JobListingSchema);
