import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  const insets = useSafeAreaInsets();
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

  const renderCleanAiSynthesis = (rawText: string) => {
    if (!rawText) return null;
    const cleaned = rawText
      .replace(/^#+\s*/gm, '')
      .replace(/^---\s*.*$/gm, '')
      .trim();

    const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim().length > 0);

    return (
      <View style={styles.aiBodyContainer}>
        {paragraphs.map((p, idx) => {
          const trimmed = p.trim();
          const colonIdx = trimmed.indexOf(':');
          const isHeader =
            colonIdx > 0 &&
            colonIdx < 45 &&
            !trimmed.slice(0, colonIdx).includes('\n');
          if (isHeader) {
            const title = trimmed.slice(0, colonIdx + 1).replace(/\*\*/g, '');
            const body = trimmed.slice(colonIdx + 1).replace(/\*\*/g, '').trim();
            return (
              <View key={idx} style={styles.aiSectionBlock}>
                <Text style={styles.aiSectionHeading}>{title}</Text>
                {body ? <Text style={styles.aiExplanation}>{body}</Text> : null}
              </View>
            );
          }

          return (
            <Text key={idx} style={styles.aiExplanation}>
              {trimmed.replace(/\*\*/g, '')}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={`${symbol} · Buy Analysis`}
        subtitle="AI-Powered Fundamental & Valuation Evaluation"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 20) + 36 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
                <View>
                  <Text style={styles.aiHeaderTitle}>InvestIQ AI Synthesis</Text>
                  <Text style={styles.aiHeaderSubtitle}>Executive Financial Evaluation</Text>
                </View>
              </View>
              {renderCleanAiSynthesis(data.aiGeneratedExplanation)}
            </Card>

            {/* 5. Geopolitical & War Conflict Impact Assessment */}
            {data.geopoliticalWarImpact ? (
              <Card variant="elevated" style={styles.warCard}>
                <View style={styles.warHeaderRow}>
                  <View style={styles.warTitleRow}>
                    <Text style={styles.warHeaderIcon}>⚔️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.warHeaderTitle}>Geopolitical & War Impact Analysis</Text>
                      <Text style={styles.warHeaderSub}>Conflict Sensitivity & Macro Transmission</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.warBadge,
                      data.geopoliticalWarImpact.vulnerabilityLevel === 'BENEFICIARY'
                        ? styles.warBadgeBeneficiary
                        : data.geopoliticalWarImpact.vulnerabilityLevel === 'RESILIENT'
                        ? styles.warBadgeResilient
                        : data.geopoliticalWarImpact.vulnerabilityLevel === 'MODERATE IMPACT'
                        ? styles.warBadgeModerate
                        : styles.warBadgeHigh,
                    ]}
                  >
                    <Text
                      style={[
                        styles.warBadgeText,
                        data.geopoliticalWarImpact.vulnerabilityLevel === 'BENEFICIARY'
                          ? styles.warBadgeTextBeneficiary
                          : data.geopoliticalWarImpact.vulnerabilityLevel === 'RESILIENT'
                          ? styles.warBadgeTextResilient
                          : data.geopoliticalWarImpact.vulnerabilityLevel === 'MODERATE IMPACT'
                          ? styles.warBadgeTextModerate
                          : styles.warBadgeTextHigh,
                      ]}
                    >
                      {data.geopoliticalWarImpact.vulnerabilityLevel}
                    </Text>
                  </View>
                </View>

                {/* War Risk Percentage Meter */}
                {data.geopoliticalWarImpact.warRiskPercentage !== undefined ? (
                  <View style={styles.warRiskGaugeContainer}>
                    <View style={styles.warRiskGaugeTopRow}>
                      <Text style={styles.warRiskGaugeLabel}>Calculated War Risk Exposure</Text>
                      <Text
                        style={[
                          styles.warRiskGaugeValue,
                          data.geopoliticalWarImpact.warRiskPercentage <= 25
                            ? { color: '#10B981' }
                            : data.geopoliticalWarImpact.warRiskPercentage <= 60
                            ? { color: '#F59E0B' }
                            : { color: '#EF4444' },
                        ]}
                      >
                        {data.geopoliticalWarImpact.warRiskPercentage}%
                      </Text>
                    </View>
                    <View style={styles.gaugeTrack}>
                      <View
                        style={[
                          styles.gaugeFill,
                          {
                            width: `${Math.min(Math.max(data.geopoliticalWarImpact.warRiskPercentage, 5), 100)}%`,
                            backgroundColor:
                              data.geopoliticalWarImpact.warRiskPercentage <= 25
                                ? '#10B981'
                                : data.geopoliticalWarImpact.warRiskPercentage <= 60
                                ? '#F59E0B'
                                : '#EF4444',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.gaugeScaleRow}>
                      <Text style={styles.gaugeScaleText}>0% (Shielded)</Text>
                      <Text style={styles.gaugeScaleText}>50% (Moderate)</Text>
                      <Text style={styles.gaugeScaleText}>100% (High Exposure)</Text>
                    </View>
                  </View>
                ) : null}

                {/* Primary War Risk Reason */}
                {data.geopoliticalWarImpact.primaryRiskReason ? (
                  <View style={styles.warReasonBox}>
                    <Text style={styles.warReasonTitle}>🎯 Core Conflict Transmission Reason:</Text>
                    <Text style={styles.warReasonText}>
                      {data.geopoliticalWarImpact.primaryRiskReason}
                    </Text>
                  </View>
                ) : null}

                {/* Quantified Factors Breakdown */}
                {data.geopoliticalWarImpact.warRiskFactors &&
                data.geopoliticalWarImpact.warRiskFactors.length > 0 ? (
                  <View style={styles.warFactorsContainer}>
                    <Text style={styles.warFactorsHeading}>Quantified Impact Drivers</Text>
                    {data.geopoliticalWarImpact.warRiskFactors.map((factor, fIdx) => (
                      <View key={fIdx} style={styles.warFactorRow}>
                        <View style={styles.warFactorLeft}>
                          <Text style={styles.warFactorDot}>•</Text>
                          <Text style={styles.warFactorName}>{factor.factor}</Text>
                        </View>
                        <View
                          style={[
                            styles.warFactorWeightPill,
                            factor.direction === 'RISK_INCREASE'
                              ? styles.warFactorWeightNeg
                              : styles.warFactorWeightPos,
                          ]}
                        >
                          <Text
                            style={[
                              styles.warFactorWeightText,
                              factor.direction === 'RISK_INCREASE'
                                ? styles.warFactorWeightTextNeg
                                : styles.warFactorWeightTextPos,
                            ]}
                          >
                            {factor.weightPercentage > 0 ? `+${factor.weightPercentage}%` : `${factor.weightPercentage}%`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.warSummaryText}>{data.geopoliticalWarImpact.summary}</Text>

                {/* 3 Macro Pillars */}
                <View style={styles.warPillarsCol}>
                  <View style={styles.warPillarBox}>
                    <View style={styles.warPillarHeader}>
                      <Text style={styles.warPillarEmoji}>🛢️</Text>
                      <Text style={styles.warPillarTitle}>Crude Oil & Energy Transmission</Text>
                    </View>
                    <Text style={styles.warPillarBody}>
                      {data.geopoliticalWarImpact.crudeAndEnergyImpact}
                    </Text>
                  </View>

                  <View style={styles.warPillarBox}>
                    <View style={styles.warPillarHeader}>
                      <Text style={styles.warPillarEmoji}>💱</Text>
                      <Text style={styles.warPillarTitle}>Currency & Rupee (USD/INR) Dynamics</Text>
                    </View>
                    <Text style={styles.warPillarBody}>
                      {data.geopoliticalWarImpact.currencyAndForexImpact}
                    </Text>
                  </View>

                  <View style={styles.warPillarBox}>
                    <View style={styles.warPillarHeader}>
                      <Text style={styles.warPillarEmoji}>🚢</Text>
                      <Text style={styles.warPillarTitle}>Maritime Routes & Input Inflation</Text>
                    </View>
                    <Text style={styles.warPillarBody}>
                      {data.geopoliticalWarImpact.supplyChainAndInflationImpact}
                    </Text>
                  </View>
                </View>

                {data.geopoliticalWarImpact.defenseOrGovernmentCatalyst ? (
                  <View style={styles.warGovBox}>
                    <Text style={styles.warGovTitle}>🛡️ Sovereign / Strategic Catalyst:</Text>
                    <Text style={styles.warGovText}>
                      {data.geopoliticalWarImpact.defenseOrGovernmentCatalyst}
                    </Text>
                  </View>
                ) : null}

                {/* Vulnerabilities & Mitigations */}
                <View style={styles.warSplitGrid}>
                  <View style={styles.warSplitCol}>
                    <Text style={styles.warSubheading}>⚠️ Conflict Vulnerabilities</Text>
                    {data.geopoliticalWarImpact.keyVulnerabilities.map((v, i) => (
                      <View key={i} style={styles.warBulletRow}>
                        <Text style={styles.warBulletIconWarn}>•</Text>
                        <Text style={styles.warBulletTextWarn}>{v}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.warSplitCol}>
                    <Text style={styles.warSubheading}>🛡️ Strategic Mitigations</Text>
                    {data.geopoliticalWarImpact.strategicMitigations.map((m, i) => (
                      <View key={i} style={styles.warBulletRow}>
                        <Text style={styles.warBulletIconShield}>✓</Text>
                        <Text style={styles.warBulletTextShield}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>
            ) : null}

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
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
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
    marginBottom: 12,
  },
  aiHeaderIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  aiHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#60A5FA',
  },
  aiHeaderSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  aiBodyContainer: {
    gap: 10,
  },
  aiSectionBlock: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    marginBottom: 4,
  },
  aiSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aiExplanation: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  warCard: {
    backgroundColor: '#0E1726',
    borderColor: '#374151',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  warHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  warHeaderIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  warHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  warHeaderSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  warBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  warBadgeBeneficiary: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  warBadgeResilient: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  warBadgeModerate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warBadgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  warBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  warBadgeTextBeneficiary: {
    color: '#34D399',
  },
  warBadgeTextResilient: {
    color: '#60A5FA',
  },
  warBadgeTextModerate: {
    color: '#FBBF24',
  },
  warBadgeTextHigh: {
    color: '#F87171',
  },
  warSummaryText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 14,
  },
  warPillarsCol: {
    gap: 8,
    marginBottom: 12,
  },
  warPillarBox: {
    backgroundColor: '#162235',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  warPillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warPillarEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  warPillarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  warPillarBody: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 17,
  },
  warGovBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  warGovTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 2,
  },
  warGovText: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 17,
  },
  warSplitGrid: {
    marginTop: 4,
    gap: 10,
  },
  warSplitCol: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 10,
  },
  warSubheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  warBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  warBulletIconWarn: {
    color: '#F59E0B',
    fontSize: 14,
    marginRight: 6,
    lineHeight: 16,
  },
  warBulletTextWarn: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
    flex: 1,
  },
  warBulletIconShield: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 6,
    lineHeight: 16,
  },
  warBulletTextShield: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
    flex: 1,
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
  warRiskGaugeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  warRiskGaugeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  warRiskGaugeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  warRiskGaugeValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  gaugeTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    marginBottom: 6,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeScaleText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  warReasonBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  warReasonTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
    marginBottom: 4,
  },
  warReasonText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  warFactorsContainer: {
    marginBottom: 10,
    gap: 6,
  },
  warFactorsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  warFactorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  warFactorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  warFactorDot: {
    fontSize: 12,
    color: '#64748B',
  },
  warFactorName: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
  },
  warFactorWeightPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warFactorWeightNeg: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  warFactorWeightPos: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  warFactorWeightText: {
    fontSize: 11,
    fontWeight: '700',
  },
  warFactorWeightTextNeg: {
    color: '#F87171',
  },
  warFactorWeightTextPos: {
    color: '#34D399',
  },
});
