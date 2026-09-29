import { z } from 'zod';

const screenerUrlRegex = /^https?:\/\/(www\.)?screener\.in\/company\/[A-Za-z0-9-_%]+\/?.*$/i;

const scrapeCompanySchema = z.object({
  url: z
    .string({ required_error: 'Company URL is required' })
    .trim()
    .url('Please provide a valid URL')
    .refine((val) => screenerUrlRegex.test(val), {
      message: 'URL must be a valid Screener.in Indian company profile URL (e.g., https://www.screener.in/company/TCS/)',
    }),
});

const getCompaniesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 10)) : 10)),
  search: z.string().trim().optional(),
  sector: z.string().trim().optional(),
});

export type ScrapeCompanyInput = z.infer<typeof scrapeCompanySchema>;
export type GetCompaniesQuery = z.infer<typeof getCompaniesQuerySchema>;

export { scrapeCompanySchema, getCompaniesQuerySchema, screenerUrlRegex };
