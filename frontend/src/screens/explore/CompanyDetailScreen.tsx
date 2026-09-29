import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  Button,
  Header,
  MetricBadge,
  LoadingSkeleton,
  ErrorMessage,
} from '../../components/common';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { getStockRiskAndProfit } from '../../utils/stockMetrics';

interface CompanyDetailScreenProps {
  route?: {
    params?: {
      companyId?: string;
      symbol?: string;
      companyName?: string;
    };
  };
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

export const CompanyDetailScreen: React.FC<CompanyDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const companyId = route?.params?.companyId || '';
  const symbol = route?.params?.symbol || '';
  const { selectedCompany, fetchCompanyDetails, isLoadingDetails, error } =
    useCompanyStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompanyDetails(companyId || symbol);
  }, [companyId, symbol]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyDetails(companyId || symbol);
    setRefreshing(false);
  };

  const company = selectedCompany;
  const metrics = company ? getStockRiskAndProfit(company) : null;

  // Calculate accurate 52-week price position
  const rangePercent =
    company?.high52Week && company?.low52Week && company?.sharePrice && company.high52Week > company.low52Week
      ? Math.min(100, Math.max(0, ((company.sharePrice - company.low52Week) / (company.high52Week - company.low52Week)) * 100))
      : 50;

  return (
    <View style={styles.container}>
      <Header
        title={symbol || 'Company'}
        subtitle={company?.companyName || 'Details & Fundamentals'}
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 20) + 36 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {isLoadingDetails && !company ? (
          <LoadingSkeleton message="Loading company data..." count={4} />
        ) : error ? (
          <ErrorMessage
            message={error}
            onRetry={() => fetchCompanyDetails(companyId || symbol)}
          />
        ) : company && metrics ? (
          <>
            {/* 1. Company Overview Header Card */}
            <Card variant="elevated" style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.symbolText}>{company.symbol}</Text>
                  <Text style={styles.nameText} numberOfLines={2}>
                    {company.companyName}
                  </Text>
                  <Text style={styles.sectorText}>
                    {company.sector} · {company.exchange?.join('/') || 'NSE'}
                  </Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.currentPrice}>
                    {company.sharePrice !== null && company.sharePrice !== undefined
                      ? `₹${company.sharePrice.toLocaleString('en-IN')}`
                      : 'N/A'}
                  </Text>
                  <Text style={styles.sourceText}>Source: {company.dataSource || 'Screener.in'}</Text>
                </View>
              </View>

              {/* 52-Week Range Bar */}
              <View style={styles.rangeBox}>
                <View style={styles.rangeHeaderRow}>
                  <Text style={styles.rangeLabel}>52-Week Range</Text>
                  <Text style={styles.rangePositionText}>
                    {rangePercent.toFixed(0)}% of range
                  </Text>
                </View>
                <View style={styles.rangeValuesRow}>
                  <Text style={styles.rangeVal}>
                    ₹{company.low52Week !== null && company.low52Week !== undefined ? company.low52Week.toLocaleString('en-IN') : 'N/A'}
                  </Text>
                  <View style={styles.rangeBarTrack}>
                    <View
                      style={[
                        styles.rangeBarFill,
                        { width: `${rangePercent.toFixed(1)}%` as DimensionValue },
                      ]}
                    />
                  </View>
                  <Text style={styles.rangeVal}>
                    ₹{company.high52Week !== null && company.high52Week !== undefined ? company.high52Week.toLocaleString('en-IN') : 'N/A'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* 2. Risk & Profit Potential Analysis */}
            <Text style={styles.sectionHeader}>Investment Profile & Risk Evaluation</Text>
            <Card variant="elevated" style={styles.riskProfitCard}>
              <View style={styles.riskProfitRow}>
                {/* Risk Value */}
                <View style={styles.riskCol}>
                  <Text style={styles.metricCardLabel}>Risk Score</Text>
                  <Text
                    style={[
                      styles.riskBigText,
                      metrics.riskPercentage <= 25
                        ? { color: '#10B981' }
                        : metrics.riskPercentage <= 60
                        ? { color: '#F59E0B' }
                        : { color: '#EF4444' },
                    ]}
                  >
                    🛡️ {metrics.riskPercentage}%
                  </Text>
                  <View
                    style={[
                      styles.levelPill,
                      metrics.riskPercentage <= 25
                        ? styles.pillLow
                        : metrics.riskPercentage <= 60
                        ? styles.pillMod
                        : styles.pillHigh,
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelPillText,
                        metrics.riskPercentage <= 25
                          ? { color: '#10B981' }
                          : metrics.riskPercentage <= 60
                          ? { color: '#F59E0B' }
                          : { color: '#EF4444' },
                      ]}
                    >
                      {metrics.riskLevel} RISK
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.riskDivider} />

                {/* Profit Potential */}
                <View style={styles.profitCol}>
                  <Text style={styles.metricCardLabel}>Profit Potential</Text>
                  <Text style={styles.profitBigText}>
                    📈 +{metrics.profitPercentage}%
                  </Text>
                  <Text style={styles.profitSubText}>Estimated Annual Return</Text>
                </View>
              </View>

              {/* Visual Risk Gauge Meter */}
              <View style={styles.meterContainer}>
                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      {
                        width: `${Math.min(100, Math.max(4, metrics.riskPercentage))}%` as DimensionValue,
                        backgroundColor:
                          metrics.riskPercentage <= 25
                            ? '#10B981'
                            : metrics.riskPercentage <= 60
                            ? '#F59E0B'
                            : '#EF4444',
                      },
                    ]}
                  />
                </View>
                <View style={styles.meterLabels}>
                  <Text style={styles.meterLabelText}>Conservative (0%)</Text>
                  <Text style={styles.meterLabelText}>Moderate (50%)</Text>
                  <Text style={styles.meterLabelText}>High Risk (100%)</Text>
                </View>
              </View>

              <Text style={styles.riskContextNote}>
                {metrics.riskPercentage <= 25
                  ? 'Resilient business model with low geopolitical shock sensitivity and robust balance sheet.'
                  : metrics.riskPercentage <= 60
                  ? 'Moderate risk profile balanced by steady industry demand and capital structure.'
                  : 'High sector volatility or cyclical sensitivity. Prudent risk management advised.'}
              </Text>
            </Card>

            {/* 3. AI Investment Decision Support */}
            <Text style={styles.sectionHeader}>AI Investment Decision Support</Text>
            <View style={styles.decisionRow}>
              <TouchableOpacity
                style={[styles.decisionBtn, styles.buyBtn]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation?.navigate('BuyAnalysis', {
                    companyId: company._id,
                    symbol: company.symbol,
                    companyName: company.companyName,
                  })
                }
              >
                <Text style={styles.decisionBtnIcon}>🟢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.decisionBtnTitle}>Buy Analysis</Text>
                  <Text style={styles.decisionBtnSub}>Valuation & Growth Catalysts</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.decisionBtn, styles.sellBtn]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation?.navigate('SellAnalysis', {
                    companyId: company._id,
                    symbol: company.symbol,
                    companyName: company.companyName,
                  })
                }
              >
                <Text style={styles.decisionBtnIcon}>🔴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.decisionBtnTitle}>Sell Analysis</Text>
                  <Text style={styles.decisionBtnSub}>Risks, Deterioration & P&L</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Action Navigation */}
            <View style={styles.actionRow}>
              <Button
                title="📊 Full Financial Analysis Report"
                onPress={() =>
                  navigation?.navigate('Analysis', {
                    companyId: company._id,
                    symbol: company.symbol,
                  })
                }
                variant="primary"
                size="md"
                style={styles.actionBtn}
              />
              <Button
                title="⚖️ Run Scenario Simulation"
                onPress={() =>
                  navigation?.navigate('Scenarios', {
                    companyId: company._id,
                    companyName: company.companyName,
                    symbol: company.symbol,
                    sharePrice: company.sharePrice,
                  })
                }
                variant="outline"
                size="md"
                style={styles.actionBtn}
              />
            </View>

            {/* 4. Core Financial Metrics */}
            <Text style={styles.sectionHeader}>Key Financial Metrics</Text>
            <Card variant="default" style={styles.metricsCard}>
              <View style={styles.metricGrid}>
                <MetricBadge
                  label="Market Cap"
                  value={company.marketCap}
                  unit="Cr"
                  status="accent"
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="Free Cash Flow"
                  value={company.financialMetrics?.freeCashFlow}
                  unit="Cr"
                  status={
                    company.financialMetrics?.freeCashFlow &&
                    company.financialMetrics.freeCashFlow > 0
                      ? 'positive'
                      : 'neutral'
                  }
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.metricGrid}>
                <MetricBadge
                  label="ROE"
                  value={company.financialMetrics?.roe}
                  unit="%"
                  status={
                    company.financialMetrics?.roe &&
                    company.financialMetrics.roe > 15
                      ? 'positive'
                      : 'neutral'
                  }
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="ROCE"
                  value={company.financialMetrics?.roce}
                  unit="%"
                  status="positive"
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.metricGrid}>
                <MetricBadge
                  label="Debt to Equity"
                  value={company.financialMetrics?.debtToEquity}
                  status={
                    company.financialMetrics?.debtToEquity &&
                    company.financialMetrics.debtToEquity > 1.5
                      ? 'negative'
                      : 'neutral'
                  }
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="P/E Ratio"
                  value={company.financialMetrics?.peRatio}
                  style={{ flex: 1 }}
                />
              </View>

              {/* Extended Metrics if available */}
              {(company.financialMetrics?.bookValue !== undefined ||
                company.financialMetrics?.dividendYield !== undefined ||
                company.financialMetrics?.opm !== undefined ||
                company.financialMetrics?.eps !== undefined) && (
                <>
                  <View style={styles.metricGrid}>
                    <MetricBadge
                      label="Book Value"
                      value={company.financialMetrics?.bookValue}
                      unit="₹"
                      style={{ flex: 1 }}
                    />
                    <MetricBadge
                      label="Dividend Yield"
                      value={company.financialMetrics?.dividendYield}
                      unit="%"
                      status={
                        company.financialMetrics?.dividendYield &&
                        company.financialMetrics.dividendYield > 1.5
                          ? 'positive'
                          : 'neutral'
                      }
                      style={{ flex: 1 }}
                    />
                  </View>

                  <View style={styles.metricGrid}>
                    <MetricBadge
                      label="OPM"
                      value={company.financialMetrics?.opm}
                      unit="%"
                      status={
                        company.financialMetrics?.opm &&
                        company.financialMetrics.opm > 15
                          ? 'positive'
                          : 'neutral'
                      }
                      style={{ flex: 1 }}
                    />
                    <MetricBadge
                      label="EPS"
                      value={company.financialMetrics?.eps}
                      unit="₹"
                      style={{ flex: 1 }}
                    />
                  </View>
                </>
              )}
            </Card>

            {/* 5. AI Assistant Quick Entry */}
            <Card variant="accent" style={styles.aiBanner}>
              <Text style={styles.aiBannerTitle}>
                🤖 Have questions about {company.symbol}?
              </Text>
              <Text style={styles.aiBannerBody}>
                Ask our AI assistant to explain this company's debt levels, cash
                flow generation, or valuation in simple language.
              </Text>
              <Button
                title={`Ask AI About ${company.symbol}`}
                onPress={() =>
                  navigation?.navigate('Chat', {
                    companyId: company._id,
                    companyName: company.companyName,
                    symbol: company.symbol,
                  })
                }
                variant="secondary"
                size="sm"
                style={{ marginTop: 8 }}
              />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  scroll: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  symbolText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3B82F6',
  },
  nameText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 2,
  },
  sectorText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sourceText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  rangeBox: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
  },
  rangeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rangeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  rangePositionText: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '600',
  },
  rangeValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeVal: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  rangeBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  rangeBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  riskProfitCard: {
    marginBottom: 16,
    padding: 16,
  },
  riskProfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskCol: {
    flex: 1,
    alignItems: 'center',
  },
  profitCol: {
    flex: 1,
    alignItems: 'center',
  },
  riskDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#374151',
    marginHorizontal: 8,
  },
  metricCardLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  riskBigText: {
    fontSize: 22,
    fontWeight: '800',
  },
  profitBigText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
  profitSubText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  pillLow: {
    backgroundColor: '#064E3B',
  },
  pillMod: {
    backgroundColor: '#78350F',
  },
  pillHigh: {
    backgroundColor: '#7F1D1D',
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  meterContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  meterTrack: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  meterLabelText: {
    fontSize: 9,
    color: '#6B7280',
  },
  riskContextNote: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    fontStyle: 'italic',
    marginTop: 4,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  buyBtn: {
    backgroundColor: '#0D231A',
    borderColor: '#059669',
  },
  sellBtn: {
    backgroundColor: '#261214',
    borderColor: '#DC2626',
  },
  decisionBtnIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  decisionBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  decisionBtnSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionRow: {
    marginBottom: 16,
  },
  actionBtn: {
    marginBottom: 8,
  },
  metricsCard: {
    marginBottom: 16,
  },
  metricGrid: {
    flexDirection: 'row',
  },
  aiBanner: {
    marginTop: 4,
    marginBottom: 24,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#93C5FD',
    marginBottom: 4,
  },
  aiBannerBody: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
    marginBottom: 8,
  },
});
