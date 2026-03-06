import mongoose, { Schema, Document } from 'mongoose';

export interface IGraphData extends Document {
  userId?: mongoose.Types.ObjectId;
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    category: string;
    weight: number;
    metadata: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    weight: number;
    label?: string;
  }>;
  metadata: {
    personName: string;
    generatedAt: Date;
    sources: string[];
  };
}

const NodeSchema = new Schema(
  {
    id: String,
    label: String,
    type: String,
    category: String,
    weight: Number,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const EdgeSchema = new Schema(
  {
    id: String,
    source: String,
    target: String,
    type: String,
    weight: Number,
    label: String,
  },
  { _id: false }
);

const GraphDataSchema = new Schema<IGraphData>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
    metadata: {
      personName: String,
      generatedAt: { type: Date, default: Date.now },
      sources: [String],
    },
  },
  { timestamps: true }
);

export const GraphData = mongoose.model<IGraphData>('GraphData', GraphDataSchema);
