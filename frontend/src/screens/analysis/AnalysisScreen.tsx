import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Button,
  Header,
  MetricBadge,
  LoadingSkeleton,
  ErrorMessage,
  EmptyState,
} from '../../components/common';
import { useAnalysisStore } from '../../stores/useAnalysisStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useCompanyStore } from '../../stores/useCompanyStore';

interface AnalysisScreenProps {
  route?: {
    params?: {
      companyId?: string;
      symbol?: string;
    };
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack?: () => void;
  };
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  route,
  navigation,
}) => {
  const { companies, fetchCompanies } = useCompanyStore();
  const { analysis, fetchAnalysis, isLoading, error } = useAnalysisStore();
  const {
    selectedPersonalizedAnalysis,
    fetchCompanyPersonalizedAnalysis,
    isAnalyzing,
  } = useDashboardStore();

  const [companyId, setCompanyId] = useState<string>(
    route?.params?.companyId || ''
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, []);

  useEffect(() => {
    if (route?.params?.companyId) {
      setCompanyId(route.params.companyId);
    } else if (!companyId && companies.length > 0) {
      setCompanyId(companies[0]._id);
    }
  }, [route?.params?.companyId, companies, companyId]);

  useEffect(() => {
    if (companyId) {
      fetchAnalysis(companyId);
      fetchCompanyPersonalizedAnalysis(companyId).catch(() => {});
    }
  }, [companyId]);

  const onRefresh = async () => {
    if (!companyId) return;
    setRefreshing(true);
    await Promise.all([
      fetchAnalysis(companyId),
      fetchCompanyPersonalizedAnalysis(companyId),
    ]);
    setRefreshing(false);
  };

  const activeAnalysis = analysis;
  const aiData = selectedPersonalizedAnalysis;

  return (
    <View style={styles.container}>
      <Header
        title="Financial Analysis"
        subtitle={activeAnalysis ? `${activeAnalysis.companyName} (${activeAnalysis.symbol})` : 'Company Analysis'}
        onBack={navigation.goBack}
      />

      {/* Horizontal Company Switcher if multiple companies exist */}
      {companies.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.companyBar}>
          {companies.map((c) => (
            <TouchableOpacity
              key={c._id}
              style={[
                styles.companyBarPill,
                companyId === c._id ? styles.companyBarPillActive : null,
              ]}
              onPress={() => setCompanyId(c._id)}
            >
              <Text
                style={[
                  styles.companyBarText,
                  companyId === c._id ? styles.companyBarTextActive : null,
                ]}
              >
                {c.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

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
        {isLoading && !refreshing ? (
          <LoadingSkeleton message="Computing deterministic financial metrics..." count={3} />
        ) : error ? (
          <ErrorMessage message={error} onRetry={onRefresh} />
        ) : activeAnalysis ? (
          <>
            {/* Attribution Header Banner */}
            <View style={styles.attrBanner}>
              <Text style={styles.attrText}>
                Reporting Period: {activeAnalysis.reportingPeriod || 'Latest Annual'} · Source: {activeAnalysis.dataSource}
              </Text>
            </View>

            {/* AI-Generated Financial Explanation Card */}
            <Card variant="accent" style={styles.aiCard}>
              <View style={styles.aiHeaderRow}>
                <Text style={styles.aiHeaderTag}>🤖 InvestIQ AI Synthesis</Text>
                <Text style={styles.aiHeaderSub}>RAG Verified Context</Text>
              </View>

              {isAnalyzing ? (
                <Text style={styles.analyzingText}>Synthesizing financial statement data with GPT-OSS 4B...</Text>
              ) : aiData?.aiExplanation ? (
                <Text style={styles.aiExplanationText}>{aiData.aiExplanation}</Text>
              ) : (
                <Text style={styles.aiExplanationText}>
                  Verified financial data retrieved. Press below to generate real-time AI financial explanation.
                </Text>
              )}

              {aiData?.budgetSuitability ? (
                <View style={styles.budgetNoteBox}>
                  <Text style={styles.budgetNoteTitle}>💼 Personal Budget Suitability:</Text>
                  <Text style={styles.budgetNoteText}>
                    {aiData.budgetSuitability.suitabilityNote}
                  </Text>
                </View>
              ) : null}
            </Card>

            {/* Core Deterministic Metrics */}
            <Text style={styles.sectionHeader}>A. Free Cash Flow & Capital Return</Text>
            <Card variant="default">
              <View style={styles.metricGrid}>
                <MetricBadge
                  label="Free Cash Flow"
                  value={activeAnalysis.freeCashFlow.value}
                  unit={activeAnalysis.freeCashFlow.unit || 'Cr'}
                  period={activeAnalysis.freeCashFlow.reportingPeriod}
                  status={activeAnalysis.freeCashFlow.value && activeAnalysis.freeCashFlow.value > 0 ? 'positive' : 'negative'}
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="Return on Equity (ROE)"
                  value={activeAnalysis.returnOnEquity.value}
                  unit="%"
                  period={activeAnalysis.returnOnEquity.reportingPeriod}
                  status="positive"
                  style={{ flex: 1 }}
                />
              </View>
              <Text style={styles.methodologyText}>
                Formula: {activeAnalysis.freeCashFlow.formula || 'OCF - CapEx'} · ROE Method: {activeAnalysis.returnOnEquity.methodology || 'Average Equity'}
              </Text>
            </Card>

            <Text style={styles.sectionHeader}>B. Balance Sheet Leverage</Text>
            <Card variant="default">
              <View style={styles.metricGrid}>
                <MetricBadge
                  label="Debt-to-Equity Ratio"
                  value={activeAnalysis.debtToEquity.value}
                  period={activeAnalysis.debtToEquity.reportingPeriod}
                  status={activeAnalysis.debtToEquity.value && activeAnalysis.debtToEquity.value > 1.5 ? 'negative' : 'neutral'}
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="P/E Valuation"
                  value={activeAnalysis.valuation.peRatio}
                  period={activeAnalysis.valuation.reportingPeriod}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>

            <Text style={styles.sectionHeader}>C. Profitability & Margins</Text>
            <Card variant="default">
              <View style={styles.metricGrid}>
                <MetricBadge
                  label="YoY Revenue Growth"
                  value={activeAnalysis.profitability.revenueGrowthYoY}
                  unit="%"
                  status={activeAnalysis.profitability.revenueGrowthYoY && activeAnalysis.profitability.revenueGrowthYoY > 0 ? 'positive' : 'negative'}
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="Net Profit Margin"
                  value={activeAnalysis.profitability.netProfitMargin}
                  unit="%"
                  status="positive"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>

            {/* Key Verified Insights */}
            {activeAnalysis.insights.length > 0 ? (
              <>
                <Text style={styles.sectionHeader}>Verified Key Insights</Text>
                <Card variant="elevated">
                  {activeAnalysis.insights.map((insight, idx) => (
                    <Text key={idx} style={styles.insightBullet}>
                      • {insight}
                    </Text>
                  ))}
                </Card>
              </>
            ) : null}

            {/* Quick action to open AI chat */}
            <Button
              title={`Ask Questions About ${activeAnalysis.symbol}`}
              onPress={() =>
                navigation.navigate('Chat', {
                  companyId: activeAnalysis.companyId,
                  companyName: activeAnalysis.companyName,
                  symbol: activeAnalysis.symbol,
                })
              }
              variant="primary"
              size="md"
              style={{ marginTop: 12, marginBottom: 24 }}
            />
          </>
        ) : (
          <EmptyState
            title="No Company Selected"
            message="Select an Indian company from the Explore screen to view deterministic financial analysis and metrics."
            actionText="Explore Companies"
            onAction={() => navigation.navigate('Explore')}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  companyBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  companyBarPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  companyBarPillActive: {
    backgroundColor: '#2563EB',
  },
  companyBarText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  companyBarTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    padding: 16,
  },
  attrBanner: {
    backgroundColor: '#111827',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  attrText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  aiCard: {
    marginBottom: 16,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiHeaderTag: {
    fontSize: 13,
    fontWeight: '800',
    color: '#93C5FD',
    textTransform: 'uppercase',
  },
  aiHeaderSub: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '600',
  },
  analyzingText: {
    color: '#93C5FD',
    fontSize: 13,
    fontStyle: 'italic',
  },
  aiExplanationText: {
    color: '#F3F4F6',
    fontSize: 14,
    lineHeight: 22,
  },
  budgetNoteBox: {
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
  },
  budgetNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 2,
  },
  budgetNoteText: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  metricGrid: {
    flexDirection: 'row',
  },
  methodologyText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },
  insightBullet: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
});
