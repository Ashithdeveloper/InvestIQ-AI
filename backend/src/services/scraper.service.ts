import { chromium, Browser, BrowserContext, Page } from 'playwright';
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

// In-memory cache for scraped data to avoid duplicate fetches for same URL
const scrapedDataCache = new Map<string, { data: ScrapedCompanyData; timestamp: number }>();
const SCRAPE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let browserInstance: Browser | null = null;
let contextInstance: BrowserContext | null = null;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
];

const launchBrowser = async (): Promise<Browser> => {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  contextInstance = null;

  try {
    browserInstance = await chromium.launch({
      headless: true,
      args: LAUNCH_ARGS,
    });
  } catch {
    try {
      browserInstance = await chromium.launch({
        channel: 'chrome',
        headless: true,
        args: LAUNCH_ARGS,
      });
    } catch {
      try {
        browserInstance = await chromium.launch({
          channel: 'msedge',
          headless: true,
          args: LAUNCH_ARGS,
        });
      } catch {
        browserInstance = await chromium.launch({ headless: true });
      }
    }
  }
  return browserInstance;
};

const getContext = async (): Promise<BrowserContext> => {
  if (contextInstance && browserInstance && browserInstance.isConnected()) {
    return contextInstance;
  }

  const browser = await launchBrowser();
  contextInstance = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Ch-Ua': '"Chromium";v="124", "Not:A-Brand";v="8"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
    },
  });
  return contextInstance;
};

