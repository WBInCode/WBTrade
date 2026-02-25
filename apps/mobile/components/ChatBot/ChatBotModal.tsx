import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { productsApi } from '../../services/products';
import type { Product } from '../../services/types';
import type { Message, MessageAction, ProductResult, ChatBotModalProps } from './types';
import { findBestAnswer } from './matching';
import {
  BOT_NAME,
  WB_LOGO,
  PRODUCT_SEARCH_KEYWORDS,
  QUICK_QUESTIONS,
  FOLLOWUP_MESSAGES,
  INITIAL_MESSAGE,
  createInitialMessage,
} from './constants';
import TypingIndicator from './TypingIndicator';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ChatBotModal({ visible, onMinimize, onEndChat }: ChatBotModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const noMatchCount = useRef(0);
  const lastUserQuestion = useRef('');
  const waitingForProductSearch = useRef(false);
  const productSearchRetryCount = useRef(0);

  const hasConversation = messages.length > 1;

  const PLACEHOLDER_TEXTS = useMemo(() => [
    'Napisz pytanie...',
    'Zapytaj o dostawę...',
    'Szukaj produktu...',
    'Pytanie o zwrot...',
    'Zapytaj o kupony...',
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [PLACEHOLDER_TEXTS.length]);

  const handleEndChat = useCallback(() => {
    if (!hasConversation) {
      onEndChat();
      setMessages([{ ...createInitialMessage(), id: Date.now().toString() }]);
      setInput('');
      noMatchCount.current = 0;
      return;
    }
    Alert.alert(
      'Zakończyć rozmowę?',
      'Historia czatu zostanie usunięta. Czy na pewno chcesz zakończyć?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zakończ',
          style: 'destructive',
          onPress: () => {
            onEndChat();
            setMessages([{ ...createInitialMessage(), id: Date.now().toString() }]);
            setInput('');
            noMatchCount.current = 0;
            productSearchRetryCount.current = 0;
          },
        },
      ],
    );
  }, [hasConversation, onEndChat]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Scroll to bottom when keyboard opens so input stays visible
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    });
    return () => sub.remove();
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToEnd();

    // Check if we're waiting for product search query
    if (waitingForProductSearch.current) {
      waitingForProductSearch.current = false;
      handleProductSearch(text.trim());
      return;
    }

    // Check if user wants to search for a product
    const lowerText = text.trim().toLowerCase();
    const isProductSearch = PRODUCT_SEARCH_KEYWORDS.some(kw => lowerText.includes(kw)) ||
      lowerText === '🔍 szukasz produktu?' || lowerText === 'szukasz produktu?';

    if (isProductSearch) {
      const isQuickQuestionTap = lowerText === '🔍 szukasz produktu?' ||
        lowerText === 'szukasz produktu?' || lowerText === 'szukasz produktu';

      let searchQuery = lowerText;
      const sortedKeywords = [...PRODUCT_SEARCH_KEYWORDS].sort((a, b) => b.length - a.length);
      for (const kw of sortedKeywords) {
        searchQuery = searchQuery.replace(kw, '').trim();
      }
      searchQuery = searchQuery.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}?!.,🔍]/gu, '').trim();

      if (!isQuickQuestionTap && searchQuery.length >= 2) {
        handleProductSearch(searchQuery);
        return;
      } else {
        setTimeout(() => {
          waitingForProductSearch.current = true;
          productSearchRetryCount.current = 0;
          const askMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Jasne! 🔍 Napisz czego szukasz, a znajdę dla Ciebie 3 najlepiej oceniane produkty tego typu! \n\nNp. "głośnik bluetooth", "frytkownica", "kamera" itp.',
            isBot: true,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, askMsg]);
          setIsTyping(false);
          scrollToEnd();
        }, 600);
        return;
      }
    }

    // Simulate typing delay
    setTimeout(() => {
      const answer = findBestAnswer(text);
      lastUserQuestion.current = text.trim();

      let botMsg: Message;

      if (answer) {
        noMatchCount.current = 0;
        botMsg = {
          id: (Date.now() + 1).toString(),
          text: answer,
          isBot: true,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
        scrollToEnd();

        setTimeout(() => {
          setIsTyping(true);
          scrollToEnd();
          setTimeout(() => {
            const followup = FOLLOWUP_MESSAGES[Math.floor(Math.random() * FOLLOWUP_MESSAGES.length)];
            const followupMsg: Message = {
              id: (Date.now() + 2).toString(),
              text: followup,
              isBot: true,
              timestamp: new Date(),
              showSuggestions: true,
            };
            setMessages(prev => [...prev, followupMsg]);
            setIsTyping(false);
            scrollToEnd();
          }, 600 + Math.random() * 400);
        }, 1200);

        return;
      } else {
        noMatchCount.current += 1;

        if (noMatchCount.current === 1) {
          botMsg = {
            id: (Date.now() + 1).toString(),
            text: 'Hmm, nie jestem pewien odpowiedzi na to pytanie. 🤔\n\nSpróbuj zapytać inaczej lub wyślij wiadomość e-mail do naszego centrum pomocy — odpowiemy w ciągu 24h!',
            isBot: true,
            timestamp: new Date(),
            actions: [
              {
                label: 'Wyślij e-mail do pomocy',
                icon: 'envelope',
                type: 'email',
                payload: 'support@wb-partners.pl',
                subject: `Pytanie z aplikacji: ${text.trim().substring(0, 80)}`,
                body: `Cześć,\n\nMam pytanie:\n\n${text.trim()}\n\nProszę o pomoc.\n\nPozdrawiam`,
              },
            ],
          };
        } else {
          botMsg = {
            id: (Date.now() + 1).toString(),
            text: 'Niestety, to pytanie wykracza poza moje możliwości. 😅\n\nZalecam skontaktować się bezpośrednio z naszym zespołem wsparcia — kliknij poniżej, aby wysłać wiadomość e-mail z Twoim pytaniem. Odpowiemy najszybciej jak to możliwe!',
            isBot: true,
            timestamp: new Date(),
            actions: [
              {
                label: '📧 Napisz do centrum pomocy',
                icon: 'envelope',
                type: 'email',
                payload: 'support@wb-partners.pl',
                subject: `Pytanie z aplikacji WBTrade`,
                body: `Cześć,\n\nMam pytanie, z którym bot nie mógł mi pomóc:\n\n${text.trim()}\n\nProszę o odpowiedź.\n\nPozdrawiam`,
              },
            ],
          };
        }
      }

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
      scrollToEnd();
    }, 800 + Math.random() * 600);
  }, [scrollToEnd]);

  const handleProductSearch = useCallback(async (query: string) => {
    setIsTyping(true);
    scrollToEnd();
    try {
      const result = await productsApi.search(query, { limit: 20 });
      const products = (result.products || [])
        .sort((a: Product, b: Product) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
        .slice(0, 3);

      if (products.length === 0) {
        productSearchRetryCount.current += 1;

        if (productSearchRetryCount.current < 2) {
          waitingForProductSearch.current = true;
          const retryMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `Niestety, nie znalazłem produktów dla "${query}" 😔\n\nSpróbuj wpisać inną frazę — np. krótsze słowo kluczowe, nazwę kategorii lub markę produktu.`,
            isBot: true,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, retryMsg]);
        } else {
          productSearchRetryCount.current = 0;
          const noResultMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `Niestety, nie znalazłem też produktów dla "${query}" 😔\n\nSpróbuj przeglądać nasze kategorie w aplikacji lub skorzystaj z wyszukiwarki na stronie głównej!`,
            isBot: true,
            timestamp: new Date(),
            showSuggestions: true,
          };
          setMessages(prev => [...prev, noResultMsg]);
        }
      } else {
        productSearchRetryCount.current = 0;
        const productResults: ProductResult[] = products.map((p: Product) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          rating: p.rating,
          reviewCount: p.reviewCount,
          imageUrl: p.images?.[0]?.url,
        }));

        const resultMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `Oto ${products.length} najlepiej oceniane produkty dla "${query}" ⭐`,
          isBot: true,
          timestamp: new Date(),
          products: productResults,
        };
        setMessages(prev => [...prev, resultMsg]);

        setTimeout(() => {
          setIsTyping(true);
          scrollToEnd();
          setTimeout(() => {
            const followupMsg: Message = {
              id: (Date.now() + 2).toString(),
              text: 'Kliknij w produkt, żeby zobaczyć szczegóły! 😊 Mogę też wyszukać coś innego — wystarczy napisać!',
              isBot: true,
              timestamp: new Date(),
              showSuggestions: true,
            };
            setMessages(prev => [...prev, followupMsg]);
            setIsTyping(false);
            scrollToEnd();
          }, 500);
        }, 800);
      }
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Ups, coś poszło nie tak przy wyszukiwaniu 😅 Spróbuj ponownie za chwilę!',
        isBot: true,
        timestamp: new Date(),
        showSuggestions: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      scrollToEnd();
    }
  }, [scrollToEnd]);

  const handleQuickQuestion = useCallback((q: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(q);
  }, [sendMessage]);

  const handleAction = useCallback(async (action: MessageAction) => {
    if (action.type === 'email') {
      const subject = encodeURIComponent(action.subject || 'Pytanie z aplikacji WBTrade');
      const body = encodeURIComponent(action.body || '');
      const mailto = `mailto:${action.payload}?subject=${subject}&body=${body}`;

      try {
        const canOpen = await Linking.canOpenURL(mailto);
        if (canOpen) {
          await Linking.openURL(mailto);
        } else {
          Alert.alert(
            'Brak aplikacji e-mail',
            `Napisz do nas ręcznie na:\n${action.payload}`,
            [{ text: 'OK' }],
          );
        }
      } catch {
        Alert.alert(
          'Brak aplikacji e-mail',
          `Napisz do nas ręcznie na:\n${action.payload}`,
          [{ text: 'OK' }],
        );
      }
    } else if (action.type === 'link') {
      Linking.openURL(action.payload).catch(() => {});
    }
  }, []);

  const getAvailableSuggestions = useCallback(() => {
    const askedTexts = new Set(
      messages.filter(m => !m.isBot).map(m => m.text.toLowerCase().trim()),
    );
    return QUICK_QUESTIONS.filter(
      q => q === '🔍 Szukasz produktu?' || !askedTexts.has(q.toLowerCase()),
    ).slice(0, 6);
  }, [messages]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const availableSuggestions = item.showSuggestions ? getAvailableSuggestions() : [];

    return (
      <View>
        <View style={[styles.messageBubble, item.isBot ? styles.botBubble : styles.userBubble]}>
          {item.isBot && (
            <View style={styles.botAvatarCol}>
              <Image source={WB_LOGO} style={styles.botAvatarLogo} />
            </View>
          )}
          <View style={[styles.messageContent, item.isBot ? styles.botContent : styles.userContent]}>
            {item.isBot && item.id !== '0' && (
              <Text style={styles.botName}>{BOT_NAME}</Text>
            )}
            <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
              {item.text}
            </Text>
            {(() => {
              const d = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
              const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
              return (
                <Text style={[styles.timestamp, item.isBot ? styles.timestampBot : styles.timestampUser]}>
                  {timeStr}
                </Text>
              );
            })()}
            {item.products && item.products.length > 0 && (
              <View style={styles.productsContainer}>
                {item.products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.productCard}
                    onPress={() => {
                      onMinimize();
                      router.push(`/product/${product.id}`);
                    }}
                    activeOpacity={0.7}
                  >
                    {product.imageUrl ? (
                      <ExpoImage
                        source={{ uri: product.imageUrl }}
                        style={styles.productImage}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <FontAwesome name="image" size={20} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                      <Text style={styles.productPrice}>{Number(product.price).toFixed(2)} zł</Text>
                      {product.rating ? (
                        <View style={styles.productRating}>
                          <FontAwesome name="star" size={12} color="#f59e0b" />
                          <Text style={styles.productRatingText}>
                            {Number(product.rating).toFixed(1)}{product.reviewCount ? ` (${product.reviewCount})` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <FontAwesome name="chevron-right" size={12} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {item.actions && item.actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {item.actions.map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.actionButton}
                    onPress={() => handleAction(action)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name={action.icon} size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        {item.showSuggestions && availableSuggestions.length > 0 && (
          <View style={styles.inlineSuggestions}>
            <View style={styles.chipsWrap}>
              {availableSuggestions.map((q) => (
                <TouchableOpacity key={q} style={styles.chip} onPress={() => handleQuickQuestion(q)} activeOpacity={0.7}>
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }, [styles, colors, handleAction, handleQuickQuestion, getAvailableSuggestions, onMinimize, router]);

  const showInitialChips = messages.length <= 1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onMinimize}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Image source={WB_LOGO} style={styles.headerLogo} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{BOT_NAME}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onMinimize} style={styles.headerBtn} activeOpacity={0.7}>
              <FontAwesome name="minus" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEndChat} style={styles.headerBtn} activeOpacity={0.7}>
              <FontAwesome name="times" size={20} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToEnd}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              <>
                {isTyping && (
                  <View style={[styles.messageBubble, styles.botBubble]}>
                    <View style={styles.botAvatarCol}>
                      <Image source={WB_LOGO} style={styles.botAvatarLogo} />
                    </View>
                    <View style={[styles.messageContent, styles.botContent]}>
                      <TypingIndicator />
                    </View>
                  </View>
                )}
                {showInitialChips && (
                  <View style={styles.quickChips}>
                    <Text style={styles.quickLabel}>Popularne pytania:</Text>
                    <View style={styles.chipsWrap}>
                      {QUICK_QUESTIONS.slice(0, 6).map((q) => (
                        <TouchableOpacity key={q} style={styles.chip} onPress={() => handleQuickQuestion(q)} activeOpacity={0.7}>
                          <Text style={styles.chipText}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            }
          />

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder={PLACEHOLDER_TEXTS[placeholderIdx]}
              placeholderTextColor={colors.placeholder}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim()}
              activeOpacity={0.7}
            >
              <FontAwesome name="send" size={16} color={input.trim() ? '#fff' : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  botBubble: {
    justifyContent: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  botAvatarCol: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  botAvatarLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  botName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.tint,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  messageContent: {
    maxWidth: SCREEN_W * 0.72,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botContent: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  userContent: {
    backgroundColor: colors.tint,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    color: colors.text,
  },
  userText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  timestampBot: {
    color: colors.textMuted,
    textAlign: 'left' as const,
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right' as const,
  },

  actionsContainer: {
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.tint,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  productsContainer: {
    marginTop: 10,
    gap: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 17,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.tint,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productRatingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  quickChips: {
    marginTop: 8,
    paddingLeft: 38,
  },
  inlineSuggestions: {
    marginTop: 10,
    paddingLeft: 38,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.tintLight,
    borderWidth: 1,
    borderColor: colors.tintMuted,
  },
  chipText: {
    fontSize: 13,
    color: colors.tint,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: colors.inputText,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    maxHeight: 44,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.backgroundTertiary,
  },
});
