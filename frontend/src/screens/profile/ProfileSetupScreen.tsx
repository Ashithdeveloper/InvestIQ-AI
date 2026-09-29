import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Input, Button, Card, Header } from '../../components/common';
import { useProfileStore } from '../../stores/useProfileStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface ProfileSetupScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    goBack?: () => void;
  };
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { profile, fetchProfile, createProfile, isLoading, error, clearError } =
    useProfileStore();

  const [age, setAge] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [formErrors, setFormErrors] = useState<{
    age?: string;
    monthlySalary?: string;
    monthlyBudget?: string;
  }>({});

  useEffect(() => {
    fetchProfile().then((p) => {
      if (p) {
        if (p.age) setAge(String(p.age));
        if (p.monthlySalary) setMonthlySalary(String(p.monthlySalary));
        if (p.monthlyInvestmentBudget) setMonthlyBudget(String(p.monthlyInvestmentBudget));
      }
    });
  }, []);

  const validate = (): boolean => {
    const errors: { age?: string; monthlySalary?: string; monthlyBudget?: string } = {};

    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      errors.age = 'Age must be between 18 and 100';
    }

    const salaryNum = parseFloat(monthlySalary);
    if (!monthlySalary || isNaN(salaryNum) || salaryNum <= 0) {
      errors.monthlySalary = 'Monthly salary must be a positive number';
    }

    const budgetNum = parseFloat(monthlyBudget);
    if (!monthlyBudget || isNaN(budgetNum) || budgetNum <= 0) {
      errors.monthlyBudget = 'Monthly investment budget must be a positive number';
    } else if (salaryNum && budgetNum > salaryNum) {
      errors.monthlyBudget = 'Investment budget cannot exceed monthly salary';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    clearError();
    if (!validate()) return;

    try {
      await createProfile({
        age: parseInt(age, 10),
        monthlySalary: parseFloat(monthlySalary),
        monthlyInvestmentBudget: parseFloat(monthlyBudget),
      });

      // Navigate to personalized dashboard
      navigation.navigate('Main');
    } catch {
      // Error handled in store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Financial Profile"
        subtitle="Complete your profile to personalize analysis"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.introBox}>
          <Text style={styles.welcomeText}>Hello, {user?.username || 'Investor'} 👋</Text>
          <Text style={styles.introDesc}>
            InvestIQ calculates whole-share allocations and personalized investment scenarios based on your verified monthly budget in INR (₹).
          </Text>
        </View>

        <Card variant="elevated" style={styles.card}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Age"
            placeholder="e.g. 28"
            value={age}
            onChangeText={(txt) => {
              setAge(txt);
              if (formErrors.age) setFormErrors((p) => ({ ...p, age: undefined }));
            }}
            keyboardType="number-pad"
            error={formErrors.age}
            helperText="Used to contextualize investment horizons"
          />

          <Input
            label="Monthly Salary (₹ INR)"
            placeholder="e.g. 75000"
            value={monthlySalary}
            onChangeText={(txt) => {
              setMonthlySalary(txt);
              if (formErrors.monthlySalary)
                setFormErrors((p) => ({ ...p, monthlySalary: undefined }));
            }}
            keyboardType="numeric"
            error={formErrors.monthlySalary}
            helperText="Your total monthly income"
          />

          <Input
            label="Monthly Investment Budget (₹ INR)"
            placeholder="e.g. 5000"
            value={monthlyBudget}
            onChangeText={(txt) => {
              setMonthlyBudget(txt);
              if (formErrors.monthlyBudget)
                setFormErrors((p) => ({ ...p, monthlyBudget: undefined }));
            }}
            keyboardType="numeric"
            error={formErrors.monthlyBudget}
            helperText="Amount allocated for equity investments each month"
          />

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              🔒 Privacy Guaranteed: Your financial data is securely isolated and never shared or sold.
            </Text>
          </View>

          <Button
            title={profile?.isCompleted ? 'Update Profile' : 'Save & Continue to Dashboard'}
            onPress={handleSave}
            loading={isLoading}
            style={styles.saveBtn}
          />
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
    padding: 20,
  },
  introBox: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  introDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
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
  infoNote: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  infoNoteText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  saveBtn: {
    marginTop: 8,
  },
});
