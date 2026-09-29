import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Button, Header, MetricBadge, LoadingSkeleton } from '../../components/common';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';

interface ProfileScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const { profile, fetchProfile, isLoading } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <View style={styles.container}>
      <Header
        title="Account & Profile"
        subtitle="Manage your credentials and financial preferences"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading && !profile ? (
          <LoadingSkeleton message="Loading profile..." count={2} />
        ) : (
          <>
            <Card variant="elevated" style={styles.userCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.username}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {profile?.isCompleted ? '✓ Profile Completed' : '⚠ Profile Incomplete'}
                  </Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionHeader}>Financial Configuration</Text>
            <Card variant="default">
              <View style={styles.metricsGrid}>
                <MetricBadge
                  label="Monthly Salary"
                  value={profile?.monthlySalary ?? null}
                  unit="INR"
                  status="accent"
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="Investment Budget"
                  value={profile?.monthlyInvestmentBudget ?? null}
                  unit="INR"
                  status="positive"
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.metricsGrid}>
                <MetricBadge
                  label="Age"
                  value={profile?.age ?? null}
                  unit="Yrs"
                  style={{ flex: 1 }}
                />
                <MetricBadge
                  label="Currency"
                  value={profile?.currency || 'INR'}
                  style={{ flex: 1 }}
                />
              </View>

              <Button
                title="Edit Financial Budget"
                onPress={() => navigation.navigate('ProfileSetup')}
                variant="outline"
                size="sm"
                style={{ marginTop: 12 }}
              />
            </Card>

            <Text style={styles.sectionHeader}>Security & Session</Text>
            <Card variant="default">
              <Text style={styles.securityNote}>
                Your session is secured using industry-standard JWT authentication. Tokens are stored encrypted on-device.
              </Text>
              <Button
                title="Sign Out"
                onPress={logout}
                variant="danger"
                size="md"
                style={{ marginTop: 8 }}
              />
            </Card>
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
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  userEmail: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
  },
  securityNote: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
  },
});
