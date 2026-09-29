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

const buyAnalysisSchema = z.object({
  companyId: z
    .string({ required_error: 'Company ID is required' })
    .trim()
    .min(1, 'Company ID cannot be empty'),
  investmentAmount: z
    .number({ invalid_type_error: 'Investment amount must be a number' })
    .positive('Investment amount must be greater than zero')
    .optional(),
  investmentDuration: z
    .union([z.string().trim().min(1), z.number().positive()])
    .optional(),
});

const sellAnalysisSchema = z.object({
  companyId: z
    .string({ required_error: 'Company ID is required' })
    .trim()
    .min(1, 'Company ID cannot be empty'),
  purchasePrice: z
    .number({ invalid_type_error: 'Purchase price must be a number' })
    .positive('Purchase price must be greater than zero')
    .optional(),
  quantityHeld: z
    .number({ invalid_type_error: 'Quantity held must be a number' })
    .int('Quantity held must be a whole integer')
    .positive('Quantity held must be greater than zero')
    .optional(),
  sharesHeld: z
    .number({ invalid_type_error: 'Shares held must be a number' })
    .int('Shares held must be a whole integer')
    .positive('Shares held must be greater than zero')
    .optional(),
});

export type CompanyAnalysisInput = z.infer<typeof companyAnalysisSchema>;
export type FinancialChatInput = z.infer<typeof financialChatSchema>;
export type BuyAnalysisInput = z.infer<typeof buyAnalysisSchema>;
export type SellAnalysisInput = z.infer<typeof sellAnalysisSchema>;

export {
  companyAnalysisSchema,
  financialChatSchema,
  buyAnalysisSchema,
  sellAnalysisSchema,
};

