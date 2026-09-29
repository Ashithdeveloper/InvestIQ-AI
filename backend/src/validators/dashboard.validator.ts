import { z } from 'zod';

const personalizedCompanyAnalysisSchema = z.object({
  companyId: z
    .string({ required_error: 'Company ID is required' })
    .trim()
    .min(1, 'Company ID cannot be empty'),
});

export type PersonalizedCompanyAnalysisInput = z.infer<
  typeof personalizedCompanyAnalysisSchema
>;

export { personalizedCompanyAnalysisSchema };
