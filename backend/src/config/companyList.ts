// ============================================================================
// INVESTIQ-AI: INDIAN COMPANY SEED LIST (55 NSE/BSE Companies)
// ============================================================================
// This list contains Screener.in profile URLs for major Indian companies
// across diversified sectors. Used for initial data population on first startup.
// ============================================================================

export interface SeedCompany {
  symbol: string;
  url: string;
  sector: string;
}

export const INDIAN_COMPANY_SEED_LIST: SeedCompany[] = [
  // ── IT & Technology ───────────────────────────────────────────────────
  { symbol: 'TCS', url: 'https://www.screener.in/company/TCS/consolidated/', sector: 'IT - Software' },
  { symbol: 'INFY', url: 'https://www.screener.in/company/INFY/consolidated/', sector: 'IT - Software' },
  { symbol: 'HCLTECH', url: 'https://www.screener.in/company/HCLTECH/consolidated/', sector: 'IT - Software' },
  { symbol: 'WIPRO', url: 'https://www.screener.in/company/WIPRO/consolidated/', sector: 'IT - Software' },
  { symbol: 'TECHM', url: 'https://www.screener.in/company/TECHM/consolidated/', sector: 'IT - Software' },
  { symbol: 'LTIM', url: 'https://www.screener.in/company/LTIM/consolidated/', sector: 'IT - Software' },

  // ── Banking & Financial Services ──────────────────────────────────────
  { symbol: 'HDFCBANK', url: 'https://www.screener.in/company/HDFCBANK/consolidated/', sector: 'Banks' },
  { symbol: 'ICICIBANK', url: 'https://www.screener.in/company/ICICIBANK/consolidated/', sector: 'Banks' },
  { symbol: 'SBIN', url: 'https://www.screener.in/company/SBIN/consolidated/', sector: 'Banks' },
  { symbol: 'KOTAKBANK', url: 'https://www.screener.in/company/KOTAKBANK/consolidated/', sector: 'Banks' },
  { symbol: 'AXISBANK', url: 'https://www.screener.in/company/AXISBANK/consolidated/', sector: 'Banks' },
  { symbol: 'INDUSINDBK', url: 'https://www.screener.in/company/INDUSINDBK/consolidated/', sector: 'Banks' },
  { symbol: 'BAJFINANCE', url: 'https://www.screener.in/company/BAJFINANCE/consolidated/', sector: 'Finance' },
  { symbol: 'BAJAJFINSV', url: 'https://www.screener.in/company/BAJAJFINSV/consolidated/', sector: 'Finance' },

  // ── Energy & Oil ──────────────────────────────────────────────────────
  { symbol: 'RELIANCE', url: 'https://www.screener.in/company/RELIANCE/consolidated/', sector: 'Refineries' },
  { symbol: 'ONGC', url: 'https://www.screener.in/company/ONGC/consolidated/', sector: 'Oil Exploration' },
  { symbol: 'IOC', url: 'https://www.screener.in/company/IOC/consolidated/', sector: 'Refineries' },
  { symbol: 'BPCL', url: 'https://www.screener.in/company/BPCL/consolidated/', sector: 'Refineries' },
  { symbol: 'NTPC', url: 'https://www.screener.in/company/NTPC/consolidated/', sector: 'Power Generation' },
  { symbol: 'POWERGRID', url: 'https://www.screener.in/company/POWERGRID/consolidated/', sector: 'Power Transmission' },
  { symbol: 'ADANIGREEN', url: 'https://www.screener.in/company/ADANIGREEN/consolidated/', sector: 'Power Generation' },

  // ── Automobiles ───────────────────────────────────────────────────────
  { symbol: 'MARUTI', url: 'https://www.screener.in/company/MARUTI/consolidated/', sector: 'Automobiles' },
  { symbol: 'TATAMOTORS', url: 'https://www.screener.in/company/TATAMOTORS/', sector: 'Automobiles' },
  { symbol: 'M&M', url: 'https://www.screener.in/company/M%26M/consolidated/', sector: 'Automobiles' },
  { symbol: 'BAJAJ-AUTO', url: 'https://www.screener.in/company/BAJAJ-AUTO/consolidated/', sector: 'Automobiles' },
  { symbol: 'HEROMOTOCO', url: 'https://www.screener.in/company/HEROMOTOCO/consolidated/', sector: 'Automobiles' },
  { symbol: 'EICHERMOT', url: 'https://www.screener.in/company/EICHERMOT/consolidated/', sector: 'Automobiles' },

  // ── FMCG & Consumer ───────────────────────────────────────────────────
  { symbol: 'HINDUNILVR', url: 'https://www.screener.in/company/HINDUNILVR/consolidated/', sector: 'FMCG' },
  { symbol: 'ITC', url: 'https://www.screener.in/company/ITC/consolidated/', sector: 'FMCG' },
  { symbol: 'NESTLEIND', url: 'https://www.screener.in/company/NESTLEIND/consolidated/', sector: 'FMCG' },
  { symbol: 'BRITANNIA', url: 'https://www.screener.in/company/BRITANNIA/consolidated/', sector: 'FMCG' },
  { symbol: 'TATACONSUM', url: 'https://www.screener.in/company/TATACONSUM/consolidated/', sector: 'FMCG' },

  // ── Pharmaceuticals & Healthcare ──────────────────────────────────────
  { symbol: 'SUNPHARMA', url: 'https://www.screener.in/company/SUNPHARMA/consolidated/', sector: 'Pharmaceuticals' },
  { symbol: 'DRREDDY', url: 'https://www.screener.in/company/DRREDDY/consolidated/', sector: 'Pharmaceuticals' },
  { symbol: 'CIPLA', url: 'https://www.screener.in/company/CIPLA/consolidated/', sector: 'Pharmaceuticals' },
  { symbol: 'DIVISLAB', url: 'https://www.screener.in/company/DIVISLAB/consolidated/', sector: 'Pharmaceuticals' },
  { symbol: 'APOLLOHOSP', url: 'https://www.screener.in/company/APOLLOHOSP/consolidated/', sector: 'Healthcare' },

  // ── Metals & Mining ───────────────────────────────────────────────────
  { symbol: 'TATASTEEL', url: 'https://www.screener.in/company/TATASTEEL/consolidated/', sector: 'Steel' },
  { symbol: 'JSWSTEEL', url: 'https://www.screener.in/company/JSWSTEEL/consolidated/', sector: 'Steel' },
  { symbol: 'HINDALCO', url: 'https://www.screener.in/company/HINDALCO/consolidated/', sector: 'Metals - Aluminium' },
  { symbol: 'COALINDIA', url: 'https://www.screener.in/company/COALINDIA/consolidated/', sector: 'Mining' },

  // ── Cement & Construction ─────────────────────────────────────────────
  { symbol: 'ULTRACEMCO', url: 'https://www.screener.in/company/ULTRACEMCO/consolidated/', sector: 'Cement' },
  { symbol: 'SHREECEM', url: 'https://www.screener.in/company/SHREECEM/consolidated/', sector: 'Cement' },
  { symbol: 'LT', url: 'https://www.screener.in/company/LT/consolidated/', sector: 'Construction' },

  // ── Telecom ───────────────────────────────────────────────────────────
  { symbol: 'BHARTIARTL', url: 'https://www.screener.in/company/BHARTIARTL/consolidated/', sector: 'Telecom' },

  // ── Insurance ─────────────────────────────────────────────────────────
  { symbol: 'SBILIFE', url: 'https://www.screener.in/company/SBILIFE/consolidated/', sector: 'Insurance' },
  { symbol: 'HDFCLIFE', url: 'https://www.screener.in/company/HDFCLIFE/consolidated/', sector: 'Insurance' },

  // ── Conglomerates & Diversified ───────────────────────────────────────
  { symbol: 'ADANIENT', url: 'https://www.screener.in/company/ADANIENT/consolidated/', sector: 'Trading' },
  { symbol: 'ADANIPORTS', url: 'https://www.screener.in/company/ADANIPORTS/consolidated/', sector: 'Infrastructure' },

  // ── Chemicals & Specialty ─────────────────────────────────────────────
  { symbol: 'PIDILITIND', url: 'https://www.screener.in/company/PIDILITIND/consolidated/', sector: 'Chemicals' },
  { symbol: 'ASIANPAINT', url: 'https://www.screener.in/company/ASIANPAINT/consolidated/', sector: 'Consumer Durables' },

  // ── Real Estate ───────────────────────────────────────────────────────
  { symbol: 'DLF', url: 'https://www.screener.in/company/DLF/consolidated/', sector: 'Real Estate' },

  // ── Media & Entertainment ─────────────────────────────────────────────
  { symbol: 'ZOMATO', url: 'https://www.screener.in/company/ZOMATO/', sector: 'Internet Software' },

  // ── Capital Goods ─────────────────────────────────────────────────────
  { symbol: 'SIEMENS', url: 'https://www.screener.in/company/SIEMENS/consolidated/', sector: 'Capital Goods - Electrical' },
  { symbol: 'HAL', url: 'https://www.screener.in/company/HAL/consolidated/', sector: 'Aerospace & Defence' },
  { symbol: 'BEL', url: 'https://www.screener.in/company/BEL/consolidated/', sector: 'Aerospace & Defence' },
];

export const SEED_COMPANY_COUNT = INDIAN_COMPANY_SEED_LIST.length;
