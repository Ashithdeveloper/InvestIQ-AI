import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { DashboardCompanySummary, AllocatedStock } from '../../types';
import { getStockRiskAndProfit } from '../../utils/stockMetrics';

interface DashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { data, isLoading, error, fetchDashboard } = useDashboardStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBoosterExtra, setSelectedBoosterExtra] = useState<number>(2000);

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

  const plan = data?.monthlyAllocationPlan;
  const topRec = plan?.topRecommendation;

  const effectiveExtra = selectedBoosterExtra;
  const extraShares = topRec ? Math.floor(effectiveExtra / (topRec.sharePrice || 1)) : 0;
  const dynamicReturnBoost = topRec
    ? parseFloat(
        (
          topRec.projectedReturnIncreasePercentage *
          (effectiveExtra / (topRec.suggestedExtraAmount || 1))
        ).toFixed(1)
      )
    : 0;
  const dynamicBoostedReturn = topRec
    ? parseFloat((topRec.currentProjectedReturnPercentage + dynamicReturnBoost).toFixed(1))
    : 0;

  const allocatedCompanyIds = new Set(plan?.allocations?.map((a) => a.companyId) || []);
  const unallocatedCompanies = (data?.companies || []).filter(
    (c) => !allocatedCompanyIds.has(c.companyId)
  );

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
          />
        }
      >

        {/* Quick Actions Shortcuts */}
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

        {/* Incomplete Profile Notice Banner */}
        {!data?.monthlyInvestmentBudget &&
        !user?.financialProfile?.monthlyInvestmentBudget &&
        !profile?.monthlyInvestmentBudget ? (
          <Card variant="elevated" style={styles.incompleteCard}>
            <Text style={styles.incompleteTitle}>⚠️ Financial Profile Incomplete</Text>
            <Text style={styles.incompleteBody}>
              Set up your monthly salary and investment budget to generate your customized 5+ stock allocation and booster recommendations.
            </Text>
            <Button
              title="Complete Profile Now"
              onPress={() => navigation.navigate('ProfileSetup')}
              variant="primary"
              size="sm"
              style={{ marginTop: 8 }}
            />
          </Card>
        ) : null}

        {/* A. Personalized Monthly Allocation Plan Across 5+ Stocks & Sectors */}
        {plan && plan.allocations && plan.allocations.length > 0 ? (
          <View style={styles.portfolioContainer}>
            <View style={styles.portfolioHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.portfolioTitle}>Personalized Monthly Allocation</Text>
                <Text style={styles.portfolioSub}>
                  Diversified across {plan.allocations.length} fundamental leaders in {plan.sectorCount} sectors
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editBudgetBadge}
                onPress={() => navigation.navigate('ProfileSetup')}
              >
                <Text style={styles.editBudgetText}>Edit Budget</Text>
              </TouchableOpacity>
            </View>

            {/* Budget Stat Cards */}
            <View style={styles.portfolioStatsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Budget</Text>
                <Text style={styles.statValue}>₹{plan.totalMonthlyBudget.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Invested Capital</Text>
                <Text style={[styles.statValue, { color: '#34D399' }]}>
                  ₹{plan.totalInvestedAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Cash Reserve</Text>
                <Text style={[styles.statValue, { color: '#60A5FA' }]}>
                  ₹{plan.unallocatedCash.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Top Recommended Company Booster Card */}
            {topRec ? (
              <Card variant="accent" style={styles.boosterCard}>
                <View style={styles.boosterBadgeRow}>
                  <Text style={styles.boosterBadge}>🌟 TOP CONVICTION PICK · CAPITAL BOOSTER</Text>
                </View>

                <View style={styles.boosterCompanyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boosterSymbol}>{topRec.symbol}</Text>
                    <Text style={styles.boosterName}>{topRec.companyName} · {topRec.sector}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.boosterPrice}>₹{topRec.sharePrice.toLocaleString('en-IN')}</Text>
                    <Text style={styles.boosterAllocNote}>
                      Allocated: ₹{topRec.currentAllocatedAmount.toLocaleString('en-IN')} ({topRec.currentShares} shares)
                    </Text>
                  </View>
                </View>

                {/* Analysis Recommendation Rationale */}
                <View style={styles.boosterRationaleBox}>
                  <Text style={styles.boosterRationaleText}>
                    💡 {topRec.analysisRationale}
                  </Text>
                </View>

                {/* Interactive Booster Uplift Simulator */}
                <View style={styles.boosterSimBox}>
                  <Text style={styles.boosterSimTitle}>
                    🚀 Extra Capital Return Simulation
                  </Text>
                  <Text style={styles.boosterSimDesc}>
                    Add extra monthly capital into {topRec.symbol} to compound returns:
                  </Text>

                  {/* Extra amount selection chips */}
                  <View style={styles.chipsRow}>
                    {[1000, 2000, 5000, 10000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={[
                          styles.chip,
                          selectedBoosterExtra === amt && styles.chipActive,
                        ]}
                        onPress={() => setSelectedBoosterExtra(amt)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedBoosterExtra === amt && styles.chipTextActive,
                          ]}
                        >
                          +₹{amt.toLocaleString('en-IN')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Dynamic Simulation Metrics */}
                  <View style={styles.simResultRow}>
                    <View style={styles.simResultCol}>
                      <Text style={styles.simResultLabel}>Projected Return</Text>
                      <Text style={styles.simResultValue}>
                        {topRec.currentProjectedReturnPercentage}% →{' '}
                        <Text style={{ color: '#34D399', fontWeight: '800' }}>
                          {dynamicBoostedReturn}% p.a.
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.simResultCol}>
                      <Text style={styles.simResultLabel}>Return Uplift</Text>
                      <Text style={[styles.simResultValue, { color: '#60A5FA' }]}>
                        +{dynamicReturnBoost}%
                      </Text>
                    </View>
                    <View style={styles.simResultCol}>
                      <Text style={styles.simResultLabel}>Additional Shares</Text>
                      <Text style={styles.simResultValue}>+{extraShares} Shares</Text>
                    </View>
                  </View>
                </View>

                {/* Top Pick Action Buttons */}
                <View style={styles.boosterActionsRow}>
                  <Button
                    title="🟢 Buy Analysis"
                    onPress={() =>
                      navigation.navigate('BuyAnalysis', {
                        companyId: topRec.companyId,
                        symbol: topRec.symbol,
                        companyName: topRec.companyName,
                      })
                    }
                    variant="primary"
                    size="sm"
                    style={{ flex: 1, marginRight: 6 }}
                  />
                  <Button
                    title="Full Report"
                    onPress={() =>
                      navigation.navigate('Analysis', {
                        companyId: topRec.companyId,
                        symbol: topRec.symbol,
                      })
                    }
                    variant="outline"
                    size="sm"
                    style={{ flex: 1, marginLeft: 6 }}
                  />
                </View>
              </Card>
            ) : null}

            {/* List of 5+ Allocated Companies */}
            <Text style={styles.allocatedListTitle}>
              Portfolio Asset Allocation ({plan.allocations.length} Companies)
            </Text>

            {plan.allocations.map((alloc: AllocatedStock) => {
              const metrics = getStockRiskAndProfit(alloc);

              return (
                <Card key={alloc.companyId} variant="default" style={styles.allocatedCard}>
                  <View style={styles.allocHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={styles.allocSymbol}>{alloc.symbol}</Text>
                        <View style={styles.sectorBadge}>
                          <Text style={styles.sectorBadgeText}>{alloc.sector}</Text>
                        </View>
                        {alloc.isTopRecommendation ? (
                          <View style={styles.topPickBadge}>
                            <Text style={styles.topPickBadgeText}>Top Pick</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.allocName} numberOfLines={1}>{alloc.companyName}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.allocPrice}>₹{alloc.sharePrice.toLocaleString('en-IN')}</Text>
                      <Text style={styles.allocScore}>Score: {alloc.financialStrengthScore}/100</Text>
                    </View>
                  </View>

                  {/* Risk Value & Profit Percentage Row */}
                  <View style={styles.allocRiskProfitRow}>
                    <View style={styles.allocRiskBadge}>
                      <Text style={styles.allocRiskLabel}>Risk Value</Text>
                      <Text
                        style={[
                          styles.allocRiskValue,
                          metrics.riskPercentage <= 25
                            ? { color: '#10B981' }
                            : metrics.riskPercentage <= 60
                            ? { color: '#F59E0B' }
                            : { color: '#EF4444' },
                        ]}
                      >
                        🛡️ {metrics.riskPercentage}% ({metrics.riskLevel})
                      </Text>
                    </View>
                    <View style={styles.allocProfitBadge}>
                      <Text style={styles.allocProfitLabel}>Profit Potential</Text>
                      <Text style={styles.allocProfitValue}>
                        📈 +{metrics.profitPercentage}% p.a.
                      </Text>
                    </View>
                  </View>

                  {/* Allocation breakdown box */}
                  <View style={styles.allocMetricsRow}>
                    <View style={styles.allocMetricItem}>
                      <Text style={styles.allocMetricLabel}>Allocated Capital</Text>
                      <Text style={styles.allocMetricVal}>
                        ₹{alloc.allocatedAmount.toLocaleString('en-IN')} ({alloc.allocationPercentage}%)
                      </Text>
                    </View>
                    <View style={styles.allocMetricItem}>
                      <Text style={styles.allocMetricLabel}>Purchasable Shares</Text>
                      <Text style={styles.allocMetricVal}>
                        {alloc.sharesToBuy} Shares (₹{alloc.actualInvestedAmount.toLocaleString('en-IN')})
                      </Text>
                    </View>
                  </View>

                  {/* Key Strengths */}
                  {alloc.keyStrengths && alloc.keyStrengths.length > 0 ? (
                    <View style={styles.strengthsRow}>
                      {alloc.keyStrengths.map((st: string, i: number) => (
                        <View key={i} style={styles.strengthChip}>
                          <Text style={styles.strengthChipText}>✓ {st}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Quick actions for allocated stock */}
                  <View style={styles.cardActionsRow}>
                    <Button
                      title="Full Report"
                      onPress={() =>
                        navigation.navigate('Analysis', {
                          companyId: alloc.companyId,
                          symbol: alloc.symbol,
                        })
                      }
                      variant="outline"
                      size="sm"
                      style={styles.cardBtn}
                    />
                    <Button
                      title="Buy Analysis"
                      onPress={() =>
                        navigation.navigate('BuyAnalysis', {
                          companyId: alloc.companyId,
                          symbol: alloc.symbol,
                          companyName: alloc.companyName,
                        })
                      }
                      variant="primary"
                      size="sm"
                      style={styles.cardBtn}
                    />
                    <Button
                      title="Run Scenario"
                      onPress={() =>
                        navigation.navigate('Scenarios', {
                          companyId: alloc.companyId,
                          symbol: alloc.symbol,
                          sharePrice: alloc.sharePrice,
                          companyName: alloc.companyName,
                        })
                      }
                      variant="secondary"
                      size="sm"
                      style={styles.cardBtn}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          /* Baseline User Financial Summary */
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
        )}

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
              Verified Indian Companies ({unallocatedCompanies.length})
            </Text>

            {unallocatedCompanies.map((company: DashboardCompanySummary) => {
              const compMetrics = getStockRiskAndProfit(company);

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

                  {/* Risk Value & Profit Percentage Row */}
                  <View style={styles.allocRiskProfitRow}>
                    <View style={styles.allocRiskBadge}>
                      <Text style={styles.allocRiskLabel}>Risk Value</Text>
                      <Text
                        style={[
                          styles.allocRiskValue,
                          compMetrics.riskPercentage <= 25
                            ? { color: '#10B981' }
                            : compMetrics.riskPercentage <= 60
                            ? { color: '#F59E0B' }
                            : { color: '#EF4444' },
                        ]}
                      >
                        🛡️ {compMetrics.riskPercentage}% ({compMetrics.riskLevel})
                      </Text>
                    </View>
                    <View style={styles.allocProfitBadge}>
                      <Text style={styles.allocProfitLabel}>Profit Potential</Text>
                      <Text style={styles.allocProfitValue}>
                        📈 +{compMetrics.profitPercentage}% p.a.
                      </Text>
                    </View>
                  </View>

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
                      {company.financialRisks.slice(0, 2).map((risk: string, idx: number) => (
                        <Text key={idx} style={styles.riskItem}>
                          • {risk}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {/* Card Actions */}
                  <View style={styles.cardActionsRow}>
                    <Button
                      title="Full Report"
                      onPress={() => handleOpenAnalysis(company)}
                      variant="outline"
                      size="sm"
                      style={styles.cardBtn}
                    />
                    <Button
                      title="AI Buy Analysis"
                      onPress={() =>
                        navigation.navigate('BuyAnalysis', {
                          companyId: company.companyId,
                          symbol: company.symbol,
                          companyName: company.companyName,
                        })
                      }
                      variant="primary"
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
  incompleteCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 14,
  },
  incompleteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 4,
  },
  incompleteBody: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  portfolioContainer: {
    marginBottom: 16,
  },
  portfolioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.3,
  },
  portfolioSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  editBudgetBadge: {
    backgroundColor: '#1E293B',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editBudgetText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  portfolioStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  boosterCard: {
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#0F172A',
  },
  boosterBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boosterBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#60A5FA',
    letterSpacing: 0.8,
  },
  boosterCompanyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  boosterSymbol: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  boosterName: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  boosterPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#34D399',
  },
  boosterAllocNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  boosterRationaleBox: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  boosterRationaleText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  boosterSimBox: {
    backgroundColor: '#0B1120',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  boosterSimTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60A5FA',
    marginBottom: 2,
  },
  boosterSimDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  simResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 8,
  },
  simResultCol: {
    flex: 1,
    alignItems: 'center',
  },
  simResultLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  simResultValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  boosterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  allocatedListTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E5E7EB',
    marginBottom: 10,
    marginTop: 4,
  },
  allocatedCard: {
    marginBottom: 12,
  },
  allocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  allocSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3B82F6',
    marginRight: 6,
  },
  sectorBadge: {
    backgroundColor: '#1E293B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 6,
  },
  sectorBadgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  topPickBadge: {
    backgroundColor: '#065F46',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  topPickBadgeText: {
    fontSize: 10,
    color: '#34D399',
    fontWeight: '800',
  },
  allocName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  allocPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  allocScore: {
    fontSize: 10,
    color: '#60A5FA',
    fontWeight: '700',
    marginTop: 2,
  },
  allocMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  allocMetricItem: {
    flex: 1,
  },
  allocMetricLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  allocMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
    marginTop: 2,
  },
  strengthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  strengthChip: {
    backgroundColor: '#064E3B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  strengthChipText: {
    fontSize: 10,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  allocRiskProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
  },
  allocRiskBadge: {
    flex: 1,
  },
  allocRiskLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  allocRiskValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  allocProfitBadge: {
    flex: 1,
    alignItems: 'flex-end',
  },
  allocProfitLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  allocProfitValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
});
