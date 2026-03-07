import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  githubId?: string;
  githubAccessToken?: string;
  githubUsername?: string;
  profileId?: mongoose.Types.ObjectId;
  onboardingComplete: boolean;
  starredJobs: Array<{
    jobListingId: mongoose.Types.ObjectId;
    starredAt: Date;
    reskillPlan?: {
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
      ragEnhanced?: boolean;
      ragChunksUsed?: number;
      ragInsights?: {
        insights: string[];
        hiddenStrengths: string[];
        summary: string;
      };
      matchingSkills?: string[];
      missingSkills?: string[];
      generatedAt: Date;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ReskillStepSchema = new Schema(
  {
    weekRange: String,
    courseName: String,
    provider: String,
    institution: String,
    url: String,
    duration: String,
    isFree: { type: Boolean, default: true },
  },
  { _id: false }
);

const StarredJobSchema = new Schema(
  {
    jobListingId: { type: Schema.Types.ObjectId, ref: 'JobListing', required: true },
    starredAt: { type: Date, default: Date.now },
    reskillPlan: {
      totalWeeks: Number,
      hoursPerWeek: Number,
      steps: [ReskillStepSchema],
      ragEnhanced: Boolean,
      ragChunksUsed: Number,
      ragInsights: {
        insights: [String],
        hiddenStrengths: [String],
        summary: String,
      },
      matchingSkills: [String],
      missingSkills: [String],
      generatedAt: Date,
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    githubId: { type: String, sparse: true, unique: true },
    githubAccessToken: String,
    githubUsername: String,
    profileId: { type: Schema.Types.ObjectId, ref: 'WorkerProfile' },
    onboardingComplete: { type: Boolean, default: false },
    starredJobs: { type: [StarredJobSchema], default: [] },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ githubId: 1 }, { sparse: true });
UserSchema.index({ 'starredJobs.jobListingId': 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
