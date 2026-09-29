import { chromium, Browser, Page } from 'playwright';
import {
  parseFinancialNumber,
  parseHighLow,
  extractSymbolFromUrl,
} from '../utils/numberParser';
import {
  IFinancialMetrics,
  IFinancialStatement,
  IFinancialStatementRow,
} from '../models/Company.model';

export interface ScrapedCompanyData {
  companyName: string;
  symbol: string;
  sector: string;
  profileUrl: string;
  exchange: string[];
  marketCap: number | null;
  sharePrice: number | null;
  high52Week: number | null;
  low52Week: number | null;
  financialMetrics: IFinancialMetrics;
  financialStatements: IFinancialStatement[];
  dataSource: string;
  lastUpdated: Date;
}

const launchBrowser = async (): Promise<Browser> => {
  // Attempt with installed Google Chrome channel first
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    // Fall back to Microsoft Edge channel
    try {
      return await chromium.launch({ channel: 'msedge', headless: true });
    } catch {
      // Fall back to standard Playwright Chromium
      return await chromium.launch({ headless: true });
    }
  }
};

const extractTable = async (
  page: Page,
  sectionSelector: string,
  statementType: IFinancialStatement['statementType']
): Promise<IFinancialStatement | null> => {
  try {
    const tableData = await page.$eval(sectionSelector, (section) => {
      const table = section.querySelector('table');
      if (!table) return null;

      const thElements = Array.from(table.querySelectorAll('thead th'));
      // Headers excluding the first empty or metric name column
      const headers = thElements.slice(1).map((th) => th.textContent?.trim() || '');

      const trElements = Array.from(table.querySelectorAll('tbody tr'));
      const rows = trElements.map((tr) => {
        const nameCell = tr.querySelector('td.name, td:first-child');
        const metricName = nameCell ? (nameCell.textContent || '').replace(/[+]/g, '').trim() : '';
        const valueCells = Array.from(tr.querySelectorAll('td:not(:first-child)'));
        const values = valueCells.map((td) => td.textContent?.trim() || '');
        return { metricName, values };
      });

      return { headers, rows };
    });

    if (!tableData || tableData.headers.length === 0) {
      return null;
    }

    const parsedRows: IFinancialStatementRow[] = tableData.rows
      .filter((r) => r.metricName.length > 0)
      .map((r) => ({
        metricName: r.metricName,
        values: r.values.map((v) => parseFinancialNumber(v)),
      }));

    return {
      statementType,
      reportingPeriods: tableData.headers,
      rows: parsedRows,
    };
  } catch {
    return null;
  }
};

const getLatestRowValue = (
  statement: IFinancialStatement | null,
  metricNames: string[]
): number | null => {
  if (!statement || !statement.rows) return null;

  for (const name of metricNames) {
    const row = statement.rows.find((r) =>
      r.metricName.toLowerCase().includes(name.toLowerCase())
    );
    if (row && row.values.length > 0) {
      // Get the latest non-null value from the rightmost columns
      for (let i = row.values.length - 1; i >= 0; i--) {
        if (row.values[i] !== null && row.values[i] !== undefined) {
          return row.values[i];
        }
      }
    }
  }

  return null;
};

