import { ICompany, IFinancialStatement } from '../models/Company.model';

export interface IFinancialMetricDetail {
  value: number | null;
  unit?: string;
  methodology?: string;
  reportingPeriod: string | null;
  formula?: string;
}

export interface IFinancialAnalysis {
  companyId: string;
  symbol: string;
  companyName: string;
  reportingPeriod: string | null;
  dataSource: string;
  lastUpdated: Date;
  freeCashFlow: IFinancialMetricDetail;
  returnOnEquity: IFinancialMetricDetail;
  debtToEquity: IFinancialMetricDetail;
  marketCapGrowth: {
    percentageGrowth: number | null;
    comparisonPeriod: string | null;
    currentValue?: number | null;
    previousValue?: number | null;
  };
  profitability: {
    revenueGrowthYoY: number | null;
    netProfitMargin: number | null;
    operatingProfitMargin: number | null;
    reportingPeriod: string | null;
  };
  valuation: {
    peRatio: number | null;
    pbRatio: number | null;
    evToEbitda: number | null;
    reportingPeriod: string | null;
  };
  insights: string[];
}

const findStatement = (
  statements: IFinancialStatement[],
  type: IFinancialStatement['statementType']
): IFinancialStatement | undefined => {
  return statements.find((s) => s.statementType === type);
};

const getRowValues = (
  statement: IFinancialStatement | undefined,
  metricNames: string[]
): { reportingPeriods: string[]; values: (number | null)[] } | null => {
  if (!statement || !statement.rows) return null;

  for (const name of metricNames) {
    const row = statement.rows.find((r) =>
      r.metricName.toLowerCase().includes(name.toLowerCase())
    );
    if (row) {
      return {
        reportingPeriods: statement.reportingPeriods,
        values: row.values,
      };
    }
  }

  return null;
};

