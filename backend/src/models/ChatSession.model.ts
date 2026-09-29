import { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  reportingPeriods?: string[];
  timestamp: Date;
}

export interface IChatSession extends Document {
  _id: Types.ObjectId;
  userId: string;
  companyId: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: [{ type: String }],
    reportingPeriods: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    messages: [ChatMessageSchema],
  },
  { timestamps: true }
);

const ChatSession = model<IChatSession>('ChatSession', ChatSessionSchema);

export default ChatSession;
export { ChatSession };
