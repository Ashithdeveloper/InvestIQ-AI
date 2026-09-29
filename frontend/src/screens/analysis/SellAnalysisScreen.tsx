import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
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

interface SellAnalysisScreenProps {
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

export const SellAnalysisScreen: React.FC<SellAnalysisScreenProps> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const companyId = route?.params?.companyId || '';
  const initialSymbol = route?.params?.symbol || '';
  const initialName = route?.params?.companyName || '';

  const { sellAnalysis, isSellLoading, sellError, fetchSellAnalysis } =
    useAnalysisStore();

  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [quantityHeld, setQuantityHeld] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async (price?: number, quantity?: number) => {
    if (!companyId) return;

    const parsedPrice = price !== undefined ? price : parseFloat(purchasePrice);
    const parsedQty = quantity !== undefined ? quantity : parseInt(quantityHeld, 10);

    await fetchSellAnalysis({
      companyId,
      purchasePrice: !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
      quantityHeld: !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : undefined,
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

  const handleCalculatePnl = () => {
    const p = parseFloat(purchasePrice);
    const q = parseInt(quantityHeld, 10);
    loadData(
      !isNaN(p) && p > 0 ? p : undefined,
      !isNaN(q) && q > 0 ? q : undefined
    );
  };

  const data = sellAnalysis;
  const symbol = data?.stockSymbol || initialSymbol || 'Stock';
  const name = data?.companyName || initialName || 'Company Analysis';
  const pnl = data?.hypotheticalProfitLoss;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={`${symbol} · Sell & Hold Analysis`}
        subtitle="Deterioration Metrics, Valuation Risks & P&L"
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
            tintColor="#EF4444"
          />
        }
      >

        {isSellLoading && !data ? (
          <LoadingSkeleton message="Evaluating balance sheet risks, debt & sell indicators..." count={5} />
        ) : sellError && !data ? (
          <ErrorMessage message={sellError} onRetry={loadData} />
        ) : data ? (
          <>
            {/* 1. Header & Live Price Card */}
            <Card variant="elevated" style={styles.topCard}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeText}>SELL-SIDE EVALUATION</Text>
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
              {data.historicalPriceMovement.high52Week && data.historicalPriceMovement.low52Week ? (
                <View style={styles.rangeBox}>
                  <View style={styles.rangeLabelRow}>
                    <Text style={styles.rangeTitle}>52-Week Price Spectrum</Text>
                    <Text style={styles.rangePosition}>
                      {data.historicalPriceMovement.currentPositionPercent !== null
                        ? `${data.historicalPriceMovement.currentPositionPercent}% of range`
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
                              data.historicalPriceMovement.currentPositionPercent || 50,
                              5
                            ),
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.rangeValuesRow}>
                    <Text style={styles.rangeVal}>₹{data.historicalPriceMovement.low52Week}</Text>
                    <Text style={styles.rangeVal}>₹{data.historicalPriceMovement.high52Week}</Text>
                  </View>
                </View>
              ) : null}
            </Card>

            {/* 2. Portfolio Holding & P&L Calculator */}
            <Card variant="default" style={styles.inputCard}>
              <Text style={styles.sectionHeader}>Your Holding & P&L Evaluator</Text>
              <Text style={styles.subtext}>
                Enter your average buy price and share quantity to model real-time unrealized gains or losses.
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Purchase Price (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="numeric"
                    placeholder="e.g. 3500"
                    placeholderTextColor="#6B7280"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Quantity (Shares)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={quantityHeld}
                    onChangeText={setQuantityHeld}
                    keyboardType="numeric"
                    placeholder="e.g. 10"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>

              <Button
                title={isSellLoading ? 'Calculating...' : 'Compute P&L'}
                onPress={handleCalculatePnl}
                variant="outline"
                size="sm"
                loading={isSellLoading}
                style={{ marginTop: 12 }}
              />
            </Card>

            {/* 3. Hypothetical Profit / Loss Outcome Card */}
            {pnl ? (
              <Card
                variant="elevated"
                style={[
                  styles.pnlCard,
                  pnl.status === 'PROFIT'
                    ? styles.borderProfit
                    : pnl.status === 'LOSS'
                    ? styles.borderLoss
                    : styles.borderNeutral,
                ]}
              >
                <View style={styles.pnlHeaderRow}>
                  <View>
                    <Text style={styles.pnlTitle}>Position Performance</Text>
                    <Text style={styles.pnlSub}>
                      {pnl.quantityHeld} share(s) @ avg ₹{pnl.purchasePrice}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      pnl.status === 'PROFIT'
                        ? styles.bgProfit
                        : pnl.status === 'LOSS'
                        ? styles.bgLoss
                        : styles.bgNeutral,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{pnl.status}</Text>
                  </View>
                </View>

                <View style={styles.pnlGrid}>
                  <View style={styles.pnlCol}>
                    <Text style={styles.pnlLabel}>Total Invested</Text>
                    <Text style={styles.pnlVal}>₹{pnl.investedAmount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.pnlCol}>
                    <Text style={styles.pnlLabel}>Current Value</Text>
                    <Text style={styles.pnlVal}>₹{pnl.currentValue.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.pnlCol}>
                    <Text style={styles.pnlLabel}>Unrealized P&L</Text>
                    <Text
                      style={[
                        styles.pnlValHighlight,
                        pnl.status === 'PROFIT'
                          ? styles.textPositive
                          : pnl.status === 'LOSS'
                          ? styles.textNegative
                          : styles.textNeutral,
                      ]}
                    >
                      {pnl.profitLoss >= 0 ? '+' : ''}₹{pnl.profitLoss.toLocaleString('en-IN')} (
                      {pnl.profitLossPercent >= 0 ? '+' : ''}
                      {pnl.profitLossPercent}%)
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* 4. AI-Generated Sell / Hold Narrative Explanation */}
            <Card variant="elevated" style={styles.aiCard}>
              <View style={styles.aiHeaderRow}>
                <Text style={styles.aiHeaderIcon}>🤖</Text>
                <Text style={styles.aiHeaderTitle}>InvestIQ AI Sell-Side Assessment</Text>
              </View>
              <Text style={styles.aiExplanation}>{data.aiGeneratedExplanation}</Text>
            </Card>

            {/* 5. Performance Changes */}
            {data.financialPerformanceChanges && data.financialPerformanceChanges.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Financial Performance Trajectory</Text>
                <Card variant="default" style={styles.sectionCard}>
                  {data.financialPerformanceChanges.map((change, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={styles.bulletIconDot}>•</Text>
                      <Text style={styles.bulletText}>{change}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {/* 6. Cash Flow & Debt Health */}
            <Text style={styles.sectionTitle}>Cash Flow & Leverage Health</Text>
            <Card variant="default" style={styles.sectionCard}>
              <View style={styles.healthRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.healthLabel}>Free Cash Flow</Text>
                  <Text style={styles.healthValue}>
                    {data.cashFlowAnalysis.freeCashFlow !== null
                      ? `₹${data.cashFlowAnalysis.freeCashFlow.toLocaleString('en-IN')} Cr`
                      : 'N/A'}
                  </Text>
                  <Text style={styles.healthStatus}>{data.cashFlowAnalysis.status}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.healthLabel}>Debt-to-Equity</Text>
                  <Text style={styles.healthValue}>
                    {data.debtAnalysis.debtToEquity !== null
                      ? `${data.debtAnalysis.debtToEquity}`
                      : 'N/A'}
                  </Text>
                  <Text style={styles.healthStatus}>{data.debtAnalysis.leverageRisk}</Text>
                </View>
              </View>
            </Card>

            {/* 7. Valuation Multiples & Risk */}
            <Text style={styles.sectionTitle}>Valuation Considerations</Text>
            <Card variant="default" style={styles.sectionCard}>
              <View style={styles.metricGrid}>
                <MetricBadge
                  label="P/E Ratio"
                  value={data.valuationConsiderations.peRatio}
                  status="neutral"
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="P/B Ratio"
                  value={data.valuationConsiderations.pbRatio}
                  status="neutral"
                  style={{ flex: 1 }}
                />
              </View>
              <Text style={styles.valuationEvalText}>
                {data.valuationConsiderations.evaluation}
              </Text>
            </Card>

            {/* 8. Potential Financial Risks */}
            <Text style={styles.sectionTitle}>Identified Sell-Side / Deterioration Risks</Text>
            <Card variant="default" style={styles.riskCard}>
              {data.potentialFinancialRisks.map((risk, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.riskIcon}>⚠️</Text>
                  <Text style={styles.bulletText}>{risk}</Text>
                </View>
              ))}
            </Card>

            {/* 9. Counterbalancing Reasons to Hold */}
            <Text style={styles.sectionTitle}>Reasons to Maintain Hold Position</Text>
            <Card variant="default" style={styles.holdCard}>
              {data.reasonsToHold.map((reason, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.holdIcon}>🛡️</Text>
                  <Text style={styles.bulletText}>{reason}</Text>
                </View>
              ))}
            </Card>

            {/* 10. Data Sources */}
            <Card variant="default" style={styles.sourceCard}>
              <Text style={styles.sourceTitle}>Source Information</Text>
              {data.sourceInformation.map((src, i) => (
                <Text key={i} style={styles.sourceItem}>• {src}</Text>
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
    color: '#F87171',
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
    color: '#F9FAFB',
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
    color: '#F87171',
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
    backgroundColor: '#F87171',
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
  pnlCard: {
    backgroundColor: '#131B26',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  borderProfit: {
    borderColor: '#10B981',
  },
  borderLoss: {
    borderColor: '#EF4444',
  },
  borderNeutral: {
    borderColor: '#4B5563',
  },
  pnlHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pnlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  pnlSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bgProfit: {
    backgroundColor: '#065F46',
  },
  bgLoss: {
    backgroundColor: '#7F1D1D',
  },
  bgNeutral: {
    backgroundColor: '#374151',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pnlGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  pnlCol: {
    flex: 1,
  },
  pnlLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pnlVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  pnlValHighlight: {
    fontSize: 14,
    fontWeight: '800',
  },
  aiCard: {
    backgroundColor: '#1C151B',
    borderColor: '#DC2626',
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
    color: '#FCA5A5',
  },
  aiExplanation: {
    fontSize: 13,
    color: '#F3F4F6',
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
  bulletIconDot: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 16,
    marginRight: 8,
    marginTop: -2,
  },
  riskIcon: {
    fontSize: 13,
    marginRight: 8,
    marginTop: 1,
  },
  holdIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 13,
    color: '#D1D5DB',
    flex: 1,
    lineHeight: 18,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  healthStatus: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  valuationEvalText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  riskCard: {
    backgroundColor: '#1C1318',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    marginBottom: 16,
  },
  holdCard: {
    backgroundColor: '#13211D',
    borderColor: '#065F46',
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
  textPositive: {
    color: '#10B981',
  },
  textNegative: {
    color: '#EF4444',
  },
  textNeutral: {
    color: '#9CA3AF',
  },
});
