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
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { DashboardCompanySummary } from '../../types';

interface DashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { data, isLoading, error, fetchDashboard } = useDashboardStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const handleOpenScenario = (company: DashboardCompanySummary) => {
    navigation.navigate('Scenarios', {
      companyId: company.companyId,
      companyName: company.companyName,
      symbol: company.symbol,
      sharePrice: company.latestSharePrice,
    });
  };

  const handleOpenAnalysis = (company: DashboardCompanySummary) => {
    navigation.navigate('Analysis', {
      companyId: company.companyId,
      symbol: company.symbol,
    });
  };

  const handleOpenChat = (company: DashboardCompanySummary) => {
    navigation.navigate('Chat', {
      companyId: company.companyId,
      companyName: company.companyName,
      symbol: company.symbol,
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title="InvestIQ · AI"
        subtitle={`Welcome, ${user?.username || 'Investor'}`}
        rightAction={
          <TouchableOpacity
            style={styles.profileBadge}
            onPress={() => navigation.navigate('ProfileSetup')}
          >
            <Text style={styles.profileBadgeText}>
              ₹{data?.monthlyInvestmentBudget ? data.monthlyInvestmentBudget.toLocaleString('en-IN') : '--'}/mo
            </Text>
          </TouchableOpacity>
        }
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
        {/* A. User Financial Summary */}
        <Card variant="accent" style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Personalized Monthly Allocation</Text>
          <View style={styles.budgetRow}>
            <View>
              <Text style={styles.budgetAmount}>
                ₹{data?.monthlyInvestmentBudget ? data.monthlyInvestmentBudget.toLocaleString('en-IN') : '0'}
              </Text>
              <Text style={styles.budgetSub}>Available Monthly Capital (INR)</Text>
            </View>
            <Button
              title="Edit Budget"
              onPress={() => navigation.navigate('ProfileSetup')}
              variant="outline"
              size="sm"
            />
          </View>
        </Card>

        {/* D. Quick Action Shortcuts */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => navigation.navigate('Explore')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => navigation.navigate('Scenarios')}
          >
            <Text style={styles.actionIcon}>⚖️</Text>
            <Text style={styles.actionLabel}>Scenarios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={styles.actionIcon}>🤖</Text>
            <Text style={styles.actionLabel}>AI Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Loading and Error States */}
        {isLoading && !refreshing ? (
          <LoadingSkeleton message="Calculating verified company analysis..." count={3} />
        ) : error ? (
          <ErrorMessage
            message={error}
            onRetry={() => {
              if (error.includes('profile')) {
                navigation.navigate('ProfileSetup');
              } else {
                fetchDashboard();
              }
            }}
          />
        ) : !data || data.companies.length === 0 ? (
          <EmptyState
            title="No Companies Found"
            message="We could not find indexed Indian companies. Explore companies or scrape data to begin."
            actionText="Explore All Companies"
            onAction={() => navigation.navigate('Explore')}
          />
        ) : (
          <>
            {/* B & C. Personalized Company Analysis & Overview */}
            <Text style={styles.sectionTitle}>
              Verified Indian Companies ({data.companies.length})
            </Text>

            {data.companies.map((company) => {
              const scenario = company.hypotheticalScenarioSummary;

              return (
                <Card key={company.companyId} variant="elevated" style={styles.companyCard}>
                  {/* Company Header */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.companyTitleWrap}>
                      <Text style={styles.companySymbol}>{company.symbol}</Text>
                      <Text style={styles.companyName} numberOfLines={1}>
                        {company.companyName}
                      </Text>
                    </View>
                    <View style={styles.priceWrap}>
                      <Text style={styles.sharePrice}>
                        {company.latestSharePrice !== null
                          ? `₹${company.latestSharePrice.toLocaleString('en-IN')}`
                          : 'N/A'}
                      </Text>
                      <Text style={styles.sectorText}>{company.sector}</Text>
                    </View>
                  </View>

                  {/* Whole-share Budget Allocation Notice */}
                  {scenario ? (
                    <View style={styles.allocationBox}>
                      <Text style={styles.allocationTitle}>
                        💼 Your Monthly Budget Allocation
                      </Text>
                      <Text style={styles.allocationBody}>
                        Can acquire{' '}
                        <Text style={styles.boldWhite}>
                          {scenario.purchasableShares} whole share{scenario.purchasableShares !== 1 ? 's' : ''}
                        </Text>{' '}
                        (₹{scenario.amountInvested.toLocaleString('en-IN')}) with{' '}
                        <Text style={styles.boldWhite}>
                          ₹{scenario.unallocatedCash.toLocaleString('en-IN')}
                        </Text>{' '}
                        unallocated cash.
                      </Text>
                    </View>
                  ) : null}

                  {/* Financial Metrics Grid */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll}>
                    <MetricBadge
                      label="Return on Equity"
                      value={company.returnOnEquity.value}
                      unit="%"
                      period={company.returnOnEquity.reportingPeriod}
                      status={
                        company.returnOnEquity.value && company.returnOnEquity.value > 15
                          ? 'positive'
                          : 'neutral'
                      }
                    />
                    <MetricBadge
                      label="Free Cash Flow"
                      value={company.freeCashFlow.value}
                      unit="Cr"
                      period={company.freeCashFlow.reportingPeriod}
                      status={
                        company.freeCashFlow.value && company.freeCashFlow.value > 0
                          ? 'positive'
                          : 'negative'
                      }
                    />
                    <MetricBadge
                      label="Debt / Equity"
                      value={company.debtToEquity.value}
                      period={company.debtToEquity.reportingPeriod}
                      status={
                        company.debtToEquity.value && company.debtToEquity.value > 1.5
                          ? 'negative'
                          : 'neutral'
                      }
                    />
                    <MetricBadge
                      label="P/E Ratio"
                      value={company.valuation.peRatio}
                      status="neutral"
                    />
                  </ScrollView>

                  {/* Financial Risks */}
                  {company.financialRisks.length > 0 ? (
                    <View style={styles.risksContainer}>
                      <Text style={styles.risksHeading}>⚠️ Financial Risk Indicators:</Text>
                      {company.financialRisks.slice(0, 2).map((risk, idx) => (
                        <Text key={idx} style={styles.riskItem}>
                          • {risk}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {/* Card Actions */}
                  <View style={styles.cardActionsRow}>
                    <Button
                      title="Run Scenario"
                      onPress={() => handleOpenScenario(company)}
                      variant="primary"
                      size="sm"
                      style={styles.cardBtn}
                    />
                    <Button
                      title="Full Report"
                      onPress={() => handleOpenAnalysis(company)}
                      variant="outline"
                      size="sm"
                      style={styles.cardBtn}
                    />
                    <Button
                      title="Ask AI"
                      onPress={() => handleOpenChat(company)}
                      variant="secondary"
                      size="sm"
                      style={styles.cardBtn}
                    />
                  </View>
                </Card>
              );
            })}
          </>
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
  scroll: {
    padding: 16,
  },
  profileBadge: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  profileBadgeText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    color: '#93C5FD',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  budgetSub: {
    fontSize: 12,
    color: '#BFDBFE',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E5E7EB',
    marginTop: 12,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionPill: {
    flex: 1,
    backgroundColor: '#161B22',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  companyCard: {
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  companySymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B82F6',
  },
  companyName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  sharePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  sectorText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  allocationBox: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    marginBottom: 12,
  },
  allocationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 4,
  },
  allocationBody: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  metricsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  risksContainer: {
    backgroundColor: '#1F1414',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3F1D1D',
  },
  risksHeading: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  riskItem: {
    color: '#FCA5A5',
    fontSize: 11,
    lineHeight: 16,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardBtn: {
    flex: 1,
    marginHorizontal: 3,
  },
});
