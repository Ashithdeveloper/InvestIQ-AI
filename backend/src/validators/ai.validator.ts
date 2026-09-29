import { z } from 'zod';

const companyAnalysisSchema = z.object({
  companyId: z
    .string({ required_error: 'Company ID is required' })
    .trim()
    .min(1, 'Company ID cannot be empty'),
  query: z
    .string({ required_error: 'Query is required' })
    .trim()
    .min(1, 'Query cannot be empty')
    .max(1000, 'Query cannot exceed 1000 characters'),
});

const financialChatSchema = z.object({
  companyId: z
    .string({ required_error: 'Company ID is required' })
    .trim()
    .min(1, 'Company ID cannot be empty'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
  sessionId: z.string().trim().optional(),
});

export type CompanyAnalysisInput = z.infer<typeof companyAnalysisSchema>;
export type FinancialChatInput = z.infer<typeof financialChatSchema>;

export { companyAnalysisSchema, financialChatSchema };
