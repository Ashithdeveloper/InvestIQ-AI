import { z } from 'zod';

const getMinAge = (): number => {
  const envMin = process.env.MIN_INVEST_AGE;
  return envMin ? parseInt(envMin, 10) : 18;
};

const getMaxAge = (): number => {
  const envMax = process.env.MAX_INVEST_AGE;
  return envMax ? parseInt(envMax, 10) : 100;
};

const createFinancialProfileSchema = z.object({
  age: z
    .number({ required_error: 'Age is required' })
    .int('Age must be a valid integer')
    .refine((val) => val >= getMinAge() && val <= getMaxAge(), {
      message: `Age must be between ${getMinAge()} and ${getMaxAge()}`,
    }),
  monthlySalary: z
    .number({ required_error: 'Monthly salary is required' })
    .min(0, 'Monthly salary cannot be negative'),
  monthlyInvestmentBudget: z
    .number({ required_error: 'Monthly investment budget is required' })
    .min(0, 'Monthly investment budget cannot be negative'),
});

const updateFinancialProfileSchema = z
  .object({
    age: z
      .number()
      .int('Age must be a valid integer')
      .refine((val) => val >= getMinAge() && val <= getMaxAge(), {
        message: `Age must be between ${getMinAge()} and ${getMaxAge()}`,
      })
      .optional(),
    monthlySalary: z
      .number()
      .min(0, 'Monthly salary cannot be negative')
      .optional(),
    monthlyInvestmentBudget: z
      .number()
      .min(0, 'Monthly investment budget cannot be negative')
      .optional(),
  })
  .refine(
    (data) =>
      data.age !== undefined ||
      data.monthlySalary !== undefined ||
      data.monthlyInvestmentBudget !== undefined,
    {
      message: 'At least one field (age, monthlySalary, monthlyInvestmentBudget) must be provided for update',
    }
  );

export type CreateFinancialProfileInput = z.infer<typeof createFinancialProfileSchema>;
export type UpdateFinancialProfileInput = z.infer<typeof updateFinancialProfileSchema>;

export {
  createFinancialProfileSchema,
  updateFinancialProfileSchema,
  getMinAge,
  getMaxAge,
};
