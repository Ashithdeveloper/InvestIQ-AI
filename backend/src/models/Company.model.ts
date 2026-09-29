import { Schema, model, Document, Types } from 'mongoose';

export interface IFinancialMetrics {
  revenue: number | null;
  netProfit: number | null;
  freeCashFlow: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  peRatio: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  opm: number | null;
  eps: number | null;
}

export interface IFinancialStatementRow {
  metricName: string;
  values: (number | null)[];
}

export interface IFinancialStatement {
  statementType: 'Quarterly' | 'ProfitAndLoss' | 'BalanceSheet' | 'CashFlow' | 'Ratios';
  reportingPeriods: string[];
  rows: IFinancialStatementRow[];
}

export interface ICompany extends Document {
  _id: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const FinancialMetricsSchema = new Schema<IFinancialMetrics>(
  {
    revenue: { type: Number, default: null },
    netProfit: { type: Number, default: null },
    freeCashFlow: { type: Number, default: null },
    roe: { type: Number, default: null },
    roce: { type: Number, default: null },
    debtToEquity: { type: Number, default: null },
    peRatio: { type: Number, default: null },
    bookValue: { type: Number, default: null },
    dividendYield: { type: Number, default: null },
    opm: { type: Number, default: null },
    eps: { type: Number, default: null },
  },
  { _id: false }
);

const FinancialStatementRowSchema = new Schema<IFinancialStatementRow>(
  {
    metricName: { type: String, required: true },
    values: [{ type: Number, default: null }],
  },
  { _id: false }
);

const FinancialStatementSchema = new Schema<IFinancialStatement>(
  {
    statementType: {
      type: String,
      enum: ['Quarterly', 'ProfitAndLoss', 'BalanceSheet', 'CashFlow', 'Ratios'],
      required: true,
    },
    reportingPeriods: [{ type: String }],
    rows: [FinancialStatementRowSchema],
  },
  { _id: false }
);

const CompanySchema = new Schema<ICompany>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    symbol: {
      type: String,
      required: [true, 'Company symbol is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    sector: {
      type: String,
      default: 'Unknown',
      trim: true,
      index: true,
    },
    profileUrl: {
      type: String,
      required: [true, 'Profile URL is required'],
      unique: true,
      trim: true,
      index: true,
    },
    exchange: {
      type: [String],
      default: ['NSE'],
    },
    marketCap: {
      type: Number,
      default: null,
    },
    sharePrice: {
      type: Number,
      default: null,
    },
    high52Week: {
      type: Number,
      default: null,
    },
    low52Week: {
      type: Number,
      default: null,
    },
    financialMetrics: {
      type: FinancialMetricsSchema,
      default: () => ({
        revenue: null,
        netProfit: null,
        freeCashFlow: null,
        roe: null,
        roce: null,
        debtToEquity: null,
        peRatio: null,
        bookValue: null,
        dividendYield: null,
        opm: null,
        eps: null,
      }),
    },
    financialStatements: {
      type: [FinancialStatementSchema],
      default: [],
    },
    dataSource: {
      type: String,
      default: 'Screener.in',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound text index for name and symbol searching
CompanySchema.index({ companyName: 'text', symbol: 'text' });

const Company = model<ICompany>('Company', CompanySchema);

export default Company;
export { Company };
