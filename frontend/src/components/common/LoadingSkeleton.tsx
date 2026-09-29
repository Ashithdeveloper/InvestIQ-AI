import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

interface LoadingSkeletonProps {
  message?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  message = 'Loading verified financial data...',
  count = 3,
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 16 }} />
      <Text style={styles.message}>{message}</Text>
      <View style={styles.skeletonWrapper}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.skeletonCard} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 20,
    fontWeight: '500',
  },
  skeletonWrapper: {
    width: '100%',
  },
  skeletonCard: {
    height: 72,
    backgroundColor: '#1E222D',
    borderRadius: 12,
    marginVertical: 6,
    opacity: 0.6,
  },
});
