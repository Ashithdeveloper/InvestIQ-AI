import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface MetricBadgeProps {
  label: string;
  value: string | number | null;
  unit?: string;
  period?: string | null;
  status?: 'positive' | 'negative' | 'neutral' | 'accent';
  style?: ViewStyle;
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  label,
  value,
  unit,
  period,
  status = 'neutral',
  style,
}) => {
  const displayValue =
    value === null || value === undefined
      ? 'N/A'
      : typeof value === 'number'
      ? `${value.toLocaleString('en-IN')}${unit ? ' ' + unit : ''}`
      : `${value}${unit ? ' ' + unit : ''}`;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, styles[`value_${status}`]]}>{displayValue}</Text>
      {period ? <Text style={styles.period}>{period}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    minWidth: 100,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
  value_neutral: {
    color: '#F9FAFB',
  },
  value_positive: {
    color: '#10B981',
  },
  value_negative: {
    color: '#EF4444',
  },
  value_accent: {
    color: '#3B82F6',
  },
  period: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
});
