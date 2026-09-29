import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Input,
  Header,
  LoadingSkeleton,
  EmptyState,
  ErrorMessage,
} from '../../components/common';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { Company } from '../../types';

interface ExploreScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ navigation }) => {
  const {
    companies,
    sectors,
    activeSector,
    searchQuery,
    isLoading,
    error,
    fetchCompanies,
    searchCompanies,
    fetchSectors,
    setActiveSector,
    setSearchQuery,
  } = useCompanyStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSectors();
    fetchCompanies();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanies();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchCompanies(text);
  };

  const handleSelectCompany = (company: Company) => {
    navigation.navigate('CompanyDetail', {
      companyId: company._id,
      symbol: company.symbol,
      companyName: company.companyName,
    });
  };

  const renderCompanyCard = ({ item }: { item: Company }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleSelectCompany(item)}
      >
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.companyName} numberOfLines={1}>
                {item.companyName}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.sharePrice}>
                {item.sharePrice !== null
                  ? `₹${item.sharePrice.toLocaleString('en-IN')}`
                  : 'N/A'}
              </Text>
              <Text style={styles.sectorText}>{item.sector}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Market Cap</Text>
              <Text style={styles.metricVal}>
                {item.marketCap ? `₹${item.marketCap.toLocaleString('en-IN')} Cr` : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ROE</Text>
              <Text style={styles.metricVal}>
                {item.financialMetrics?.roe !== null && item.financialMetrics?.roe !== undefined
                  ? `${item.financialMetrics.roe}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>P/E Ratio</Text>
              <Text style={styles.metricVal}>
                {item.financialMetrics?.peRatio !== null &&
                item.financialMetrics?.peRatio !== undefined
                  ? item.financialMetrics.peRatio
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Explore Equities"
        subtitle="Verified Indian stocks & financial fundamentals"
      />

      <View style={styles.searchSection}>
        <Input
          placeholder="Search by company name or symbol (e.g. INFY, Tata)..."
          value={searchQuery}
          onChangeText={handleSearch}
          containerStyle={{ marginBottom: 8 }}
        />

        {/* Sectors Horizontal Pill Filter */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...sectors]}
          keyExtractor={(item) => item}
          style={styles.sectorsScroll}
          renderItem={({ item }) => {
            const isSelected =
              (item === 'All' && !activeSector) || activeSector === item;

            return (
              <TouchableOpacity
                style={[
                  styles.sectorPill,
                  isSelected ? styles.sectorPillActive : null,
                ]}
                onPress={() => setActiveSector(item === 'All' ? null : item)}
              >
                <Text
                  style={[
                    styles.sectorPillText,
                    isSelected ? styles.sectorPillTextActive : null,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {error ? (
        <ErrorMessage message={error} onRetry={() => fetchCompanies()} />
      ) : null}

      {isLoading && !refreshing ? (
        <LoadingSkeleton message="Searching companies..." count={4} />
      ) : (
        <FlatList
          data={companies}
          keyExtractor={(item) => item._id}
          renderItem={renderCompanyCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No Companies Found"
              message={
                searchQuery
                  ? `No results matching "${searchQuery}". Try a different search term or sector.`
                  : 'No Indian companies are currently loaded.'
              }
              actionText="Reset Filters"
              onAction={() => {
                setSearchQuery('');
                setActiveSector(null);
              }}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectorsScroll: {
    marginBottom: 8,
  },
  sectorPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectorPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  sectorPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  sectorPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  symbol: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3B82F6',
  },
  companyName: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    maxWidth: 200,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  sharePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  sectorText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#6B7280',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metricVal: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
