import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Card,
  Button,
  Header,
  MetricBadge,
  LoadingSkeleton,
  ErrorMessage,
} from '../../components/common';
import { useCompanyStore } from '../../stores/useCompanyStore';

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
  const companyId = route?.params?.companyId || '';
  const symbol = route?.params?.symbol || '';
  const { selectedCompany, fetchCompanyDetails, isLoadingDetails, error } =
    useCompanyStore();

  useEffect(() => {
    fetchCompanyDetails(companyId || symbol);
  }, [companyId, symbol]);

  const company = selectedCompany;

  return (
    <View style={styles.container}>
      <Header
        title={symbol || 'Company'}
        subtitle={company?.companyName || 'Details & Fundamentals'}
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoadingDetails && !company ? (
          <LoadingSkeleton message="Loading company data..." count={4} />
        ) : error ? (
          <ErrorMessage
            message={error}
            onRetry={() => fetchCompanyDetails(companyId || symbol)}
          />
        ) : company ? (
          <>
            {/* 1. Company Overview Header Card */}
            <Card variant="elevated" style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.symbolText}>{company.symbol}</Text>
                  <Text style={styles.nameText}>{company.companyName}</Text>
                  <Text style={styles.sectorText}>{company.sector} · {company.exchange.join('/')}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.currentPrice}>
                    {company.sharePrice !== null ? `₹${company.sharePrice.toLocaleString('en-IN')}` : 'N/A'}
                  </Text>
                  <Text style={styles.sourceText}>Source: {company.dataSource || 'Screener.in'}</Text>
                </View>
              </View>

              {/* 52-Week Range Bar */}
              <View style={styles.rangeBox}>
                <Text style={styles.rangeLabel}>52-Week Range</Text>
                <View style={styles.rangeValuesRow}>
                  <Text style={styles.rangeVal}>₹{company.low52Week ?? 'N/A'}</Text>
                  <View style={styles.rangeBarTrack}>
                    <View style={styles.rangeBarFill} />
                  </View>
                  <Text style={styles.rangeVal}>₹{company.high52Week ?? 'N/A'}</Text>
                </View>
              </View>
            </Card>

            {/* Quick Action Navigation */}
            <View style={styles.actionRow}>
              <Button
                title="Financial Analysis Report"
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
                title="Run Scenario"
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

            {/* Core Financial Metrics */}
            <Text style={styles.sectionHeader}>Key Financial Metrics</Text>
            <Card variant="default">
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
                  status={company.financialMetrics?.freeCashFlow && company.financialMetrics.freeCashFlow > 0 ? 'positive' : 'neutral'}
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.metricGrid}>
                <MetricBadge
                  label="ROE"
                  value={company.financialMetrics?.roe}
                  unit="%"
                  status={company.financialMetrics?.roe && company.financialMetrics.roe > 15 ? 'positive' : 'neutral'}
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
                  status={company.financialMetrics?.debtToEquity && company.financialMetrics.debtToEquity > 1.5 ? 'negative' : 'neutral'}
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="P/E Ratio"
                  value={company.financialMetrics?.peRatio}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>

            {/* AI Assistant Quick Entry */}
            <Card variant="accent" style={styles.aiBanner}>
              <Text style={styles.aiBannerTitle}>🤖 Have questions about {company.symbol}?</Text>
              <Text style={styles.aiBannerBody}>
                Ask our AI assistant to explain this company's debt levels, cash flow generation, or valuation in simple language.
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
    maxWidth: 200,
  },
  sectorText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
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
  rangeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
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
    width: '60%',
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  actionRow: {
    marginBottom: 16,
  },
  actionBtn: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricGrid: {
    flexDirection: 'row',
  },
  aiBanner: {
    marginTop: 12,
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
