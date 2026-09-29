import { getCompanyById } from './company.service';
import { ICompany } from '../models/Company.model';
import { ScenarioInput, CompareBudgetInput } from '../validators/scenario.validator';

export interface InvestmentScenarioOutcome {
  company: {
    id: string;
    symbol: string;
    companyName: string;
    currentSharePrice: number;
    currency: string;
    dataSource: string;
    lastUpdated: Date;
  };
  scenarioInputs: {
    monthlyBudget: number;
    hypotheticalPriceChangePercent: number;
    investmentDurationMonths: number;
  };
  calculation: {
    wholeShares: number;
    amountInvested: number;
    unallocatedCash: number;
    hypotheticalNewPrice: number;
    estimatedValue: number;
    hypotheticalGainLoss: number;
    hypotheticalGainLossPercent: number;
    totalPortfolioValue: number;
  };
  assumptionsAndLimitations: string[];
  isHypothetical: true;
}

export interface BudgetComparisonOutcome {
  company: {
    id: string;
    symbol: string;
    companyName: string;
    currentSharePrice: number;
    currency: string;
    dataSource: string;
    lastUpdated: Date;
  };
  currentScenario: InvestmentScenarioOutcome['calculation'] & {
    budget: number;
  };
  alternativeScenario: InvestmentScenarioOutcome['calculation'] & {
    budget: number;
  };
  comparison: {
    budgetDifference: number;
    additionalInvestedAmount: number;
    additionalShares: number;
    estimatedValueDifference: number;
    gainLossDifference: number;
  };
  riskAnalysis: {
    warning: string;
    lossExposureNote: string;
  };
  assumptionsAndLimitations: string[];
  isHypothetical: true;
}

const SCENARIO_ASSUMPTIONS: string[] = [
  'Hypothetical scenario for illustrative and educational purposes only. This is NOT a financial prediction or guarantee of future returns.',
  'Calculations strictly assume whole-share purchases. Fractional share purchases are not supported in standard Indian cash equity markets.',
  'Transaction charges (brokerage, STT, exchange turnover fees, SEBI charges, stamp duty, GST) and capital gains taxes are not deducted.',
  'Hypothetical price changes represent simulated scenarios and do not incorporate company fundamentals, earnings announcements, or macroeconomic events.',
  'Past company performance does not guarantee future market behavior.',
];

const calculateInvestmentScenario = async (
  input: ScenarioInput
): Promise<InvestmentScenarioOutcome> => {
  const company: ICompany = await getCompanyById(input.companyId);

  if (!company.sharePrice || company.sharePrice <= 0) {
    const error = new Error(
      `Verified share price is not available for ${company.companyName} (${company.symbol}). Cannot compute investment scenario.`
    ) as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }

  const sharePrice = company.sharePrice;
  const budget = input.monthlyBudget;
  const priceChangePercent = input.hypotheticalPriceChangePercent;
  const durationMonths = input.investmentDurationMonths ?? 1;

  // 1. Whole shares purchasable within budget
  const wholeShares = Math.floor(budget / sharePrice);

  // 2. Amount actually invested in whole shares
  const amountInvested = parseFloat((wholeShares * sharePrice).toFixed(2));

  // 3. Unallocated residual cash from the monthly budget
  const unallocatedCash = parseFloat((budget - amountInvested).toFixed(2));

  // 4. Hypothetical new share price (floored at 0)
  const hypotheticalNewPrice = parseFloat(
    Math.max(0, sharePrice * (1 + priceChangePercent / 100)).toFixed(2)
  );

  // 5. Estimated value of purchased shares
  const estimatedValue = parseFloat((wholeShares * hypotheticalNewPrice).toFixed(2));

  // 6. Hypothetical gain or loss on invested equity
  const hypotheticalGainLoss = parseFloat((estimatedValue - amountInvested).toFixed(2));

  // 7. Percentage return on actual invested amount
  const hypotheticalGainLossPercent =
    amountInvested > 0
      ? parseFloat(((hypotheticalGainLoss / amountInvested) * 100).toFixed(2))
      : 0;

  // 8. Total combined portfolio value (shares + unallocated cash)
  const totalPortfolioValue = parseFloat((estimatedValue + unallocatedCash).toFixed(2));

  return {
    company: {
      id: company._id.toString(),
      symbol: company.symbol,
      companyName: company.companyName,
      currentSharePrice: sharePrice,
      currency: 'INR',
      dataSource: company.dataSource || 'Screener.in',
      lastUpdated: company.lastUpdated,
    },
    scenarioInputs: {
      monthlyBudget: budget,
      hypotheticalPriceChangePercent: priceChangePercent,
      investmentDurationMonths: durationMonths,
    },
    calculation: {
      wholeShares,
      amountInvested,
      unallocatedCash,
      hypotheticalNewPrice,
      estimatedValue,
      hypotheticalGainLoss,
      hypotheticalGainLossPercent,
      totalPortfolioValue,
    },
    assumptionsAndLimitations: SCENARIO_ASSUMPTIONS,
    isHypothetical: true,
  };
};

