import {
  parseFinancialNumber,
  parseHighLow,
  extractSymbolFromUrl,
} from '../src/utils/numberParser';

describe('Financial Number Parser and Normalization Utilities', () => {
  describe('parseFinancialNumber', () => {
    it('should parse Indian currency numbers with commas and Cr.', () => {
      expect(parseFinancialNumber('₹ 7,34,985 Cr.')).toBe(734985);
      expect(parseFinancialNumber('₹ 2,032.50')).toBe(2032.5);
      expect(parseFinancialNumber('1,500 Cr')).toBe(1500);
    });

    it('should parse percentages and standard decimals', () => {
      expect(parseFinancialNumber('15.4 %')).toBe(15.4);
      expect(parseFinancialNumber('3.15%')).toBe(3.15);
      expect(parseFinancialNumber('13.7')).toBe(13.7);
    });

    it('should parse negative numbers in standard and accounting format', () => {
      expect(parseFinancialNumber('-500')).toBe(-500);
      expect(parseFinancialNumber('(1,250.75)')).toBe(-1250.75);
    });

    it('should accurately preserve 0 values', () => {
      expect(parseFinancialNumber('0')).toBe(0);
      expect(parseFinancialNumber('0.00')).toBe(0);
      expect(parseFinancialNumber('₹ 0 Cr.')).toBe(0);
    });

    it('should return null for unavailable, empty, or placeholder values', () => {
      expect(parseFinancialNumber(null)).toBeNull();
      expect(parseFinancialNumber(undefined)).toBeNull();
      expect(parseFinancialNumber('')).toBeNull();
      expect(parseFinancialNumber('-')).toBeNull();
      expect(parseFinancialNumber('--')).toBeNull();
      expect(parseFinancialNumber('N/A')).toBeNull();
      expect(parseFinancialNumber('invalid-text')).toBeNull();
    });
  });

  describe('parseHighLow', () => {
    it('should parse 52-week high and low from slash-separated string', () => {
      const result = parseHighLow('₹ 3,350 / 1,976');
      expect(result.high).toBe(3350);
      expect(result.low).toBe(1976);
    });

    it('should return nulls when high/low is unavailable or malformed', () => {
      expect(parseHighLow(null)).toEqual({ high: null, low: null });
      expect(parseHighLow('- / -')).toEqual({ high: null, low: null });
    });
  });

  describe('extractSymbolFromUrl', () => {
    it('should extract company symbol from various Screener.in URL formats', () => {
      expect(
        extractSymbolFromUrl('https://www.screener.in/company/TCS/consolidated/')
      ).toBe('TCS');
      expect(extractSymbolFromUrl('https://www.screener.in/company/RELIANCE/')).toBe(
        'RELIANCE'
      );
      expect(
        extractSymbolFromUrl('https://screener.in/company/infy?utm_source=test')
      ).toBe('INFY');
    });
  });
});