const calculateFinancialMetrics = (company: ICompany): IFinancialAnalysis => {
  const statements = company.financialStatements || [];
  const plStatement = findStatement(statements, 'ProfitAndLoss');
  const balanceSheet = findStatement(statements, 'BalanceSheet');
  const cashFlow = findStatement(statements, 'CashFlow');

  // Determine latest reporting period
  const periods = plStatement?.reportingPeriods || balanceSheet?.reportingPeriods || [];
  const latestPeriod = periods.length > 0 ? periods[periods.length - 1] : null;
  const previousPeriod = periods.length > 1 ? periods[periods.length - 2] : null;

  // A. FREE CASH FLOW (FCF = Operating Cash Flow - Capital Expenditure)
  let fcfValue: number | null = null;
  let fcfPeriod = latestPeriod;

  const directFcf = getRowValues(cashFlow, ['Free Cash Flow']);
  const operatingCashFlow = getRowValues(cashFlow, [
    'Cash from Operating Activity',
    'Operating Cash Flow',
  ]);
  const capex = getRowValues(cashFlow, [
    'Fixed assets purchased',
    'Capital Expenditure',
    'Cash from Investing Activity',
  ]);

  if (directFcf && directFcf.values.length > 0) {
    const val = directFcf.values[directFcf.values.length - 1];
    if (val !== null && val !== undefined) {
      fcfValue = val;
      fcfPeriod = directFcf.reportingPeriods[directFcf.reportingPeriods.length - 1];
    }
  } else if (operatingCashFlow && operatingCashFlow.values.length > 0) {
    const cfo = operatingCashFlow.values[operatingCashFlow.values.length - 1];
    if (cfo !== null && cfo !== undefined) {
      if (capex && capex.values.length > 0) {
        const capexVal = Math.abs(capex.values[capex.values.length - 1] || 0);
        fcfValue = cfo - capexVal;
      } else {
        fcfValue = cfo;
      }
      fcfPeriod =
        operatingCashFlow.reportingPeriods[operatingCashFlow.reportingPeriods.length - 1];
    }
  }

  if (fcfValue === null && company.financialMetrics?.freeCashFlow !== null) {
    fcfValue = company.financialMetrics.freeCashFlow;
  }

  // B. RETURN ON EQUITY (ROE = Net Income / Average Shareholders' Equity * 100)
  let roeValue: number | null = null;
  let roeMethodology = 'Reported ROE';
  let roePeriod = latestPeriod;

  const netIncomeRow = getRowValues(plStatement, ['Net Profit']);
  const shareCapitalRow = getRowValues(balanceSheet, ['Share Capital', 'Equity Capital']);
  const reservesRow = getRowValues(balanceSheet, ['Reserves']);

  if (netIncomeRow && shareCapitalRow && reservesRow) {
    const netIncome = netIncomeRow.values[netIncomeRow.values.length - 1];
    const len = shareCapitalRow.values.length;
    const currentEquity =
      (shareCapitalRow.values[len - 1] || 0) + (reservesRow.values[len - 1] || 0);

    if (netIncome !== null && currentEquity > 0) {
      if (len > 1) {
        const prevEquity =
          (shareCapitalRow.values[len - 2] || 0) + (reservesRow.values[len - 2] || 0);
        const avgEquity = (currentEquity + prevEquity) / 2;
        if (avgEquity > 0) {
          roeValue = parseFloat(((netIncome / avgEquity) * 100).toFixed(2));
          roeMethodology = "Calculated using Net Income / Average Shareholders' Equity × 100";
        }
      } else {
        roeValue = parseFloat(((netIncome / currentEquity) * 100).toFixed(2));
        roeMethodology = "Calculated using Net Income / Shareholders' Equity × 100";
      }
      roePeriod = netIncomeRow.reportingPeriods[netIncomeRow.reportingPeriods.length - 1];
    }
  }

  if (roeValue === null && company.financialMetrics?.roe !== null) {
    roeValue = company.financialMetrics.roe;
    roeMethodology = 'Screener.in verified verified annual ratio';
  }

  // C. DEBT-TO-EQUITY RATIO (Total Debt / Shareholders' Equity)
  let debtToEquityValue: number | null = null;
  let deMethodology = 'Balance Sheet Total Debt / Shareholders Equity';
  let dePeriod = latestPeriod;

  const borrowingsRow = getRowValues(balanceSheet, ['Borrowings']);
  if (borrowingsRow && shareCapitalRow && reservesRow) {
    const len = borrowingsRow.values.length;
    const totalDebt = borrowingsRow.values[len - 1];
    const totalEquity =
      (shareCapitalRow.values[len - 1] || 0) + (reservesRow.values[len - 1] || 0);

    if (totalDebt !== null && totalDebt !== undefined) {
      if (totalEquity <= 0) {
        debtToEquityValue = null; // Negative or zero equity
        deMethodology = 'Undefined (shareholders equity is zero or negative)';
      } else {
        debtToEquityValue = parseFloat((totalDebt / totalEquity).toFixed(2));
      }
      dePeriod = borrowingsRow.reportingPeriods[len - 1];
    }
  }

  if (debtToEquityValue === null && company.financialMetrics?.debtToEquity !== null) {
    debtToEquityValue = company.financialMetrics.debtToEquity;
    deMethodology = 'Verified verified ratio';
  }

  // D. MARKET CAPITALIZATION / PRICE GROWTH
  let percentageGrowth: number | null = null;
  let comparisonPeriod: string | null = null;

  if (company.high52Week && company.low52Week && company.low52Week > 0) {
    percentageGrowth = parseFloat(
      (((company.high52Week - company.low52Week) / company.low52Week) * 100).toFixed(2)
    );
    comparisonPeriod = '52-Week Low to 52-Week High';
  }

  // E. PROFITABILITY
  let revenueGrowthYoY: number | null = null;
  let netProfitMargin: number | null = null;
  let operatingProfitMargin: number | null = null;

  const salesRow = getRowValues(plStatement, ['Sales', 'Revenue']);
  const opmRow = getRowValues(plStatement, ['OPM %', 'Operating Profit Margin']);

  if (salesRow && salesRow.values.length > 1) {
    const len = salesRow.values.length;
    const currentSales = salesRow.values[len - 1];
    const previousSales = salesRow.values[len - 2];

    if (currentSales && previousSales && previousSales > 0) {
      revenueGrowthYoY = parseFloat(
        (((currentSales - previousSales) / previousSales) * 100).toFixed(2)
      );
    }
  }

  if (salesRow && netIncomeRow) {
    const len = salesRow.values.length;
    const currentSales = salesRow.values[len - 1];
    const currentNetIncome = netIncomeRow.values[netIncomeRow.values.length - 1];

    if (currentSales && currentNetIncome !== null && currentSales > 0) {
      netProfitMargin = parseFloat(((currentNetIncome / currentSales) * 100).toFixed(2));
    }
  }

  if (opmRow && opmRow.values.length > 0) {
    operatingProfitMargin = opmRow.values[opmRow.values.length - 1];
  } else if (company.financialMetrics?.opm !== null) {
    operatingProfitMargin = company.financialMetrics.opm;
  }

  // F. VALUATION
  const peRatio = company.financialMetrics?.peRatio ?? null;
  const pbRatio =
    company.sharePrice && company.financialMetrics?.bookValue && company.financialMetrics.bookValue > 0
      ? parseFloat((company.sharePrice / company.financialMetrics.bookValue).toFixed(2))
      : null;

  // EV / EBITDA
  let evToEbitda: number | null = null;
  const operatingProfitRow = getRowValues(plStatement, ['Operating Profit']);
  if (company.marketCap && operatingProfitRow && borrowingsRow) {
    const ebitda = operatingProfitRow.values[operatingProfitRow.values.length - 1];
    const debt = borrowingsRow.values[borrowingsRow.values.length - 1] || 0;
    const ev = company.marketCap + debt;

    if (ebitda && ebitda > 0) {
      evToEbitda = parseFloat((ev / ebitda).toFixed(2));
    }
  }

  // Generate deterministic structured insights
  const insights: string[] = [];

  if (roeValue !== null) {
    insights.push(
      roeValue >= 15
        ? `High Return on Equity of ${roeValue}% indicates strong profitability relative to shareholders' capital.`
        : `Return on Equity is ${roeValue}%, reflecting modest equity return efficiency.`
    );
  }

  if (debtToEquityValue !== null) {
    insights.push(
      debtToEquityValue <= 0.5
        ? `Prudent capital structure with a conservative Debt-to-Equity ratio of ${debtToEquityValue}.`
        : `Debt-to-Equity ratio of ${debtToEquityValue} denotes leverage to monitor against cash flow generation.`
    );
  }

  if (revenueGrowthYoY !== null) {
    insights.push(
      revenueGrowthYoY > 0
        ? `Delivered ${revenueGrowthYoY}% YoY revenue expansion over ${previousPeriod || 'prior year'} to ${latestPeriod || 'current year'}.`
        : `Revenue contracted by ${Math.abs(revenueGrowthYoY)}% YoY.`
    );
  }

  if (fcfValue !== null) {
    insights.push(
      fcfValue > 0
        ? `Positive Free Cash Flow of ₹${fcfValue.toLocaleString('en-IN')} Cr indicates organic capital self-sufficiency.`
        : `Free Cash Flow stands at ₹${fcfValue.toLocaleString('en-IN')} Cr.`
    );
  }

  return {
    companyId: company._id.toString(),
    symbol: company.symbol,
    companyName: company.companyName,
    reportingPeriod: latestPeriod,
    dataSource: company.dataSource || 'Screener.in',
    lastUpdated: company.lastUpdated,
    freeCashFlow: {
      value: fcfValue,
      unit: 'INR Crores',
      reportingPeriod: fcfPeriod,
      formula: 'Operating Cash Flow - Capital Expenditure',
    },
    returnOnEquity: {
      value: roeValue,
      unit: '%',
      methodology: roeMethodology,
      reportingPeriod: roePeriod,
    },
    debtToEquity: {
      value: debtToEquityValue,
      methodology: deMethodology,
      reportingPeriod: dePeriod,
    },
    marketCapGrowth: {
      percentageGrowth,
      comparisonPeriod,
      currentValue: company.sharePrice,
    },
    profitability: {
      revenueGrowthYoY,
      netProfitMargin,
      operatingProfitMargin,
      reportingPeriod: latestPeriod,
    },
    valuation: {
      peRatio,
      pbRatio,
      evToEbitda,
      reportingPeriod: latestPeriod,
    },
    insights,
  };
};

export { calculateFinancialMetrics };
