import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          title="Retry"
          onPress={onRetry}
          variant="outline"
          size="sm"
          style={styles.retryBtn}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#371B1B',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  title: {
    color: '#FCA5A5',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  message: {
    color: '#FECACA',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    borderColor: '#EF4444',
  },
});
