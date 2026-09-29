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
import { Input, Button, Card } from '../../components/common';
import { useAuthStore } from '../../stores/useAuthStore';

interface SignupScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});

  const { signup, isLoading, error, clearError } = useAuthStore();

  const validate = (): boolean => {
    const errors: { username?: string; email?: string; password?: string } = {};

    if (!username.trim() || username.trim().length < 2) {
      errors.username = 'Username must be at least 2 characters';
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'Valid email is required';
    }

    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async () => {
    clearError();
    if (!validate()) return;

    try {
      await signup({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    } catch {
      // Error handled in store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandHeader}>
          <Text style={styles.logoBadge}>InvestIQ · AI</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join InvestIQ to start smart, deterministic, data-driven investing.
          </Text>
        </View>

        <Card variant="elevated" style={styles.card}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Full Name or Username"
            placeholder="Ashith Sharma"
            value={username}
            onChangeText={(txt) => {
              setUsername(txt);
              if (formErrors.username)
                setFormErrors((prev) => ({ ...prev, username: undefined }));
            }}
            error={formErrors.username}
          />

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
            title="Create Account"
            onPress={handleSignup}
            loading={isLoading}
            style={styles.submitBtn}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}>Sign In</Text>
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
