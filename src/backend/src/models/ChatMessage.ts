import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  workerId: string;
  role: 'user' | 'assistant';
  content: string;
  language: 'en' | 'hi';
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  workerId: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  language: { type: String, enum: ['en', 'hi'], default: 'en' },
  timestamp: { type: Date, default: Date.now },
});

ChatMessageSchema.index({ workerId: 1, timestamp: -1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