const closeScraperBrowser = async (): Promise<void> => {
  if (contextInstance) {
    await contextInstance.close().catch(() => {});
    contextInstance = null;
  }
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
  scrapedDataCache.clear();
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

const scrapeCompanyData = async (
  url: string,
  preferredSymbol?: string
): Promise<ScrapedCompanyData> => {
  // 1. Check in-memory cache first to avoid duplicate network fetches
  const cached = scrapedDataCache.get(url);
  if (cached && Date.now() - cached.timestamp < SCRAPE_CACHE_TTL_MS) {
    return cached.data;
  }

  let page: Page | null = null;

  try {
    const context = await getContext();
    page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Respectful navigation with retry for transient network glitches
    let currentUrl = url;
    let response = null;
    let navError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await page.goto(currentUrl, {
          timeout: 35000,
          waitUntil: 'domcontentloaded',
        });
        navError = null;
        break;
      } catch (err) {
        navError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 3) {
          // Close stale socket page and spawn a fresh page to avoid net::ERR_SOCKET_NOT_CONNECTED
          await page.close().catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
          page = await context.newPage();
        }
      }
    }

    if (navError) {
      throw navError;
    }

    // If 404 on /consolidated/ URL, fallback to standalone page
    if (response && response.status() === 404 && currentUrl.includes('/consolidated/')) {
      currentUrl = currentUrl.replace('/consolidated/', '/');
      try {
        response = await page.goto(currentUrl, {
          timeout: 35000,
          waitUntil: 'domcontentloaded',
        });
      } catch {
        await page.close().catch(() => {});
        page = await context.newPage();
        response = await page.goto(currentUrl, {
          timeout: 35000,
          waitUntil: 'domcontentloaded',
        });
      }
    }

    if (response && response.status() === 404) {
      const error = new Error('Company not found on Screener.in') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    // 1. Company Name
    const companyName = await page
      .$eval('h1', (el) => (el.textContent || '').trim())
      .catch(async () => {
        const title = await page!.title();
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
    const symbolFromUrl = extractSymbolFromUrl(currentUrl);
    const symbol =
      preferredSymbol?.toUpperCase() || symbolFromUrl || companyName.split(' ')[0].toUpperCase();

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

    let marketCap = parseFinancialNumber(ratioMap.get('market cap'));
    let sharePrice = parseFinancialNumber(ratioMap.get('current price'));

    // If top ratios are empty on consolidated page, fallback to standalone page
    if (marketCap === null && sharePrice === null && currentUrl.includes('/consolidated/')) {
      const standaloneUrl = currentUrl.replace('/consolidated/', '/');
      try {
        const standaloneResp = await page.goto(standaloneUrl, {
          timeout: 25000,
          waitUntil: 'domcontentloaded',
        });
        if (standaloneResp && standaloneResp.ok()) {
          currentUrl = standaloneUrl;
          const freshRatiosRaw = await page
            .$$eval('#top-ratios li', (items) =>
              items.map((li) => {
                const name = li.querySelector('.name')?.textContent?.trim() || '';
                const value = li.querySelector('.value')?.textContent?.trim() || '';
                return { name, value };
              })
            )
            .catch(() => []);
          freshRatiosRaw.forEach((r) => {
            if (r.name) ratioMap.set(r.name.toLowerCase(), r.value);
          });
          marketCap = parseFinancialNumber(ratioMap.get('market cap'));
          sharePrice = parseFinancialNumber(ratioMap.get('current price'));
        }
      } catch {
        // Retain any existing values if standalone navigation fails
      }
    }

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

    const result: ScrapedCompanyData = {
      companyName,
      symbol,
      sector,
      profileUrl: currentUrl,
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

    scrapedDataCache.set(url, { data: result, timestamp: Date.now() });
    return result;
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
    if (page) {
      await page.close().catch(() => {});
    }
  }
};

export interface ResolvedScreenerCompany {
  url: string;
  symbol: string;
  name?: string;
}

const searchAndResolveScreenerCompany = async (
  query: string
): Promise<ResolvedScreenerCompany> => {
  const trimmed = query.trim();

  // 1. Direct Screener URL provided
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const symbol = extractSymbolFromUrl(trimmed);
    return { url: trimmed, symbol: symbol || 'UNKNOWN' };
  }

  // 2. Query Screener.in search API
  try {
    const searchApiUrl = `https://www.screener.in/api/company/search/?q=${encodeURIComponent(trimmed)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch(searchApiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const searchResults = (await resp.json()) as Array<{
        id: number;
        name: string;
        url: string;
      }>;

      if (Array.isArray(searchResults) && searchResults.length > 0) {
        const topMatch = searchResults[0];
        const relativeUrl = topMatch.url.startsWith('/') ? topMatch.url : `/${topMatch.url}`;
        const fullUrl = `https://www.screener.in${relativeUrl}`;
        const symbol = extractSymbolFromUrl(fullUrl) || trimmed.toUpperCase();
        return {
          url: fullUrl,
          symbol,
          name: topMatch.name,
        };
      }
    }
  } catch {
    // If API search times out or fails, proceed to fallback
  }

  // 3. Fallback: standard company URL construction
  const cleanSymbol = trimmed.replace(/[^a-zA-Z0-9&]/g, '').toUpperCase();
  return {
    url: `https://www.screener.in/company/${cleanSymbol}/consolidated/`,
    symbol: cleanSymbol,
  };
};

export interface ScreenerSuggestion {
  id: number;
  name: string;
  symbol: string;
  url: string;
}

const searchScreenerSuggestions = async (
  query: string
): Promise<ScreenerSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const searchApiUrl = `https://www.screener.in/api/company/search/?q=${encodeURIComponent(trimmed)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const resp = await fetch(searchApiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const searchResults = (await resp.json()) as Array<{
        id: number;
        name: string;
        url: string;
      }>;

      if (Array.isArray(searchResults)) {
        return searchResults.slice(0, 8).map((item) => {
          const relativeUrl = item.url.startsWith('/') ? item.url : `/${item.url}`;
          const fullUrl = `https://www.screener.in${relativeUrl}`;
          const symbol = extractSymbolFromUrl(fullUrl) || item.name.split(' ')[0].toUpperCase();
          return {
            id: item.id,
            name: item.name,
            symbol,
            url: fullUrl,
          };
        });
      }
    }
  } catch {
    // Fail gracefully
  }
  return [];
};

export {
  scrapeCompanyData,
  launchBrowser,
  getContext,
  searchAndResolveScreenerCompany,
  searchScreenerSuggestions,
  closeScraperBrowser,
};
