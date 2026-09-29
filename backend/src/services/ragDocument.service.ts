import { ICompany } from '../models/Company.model';
import { calculateFinancialMetrics } from './analysis.service';

export interface IRagDocument {
  id: string;
  companyId: string;
  symbol: string;
  companyName: string;
  sector: string;
  reportingPeriod: string;
  documentType: 'company_overview' | 'financial_statement' | 'ratios_analysis';
  content: string;
  source: string;
  metadata: {
    companyId: string;
    symbol: string;
    companyName: string;
    sector: string;
    reportingPeriod: string;
    documentType: string;
    source: string;
  };
}

const generateRagDocuments = (company: ICompany): IRagDocument[] => {
  const documents: IRagDocument[] = [];
  const companyId = company._id.toString();
  const source = company.dataSource || 'Screener.in';

  // 1. Company Overview Document
  const overviewContent = [
    `Company: ${company.companyName} (${company.symbol})`,
    `Sector: ${company.sector}`,
    `Exchanges: ${company.exchange.join(', ')}`,
    `Current Share Price: ₹${company.sharePrice ?? 'N/A'}`,
    `Market Capitalization: ₹${company.marketCap ? company.marketCap.toLocaleString('en-IN') + ' Cr' : 'N/A'}`,
    `52-Week Range: High ₹${company.high52Week ?? 'N/A'}, Low ₹${company.low52Week ?? 'N/A'}`,
    `Key Valuation Ratios: P/E Ratio: ${company.financialMetrics.peRatio ?? 'N/A'}, Book Value: ₹${company.financialMetrics.bookValue ?? 'N/A'}, Dividend Yield: ${company.financialMetrics.dividendYield ?? 'N/A'}%`,
    `Key Profitability Metrics: ROE: ${company.financialMetrics.roe ?? 'N/A'}%, ROCE: ${company.financialMetrics.roce ?? 'N/A'}%, OPM: ${company.financialMetrics.opm ?? 'N/A'}%`,
    `Source: ${source}`,
    `Profile URL: ${company.profileUrl}`,
  ].join('\n');

  documents.push({
    id: `${companyId}_overview`,
    companyId,
    symbol: company.symbol,
    companyName: company.companyName,
    sector: company.sector,
    reportingPeriod: 'Latest',
    documentType: 'company_overview',
    content: overviewContent,
    source,
    metadata: {
      companyId,
      symbol: company.symbol,
      companyName: company.companyName,
      sector: company.sector,
      reportingPeriod: 'Latest',
      documentType: 'company_overview',
      source,
    },
  });

  // 2. Deterministic Ratios & Analysis Document
  const analysis = calculateFinancialMetrics(company);
  const analysisContent = [
    `Financial Analysis for ${company.companyName} (${company.symbol}) - Reporting Period: ${analysis.reportingPeriod || 'Latest'}:`,
    `- Free Cash Flow (FCF): ${analysis.freeCashFlow.value !== null ? '₹' + analysis.freeCashFlow.value.toLocaleString('en-IN') + ' Cr' : 'N/A'} (${analysis.freeCashFlow.formula || 'OCF - CapEx'})`,
    `- Return on Equity (ROE): ${analysis.returnOnEquity.value !== null ? analysis.returnOnEquity.value + '%' : 'N/A'} (${analysis.returnOnEquity.methodology || 'Reported'})`,
    `- Debt-to-Equity Ratio: ${analysis.debtToEquity.value !== null ? analysis.debtToEquity.value : 'N/A'} (${analysis.debtToEquity.methodology || 'Debt / Equity'})`,
    `- Revenue Growth YoY: ${analysis.profitability.revenueGrowthYoY !== null ? analysis.profitability.revenueGrowthYoY + '%' : 'N/A'}`,
    `- Net Profit Margin: ${analysis.profitability.netProfitMargin !== null ? analysis.profitability.netProfitMargin + '%' : 'N/A'}`,
    `- Operating Profit Margin (OPM): ${analysis.profitability.operatingProfitMargin !== null ? analysis.profitability.operatingProfitMargin + '%' : 'N/A'}`,
    `- Price-to-Earnings (P/E): ${analysis.valuation.peRatio ?? 'N/A'}`,
    `- Price-to-Book (P/B): ${analysis.valuation.pbRatio ?? 'N/A'}`,
    `- EV/EBITDA: ${analysis.valuation.evToEbitda ?? 'N/A'}`,
    `Verified Key Insights:`,
    ...analysis.insights.map((insight) => `* ${insight}`),
    `Data Source: ${source}`,
  ].join('\n');

  documents.push({
    id: `${companyId}_ratios`,
    companyId,
    symbol: company.symbol,
    companyName: company.companyName,
    sector: company.sector,
    reportingPeriod: analysis.reportingPeriod || 'Latest',
    documentType: 'ratios_analysis',
    content: analysisContent,
    source,
    metadata: {
      companyId,
      symbol: company.symbol,
      companyName: company.companyName,
      sector: company.sector,
      reportingPeriod: analysis.reportingPeriod || 'Latest',
      documentType: 'ratios_analysis',
      source,
    },
  });

  // 3. Period-Specific Financial Statement Documents
  for (const statement of company.financialStatements || []) {
    const periods = statement.reportingPeriods || [];
    // Process each period (or the last 5 reporting periods for concise, rich context)
    const recentPeriodIndices = periods.map((_, i) => i).slice(-5);

    for (const idx of recentPeriodIndices) {
      const period = periods[idx];
      const rowsForPeriod = (statement.rows || [])
        .map((r) => {
          const val = r.values && r.values[idx] !== undefined && r.values[idx] !== null
            ? `₹${r.values[idx]?.toLocaleString('en-IN')} Cr`
            : null;
          return val ? `${r.metricName}: ${val}` : null;
        })
        .filter((r): r is string => Boolean(r));

      if (rowsForPeriod.length > 0) {
        const stmtContent = [
          `Company: ${company.companyName} (${company.symbol})`,
          `Statement Type: ${statement.statementType}`,
          `Reporting Period: ${period}`,
          `Financial Figures:`,
          ...rowsForPeriod,
          `Source: ${source}`,
        ].join('\n');

        const cleanPeriodSlug = period.replace(/[^a-zA-Z0-9]/g, '_');
        documents.push({
          id: `${companyId}_${statement.statementType}_${cleanPeriodSlug}`,
          companyId,
          symbol: company.symbol,
          companyName: company.companyName,
          sector: company.sector,
          reportingPeriod: period,
          documentType: 'financial_statement',
          content: stmtContent,
          source,
          metadata: {
            companyId,
            symbol: company.symbol,
            companyName: company.companyName,
            sector: company.sector,
            reportingPeriod: period,
            documentType: 'financial_statement',
            source,
          },
        });
      }
    }
  }

  return documents;
};

export { generateRagDocuments };
