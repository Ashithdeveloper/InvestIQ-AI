import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Button, Card } from '../../components/common';
import { useAuthStore } from '../../stores/useAuthStore';

interface LoginScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading, error, clearError } = useAuthStore();

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;

    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
    } catch {
      // Error handled by store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 20) + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.brandHeader}>
          <Text style={styles.logoBadge}>InvestIQ · AI</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access verified Indian financial insights and personalized investment analysis.
          </Text>
        </View>

        <Card variant="elevated" style={styles.card}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
            placeholder="investor@example.com"
            value={email}
            onChangeText={(txt) => {
              setEmail(txt);
              if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={formErrors.email}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(txt) => {
              setPassword(txt);
              if (formErrors.password)
                setFormErrors((prev) => ({ ...prev, password: undefined }));
            }}
            secureTextEntry
            error={formErrors.password}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.submitBtn}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.switchLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Card>
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
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    color: '#3B82F6',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    padding: 20,
  },
  errorBanner: {
    backgroundColor: '#371B1B',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  switchLink: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 14,
  },
});
