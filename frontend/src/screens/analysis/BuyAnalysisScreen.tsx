import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {
  Card,
  Button,
  Header,
  MetricBadge,
  LoadingSkeleton,
  ErrorMessage,
} from '../../components/common';
import { useAnalysisStore } from '../../stores/useAnalysisStore';

interface BuyAnalysisScreenProps {
  route?: {
    params?: {
      companyId?: string;
      symbol?: string;
      companyName?: string;
    };
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

export const BuyAnalysisScreen: React.FC<BuyAnalysisScreenProps> = ({
  route,
  navigation,
}) => {
  const companyId = route?.params?.companyId || '';
  const initialSymbol = route?.params?.symbol || '';
  const initialName = route?.params?.companyName || '';

  const { buyAnalysis, isBuyLoading, buyError, fetchBuyAnalysis } =
    useAnalysisStore();

  const [investmentAmount, setInvestmentAmount] = useState<string>('25000');
  const [investmentDuration, setInvestmentDuration] = useState<string>('3 years');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async (amount?: number, duration?: string) => {
    if (!companyId) return;
    await fetchBuyAnalysis({
      companyId,
      investmentAmount: amount ?? (parseFloat(investmentAmount) || undefined),
      investmentDuration: duration ?? investmentDuration,
    });
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRecalculate = () => {
    const num = parseFloat(investmentAmount);
    loadData(isNaN(num) || num <= 0 ? undefined : num, investmentDuration);
  };

  const data = buyAnalysis;
  const symbol = data?.stockSymbol || initialSymbol || 'Stock';
  const name = data?.companyName || initialName || 'Company Analysis';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={`${symbol} · Buy Analysis`}
        subtitle="AI-Powered Fundamental & Valuation Evaluation"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {isBuyLoading && !data ? (
          <LoadingSkeleton message="Synthesizing buy-side financial data & RAG context..." count={5} />
        ) : buyError && !data ? (
          <ErrorMessage message={buyError} onRetry={loadData} />
        ) : data ? (
          <>
            {/* 1. Header & Live Price Card */}
            <Card variant="elevated" style={styles.topCard}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeText}>BUY-SIDE REPORT</Text>
                  <Text style={styles.companyTitle}>{data.companyName}</Text>
                  <Text style={styles.symbolSub}>{data.stockSymbol}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Current Price</Text>
                  <Text style={styles.priceValue}>
                    {data.latestAvailablePrice !== null
                      ? `₹${data.latestAvailablePrice.toLocaleString('en-IN')}`
                      : 'N/A'}
                  </Text>
                  <Text style={styles.timestampText}>
                    Updated {new Date(data.dataTimestamp).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* 52-Week Range Bar */}
              {data.historicalPerformance.high52Week && data.historicalPerformance.low52Week ? (
                <View style={styles.rangeBox}>
                  <View style={styles.rangeLabelRow}>
                    <Text style={styles.rangeTitle}>52-Week Trading Range</Text>
                    <Text style={styles.rangePosition}>
                      {data.historicalPerformance.currentRangePositionPercent !== null
                        ? `${data.historicalPerformance.currentRangePositionPercent}% of range`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.rangeTrack}>
                    <View
                      style={[
                        styles.rangeFill,
                        {
                          width: `${Math.min(
                            Math.max(
                              data.historicalPerformance.currentRangePositionPercent || 50,
                              5
                            ),
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.rangeValuesRow}>
                    <Text style={styles.rangeVal}>₹{data.historicalPerformance.low52Week}</Text>
                    <Text style={styles.rangeVal}>₹{data.historicalPerformance.high52Week}</Text>
                  </View>
                </View>
              ) : null}
            </Card>

            {/* 2. Scenario / Custom Investment Input */}
            <Card variant="default" style={styles.inputCard}>
              <Text style={styles.sectionHeader}>Hypothetical Investment Simulator</Text>
              <Text style={styles.subtext}>
                Model whole-share allocations and simulated price changes.
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Budget (₹ INR)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={investmentAmount}
                    onChangeText={setInvestmentAmount}
                    keyboardType="numeric"
                    placeholder="e.g. 25000"
                    placeholderTextColor="#6B7280"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Horizon</Text>
                  <TextInput
                    style={styles.textInput}
                    value={investmentDuration}
                    onChangeText={setInvestmentDuration}
                    placeholder="e.g. 3 years"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>

              <Button
                title={isBuyLoading ? 'Recalculating...' : 'Update Scenarios'}
                onPress={handleRecalculate}
                variant="primary"
                size="sm"
                loading={isBuyLoading}
                style={{ marginTop: 12 }}
              />
            </Card>

            {/* 3. User Budget Context (if available) */}
            {data.budgetContext ? (
              <Card variant="default" style={styles.budgetCard}>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletIcon}>💼</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.budgetTitle}>Monthly Budget Context</Text>
                    <Text style={styles.budgetText}>{data.budgetContext.note}</Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* 4. AI-Generated Narrative Explanation */}
            <Card variant="elevated" style={styles.aiCard}>
              <View style={styles.aiHeaderRow}>
                <Text style={styles.aiHeaderIcon}>🤖</Text>
                <Text style={styles.aiHeaderTitle}>InvestIQ AI Synthesis</Text>
              </View>
              <Text style={styles.aiExplanation}>{data.aiGeneratedExplanation}</Text>
            </Card>

            {/* 5. Financial Strengths (Reasons to consider) */}
            <Text style={styles.sectionTitle}>Key Fundamental Strengths</Text>
            <Card variant="default" style={styles.sectionCard}>
              {data.financialStrengths.map((str, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.strengthIcon}>✓</Text>
                  <Text style={styles.bulletText}>{str}</Text>
                </View>
              ))}
            </Card>

            {/* 6. Valuation Analysis */}
            <Text style={styles.sectionTitle}>Valuation Multiples</Text>
            <Card variant="default" style={styles.sectionCard}>
              <View style={styles.metricGrid}>
                <MetricBadge
                  label="P/E Ratio"
                  value={data.valuationAnalysis.peRatio}
                  period={data.valuationAnalysis.reportingPeriod}
                  status={
                    data.valuationAnalysis.peRatio && data.valuationAnalysis.peRatio < 35
                      ? 'positive'
                      : 'neutral'
                  }
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="P/B Ratio"
                  value={data.valuationAnalysis.pbRatio}
                  status="neutral"
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="EV/EBITDA"
                  value={data.valuationAnalysis.evToEbitda}
                  status="neutral"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>

            {/* 7. Profitability & Growth */}
            <Text style={styles.sectionTitle}>Profitability & Growth Trends</Text>
            <Card variant="default" style={styles.sectionCard}>
              <View style={styles.metricGrid}>
                <MetricBadge
                  label="YoY Revenue Growth"
                  value={data.profitabilityAnalysis.revenueGrowthYoY}
                  unit="%"
                  period={data.profitabilityAnalysis.reportingPeriod}
                  status={
                    data.profitabilityAnalysis.revenueGrowthYoY &&
                    data.profitabilityAnalysis.revenueGrowthYoY > 0
                      ? 'positive'
                      : 'negative'
                  }
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="Net Profit Margin"
                  value={data.profitabilityAnalysis.netProfitMargin}
                  unit="%"
                  status={
                    data.profitabilityAnalysis.netProfitMargin &&
                    data.profitabilityAnalysis.netProfitMargin > 10
                      ? 'positive'
                      : 'neutral'
                  }
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="OPM"
                  value={data.profitabilityAnalysis.operatingProfitMargin}
                  unit="%"
                  status="accent"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>

            {/* 8. Hypothetical Investment Scenarios */}
            {data.hypotheticalScenarios && data.hypotheticalScenarios.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Hypothetical Price Movement Scenarios</Text>
                <Card variant="default" style={styles.sectionCard}>
                  {data.hypotheticalScenarios.map((sc, i) => {
                    const isPositive = sc.projectedProfitLoss >= 0;
                    return (
                      <View key={i} style={styles.scenarioRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.scenarioName}>{sc.scenarioName}</Text>
                          <Text style={styles.scenarioMeta}>
                            {sc.purchasableShares} shares @ ₹{sc.projectedPrice} + ₹{sc.unallocatedCash} cash
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.scenarioValue}>
                            ₹{sc.projectedValue.toLocaleString('en-IN')}
                          </Text>
                          <Text
                            style={[
                              styles.scenarioPnl,
                              isPositive ? styles.textPositive : styles.textNegative,
                            ]}
                          >
                            {isPositive ? '+' : ''}₹{sc.projectedProfitLoss.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}

            {/* 9. Potential Financial Risks */}
            <Text style={styles.sectionTitle}>Identified Financial Risks</Text>
            <Card variant="default" style={styles.riskCard}>
              {data.financialRisks.map((risk, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.riskIcon}>⚠️</Text>
                  <Text style={styles.bulletText}>{risk}</Text>
                </View>
              ))}
            </Card>

            {/* 10. Key Assumptions & Sources */}
            <Card variant="default" style={styles.sourceCard}>
              <Text style={styles.sourceTitle}>Data Sources & Key Assumptions</Text>
              {data.dataSources.map((src, i) => (
                <Text key={i} style={styles.sourceItem}>• Source: {src}</Text>
              ))}
              {data.keyAssumptions.map((asm, i) => (
                <Text key={`a-${i}`} style={styles.sourceItem}>• {asm}</Text>
              ))}
            </Card>

            {/* 11. Mandatory Regulatory Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>{data.disclaimer}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  topCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1,
    marginBottom: 4,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  symbolSub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
  timestampText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  rangeBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  rangeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rangeTitle: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  rangePosition: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '700',
  },
  rangeTrack: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rangeFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  rangeValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeVal: {
    fontSize: 11,
    color: '#6B7280',
  },
  inputCard: {
    marginBottom: 16,
    backgroundColor: '#111827',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  subtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#1E293B',
    color: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  budgetCard: {
    marginBottom: 16,
    backgroundColor: '#132338',
    borderColor: '#1D4ED8',
    borderWidth: 1,
  },
  budgetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 2,
  },
  budgetText: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  aiCard: {
    backgroundColor: '#0F172A',
    borderColor: '#2563EB',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  aiHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60A5FA',
  },
  aiExplanation: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    marginBottom: 16,
    backgroundColor: '#111827',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  strengthIcon: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  riskIcon: {
    fontSize: 13,
    marginRight: 8,
    marginTop: 1,
  },
  bulletIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  bulletText: {
    fontSize: 13,
    color: '#D1D5DB',
    flex: 1,
    lineHeight: 18,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  scenarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  scenarioName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  scenarioMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  scenarioValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  scenarioPnl: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  textPositive: {
    color: '#10B981',
  },
  textNegative: {
    color: '#EF4444',
  },
  riskCard: {
    backgroundColor: '#1C1318',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    marginBottom: 16,
  },
  sourceCard: {
    backgroundColor: '#111827',
    marginBottom: 16,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sourceItem: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 16,
  },
  disclaimerBox: {
    padding: 12,
    backgroundColor: '#0F1318',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