const compareBudgetScenarios = async (
  input: CompareBudgetInput
): Promise<BudgetComparisonOutcome> => {
  const currentScenario = await calculateInvestmentScenario({
    companyId: input.companyId,
    monthlyBudget: input.currentBudget,
    hypotheticalPriceChangePercent: input.hypotheticalPriceChangePercent,
    investmentDurationMonths: input.investmentDurationMonths,
  });

  const alternativeScenario = await calculateInvestmentScenario({
    companyId: input.companyId,
    monthlyBudget: input.alternativeBudget,
    hypotheticalPriceChangePercent: input.hypotheticalPriceChangePercent,
    investmentDurationMonths: input.investmentDurationMonths,
  });

  const budgetDifference = parseFloat(
    (input.alternativeBudget - input.currentBudget).toFixed(2)
  );
  const additionalInvestedAmount = parseFloat(
    (alternativeScenario.calculation.amountInvested - currentScenario.calculation.amountInvested).toFixed(2)
  );
  const additionalShares =
    alternativeScenario.calculation.wholeShares - currentScenario.calculation.wholeShares;
  const estimatedValueDifference = parseFloat(
    (alternativeScenario.calculation.estimatedValue - currentScenario.calculation.estimatedValue).toFixed(2)
  );
  const gainLossDifference = parseFloat(
    (alternativeScenario.calculation.hypotheticalGainLoss - currentScenario.calculation.hypotheticalGainLoss).toFixed(2)
  );

  return {
    company: currentScenario.company,
    currentScenario: {
      budget: input.currentBudget,
      ...currentScenario.calculation,
    },
    alternativeScenario: {
      budget: input.alternativeBudget,
      ...alternativeScenario.calculation,
    },
    comparison: {
      budgetDifference,
      additionalInvestedAmount,
      additionalShares,
      estimatedValueDifference,
      gainLossDifference,
    },
    riskAnalysis: {
      warning:
        'Higher investment amounts increase both potential monetary upside and downside capital exposure.',
      lossExposureNote:
        input.hypotheticalPriceChangePercent < 0
          ? `In this negative return scenario (${input.hypotheticalPriceChangePercent}%), increasing your budget by ₹${Math.abs(budgetDifference).toLocaleString('en-IN')} results in ₹${Math.abs(gainLossDifference).toLocaleString('en-IN')} additional capital loss.`
          : `While an increase of ₹${budgetDifference.toLocaleString('en-IN')} yields ₹${gainLossDifference.toLocaleString('en-IN')} higher hypothetical gain, the same larger capital is equally subject to magnified losses in an adverse market decline.`,
    },
    assumptionsAndLimitations: SCENARIO_ASSUMPTIONS,
    isHypothetical: true,
  };
};

export { calculateInvestmentScenario, compareBudgetScenarios };
