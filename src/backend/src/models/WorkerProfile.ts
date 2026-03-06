import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkerProfile extends Document {
  jobTitle: string;
  normalizedTitle: string;
  city: string;
  yearsOfExperience: number;
  writeUp: string;
  extractedSkills: string[];
  extractedAspirations: string[];
  extractedTools: string[];
  riskScore: {
    current: number;
    previous: number;
    trend: 'rising' | 'falling' | 'stable';
    level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    factors: Array<{ signal: string; weight: number }>;
  };
  reskillPath?: {
    targetRole: string;
    targetCity: string;
    isHiringVerified: boolean;
    totalWeeks: number;
    hoursPerWeek: number;
    steps: Array<{
      weekRange: string;
      courseName: string;
      provider: string;
      institution?: string;
      url: string;
      duration: string;
      isFree: boolean;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WorkerProfileSchema = new Schema<IWorkerProfile>(
  {
    jobTitle: { type: String, required: true },
    normalizedTitle: { type: String, required: true },
    city: { type: String, required: true },
    yearsOfExperience: { type: Number, required: true },
    writeUp: { type: String, required: true },
    extractedSkills: [{ type: String }],
    extractedAspirations: [{ type: String }],
    extractedTools: [{ type: String }],
    riskScore: {
      current: { type: Number, default: 0 },
      previous: { type: Number, default: 0 },
      trend: { type: String, enum: ['rising', 'falling', 'stable'], default: 'stable' },
      level: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], default: 'LOW' },
      factors: [
        {
          signal: String,
          weight: Number,
        },
      ],
    },
    reskillPath: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

WorkerProfileSchema.index({ city: 1, normalizedTitle: 1 });
WorkerProfileSchema.index({ 'riskScore.current': -1 });

export const WorkerProfile = mongoose.model<IWorkerProfile>('WorkerProfile', WorkerProfileSchema);
