import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, Card } from '../../components/common';
import { useChatStore } from '../../stores/useChatStore';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { companyApi, LiveSearchResultItem } from '../../services/api/company.api';

interface AiChatScreenProps {
  route?: {
    params?: {
      companyId?: string;
      companyName?: string;
      symbol?: string;
    };
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export const AiChatScreen: React.FC<AiChatScreenProps> = ({ route }) => {
  const insets = useSafeAreaInsets();
  const {
    companies,
    fetchCompanies,
    findAndScrapeCompany,
  } = useCompanyStore();

  const {
    messages,
    selectedCompanyId,
    isLoading,
    isStreaming,
    streamingText,
    streamingMetadata,
    isRefreshingLive,
    error,
    setCompanyId,
    sendMessage,
    refreshActiveCompanyLive,
    clearChat,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LiveSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies({ page: 1 });
    }
  }, []);

  useEffect(() => {
    if (route?.params?.companyId) {
      setCompanyId(route.params.companyId);
    } else if (!selectedCompanyId && companies.length > 0) {
      setCompanyId(companies[0]._id);
    }
  }, [route?.params?.companyId, companies]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, streamingText]);

  // Debounced search for company switcher modal
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 1) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await companyApi.liveSearch(q);
          setSearchResults(res);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 220);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading || isStreaming) return;
    setInputMessage('');
    sendMessage(text);
  };

  const handleSelectSearchResult = async (item: LiveSearchResultItem) => {
    setSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);

    if (item.inDatabase && item.companyId) {
      setCompanyId(item.companyId);
    } else {
      // Scrape from Screener.in on the fly and set active
      const scraped = await findAndScrapeCompany(item.symbol);
      if (scraped) {
        setCompanyId(scraped._id);
      }
    }
  };

  const selectedCompany = companies.find((c) => c._id === selectedCompanyId);

  const DYNAMIC_PROMPTS = [
    `Is ${selectedCompany?.symbol || 'this stock'}'s Debt-to-Equity ratio safe?`,
    `Explain the Free Cash Flow trend for ${selectedCompany?.symbol || 'this company'}.`,
    `Is ${selectedCompany?.symbol || 'this stock'} currently overvalued or undervalued?`,
    `Evaluate Buy vs Sell risk profile for ${selectedCompany?.symbol || 'this company'}.`,
    `Break down ROE and Operating Margins for ${selectedCompany?.symbol || 'this company'}.`,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Header
        title="InvestIQ AI Chat"
        subtitle={
          selectedCompany
            ? `Real-Time RAG: ${selectedCompany.symbol} (${selectedCompany.companyName})`
            : 'Select an Indian company'
        }
        rightAction={
          messages.length > 0 || isStreaming ? (
            <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Company Selector Ribbon with Live Search Trigger */}
      <View style={styles.ribbonContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ribbonScroll}
        >
          <TouchableOpacity
            style={styles.searchPill}
            onPress={() => setSearchModalVisible(true)}
          >
            <Text style={styles.searchPillIcon}>🔍</Text>
            <Text style={styles.searchPillText}>Search / Scrape</Text>
          </TouchableOpacity>

          {companies.map((c) => {
            const isSelected = selectedCompanyId === c._id;
            return (
              <TouchableOpacity
                key={c._id}
                style={[
                  styles.companyChip,
                  isSelected ? styles.companyChipActive : null,
                ]}
                onPress={() => setCompanyId(c._id)}
              >
                <Text
                  style={[
                    styles.companyChipText,
                    isSelected ? styles.companyChipTextActive : null,
                  ]}
                >
                  {c.symbol}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Company Live Context Card with Real-time Refresh */}
      {selectedCompany && (
        <View style={styles.contextBar}>
          <View style={styles.contextTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.contextSymbolRow}>
                <Text style={styles.contextSymbol}>{selectedCompany.symbol}</Text>
                <View style={styles.liveVerifiedBadge}>
                  <Text style={styles.liveVerifiedBadgeText}>Screener.in Verified</Text>
                </View>
                <TouchableOpacity
                  style={styles.liveRefreshBtn}
                  onPress={refreshActiveCompanyLive}
                  disabled={isRefreshingLive}
                >
                  {isRefreshingLive ? (
                    <ActivityIndicator size="small" color="#60A5FA" style={{ transform: [{ scale: 0.75 }] }} />
                  ) : (
                    <Text style={styles.liveRefreshText}>🔄 Re-scrape Live</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.contextName} numberOfLines={1}>
                {selectedCompany.companyName} · {selectedCompany.sector}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.contextPrice}>
                {selectedCompany.sharePrice !== null && selectedCompany.sharePrice !== undefined
                  ? `₹${selectedCompany.sharePrice.toLocaleString('en-IN')}`
                  : 'N/A'}
              </Text>
              <Text style={styles.contextPriceLabel}>Market Price</Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.contextMetricsRow}>
            <View style={styles.contextMetricItem}>
              <Text style={styles.contextMetricLabel}>P/E</Text>
              <Text style={styles.contextMetricVal}>
                {selectedCompany.financialMetrics?.peRatio ?? 'N/A'}
              </Text>
            </View>
            <View style={styles.contextMetricItem}>
              <Text style={styles.contextMetricLabel}>Debt/Eq</Text>
              <Text style={styles.contextMetricVal}>
                {selectedCompany.financialMetrics?.debtToEquity ?? '0'}
              </Text>
            </View>
            <View style={styles.contextMetricItem}>
              <Text style={styles.contextMetricLabel}>ROE</Text>
              <Text style={styles.contextMetricVal}>
                {selectedCompany.financialMetrics?.roe !== null && selectedCompany.financialMetrics?.roe !== undefined
                  ? `${selectedCompany.financialMetrics.roe}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.contextMetricItem}>
              <Text style={styles.contextMetricLabel}>OPM</Text>
              <Text style={styles.contextMetricVal}>
                {selectedCompany.financialMetrics?.opm !== null && selectedCompany.financialMetrics?.opm !== undefined
                  ? `${selectedCompany.financialMetrics.opm}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.contextMetricItem}>
              <Text style={styles.contextMetricLabel}>52W High</Text>
              <Text style={styles.contextMetricVal}>
                {selectedCompany.high52Week ? `₹${selectedCompany.high52Week}` : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Messages Scroll View */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.messagesScroll,
          { paddingBottom: Math.max(insets.bottom, 12) + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !isStreaming ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeEmoji}>⚡</Text>
            <Text style={styles.welcomeTitle}>
              Real-Time AI Financial Chat
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Live Screener.in financial scraping + Qdrant RAG vector retrieval + LLM synthesis for {selectedCompany ? selectedCompany.symbol : 'Indian Equities'}.
            </Text>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsHeading}>Instant Analysis Prompts:</Text>
              {DYNAMIC_PROMPTS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionPill}
                  activeOpacity={0.75}
                  onPress={() => handleSend(q)}
                >
                  <Text style={styles.suggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <View style={styles.messageHeaderRow}>
                  <Text style={styles.messageRole}>
                    {isUser ? 'You' : 'InvestIQ AI · RAG & Scraped Data'}
                  </Text>
                  {!isUser && (
                    <View style={styles.modelPill}>
                      <Text style={styles.modelPillText}>GPT-OSS 4B · Verified</Text>
                    </View>
                  )}
                </View>

                {/* Scraped Data Badge for Assistant */}
                {!isUser && msg.isLiveScraped && (
                  <View style={styles.scrapedDataBadgeRow}>
                    <Text style={styles.scrapedDataBadgeText}>
                      🟢 Live Screener.in Scraped Fundamentals {msg.scrapedAt ? `(${msg.scrapedAt})` : ''}
                    </Text>
                  </View>
                )}

                <Text style={styles.messageContent}>{msg.content}</Text>

                {msg.sources && msg.sources.length > 0 ? (
                  <View style={styles.sourcesBox}>
                    <Text style={styles.sourcesHeading}>
                      📑 Sources: {msg.sources.join(', ')}
                    </Text>
                    {msg.reportingPeriods && msg.reportingPeriods.length > 0 ? (
                      <Text style={styles.sourcesSub}>
                        Reporting Periods: {msg.reportingPeriods.join(', ')}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {/* Real-time Streaming Message Bubble */}
        {isStreaming && (
          <View style={[styles.messageBubble, styles.assistantBubble, styles.streamingBubble]}>
            <View style={styles.messageHeaderRow}>
              <View style={styles.streamingHeaderLeft}>
                <View style={styles.pulseDot} />
                <Text style={styles.messageRole}>Streaming RAG & Scraped Data</Text>
              </View>
              <View style={[styles.modelPill, { backgroundColor: '#1E3A8A' }]}>
                <Text style={[styles.modelPillText, { color: '#93C5FD' }]}>Live Token Stream</Text>
              </View>
            </View>

            {streamingMetadata?.company && (
              <View style={styles.scrapedDataBadgeRow}>
                <Text style={styles.scrapedDataBadgeText}>
                  🟢 Screener.in: {streamingMetadata.company.symbol} · ₹{streamingMetadata.company.sharePrice ?? 'N/A'} · P/E: {streamingMetadata.company.peRatio ?? 'N/A'}
                </Text>
              </View>
            )}

            <Text style={styles.messageContent}>
              {streamingText}
              <Text style={styles.blinkingCursor}> ▌</Text>
            </Text>
          </View>
        )}

        {/* Initial Loading Indicator before first token */}
        {isLoading && !isStreaming ? (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 10 }} />
            <Text style={styles.loadingText}>
              Retrieving verified facts from Screener.in & synthesizing RAG response...
            </Text>
          </View>
        ) : null}

        {error ? (
          <Card variant="default" style={styles.errorCard}>
            <Text style={styles.errorCardText}>{error}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Live Fundamental Quick-Chips Bar */}
      {selectedCompany && (
        <View style={styles.quickChipsStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsScroll}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleSend(`Is ${selectedCompany.symbol}'s P/E of ${selectedCompany.financialMetrics?.peRatio ?? 'N/A'} attractive relative to growth?`)}
              disabled={isLoading || isStreaming}
            >
              <Text style={styles.quickChipText}>📊 Valuation & P/E</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleSend(`Is ${selectedCompany.symbol}'s Debt-to-Equity of ${selectedCompany.financialMetrics?.debtToEquity ?? '0'} safe?`)}
              disabled={isLoading || isStreaming}
            >
              <Text style={styles.quickChipText}>🛡️ Debt & Solvency</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleSend(`Explain Free Cash Flow and ROE (${selectedCompany.financialMetrics?.roe ?? 'N/A'}%) for ${selectedCompany.symbol}.`)}
              disabled={isLoading || isStreaming}
            >
              <Text style={styles.quickChipText}>💰 FCF & ROE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleSend(`Evaluate current 52-Week range (High ₹${selectedCompany.high52Week ?? 'N/A'}, Low ₹${selectedCompany.low52Week ?? 'N/A'}) for ${selectedCompany.symbol}.`)}
              disabled={isLoading || isStreaming}
            >
              <Text style={styles.quickChipText}>📈 52W Range</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleSend(`Should I buy, hold, or sell ${selectedCompany.symbol} at current price of ₹${selectedCompany.sharePrice ?? 'N/A'}?`)}
              disabled={isLoading || isStreaming}
            >
              <Text style={styles.quickChipText}>⚖️ Buy vs Sell</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
        <TextInput
          style={styles.textInput}
          placeholder={`Ask AI about ${selectedCompany?.symbol || 'company'}...`}
          placeholderTextColor="#64748B"
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputMessage.trim() || isLoading || isStreaming ? styles.sendButtonDisabled : null,
          ]}
          onPress={() => handleSend()}
          disabled={!inputMessage.trim() || isLoading || isStreaming}
        >
          {isLoading || isStreaming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Company Search / Switcher Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Switch Company Context</Text>
            <TouchableOpacity
              onPress={() => setSearchModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search by symbol or name (e.g. ZOMATO, TCS)..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {isSearching && (
              <View style={styles.modalSearchingRow}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.modalSearchingText}>Searching Screener.in & local database...</Text>
              </View>
            )}

            <ScrollView style={{ marginTop: 12 }}>
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchResultRow}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.contextSymbolRow}>
                      <Text style={styles.searchResultSymbol}>{item.symbol}</Text>
                      {item.inDatabase ? (
                        <View style={styles.inDbPill}>
                          <Text style={styles.inDbPillText}>Tracked</Text>
                        </View>
                      ) : (
                        <View style={styles.screenerPill}>
                          <Text style={styles.screenerPillText}>⚡ Scrape Live</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.searchResultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.searchResultArrow}>→</Text>
                </TouchableOpacity>
              ))}

              {searchQuery.trim().length === 0 && (
                <View style={{ paddingVertical: 12 }}>
                  <Text style={styles.modalSectionHeading}>Or Pick from Stored Equities:</Text>
                  {companies.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={styles.searchResultRow}
                      onPress={() => {
                        setCompanyId(c._id);
                        setSearchModalVisible(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchResultSymbol}>{c.symbol}</Text>
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {c.companyName} · {c.sector}
                        </Text>
                      </View>
                      <Text style={styles.searchResultArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D12',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  ribbonContainer: {
    backgroundColor: '#0F141C',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  ribbonScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 4,
  },
  searchPillIcon: {
    fontSize: 12,
  },
  searchPillText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  companyChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  companyChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  companyChipTextActive: {
    color: '#FFFFFF',
  },
  contextBar: {
    backgroundColor: '#0B1322',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contextTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contextSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#60A5FA',
  },
  liveVerifiedBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#059669',
  },
  liveVerifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
  },
  liveRefreshBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  liveRefreshText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#60A5FA',
  },
  contextName: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  contextPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contextPriceLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  contextMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F1A2E',
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  contextMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  contextMetricLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  contextMetricVal: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '800',
    marginTop: 1,
  },
  messagesScroll: {
    padding: 16,
    flexGrow: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  welcomeEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 8,
  },
  suggestionsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  suggestionPill: {
    backgroundColor: '#0F1A2E',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 10,
    padding: 12,
  },
  suggestionText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  messageBubble: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    maxWidth: '92%',
  },
  userBubble: {
    backgroundColor: '#1E3A8A',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#0F1626',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  streamingBubble: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
  },
  streamingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  blinkingCursor: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  scrapedDataBadgeRow: {
    backgroundColor: '#064E3B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  scrapedDataBadgeText: {
    fontSize: 10,
    color: '#34D399',
    fontWeight: '700',
  },
  messageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageRole: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
    textTransform: 'uppercase',
  },
  modelPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modelPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  messageContent: {
    fontSize: 13,
    color: '#F1F5F9',
    lineHeight: 20,
  },
  sourcesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  sourcesHeading: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  sourcesSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1626',
    borderRadius: 12,
    padding: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1E293B',
    maxWidth: '85%',
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: '#3F1212',
    borderColor: '#DC2626',
    borderWidth: 1,
    marginBottom: 12,
  },
  errorCardText: {
    color: '#F87171',
    fontSize: 12,
  },
  quickChipsStrip: {
    backgroundColor: '#0B1322',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 6,
  },
  quickChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickChipText: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#0F141C',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Modal */
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
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F141C',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
    flex: 1,
  },
  modalSearchInput: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalSearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  modalSearchingText: {
    fontSize: 11,
    color: '#60A5FA',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  searchResultSymbol: {
    fontSize: 15,
    fontWeight: '800',
    color: '#60A5FA',
  },
  searchResultName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchResultArrow: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  inDbPill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inDbPillText: {
    fontSize: 9,
    color: '#34D399',
    fontWeight: '700',
  },
  screenerPill: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  screenerPillText: {
    fontSize: 9,
    color: '#93C5FD',
    fontWeight: '700',
  },
  modalSectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
});
