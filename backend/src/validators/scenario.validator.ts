import { z } from 'zod';

const scenarioInputSchema = z.object({
  companyId: z
    .string({ required_error: 'Company ID is required' })
    .trim()
    .min(1, 'Company ID cannot be empty'),
  monthlyBudget: z
    .number({ required_error: 'Monthly budget is required' })
    .positive('Monthly budget must be a positive number'),
  hypotheticalPriceChangePercent: z
    .number({ required_error: 'Hypothetical price change percentage is required' })
    .min(-100, 'Price change cannot be less than -100%')
    .max(10000, 'Price change percentage cannot exceed 10000%'),
  investmentDurationMonths: z
    .number()
    .int('Investment duration must be an integer')
    .positive('Investment duration must be at least 1 month')
    .optional()
    .default(1),
});

const compareBudgetSchema = z.object({
  companyId: z
    .string({ required_error: 'Company ID is required' })
    .trim()
    .min(1, 'Company ID cannot be empty'),
  currentBudget: z
    .number({ required_error: 'Current budget is required' })
    .positive('Current budget must be a positive number'),
  alternativeBudget: z
    .number({ required_error: 'Alternative budget is required' })
    .positive('Alternative budget must be a positive number'),
  hypotheticalPriceChangePercent: z
    .number({ required_error: 'Hypothetical price change percentage is required' })
    .min(-100, 'Price change cannot be less than -100%')
    .max(10000, 'Price change percentage cannot exceed 10000%'),
  investmentDurationMonths: z
    .number()
    .int('Investment duration must be an integer')
    .positive('Investment duration must be at least 1 month')
    .optional()
    .default(1),
});

export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type CompareBudgetInput = z.infer<typeof compareBudgetSchema>;

export { scenarioInputSchema, compareBudgetSchema };
