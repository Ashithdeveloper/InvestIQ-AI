import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, Input, Header, ErrorMessage } from '../../components/common';
import { useScenarioStore } from '../../stores/useScenarioStore';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { useProfileStore } from '../../stores/useProfileStore';

interface ScenarioCalculatorScreenProps {
  route?: {
    params?: {
      companyId?: string;
      companyName?: string;
      symbol?: string;
      sharePrice?: number;
    };
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export const ScenarioCalculatorScreen: React.FC<ScenarioCalculatorScreenProps> = ({
  route,
  navigation,
}) => {
  const { profile } = useProfileStore();
  const { companies, fetchCompanies } = useCompanyStore();
  const {
    scenarioOutcome,
    comparisonOutcome,
    calculateScenario,
    compareBudgets,
    isLoading,
    error,
    clearError,
    clearOutcomes,
  } = useScenarioStore();

  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    route?.params?.companyId || ''
  );
  const [budget, setBudget] = useState<string>(
    profile?.monthlyInvestmentBudget ? String(profile.monthlyInvestmentBudget) : '5000'
  );
  const [altBudget, setAltBudget] = useState<string>('7000');
  const [percentChange, setPercentChange] = useState<string>('10');

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies({ page: 1 });
    }
  }, []);

  useEffect(() => {
    if (route?.params?.companyId) {
      setSelectedCompanyId(route.params.companyId);
    } else if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0]._id);
    }
  }, [route?.params?.companyId, companies]);

  const handleCalculate = async () => {
    clearError();
    if (!selectedCompanyId) return;

    const budgetNum = parseFloat(budget);
    const percentNum = parseFloat(percentChange);

    if (isNaN(budgetNum) || budgetNum <= 0) return;
    if (isNaN(percentNum)) return;

    if (mode === 'single') {
      await calculateScenario({
        companyId: selectedCompanyId,
        monthlyBudget: budgetNum,
        hypotheticalPriceChangePercent: percentNum,
      });
    } else {
      const altBudgetNum = parseFloat(altBudget);
      if (isNaN(altBudgetNum) || altBudgetNum <= 0) return;

      await compareBudgets({
        companyId: selectedCompanyId,
        currentBudget: budgetNum,
        alternativeBudget: altBudgetNum,
        hypotheticalPriceChangePercent: percentNum,
      });
    }
  };

  const selectedCompany = companies.find((c) => c._id === selectedCompanyId);

  return (
    <View style={styles.container}>
      <Header
        title="Investment Scenarios"
        subtitle="Whole-share hypothetical outcome calculator"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Mode Toggle Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'single' ? styles.tabActive : null]}
            onPress={() => {
              setMode('single');
              clearOutcomes();
            }}
          >
            <Text style={[styles.tabText, mode === 'single' ? styles.tabTextActive : null]}>
              Single Scenario
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'compare' ? styles.tabActive : null]}
            onPress={() => {
              setMode('compare');
              clearOutcomes();
            }}
          >
            <Text style={[styles.tabText, mode === 'compare' ? styles.tabTextActive : null]}>
              Budget Comparison
            </Text>
          </TouchableOpacity>
        </View>

        {/* Company Selector */}
        <Card variant="default">
          <Text style={styles.fieldLabel}>Selected Indian Company</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.companyPillsScroll}>
            {companies.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={[
                  styles.companyPill,
                  selectedCompanyId === c._id ? styles.companyPillActive : null,
                ]}
                onPress={() => setSelectedCompanyId(c._id)}
              >
                <Text
                  style={[
                    styles.companyPillText,
                    selectedCompanyId === c._id ? styles.companyPillTextActive : null,
                  ]}
                >
                  {c.symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedCompany ? (
            <View style={styles.selectedCompanyInfo}>
              <Text style={styles.selectedCompName}>{selectedCompany.companyName}</Text>
              <Text style={styles.selectedCompPrice}>
                Share Price: ₹{selectedCompany.sharePrice?.toLocaleString('en-IN') ?? 'N/A'}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Input Form */}
        <Card variant="elevated">
          <Input
            label={mode === 'single' ? 'Monthly Investment Budget (₹)' : 'Current Monthly Budget (₹)'}
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
            placeholder="5000"
          />

          {mode === 'compare' ? (
            <Input
              label="Alternative Monthly Budget (₹)"
              value={altBudget}
              onChangeText={setAltBudget}
              keyboardType="numeric"
              placeholder="7000"
            />
          ) : null}

          <Text style={styles.fieldLabel}>Hypothetical Price Movement (%)</Text>
          <View style={styles.percentPillsRow}>
            {['-20', '-10', '+5', '+10', '+20'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.percentPill,
                  percentChange === p.replace('+', '') ? styles.percentPillActive : null,
                ]}
                onPress={() => setPercentChange(p.replace('+', ''))}
              >
                <Text
                  style={[
                    styles.percentPillText,
                    percentChange === p.replace('+', '') ? styles.percentPillTextActive : null,
                  ]}
                >
                  {p}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={mode === 'single' ? 'Calculate Scenario' : 'Compare Scenarios'}
            onPress={handleCalculate}
            loading={isLoading}
            style={{ marginTop: 16 }}
          />
        </Card>

        {error ? <ErrorMessage message={error} onRetry={handleCalculate} /> : null}

        {/* Single Outcome Display */}
        {mode === 'single' && scenarioOutcome ? (
          <Card variant="accent" style={styles.resultCard}>
            <View style={styles.disclaimerPill}>
              <Text style={styles.disclaimerPillText}>HYPOTHETICAL SIMULATION</Text>
            </View>

            <Text style={styles.resultHeading}>
              Simulation Results for {scenarioOutcome.company.symbol}
            </Text>

            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resLabel}>Whole Shares</Text>
                <Text style={styles.resValue}>{scenarioOutcome.calculation.wholeShares}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resLabel}>Invested Amount</Text>
                <Text style={styles.resValue}>
                  ₹{scenarioOutcome.calculation.amountInvested.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resLabel}>Unallocated Cash</Text>
                <Text style={styles.resValue}>
                  ₹{scenarioOutcome.calculation.unallocatedCash.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resLabel}>Simulated Price</Text>
                <Text style={styles.resValue}>
                  ₹{scenarioOutcome.calculation.hypotheticalNewPrice.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.outcomeHighlight}>
              <Text style={styles.outcomeHighlightLabel}>Hypothetical Portfolio Value</Text>
              <Text style={styles.outcomeHighlightValue}>
                ₹{scenarioOutcome.calculation.totalPortfolioValue.toLocaleString('en-IN')}
              </Text>
              <Text
                style={[
                  styles.gainLossText,
                  scenarioOutcome.calculation.hypotheticalGainLoss >= 0
                    ? styles.positiveText
                    : styles.negativeText,
                ]}
              >
                {scenarioOutcome.calculation.hypotheticalGainLoss >= 0 ? '+' : ''}₹
                {scenarioOutcome.calculation.hypotheticalGainLoss.toLocaleString('en-IN')} (
                {scenarioOutcome.calculation.hypotheticalGainLossPercent}%)
              </Text>
            </View>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerHead}>Explicit Assumptions & Limitations:</Text>
              {scenarioOutcome.assumptionsAndLimitations.map((a, i) => (
                <Text key={i} style={styles.disclaimerItem}>
                  • {a}
                </Text>
              ))}
            </View>
          </Card>
        ) : null}

        {/* Comparison Outcome Display */}
        {mode === 'compare' && comparisonOutcome ? (
          <Card variant="accent" style={styles.resultCard}>
            <View style={styles.disclaimerPill}>
              <Text style={styles.disclaimerPillText}>HYPOTHETICAL BUDGET COMPARISON</Text>
            </View>

            <Text style={styles.resultHeading}>
              Comparison: ₹{comparisonOutcome.currentScenario.budget.toLocaleString('en-IN')} vs ₹
              {comparisonOutcome.alternativeScenario.budget.toLocaleString('en-IN')}
            </Text>

            <View style={styles.comparisonTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colText, styles.colHead]}>Metric</Text>
                <Text style={[styles.colText, styles.colHead]}>Budget A</Text>
                <Text style={[styles.colText, styles.colHead]}>Budget B</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colText}>Whole Shares</Text>
                <Text style={styles.colVal}>{comparisonOutcome.currentScenario.wholeShares}</Text>
                <Text style={styles.colVal}>{comparisonOutcome.alternativeScenario.wholeShares}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colText}>Invested</Text>
                <Text style={styles.colVal}>
                  ₹{comparisonOutcome.currentScenario.amountInvested.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.colVal}>
                  ₹{comparisonOutcome.alternativeScenario.amountInvested.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colText}>Simulated Gain/Loss</Text>
                <Text style={styles.colVal}>
                  ₹{comparisonOutcome.currentScenario.hypotheticalGainLoss.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.colVal}>
                  ₹{comparisonOutcome.alternativeScenario.hypotheticalGainLoss.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.riskAlertBox}>
              <Text style={styles.riskAlertTitle}>⚠️ Risk Analysis & Exposure Note:</Text>
              <Text style={styles.riskAlertText}>
                {comparisonOutcome.riskAnalysis.warning}
              </Text>
              <Text style={styles.riskAlertSub}>
                {comparisonOutcome.riskAnalysis.lossExposureNote}
              </Text>
            </View>
          </Card>
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fieldLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  companyPillsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  companyPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyPillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  companyPillText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 13,
  },
  companyPillTextActive: {
    color: '#FFFFFF',
  },
  selectedCompanyInfo: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  selectedCompName: {
    color: '#F9FAFB',
    fontWeight: '700',
    fontSize: 14,
  },
  selectedCompPrice: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  percentPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  percentPill: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#374151',
  },
  percentPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  percentPillText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },
  percentPillTextActive: {
    color: '#93C5FD',
    fontWeight: '700',
  },
  resultCard: {
    marginTop: 16,
  },
  disclaimerPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  disclaimerPillText: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultHeading: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  resultItem: {
    width: '50%',
    padding: 8,
  },
  resLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  resValue: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  outcomeHighlight: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  outcomeHighlightLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  outcomeHighlightValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  gainLossText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  positiveText: {
    color: '#10B981',
  },
  negativeText: {
    color: '#EF4444',
  },
  disclaimerBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  disclaimerHead: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  disclaimerItem: {
    color: '#6B7280',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 2,
  },
  comparisonTable: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  colText: {
    flex: 1.5,
    color: '#9CA3AF',
    fontSize: 12,
  },
  colHead: {
    fontWeight: '700',
    color: '#E5E7EB',
  },
  colVal: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  riskAlertBox: {
    backgroundColor: '#2A1717',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  riskAlertTitle: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
  },
  riskAlertText: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 16,
  },
  riskAlertSub: {
    color: '#FECACA',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
});
