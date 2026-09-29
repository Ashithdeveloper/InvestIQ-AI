const parseFinancialNumber = (rawVal: unknown): number | null => {
  if (rawVal === null || rawVal === undefined) {
    return null;
  }

  const str = String(rawVal).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === 'null' || str === '--') {
    return null;
  }

  // Handle accounting negative format: (1,234.56)
  const isParenthesesNegative = /^\(.*\)$/.test(str);

  // Remove currency signs (₹, $, etc.), commas, percentage, Cr, etc.
  const cleaned = str
    .replace(/[₹$€£,%]/g, '')
    .replace(/Cr\.?/gi, '')
    .replace(/[()]/g, '')
    .trim();

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return null;
  }

  return isParenthesesNegative ? -Math.abs(num) : num;
};

const parseHighLow = (rawVal: unknown): { high: number | null; low: number | null } => {
  if (!rawVal) return { high: null, low: null };
  const str = String(rawVal);
  const parts = str.split('/');
  if (parts.length === 2) {
    return {
      high: parseFinancialNumber(parts[0]),
      low: parseFinancialNumber(parts[1]),
    };
  }
  return { high: null, low: null };
};

const extractSymbolFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const companyIndex = pathParts.indexOf('company');
    if (companyIndex !== -1 && pathParts[companyIndex + 1]) {
      return pathParts[companyIndex + 1].toUpperCase();
    }
    return '';
  } catch {
    const match = url.match(/\/company\/([^/?#]+)/i);
    return match ? match[1].toUpperCase() : '';
  }
};

export { parseFinancialNumber, parseHighLow, extractSymbolFromUrl };
