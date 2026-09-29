import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  Input,
  Header,
  Button,
  LoadingSkeleton,
  EmptyState,
  ErrorMessage,
} from '../../components/common';

import { useCompanyStore } from '../../stores/useCompanyStore';
import { Company } from '../../types';
import { companyApi, LiveSearchResultItem } from '../../services/api/company.api';
import { getStockRiskAndProfit } from '../../utils/stockMetrics';

interface ExploreScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const POPULAR_INDIAN_STOCKS = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'TATAMOTORS',
  'ZOMATO',
  'SUZLON',
  'IRFC',
  'ITC',
  'INFY',
  'ADANIENT',
  'PAYTM',
  'MRF',
  'WIPRO',
  'SBIN',
];

const SCRAPE_STEPS = [
  { step: 1, title: 'Connecting to Screener.in live portal...' },
  { step: 2, title: 'Extracting Balance Sheet, P&L & Cash Flow statements...' },
  { step: 3, title: 'Computing deterministic risk score & valuation metrics...' },
  { step: 4, title: 'Indexing financial data for instant AI insights...' },
];

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    companies,
    sectors,
    activeSector,
    searchQuery,
    liveSuggestions,
    isLiveSearching,
    isLoading,
    isScrapingStock,
    error,
    fetchCompanies,
    searchCompanies,
    fetchLiveSuggestions,
    clearLiveSuggestions,
    findAndScrapeCompany,
    fetchSectors,
    setActiveSector,
    setSearchQuery,
  } = useCompanyStore();

  const [refreshing, setRefreshing] = useState(false);

  // Scraper Modal State
  const [scraperModalVisible, setScraperModalVisible] = useState(false);
  const [scraperInput, setScraperInput] = useState('');
  const [modalSuggestions, setModalSuggestions] = useState<LiveSearchResultItem[]>([]);
  const [isModalSearching, setIsModalSearching] = useState(false);
  const [scrapedCompany, setScrapedCompany] = useState<Company | null>(null);
  const [scraperError, setScraperError] = useState<string | null>(null);
  const [activeScrapeStep, setActiveScrapeStep] = useState(0);

  useEffect(() => {
    fetchSectors();
    fetchCompanies();
  }, []);

  // Debounced live suggestion search for main search input
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 1) {
      const timer = setTimeout(() => {
        fetchLiveSuggestions(q);
      }, 220);
      return () => clearTimeout(timer);
    } else {
      clearLiveSuggestions();
    }
  }, [searchQuery]);

  // Debounced live suggestion search for modal input
  useEffect(() => {
    const q = scraperInput.trim();
    if (q.length >= 1) {
      const timer = setTimeout(async () => {
        setIsModalSearching(true);
        try {
          const res = await companyApi.liveSearch(q);
          setModalSuggestions(res);
        } catch {
          setModalSuggestions([]);
        } finally {
          setIsModalSearching(false);
        }
      }, 220);
      return () => clearTimeout(timer);
    } else {
      setModalSuggestions([]);
      setIsModalSearching(false);
    }
  }, [scraperInput]);

  // Step progression animation while scraping
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isScrapingStock) {
      setActiveScrapeStep(0);
      interval = setInterval(() => {
        setActiveScrapeStep((prev) => (prev < SCRAPE_STEPS.length - 1 ? prev + 1 : prev));
      }, 1600);
    } else {
      setActiveScrapeStep(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScrapingStock]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanies();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchCompanies(text);
  };

  const handleOpenScraperModal = (prefill?: string) => {
    if (prefill) {
      setScraperInput(prefill);
    }
    setScraperError(null);
    setScraperModalVisible(true);
  };

  const handleExecuteScrape = async (targetQuery?: string) => {
    const q = (targetQuery || scraperInput || searchQuery).trim();
    if (!q) {
      setScraperError('Please enter a stock ticker or Screener.in URL');
      return;
    }

    setScraperError(null);
    setScrapedCompany(null);
    clearLiveSuggestions();
    setModalSuggestions([]);

    // If modal is not open, open it to show progress & results
    if (!scraperModalVisible) {
      setScraperInput(q);
      setScraperModalVisible(true);
    }

    const result = await findAndScrapeCompany(q);
    if (result) {
      setScrapedCompany(result);
    } else {
      setScraperError(
        `Unable to scrape or locate "${q.toUpperCase()}". Please verify the ticker symbol or paste a direct Screener.in company URL.`
      );
    }
  };

  const handleSelectCompany = (company: Company) => {
    clearLiveSuggestions();
    navigation.navigate('CompanyDetail', {
      companyId: company._id,
      symbol: company.symbol,
      companyName: company.companyName,
    });
  };

  const handleSuggestionPress = (item: LiveSearchResultItem) => {
    clearLiveSuggestions();
    if (item.inDatabase && item.companyId) {
      navigation.navigate('CompanyDetail', {
        companyId: item.companyId,
        symbol: item.symbol,
        companyName: item.name,
      });
    } else {
      // Trigger live scrape on Screener.in
      handleOpenScraperModal(item.symbol);
      handleExecuteScrape(item.symbol);
    }
  };

  const handleNavigateAnalysis = (company: Company) => {
    setScraperModalVisible(false);
    clearLiveSuggestions();
    navigation.navigate('Analysis', {
      companyId: company._id,
      symbol: company.symbol,
    });
  };

  const handleNavigateBuyAnalysis = (company: Company) => {
    setScraperModalVisible(false);
    clearLiveSuggestions();
    navigation.navigate('BuyAnalysis', {
      companyId: company._id,
      symbol: company.symbol,
      companyName: company.companyName,
    });
  };

  const handleNavigateSellAnalysis = (company: Company) => {
    setScraperModalVisible(false);
    clearLiveSuggestions();
    navigation.navigate('SellAnalysis', {
      companyId: company._id,
      symbol: company.symbol,
      companyName: company.companyName,
    });
  };

  const handleNavigateChat = (company: Company) => {
    setScraperModalVisible(false);
    clearLiveSuggestions();
    navigation.navigate('Chat', {
      companyId: company._id,
      companyName: company.companyName,
      symbol: company.symbol,
    });
  };

  // Other stocks excluding the currently scraped/selected one
  const otherStocks = useMemo(() => {
    if (!scrapedCompany) return companies;
    return companies.filter((c) => c._id !== scrapedCompany._id && c.symbol !== scrapedCompany.symbol);
  }, [companies, scrapedCompany]);

  const renderCompanyCard = ({ item }: { item: Company }) => {
    const metrics = getStockRiskAndProfit(item);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleSelectCompany(item)}
      >
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.symbolHeaderRow}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <View style={styles.exchangePill}>
                  <Text style={styles.exchangePillText}>
                    {item.exchange?.length ? item.exchange.join('/') : 'NSE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.companyName} numberOfLines={1}>
                {item.companyName}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.sharePrice}>
                {item.sharePrice !== null && item.sharePrice !== undefined
                  ? `₹${item.sharePrice.toLocaleString('en-IN')}`
                  : 'N/A'}
              </Text>
              <Text style={styles.sectorText}>{item.sector}</Text>
            </View>
          </View>

          {/* Risk Value & Profit Potential */}
          <View style={styles.riskProfitRow}>
            <View style={styles.riskBadge}>
              <Text style={styles.riskLabel}>Risk Value</Text>
              <Text
                style={[
                  styles.riskValue,
                  metrics.riskPercentage <= 25
                    ? { color: '#10B981' }
                    : metrics.riskPercentage <= 60
                    ? { color: '#F59E0B' }
                    : { color: '#EF4444' },
                ]}
              >
                🛡️ {metrics.riskPercentage}% ({metrics.riskLevel})
              </Text>
            </View>
            <View style={styles.profitBadge}>
              <Text style={styles.profitLabel}>Profit Potential</Text>
              <Text style={styles.profitValue}>
                📈 +{metrics.profitPercentage}% p.a.
              </Text>
            </View>
          </View>

          {/* Financial Metrics */}
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
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Debt/Eq</Text>
              <Text style={styles.metricVal}>
                {item.financialMetrics?.debtToEquity !== null &&
                item.financialMetrics?.debtToEquity !== undefined
                  ? item.financialMetrics.debtToEquity
                  : '0'}
              </Text>
            </View>
          </View>

          {/* Action Buttons: Clear Analysis Buttons for Every Stock */}
          <View style={styles.cardActionsContainer}>
            <View style={styles.cardActionsRow}>
              <Button
                title="📊 Analysis"
                onPress={() => handleNavigateAnalysis(item)}
                variant="primary"
                size="sm"
                style={styles.cardBtn}
              />
              <Button
                title="🟢 Buy Analysis"
                onPress={() => handleNavigateBuyAnalysis(item)}
                variant="outline"
                size="sm"
                style={styles.cardBtn}
              />
            </View>
            <View style={[styles.cardActionsRow, { marginTop: 6 }]}>
              <Button
                title="🔴 Sell Analysis"
                onPress={() => handleNavigateSellAnalysis(item)}
                variant="secondary"
                size="sm"
                style={[styles.cardBtn, styles.sellBtnOutline]}
                textStyle={{ color: '#F87171' }}
              />
              <Button
                title="🤖 Ask AI"
                onPress={() => handleNavigateChat(item)}
                variant="secondary"
                size="sm"
                style={styles.cardBtn}
              />
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

      {/* Prominent Screener Stock Finder & Scraper Banner */}
      <View style={styles.topFeatureContainer}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleOpenScraperModal()}
          style={styles.featureCard}
        >
          <View style={styles.featureCardContent}>
            <View style={styles.featureIconBadge}>
              <Text style={{ fontSize: 20 }}>⚡</Text>
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.featureHeaderRow}>
                <Text style={styles.featureTitle}>Find Stock by Scraping Screener</Text>
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>LIVE SCRAPER</Text>
                </View>
              </View>
              <Text style={styles.featureDescription}>
                Can't find a stock? Enter any Indian symbol or Screener.in URL to scrape live financials & AI analysis.
              </Text>
            </View>
          </View>
          <View style={styles.featureActionRow}>
            <Text style={styles.featureActionText}>🔍 Open Stock Scraper & Finder</Text>
            <Text style={styles.featureActionArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <Input
          placeholder="Search by company name or symbol (e.g. INFY, Tata)..."
          value={searchQuery}
          onChangeText={handleSearch}
          containerStyle={{ marginBottom: 8 }}
        />

        {/* Live Smooth Autocomplete Suggestions Container */}
        {searchQuery.trim().length >= 1 && liveSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsTitle}>
                ⚡ Instant Search Suggestions
              </Text>
              {isLiveSearching && <ActivityIndicator size="small" color="#60A5FA" />}
            </View>
            {liveSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionRow}
                activeOpacity={0.7}
                onPress={() => handleSuggestionPress(item)}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={styles.suggestionSymbolRow}>
                    <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                    {item.inDatabase ? (
                      <View style={styles.inDbBadge}>
                        <Text style={styles.inDbBadgeText}>
                          ✓ Tracked {item.sharePrice ? `· ₹${item.sharePrice}` : ''}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.screenerLiveBadge}>
                        <Text style={styles.screenerLiveBadgeText}>⚡ Scrape on Screener</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <Text style={styles.suggestionArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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

        {/* Live Screener Search & Scrape Prompt Card */}
        {searchQuery.trim().length >= 2 && !isScrapingStock && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleExecuteScrape(searchQuery)}
            style={styles.liveScrapeBanner}
          >
            <View style={styles.liveScrapeIconBox}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.liveScrapeTitle}>
                Find & Scrape "{searchQuery.toUpperCase()}" on Screener.in
              </Text>
              <Text style={styles.liveScrapeSub}>
                Fetch live fundamentals, P&L, balance sheets & deterministic valuation
              </Text>
            </View>
            <View style={styles.liveScrapeBadge}>
              <Text style={styles.liveScrapeBadgeText}>Scrape</Text>
            </View>
          </TouchableOpacity>
        )}
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
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={
                searchQuery
                  ? `No Local Results for "${searchQuery}"`
                  : 'No Companies Found'
              }
              message={
                searchQuery
                  ? `"${searchQuery}" is not yet in your local database. Tap below to fetch its financial fundamentals & AI analysis live from Screener.in.`
                  : 'No Indian companies are currently loaded.'
              }
              actionText={
                searchQuery
                  ? `⚡ Scrape & Analyze "${searchQuery.toUpperCase()}" on Screener`
                  : 'Reset Filters'
              }
              onAction={() => {
                if (searchQuery) {
                  handleExecuteScrape(searchQuery);
                } else {
                  setSearchQuery('');
                  setActiveSector(null);
                }
              }}
            />
          }
        />
      )}

      {/* ========================================================================= */}
      {/* SCREENER.IN STOCK FINDER & SCRAPER MODAL FEATURE                          */}
      {/* ========================================================================= */}
      <Modal
        visible={scraperModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScraperModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>⚡ Screener Stock Scraper</Text>
                <View style={styles.liveBadgeSmall}>
                  <Text style={styles.liveBadgeSmallText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.modalSubtitle}>
                Find, scrape & analyze ANY Indian company from Screener.in
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setScraperModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 20 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Input & Scrape Trigger Section */}
            <Card variant="elevated" style={styles.scraperSearchCard}>
              <Text style={styles.inputSectionLabel}>Stock Symbol or Screener.in URL</Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={styles.scraperTextInput}
                  placeholder="e.g. ZOMATO, TATAMOTORS, SUZLON..."
                  placeholderTextColor="#64748B"
                  value={scraperInput}
                  onChangeText={(text) => {
                    setScraperInput(text);
                    if (scraperError) setScraperError(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isScrapingStock}
                />
                {scraperInput.length > 0 && !isScrapingStock && (
                  <TouchableOpacity
                    onPress={() => {
                      setScraperInput('');
                      setModalSuggestions([]);
                    }}
                    style={styles.clearInputBtn}
                  >
                    <Text style={styles.clearInputText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Modal Autocomplete Suggestions */}
              {scraperInput.trim().length >= 1 && modalSuggestions.length > 0 && !isScrapingStock && (
                <View style={styles.modalSuggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsTitle}>Matching Companies</Text>
                    {isModalSearching && <ActivityIndicator size="small" color="#60A5FA" />}
                  </View>
                  {modalSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.suggestionRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        setScraperInput(item.symbol);
                        setModalSuggestions([]);
                        handleExecuteScrape(item.symbol);
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={styles.suggestionSymbolRow}>
                          <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                          {item.inDatabase ? (
                            <View style={styles.inDbBadge}>
                              <Text style={styles.inDbBadgeText}>In Database</Text>
                            </View>
                          ) : (
                            <View style={styles.screenerLiveBadge}>
                              <Text style={styles.screenerLiveBadgeText}>⚡ Scrape on Screener</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={styles.suggestionArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quick Suggestion Pills */}
              <Text style={styles.popularLabel}>Popular Indian Equities (Tap to Scrape):</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.popularScrollView}
              >
                {POPULAR_INDIAN_STOCKS.map((sym) => (
                  <TouchableOpacity
                    key={sym}
                    style={[
                      styles.popularPill,
                      scraperInput.toUpperCase() === sym ? styles.popularPillActive : null,
                    ]}
                    onPress={() => {
                      setScraperInput(sym);
                      handleExecuteScrape(sym);
                    }}
                    disabled={isScrapingStock}
                  >
                    <Text
                      style={[
                        styles.popularPillText,
                        scraperInput.toUpperCase() === sym ? styles.popularPillTextActive : null,
                      ]}
                    >
                      {sym}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Scrape Action Button */}
              <Button
                title={isScrapingStock ? 'Scraping Screener.in...' : '⚡ Scrape & Analyze Stock'}
                onPress={() => handleExecuteScrape()}
                variant="primary"
                size="md"
                loading={isScrapingStock}
                style={{ marginTop: 14 }}
              />
            </Card>

            {/* Live Scraping Progress Indicator */}
            {isScrapingStock && (
              <Card variant="elevated" style={styles.progressCard}>
                <View style={styles.progressHeaderRow}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.progressTitle}>
                    Scraping "{scraperInput.toUpperCase()}" Live...
                  </Text>
                </View>
                <View style={styles.stepsList}>
                  {SCRAPE_STEPS.map((s, idx) => {
                    const isDone = activeScrapeStep > idx;
                    const isCurrent = activeScrapeStep === idx;
                    return (
                      <View key={s.step} style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepCircle,
                            isDone
                              ? styles.stepCircleDone
                              : isCurrent
                              ? styles.stepCircleActive
                              : styles.stepCirclePending,
                          ]}
                        >
                          <Text style={styles.stepCircleText}>
                            {isDone ? '✓' : s.step}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.stepText,
                            isCurrent
                              ? styles.stepTextActive
                              : isDone
                              ? styles.stepTextDone
                              : styles.stepTextPending,
                          ]}
                        >
                          {s.title}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Error Message */}
            {scraperError && !isScrapingStock && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Scraping Notice</Text>
                  <Text style={styles.errorMessageText}>{scraperError}</Text>
                </View>
              </View>
            )}

            {/* Scraped Result Showcase */}
            {scrapedCompany && !isScrapingStock && (
              <View style={styles.resultSection}>
                <View style={styles.resultSuccessBanner}>
                  <Text style={styles.resultSuccessIcon}>🎉</Text>
                  <Text style={styles.resultSuccessText}>
                    Successfully Scraped & Indexed from Screener.in!
                  </Text>
                </View>

                {/* Scraped Company Card */}
                <Card variant="elevated" style={styles.scrapedStockCard}>
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={styles.symbolHeaderRow}>
                        <Text style={styles.scrapedSymbol}>{scrapedCompany.symbol}</Text>
                        <View style={styles.liveSourceBadge}>
                          <Text style={styles.liveSourceBadgeText}>Screener.in</Text>
                        </View>
                      </View>
                      <Text style={styles.scrapedName} numberOfLines={2}>
                        {scrapedCompany.companyName}
                      </Text>
                      <Text style={styles.scrapedSector}>
                        {scrapedCompany.sector} · {scrapedCompany.exchange?.join('/') || 'NSE'}
                      </Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.scrapedPrice}>
                        {scrapedCompany.sharePrice !== null && scrapedCompany.sharePrice !== undefined
                          ? `₹${scrapedCompany.sharePrice.toLocaleString('en-IN')}`
                          : 'N/A'}
                      </Text>
                      <Text style={styles.scrapedPriceLabel}>Current Market Price</Text>
                    </View>
                  </View>

                  {/* Risk & Profit potential for scraped stock */}
                  {(() => {
                    const m = getStockRiskAndProfit(scrapedCompany);
                    return (
                      <View style={styles.riskProfitRow}>
                        <View style={styles.riskBadge}>
                          <Text style={styles.riskLabel}>Risk Value</Text>
                          <Text
                            style={[
                              styles.riskValue,
                              m.riskPercentage <= 25
                                ? { color: '#10B981' }
                                : m.riskPercentage <= 60
                                ? { color: '#F59E0B' }
                                : { color: '#EF4444' },
                            ]}
                          >
                            🛡️ {m.riskPercentage}% ({m.riskLevel})
                          </Text>
                        </View>
                        <View style={styles.profitBadge}>
                          <Text style={styles.profitLabel}>Profit Potential</Text>
                          <Text style={styles.profitValue}>
                            📈 +{m.profitPercentage}% p.a.
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Scraped Stock Fundamentals Grid */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Market Cap</Text>
                      <Text style={styles.metricVal}>
                        {scrapedCompany.marketCap
                          ? `₹${scrapedCompany.marketCap.toLocaleString('en-IN')} Cr`
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>ROE</Text>
                      <Text style={styles.metricVal}>
                        {scrapedCompany.financialMetrics?.roe !== null &&
                        scrapedCompany.financialMetrics?.roe !== undefined
                          ? `${scrapedCompany.financialMetrics.roe}%`
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>P/E Ratio</Text>
                      <Text style={styles.metricVal}>
                        {scrapedCompany.financialMetrics?.peRatio !== null &&
                        scrapedCompany.financialMetrics?.peRatio !== undefined
                          ? scrapedCompany.financialMetrics.peRatio
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Debt/Eq</Text>
                      <Text style={styles.metricVal}>
                        {scrapedCompany.financialMetrics?.debtToEquity !== null &&
                        scrapedCompany.financialMetrics?.debtToEquity !== undefined
                          ? scrapedCompany.financialMetrics.debtToEquity
                          : '0'}
                      </Text>
                    </View>
                  </View>

                  {/* Dedicated Analysis Buttons for the Scraped Stock */}
                  <Text style={styles.scrapedActionTitle}>
                    Analysis & Investment Decisions for {scrapedCompany.symbol}:
                  </Text>

                  <View style={styles.scrapedButtonsGrid}>
                    <Button
                      title="📊 Stock Analysis Report"
                      onPress={() => handleNavigateAnalysis(scrapedCompany)}
                      variant="primary"
                      size="md"
                      style={styles.scrapedPrimaryBtn}
                    />

                    <View style={styles.scrapedSubButtonsRow}>
                      <Button
                        title="🟢 Buy Analysis"
                        onPress={() => handleNavigateBuyAnalysis(scrapedCompany)}
                        variant="outline"
                        size="sm"
                        style={styles.cardBtn}
                      />
                      <Button
                        title="🔴 Sell Analysis"
                        onPress={() => handleNavigateSellAnalysis(scrapedCompany)}
                        variant="secondary"
                        size="sm"
                        style={[styles.cardBtn, styles.sellBtnOutline]}
                        textStyle={{ color: '#F87171' }}
                      />
                    </View>

                    <View style={[styles.scrapedSubButtonsRow, { marginTop: 8 }]}>
                      <Button
                        title={`🏢 Details & Fundamentals`}
                        onPress={() => {
                          setScraperModalVisible(false);
                          handleSelectCompany(scrapedCompany);
                        }}
                        variant="secondary"
                        size="sm"
                        style={styles.cardBtn}
                      />
                      <Button
                        title="🤖 Ask AI"
                        onPress={() => handleNavigateChat(scrapedCompany)}
                        variant="secondary"
                        size="sm"
                        style={styles.cardBtn}
                      />
                    </View>
                  </View>
                </Card>
              </View>
            )}

            {/* ========================================================================= */}
            {/* OTHER STOCKS TO ANALYZE SECTION (GIVE ANALYSIS BUTTON FOR OTHER STOCKS)   */}
            {/* ========================================================================= */}
            <View style={styles.otherStocksSection}>
              <View style={styles.otherStocksHeaderRow}>
                <View>
                  <Text style={styles.otherStocksTitle}>📊 Other Stocks to Analyze</Text>
                  <Text style={styles.otherStocksSubtitle}>
                    Compare with other verified Indian equities:
                  </Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{otherStocks.length} Stocks</Text>
                </View>
              </View>

              {otherStocks.slice(0, 10).map((other) => {
                const otherMetrics = getStockRiskAndProfit(other);
                return (
                  <Card key={other._id} variant="default" style={styles.otherStockCard}>
                    <View style={styles.otherStockTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={styles.symbolHeaderRow}>
                          <Text style={styles.otherStockSymbol}>{other.symbol}</Text>
                          <Text style={styles.otherStockSector}>· {other.sector}</Text>
                        </View>
                        <Text style={styles.otherStockName} numberOfLines={1}>
                          {other.companyName}
                        </Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.otherStockPrice}>
                          {other.sharePrice !== null && other.sharePrice !== undefined
                            ? `₹${other.sharePrice.toLocaleString('en-IN')}`
                            : 'N/A'}
                        </Text>
                        <Text style={styles.otherStockRisk}>
                          🛡️ {otherMetrics.riskPercentage}% Risk
                        </Text>
                      </View>
                    </View>

                    {/* Quick Analysis Buttons for Other Stocks */}
                    <View style={styles.otherActionsRow}>
                      <TouchableOpacity
                        style={styles.otherActionBtnPrimary}
                        onPress={() => handleNavigateAnalysis(other)}
                      >
                        <Text style={styles.otherActionBtnPrimaryText}>📊 Analysis</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.otherActionBtnBuy}
                        onPress={() => handleNavigateBuyAnalysis(other)}
                      >
                        <Text style={styles.otherActionBtnBuyText}>🟢 Buy Analysis</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.otherActionBtnSell}
                        onPress={() => handleNavigateSellAnalysis(other)}
                      >
                        <Text style={styles.otherActionBtnSellText}>🔴 Sell Analysis</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  topFeatureContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  featureCard: {
    backgroundColor: '#0F1A2E',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  featureCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  featureBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featureBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  featureDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
  },
  featureActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featureActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  featureActionArrow: {
    fontSize: 14,
    fontWeight: '800',
    color: '#60A5FA',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  suggestionsContainer: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  suggestionSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#60A5FA',
  },
  suggestionName: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  inDbBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#059669',
  },
  inDbBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  screenerLiveBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  screenerLiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93C5FD',
  },
  suggestionArrow: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '800',
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
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  symbolHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3B82F6',
  },
  exchangePill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exchangePillText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
  },
  companyName: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    maxWidth: 210,
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
    marginTop: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#6B7280',
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  metricVal: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  riskProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
  },
  riskBadge: {
    flex: 1,
  },
  riskLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  riskValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  profitBadge: {
    flex: 1,
    alignItems: 'flex-end',
  },
  profitLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  profitValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  cardActionsContainer: {
    marginTop: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardBtn: {
    flex: 1,
  },
  sellBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  liveScrapeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1E36',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  liveScrapeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  liveScrapeTitle: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '700',
  },
  liveScrapeSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  liveScrapeBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveScrapeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ================= MODAL STYLES ================= */
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#0F1318',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveBadgeSmall: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeSmallText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  scraperSearchCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#0F141C',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  inputSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  scraperTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 12,
    fontWeight: '600',
  },
  clearInputBtn: {
    padding: 6,
  },
  clearInputText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSuggestionsContainer: {
    backgroundColor: '#0B1322',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  popularLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  popularScrollView: {
    marginBottom: 4,
  },
  popularPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  popularPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  popularPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  popularPillTextActive: {
    color: '#FFFFFF',
  },
  progressCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#0F1E36',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60A5FA',
  },
  stepsList: {
    gap: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCirclePending: {
    backgroundColor: '#1E293B',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepCircleDone: {
    backgroundColor: '#10B981',
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 12,
    flex: 1,
  },
  stepTextPending: {
    color: '#64748B',
  },
  stepTextActive: {
    color: '#93C5FD',
    fontWeight: '700',
  },
  stepTextDone: {
    color: '#34D399',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#3F1212',
    borderWidth: 1,
    borderColor: '#991B1B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorIcon: {
    fontSize: 18,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
    marginBottom: 2,
  },
  errorMessageText: {
    fontSize: 11,
    color: '#FECACA',
    lineHeight: 16,
  },
  resultSection: {
    marginBottom: 20,
  },
  resultSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  resultSuccessIcon: {
    fontSize: 14,
  },
  resultSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  scrapedStockCard: {
    backgroundColor: '#0F1A2E',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    padding: 16,
  },
  scrapedSymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3B82F6',
  },
  liveSourceBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  liveSourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93C5FD',
  },
  scrapedName: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 2,
  },
  scrapedSector: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  scrapedPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrapedPriceLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  scrapedActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 14,
    marginBottom: 10,
  },
  scrapedButtonsGrid: {
    gap: 8,
  },
  scrapedPrimaryBtn: {
    width: '100%',
  },
  scrapedSubButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  /* Other Stocks Section */
  otherStocksSection: {
    marginTop: 8,
  },
  otherStocksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  otherStocksTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  otherStocksSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  otherStockCard: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#0F141C',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  otherStockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  otherStockSymbol: {
    fontSize: 15,
    fontWeight: '800',
    color: '#60A5FA',
  },
  otherStockSector: {
    fontSize: 11,
    color: '#64748B',
  },
  otherStockName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  otherStockPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otherStockRisk: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 2,
  },
  otherActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  otherActionBtnPrimary: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherActionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  otherActionBtnBuy: {
    flex: 1,
    backgroundColor: '#064E3B',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#059669',
  },
  otherActionBtnBuyText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  otherActionBtnSell: {
    flex: 1,
    backgroundColor: '#3F1212',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  otherActionBtnSellText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
});
