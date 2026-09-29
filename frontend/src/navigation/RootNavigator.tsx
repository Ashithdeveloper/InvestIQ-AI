import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuthStore } from '../stores/useAuthStore';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isRestoring, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  if (isRestoring) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashLogo}>InvestIQ · AI</Text>
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 24 }} />
        <Text style={styles.splashText}>Restoring secure session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0A0D12',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashLogo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 1.5,
  },
  splashText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 12,
  },
});
