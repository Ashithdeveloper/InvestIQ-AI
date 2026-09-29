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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, Card } from '../../components/common';
import { useChatStore } from '../../stores/useChatStore';
import { useCompanyStore } from '../../stores/useCompanyStore';

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
  const { companies, fetchCompanies } = useCompanyStore();

  const {
    messages,
    selectedCompanyId,
    isLoading,
    error,
    setCompanyId,
    sendMessage,
    clearChat,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
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
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim() || isLoading) return;
    const msg = inputMessage;
    setInputMessage('');
    sendMessage(msg);
  };

  const selectedCompany = companies.find((c) => c._id === selectedCompanyId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Header
        title="AI Financial Assistant"
        subtitle={
          selectedCompany
            ? `Context: ${selectedCompany.symbol} (${selectedCompany.companyName})`
            : 'Select an Indian company'
        }
        rightAction={
          messages.length > 0 ? (
            <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Company Selector Ribbon */}
      <View style={styles.ribbonContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ribbonScroll}>
          {companies.map((c) => (
            <TouchableOpacity
              key={c._id}
              style={[
                styles.companyChip,
                selectedCompanyId === c._id ? styles.companyChipActive : null,
              ]}
              onPress={() => setCompanyId(c._id)}
            >
              <Text
                style={[
                  styles.companyChipText,
                  selectedCompanyId === c._id ? styles.companyChipTextActive : null,
                ]}
              >
                {c.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Guardrail Disclaimer */}
      <View style={styles.guardrailNotice}>
        <Text style={styles.guardrailText}>
          🔒 Guardrail Enforced: InvestIQ uses retrieved verified facts only. The AI never invents financial numbers or guarantees returns.
        </Text>
      </View>

      {/* Messages Scroll View */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {messages.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeEmoji}>🤖</Text>
            <Text style={styles.welcomeTitle}>
              Ask about {selectedCompany ? selectedCompany.symbol : 'Indian Equities'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Ask about cash flows, debt safety, profit margins, or valuation multiples.
            </Text>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsHeading}>Suggested Questions:</Text>
              {[
                `Is ${selectedCompany?.symbol || 'this company'}'s Debt-to-Equity ratio safe?`,
                `Explain the Free Cash Flow trend for ${selectedCompany?.symbol || 'this company'}.`,
                `What are the major financial risks for ${selectedCompany?.symbol || 'this company'}?`,
              ].map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionPill}
                  onPress={() => {
                    setInputMessage(q);
                  }}
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
                <Text style={styles.messageRole}>
                  {isUser ? 'You' : 'InvestIQ AI · GPT-OSS 4B'}
                </Text>
                <Text style={styles.messageContent}>{msg.content}</Text>

                {msg.sources && msg.sources.length > 0 ? (
                  <View style={styles.sourcesBox}>
                    <Text style={styles.sourcesHeading}>
                      Sources: {msg.sources.join(', ')}
                    </Text>
                    {msg.reportingPeriods && msg.reportingPeriods.length > 0 ? (
                      <Text style={styles.sourcesSub}>
                        Periods: {msg.reportingPeriods.join(', ')}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {isLoading ? (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={styles.loadingText}>Synthesizing financial context...</Text>
          </View>
        ) : null}

        {error ? (
          <Card variant="default" style={styles.errorCard}>
            <Text style={styles.errorCardText}>{error}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
        <TextInput
          style={styles.textInput}
          placeholder={`Ask about ${selectedCompany?.symbol || 'company'}...`}
          placeholderTextColor="#6B7280"
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputMessage.trim() || isLoading ? styles.sendButtonDisabled : null,
          ]}
          onPress={handleSend}
          disabled={!inputMessage.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#111827',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  ribbonScroll: {
    paddingHorizontal: 16,
  },
  companyChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
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
  guardrailNotice: {
    backgroundColor: '#172234',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A8A',
  },
  guardrailText: {
    color: '#93C5FD',
    fontSize: 11,
    lineHeight: 14,
  },
  messagesScroll: {
    padding: 16,
    flexGrow: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  welcomeEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: 24,
  },
  suggestionsContainer: {
    width: '100%',
  },
  suggestionsHeading: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  suggestionPill: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  suggestionText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  messageBubble: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E222D',
    borderWidth: 1,
    borderColor: '#2A2E39',
  },
  messageRole: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageContent: {
    color: '#F9FAFB',
    fontSize: 14,
    lineHeight: 20,
  },
  sourcesBox: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  sourcesHeading: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  sourcesSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E222D',
    borderRadius: 12,
    padding: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: '#371B1B',
    borderColor: '#7F1D1D',
    padding: 12,
  },
  errorCardText: {
    color: '#FCA5A5',
    fontSize: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F1318',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#161B22',
    color: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});
