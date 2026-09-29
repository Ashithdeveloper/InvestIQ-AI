import { z } from 'zod';

const getCompaniesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 10;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 10 : Math.min(100, parsed);
    }),
  search: z.string().trim().optional(),
  q: z.string().trim().optional(),
  sector: z.string().trim().optional(),
});

const searchCompaniesQuerySchema = z.object({
  q: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 10;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 10 : Math.min(100, parsed);
    }),
});

export type GetCompaniesQuery = z.infer<typeof getCompaniesQuerySchema>;
export type SearchCompaniesQuery = z.infer<typeof searchCompaniesQuerySchema>;

export { getCompaniesQuerySchema, searchCompaniesQuerySchema };