const scrapeCompanyData = async (url: string): Promise<ScrapedCompanyData> => {
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Respectful navigation with 30s timeout
    const response = await page.goto(url, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    if (response && response.status() === 404) {
      const error = new Error('Company not found on Screener.in') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    // 1. Company Name
    const companyName = await page
      .$eval('h1', (el) => (el.textContent || '').trim())
      .catch(async () => {
        const title = await page.title();
        return title.split('|')[0]?.trim() || '';
      });

    if (!companyName) {
      const error = new Error('Unable to extract company name from the provided page') as Error & {
        statusCode: number;
      };
      error.statusCode = 400;
      throw error;
    }

    // 2. Company Symbol
    const symbolFromUrl = extractSymbolFromUrl(url);
    const symbol = symbolFromUrl || companyName.split(' ')[0].toUpperCase();

    // 3. Sector
    const sector = await page
      .$eval('#peers a[href*="/market/"], .breadcrumbs a[href*="/market/"]', (el) =>
        (el.textContent || '').trim()
      )
      .catch(() => 'Unknown');

    // 4. Exchanges (NSE / BSE)
    const exchangeLinks = await page
      .$$eval('a[href*="bseindia"], a[href*="nseindia"]', (els) =>
        els.map((a) => (a.textContent || '').toUpperCase())
      )
      .catch(() => []);

    const detectedExchanges = new Set<string>();
    exchangeLinks.forEach((text) => {
      if (text.includes('BSE')) detectedExchanges.add('BSE');
      if (text.includes('NSE')) detectedExchanges.add('NSE');
    });

    if (detectedExchanges.size === 0) {
      detectedExchanges.add('NSE');
    }

    // 5. Top Ratios
    const topRatiosRaw = await page
      .$$eval('#top-ratios li', (items) =>
        items.map((li) => {
          const name = li.querySelector('.name')?.textContent?.trim() || '';
          const value = li.querySelector('.value')?.textContent?.trim() || '';
          return { name, value };
        })
      )
      .catch(() => []);

    const ratioMap = new Map<string, string>();
    topRatiosRaw.forEach((r) => {
      if (r.name) ratioMap.set(r.name.toLowerCase(), r.value);
    });

    const marketCap = parseFinancialNumber(ratioMap.get('market cap'));
    const sharePrice = parseFinancialNumber(ratioMap.get('current price'));
    const { high: high52Week, low: low52Week } = parseHighLow(ratioMap.get('high / low'));
    const peRatio = parseFinancialNumber(ratioMap.get('stock p/e'));
    const bookValue = parseFinancialNumber(ratioMap.get('book value'));
    const dividendYield = parseFinancialNumber(ratioMap.get('dividend yield'));
    const roce = parseFinancialNumber(ratioMap.get('roce'));
    const roe = parseFinancialNumber(ratioMap.get('roe'));

    // 6. Financial Statements
    const quarterly = await extractTable(page, '#quarters', 'Quarterly');
    const profitAndLoss = await extractTable(page, '#profit-loss', 'ProfitAndLoss');
    const balanceSheet = await extractTable(page, '#balance-sheet', 'BalanceSheet');
    const cashFlow = await extractTable(page, '#cash-flow', 'CashFlow');
    const ratiosTable = await extractTable(page, '#ratios', 'Ratios');

    const statements: IFinancialStatement[] = [];
    if (quarterly) statements.push(quarterly);
    if (profitAndLoss) statements.push(profitAndLoss);
    if (balanceSheet) statements.push(balanceSheet);
    if (cashFlow) statements.push(cashFlow);
    if (ratiosTable) statements.push(ratiosTable);

    // 7. Core Financial Metrics from statements
    const revenue = getLatestRowValue(profitAndLoss, ['Sales', 'Revenue']);
    const netProfit = getLatestRowValue(profitAndLoss, ['Net Profit']);
    const freeCashFlow = getLatestRowValue(cashFlow, ['Free Cash Flow']);
    const opm = getLatestRowValue(profitAndLoss, ['OPM %', 'Operating Profit Margin']);
    const eps = getLatestRowValue(profitAndLoss, ['EPS in Rs', 'EPS']);

    // Debt to Equity calculation if borrowings and equity exist in Balance Sheet
    let debtToEquity: number | null = null;
    const borrowings = getLatestRowValue(balanceSheet, ['Borrowings']);
    const equityShareCapital = getLatestRowValue(balanceSheet, ['Share Capital', 'Equity Capital']);
    const reserves = getLatestRowValue(balanceSheet, ['Reserves']);

    if (borrowings !== null && equityShareCapital !== null) {
      const totalEquity = equityShareCapital + (reserves || 0);
      if (totalEquity > 0) {
        debtToEquity = parseFloat((borrowings / totalEquity).toFixed(2));
      } else if (borrowings === 0) {
        debtToEquity = 0;
      }
    }

    const financialMetrics: IFinancialMetrics = {
      revenue,
      netProfit,
      freeCashFlow,
      roe,
      roce,
      debtToEquity,
      peRatio,
      bookValue,
      dividendYield,
      opm,
      eps,
    };

    return {
      companyName,
      symbol,
      sector,
      profileUrl: url,
      exchange: Array.from(detectedExchanges),
      marketCap,
      sharePrice,
      high52Week,
      low52Week,
      financialMetrics,
      financialStatements: statements,
      dataSource: 'Screener.in',
      lastUpdated: new Date(),
    };
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string; statusCode?: number };
    if (error.name === 'TimeoutError' || (error.message && error.message.includes('timeout'))) {
      const timeoutError = new Error(
        'Request to Screener.in timed out. Please verify your internet connection or the target URL.'
      ) as Error & { statusCode: number };
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

export { scrapeCompanyData, launchBrowser };
