import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { pluralizeReviews } from '../../utils/pluralize';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ViewToken,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import ProductCarousel from '../../components/product/ProductCarousel';
import AddToListModal from '../../components/AddToListModal';
import type { Product, ProductVariant } from '../../services/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Decode HTML entities
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&oacute;/g, 'ó')
    .replace(/&eacute;/g, 'é')
    .replace(/&#\d+;/g, (m) => {
      const code = parseInt(m.replace(/&#|;/g, ''));
      return String.fromCharCode(code);
    })
    .replace(/ {2,}/g, ' ')
    .trim();
}

// Parse HTML into structured blocks for rendering
type HtmlBlock = { type: 'heading' | 'paragraph' | 'list' | 'table'; text?: string; items?: string[]; rows?: Array<[string, string]> };

function parseHtmlBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = [];

  // 1) Extract <table> blocks first
  let cleaned = html.replace(/\r\n/g, '\n').replace(/\t/g, ' ');

  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  cleaned = cleaned.replace(tableRegex, (_, tableContent) => {
    const rows: Array<[string, string]> = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(tableContent)) !== null) {
      const cells: string[] = [];
      let tdMatch;
      tdRegex.lastIndex = 0;
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        cells.push(decodeEntities(tdMatch[1].replace(/<[^>]*>/g, '').trim()));
      }
      if (cells.length >= 2) rows.push([cells[0], cells[1]]);
    }
    if (rows.length > 0) blocks.push({ type: 'table', rows });
    return '';
  });

  // 2) Extract <ul>/<ol> lists
  const ulRegex = /<[uo]l[^>]*>([\s\S]*?)<\/[uo]l>/gi;
  cleaned = cleaned.replace(ulRegex, (_, listContent) => {
    const items: string[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(listContent)) !== null) {
      let text = decodeEntities(liMatch[1].replace(/<[^>]*>/g, '').trim());
      // Strip leading dash/bullet that some formats add inside <li>
      text = text.replace(/^[\-–•·]\s*/, '');
      if (text) items.push(text);
    }
    if (items.length > 0) {
      // Check if list items look like specs (key - value or key: value)
      const specLike = items.filter(item =>
        /^[^:\-–]{2,35}\s*[\-–]\s*\S/.test(item) || /^[^:]{2,30}:\s/.test(item)
      );
      if (specLike.length >= 3 && specLike.length >= items.length * 0.6) {
        const rows: Array<[string, string]> = items.map(item => {
          // Try "key - value" format first
          const dashMatch = item.match(/^(.{2,35}?)\s*[\-–]\s+(.+)$/);
          if (dashMatch) return [dashMatch[1].trim(), dashMatch[2].trim()];
          // Try "key: value" format
          const colonIdx = item.indexOf(':');
          if (colonIdx > 0 && colonIdx < 40) return [item.slice(0, colonIdx).trim(), item.slice(colonIdx + 1).trim()];
          return [item, ''];
        });
        blocks.push({ type: 'table', rows });
      } else {
        blocks.push({ type: 'list', items });
      }
    }
    return '';
  });

  // 3) Extract <h1>-<h6> headings
  cleaned = cleaned.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, content) => {
    const text = decodeEntities(content.replace(/<[^>]*>/g, '').trim());
    if (text) blocks.push({ type: 'heading', text });
    return '';
  });

  // 4) Convert <strong>/<b> into heading markers or keep as text with separators
  cleaned = cleaned.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_, inner) => {
    // Split by <br> inside strong — each part may be separate heading/text
    const parts = inner.split(/<br\s*\/?>/gi).map((p: string) => p.replace(/<[^>]*>/g, '').trim()).filter(Boolean);
    if (parts.length === 0) return '';
    return parts.map((part: string) => {
      if (part.endsWith(':') && part.length <= 60) {
        return '\n===SHEADING===' + part + '===ESHEADING===\n';
      }
      return ' ' + part + ' ';
    }).join('\n');
  });

  // 5) Process <P> blocks — split by <BR> to detect bullets inside paragraphs
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  cleaned = cleaned.replace(pRegex, (_, pContent) => {
    processParagraphContent(pContent, blocks);
    return '';
  });

  // 6) Process any remaining text outside <P> tags (handles no-<P> formats)
  if (cleaned.trim()) {
    processRemainingContent(cleaned, blocks);
  }

  // 7) Merge consecutive list blocks
  const merged: HtmlBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'list' && merged.length > 0 && merged[merged.length - 1].type === 'list') {
      merged[merged.length - 1].items!.push(...block.items!);
    } else {
      merged.push(block);
    }
  }

  // 8) Strip any remaining ===SHEADING=== / ===ESHEADING=== markers (safety net)
  for (const block of merged) {
    if (block.text) {
      block.text = block.text.replace(/===SHEADING===|===ESHEADING===/g, '').trim();
    }
    if (block.items) {
      block.items = block.items.map(item => item.replace(/===SHEADING===|===ESHEADING===/g, '').trim()).filter(Boolean);
    }
  }

  // 9) Filter out empty blocks
  return merged.filter(b => {
    if (b.type === 'list') return (b.items?.length ?? 0) > 0;
    if (b.type === 'table') return (b.rows?.length ?? 0) > 0;
    return b.text && b.text.length > 0;
  });
}

// Process inner content of a <P> tag — handles bullets separated by <BR>
function processParagraphContent(pContent: string, blocks: HtmlBlock[]) {
  // Split content by <BR> tags, normalize whitespace within each segment
  const segments = pContent
    .split(/<br\s*\/?>/gi)
    .map(s => decodeEntities(s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()))
    .filter(Boolean);

  if (segments.length === 0) return;

  // Extract ===SHEADING=== markers as heading blocks, keep remaining segments
  const cleanSegments: string[] = [];
  for (const seg of segments) {
    if (seg.includes('===SHEADING===')) {
      const match = seg.match(/===SHEADING===([\s\S]*?)===ESHEADING===/);
      if (match) {
        const headingText = match[1].trim();
        if (headingText) blocks.push({ type: 'heading', text: headingText });
      }
      const after = seg.replace(/===SHEADING===[\s\S]*?===ESHEADING===/g, '').trim();
      if (after) cleanSegments.push(after);
    } else {
      cleanSegments.push(seg);
    }
  }

  if (cleanSegments.length === 0) return;

  // Check if segments contain bullet points (•, -, –)
  const bulletSegments = cleanSegments.filter(s => /^[•·\-–]\s/.test(s));

  if (bulletSegments.length >= 2) {
    // This <P> is a bullet list with possible heading before bullets
    const items: string[] = [];
    for (const seg of cleanSegments) {
      if (/^[•·\-–]\s/.test(seg)) {
        items.push(seg.replace(/^[•·\-–]\s*/, ''));
      } else if (items.length === 0 && seg.length > 0) {
        // Text before bullets — treat as heading or paragraph
        if (isLikelyHeading(seg)) {
          blocks.push({ type: 'heading', text: seg });
        } else {
          blocks.push({ type: 'paragraph', text: seg });
        }
      }
    }
    if (items.length > 0) {
      // Check if items look like specs (key: value pairs)
      const specItems = items.filter(item => /^[^:]{2,30}:\s/.test(item));
      if (specItems.length >= 3 && specItems.length >= items.length * 0.6) {
        // Convert to table
        const rows: Array<[string, string]> = items.map(item => {
          const colonIdx = item.indexOf(':');
          if (colonIdx > 0 && colonIdx < 40) {
            return [item.slice(0, colonIdx).trim(), item.slice(colonIdx + 1).trim()];
          }
          return [item, ''];
        });
        blocks.push({ type: 'table', rows });
      } else {
        blocks.push({ type: 'list', items });
      }
    }
  } else if (bulletSegments.length === 1) {
    // Mixed: some text + one bullet. Treat all as paragraph
    const fullText = cleanSegments.join(' ');
    blocks.push({ type: 'paragraph', text: fullText });
  } else {
    // Regular paragraph — join segments into one text
    const fullText = cleanSegments.join(' ');
    if (isLikelyHeading(fullText)) {
      blocks.push({ type: 'heading', text: fullText });
    } else {
      blocks.push({ type: 'paragraph', text: fullText });
    }
  }
}

// Process remaining content that has no <P> wrappers (uses <br>, <strong> etc)
function processRemainingContent(content: string, blocks: HtmlBlock[]) {
  // Split by <br> tags
  const segments = content
    .split(/<br\s*\/?>/gi)
    .map(s => s.trim())
    .filter(Boolean);

  let currentParagraph = '';
  const bulletItems: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.trim()) {
      const text = decodeEntities(currentParagraph.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
      if (text) blocks.push({ type: 'paragraph', text });
      currentParagraph = '';
    }
  };

  const flushBullets = () => {
    if (bulletItems.length > 0) {
      blocks.push({ type: 'list', items: [...bulletItems] });
      bulletItems.length = 0;
    }
  };

  for (const seg of segments) {
    // Check for heading markers
    if (seg.includes('===SHEADING===')) {
      flushParagraph();
      flushBullets();
      const match = seg.match(/===SHEADING===([\s\S]*?)===ESHEADING===/);
      if (match) {
        const headingText = decodeEntities(match[1].trim());
        if (headingText) blocks.push({ type: 'heading', text: headingText });
      }
      const after = seg.replace(/.*===ESHEADING===/, '').trim();
      if (after) {
        const text = decodeEntities(after.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
        if (text) currentParagraph = text;
      }
      continue;
    }

    const text = decodeEntities(seg.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    if (!text) continue;

    // Check if this is a bullet item
    if (/^[•·\-–]\s/.test(text)) {
      flushParagraph();
      bulletItems.push(text.replace(/^[•·\-–]\s*/, ''));
    } else {
      // Regular text — flush bullets first if we had any
      flushBullets();
      if (currentParagraph) {
        currentParagraph += ' ' + text;
      } else {
        currentParagraph = text;
      }
    }
  }

  flushBullets();
  flushParagraph();
}

// Detect if a short text is likely a heading
function isLikelyHeading(text: string): boolean {
  if (text.length < 3) return false;
  // ALL CAPS (allow digits, spaces, punctuation) — up to 120 chars
  if (text.length <= 120 && /^[A-ZĄĆĘŁŃÓŚŻŹ0-9\s\-–:,./+()!?]+$/.test(text) && text.length > 5) return true;
  // Ends with : or ? and is short
  if (/[?:]$/.test(text) && text.length <= 60) return true;
  return false;
}

// Render parsed HTML blocks as React Native components
function HtmlContent({ html }: { html: string }) {
  const blocks = parseHtmlBlocks(html);
  const colors = useThemeColors();
  const htmlStyles = useMemo(() => createHtmlStyles(colors), [colors]);

  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <Text key={i} style={[htmlStyles.heading, i === 0 && { marginTop: 0 }]}>
                {block.text}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={i} style={htmlStyles.paragraph}>
                {block.text}
              </Text>
            );
          case 'list':
            return (
              <View key={i} style={htmlStyles.list}>
                {block.items!.map((item, j) => (
                  <View key={j} style={[htmlStyles.listItem, j === block.items!.length - 1 && { marginBottom: 0 }]}>
                    <View style={htmlStyles.bulletDot} />
                    <Text style={htmlStyles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          case 'table':
            return (
              <View key={i} style={htmlStyles.table}>
                {block.rows!.map(([key, value], j) => (
                  <View
                    key={j}
                    style={[
                      htmlStyles.tableRow,
                      j % 2 === 0 ? htmlStyles.tableRowEven : null,
                      j === block.rows!.length - 1 ? htmlStyles.tableRowLast : null,
                    ]}
                  >
                    <Text style={htmlStyles.tableKey}>{key}</Text>
                    <Text style={htmlStyles.tableValue}>{value}</Text>
                  </View>
                ))}
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

const createHtmlStyles = (colors: ThemeColors) => StyleSheet.create({
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    marginTop: 20,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  list: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: colors.tint,
    marginRight: 10,
    lineHeight: 21,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tint,
    marginRight: 10,
    marginTop: 8,
  },
  listItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    flex: 1,
  },
  table: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRowEven: {
    backgroundColor: colors.backgroundSecondary,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableKey: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  tableValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});

// Legacy stripHtml for simple strings
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// --- Review Types ---
interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  content: string;
  isVerifiedPurchase: boolean;
  helpfulCount?: number;
  adminReply?: string | null;
  adminReplyAt?: string | null;
  adminReplyBy?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

// --- Wishlist Button ---
function WishlistButton({ productId }: { productId: string }) {
  const { isInWishlist, toggle } = useWishlist();
  const { user } = useAuth();
  const router = useRouter();
  const isFav = isInWishlist(productId);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.wishlistBtn, isFav && styles.wishlistBtnActive]}
      onPress={() => {
        if (!user) {
          router.push('/(auth)/login');
          return;
        }
        toggle(productId);
      }}
      activeOpacity={0.7}
    >
      <FontAwesome
        name={isFav ? 'heart' : 'heart-o'}
        size={20}
        color={isFav ? colors.destructive : colors.textMuted}
      />
    </TouchableOpacity>
  );
}

// --- Image Gallery ---
function ImageGallery({ images }: { images: { url: string; alt: string | null }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (!images || images.length === 0) {
    return (
      <View style={styles.galleryPlaceholder}>
        <FontAwesome name="image" size={48} color={colors.border} />
        <Text style={styles.galleryPlaceholderText}>Brak zdjęć</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url }}
            style={styles.galleryImage}
            contentFit="contain"
            transition={200}
          />
        )}
      />
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// --- Star Rating ---
function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const colors = useThemeColors();
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <FontAwesome
        key={i}
        name={i <= Math.round(rating) ? 'star' : 'star-o'}
        size={size}
        color={colors.warning}
        style={{ marginRight: 2 }}
      />
    );
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
}

// --- Product Info Tabs (Opis / Specyfikacja) ---
function ProductInfoTabs({
  description,
  specifications,
}: {
  description?: string;
  specifications?: Record<string, string>;
}) {
  const [activeTab, setActiveTab] = useState<'opis' | 'spec'>('opis');
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const htmlStyles = useMemo(() => createHtmlStyles(colors), [colors]);

  const allBlocks = description ? parseHtmlBlocks(description) : [];
  // Skip the first block if it's an ALL-CAPS heading (redundant product title)
  const filtered = allBlocks.length > 0 && allBlocks[0].type === 'heading'
    && allBlocks[0].text && allBlocks[0].text === allBlocks[0].text.toUpperCase()
    ? allBlocks.slice(1)
    : allBlocks;
  const descBlocks = filtered.filter(b => b.type !== 'table');
  const tableBlocks = filtered.filter(b => b.type === 'table');
  const specEntries = specifications ? Object.entries(specifications) : [];
  const hasSpec = tableBlocks.length > 0 || specEntries.length > 0;

  if (descBlocks.length === 0 && !hasSpec) return null;

  const tabs: { key: 'opis' | 'spec'; label: string }[] = [{ key: 'opis', label: 'Opis' }];
  if (hasSpec) tabs.push({ key: 'spec', label: 'Specyfikacja' });

  // Collect all spec rows into one flat list for the spec tab
  const allSpecRows: Array<[string, string]> = [];
  for (const entry of specEntries) allSpecRows.push([entry[0], String(entry[1])]);
  for (const block of tableBlocks) {
    if (block.rows) allSpecRows.push(...block.rows);
  }

  return (
    <View style={styles.tabsWrap}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map(t => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Opis tab */}
      {activeTab === 'opis' && (
        <View style={styles.tabBody}>
          {descBlocks.map((block, i) => {
            switch (block.type) {
              case 'heading':
                return (
                  <Text key={i} style={[htmlStyles.heading, i === 0 && { marginTop: 4 }]}>
                    {block.text}
                  </Text>
                );
              case 'paragraph':
                return (
                  <Text key={i} style={[htmlStyles.paragraph, i === 0 && { marginTop: 0 }]}>
                    {block.text}
                  </Text>
                );
              case 'list':
                return (
                  <View key={i} style={htmlStyles.list}>
                    {block.items!.map((item, j) => (
                      <View key={j} style={[htmlStyles.listItem, j === block.items!.length - 1 && { marginBottom: 0 }]}>
                        <View style={htmlStyles.bulletDot} />
                        <Text style={htmlStyles.listItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                );
              default:
                return null;
            }
          })}
          {descBlocks.length === 0 && (
            <Text style={htmlStyles.paragraph}>Brak opisu produktu.</Text>
          )}
        </View>
      )}

      {/* Specyfikacja tab */}
      {activeTab === 'spec' && (
        <View style={styles.tabBody}>
          <View style={styles.specTableWrap}>
            {allSpecRows.map(([key, value], idx) => (
              <View
                key={idx}
                style={[
                  styles.specRow,
                  idx % 2 === 0 && styles.specRowAlt,
                ]}
              >
                <Text style={styles.specLabel}>{key}</Text>
                <Text style={styles.specVal}>{value}</Text>
              </View>
            ))}
          </View>
          {allSpecRows.length === 0 && (
            <Text style={htmlStyles.paragraph}>Brak specyfikacji.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// --- Accordion ---
function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionTitle}>{title}</Text>
        <FontAwesome
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {open && <View style={styles.accordionContent}>{children}</View>}
    </View>
  );
}

// --- Main Screen ---
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [addingToCart, setAddingToCart] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loadingAllReviews, setLoadingAllReviews] = useState(false);

  // Review form state
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Newsletter badge animation
  const nlAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nlAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(nlAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const nlScale = nlAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.02, 1] });
  const nlOpacity = nlAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1, 0.85] });

  const { show: showToast } = useToast();

  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([]);
  const [warehouseSource, setWarehouseSource] = useState<'warehouse' | 'category'>('warehouse');

  // Fetch product
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    // Reset stale data from previous product
    setProduct(null);
    setReviewStats(null);
    setReviews([]);
    setShowAllReviews(false);
    setWarehouseProducts([]);
    setCanReview(false);
    setHasReviewed(false);
    setSelectedVariant(null);
    setSelectedAttributes({});

    api
      .get<any>(`/products/${id}`)
      .then((data) => {
        if (cancelled) return;
        // API may return { product: Product } or Product directly
        const prod: Product = data.product || data;
        setProduct(prod);
        // Auto-select first variant if exists
        if (prod.variants && prod.variants.length > 0) {
          const firstVariant = prod.variants[0];
          setSelectedVariant(firstVariant);
          setSelectedAttributes(firstVariant.attributes || {});
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Nie udało się pobrać produktu');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  // Fetch reviews + same warehouse (use product.id = CUID, not route param which may be slug)
  useEffect(() => {
    if (!product) return;
    const pid = product.id;
    let cancelled = false;

    // Reviews stats
    api
      .get<ReviewStats>(`/products/${pid}/reviews/stats`)
      .then((data) => { if (!cancelled) setReviewStats(data); })
      .catch(() => {});

    // Reviews list
    api
      .get<{ reviews: Review[] }>(`/products/${pid}/reviews?limit=5&sort=newest`)
      .then((data) => { if (!cancelled) setReviews(data.reviews || []); })
      .catch(() => {});

    // Can review check
    if (user) {
      api
        .get<{ canReview: boolean; hasReviewed: boolean }>(`/products/${pid}/reviews/can-review`)
        .then((data) => {
          if (cancelled) return;
          setCanReview(data.canReview);
          setHasReviewed(data.hasReviewed);
        })
        .catch(() => {});
    }

    // Same warehouse products
    api
      .get<{ products: Product[] }>(`/products/same-warehouse/${pid}?limit=10`)
      .then((data) => {
        if (cancelled) return;
        const prods = data.products || [];
        if (prods.length > 0) {
          setWarehouseSource('warehouse');
        }
        setWarehouseProducts(prods);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [product?.id]);

  // Fallback: if no warehouse products, fetch from same category
  useEffect(() => {
    if (!product || warehouseProducts.length > 0 || loading) return;

    const categoryId = product.categoryId || (product.category as any)?.id;
    if (!categoryId) return;

    api
      .get<any>(`/products?categoryId=${categoryId}&limit=11`)
      .then((data) => {
        const prods = (data.products || data.data || [])
          .filter((p: Product) => p.id !== product.id)
          .slice(0, 10);
        if (prods.length > 0) {
          setWarehouseSource('category');
          setWarehouseProducts(prods);
        }
      })
      .catch(() => {});
  }, [product, warehouseProducts.length, loading]);

  // --- Price helpers ---
  const getPrice = useCallback(() => {
    if (selectedVariant && selectedVariant.price > 0) {
      return selectedVariant.price;
    }
    if (!product || product.price == null) return 0;
    const parsed = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    return isNaN(parsed) ? 0 : parsed;
  }, [product, selectedVariant]);

  const getComparePrice = useCallback(() => {
    if (!product?.compareAtPrice) return null;
    const compare =
      typeof product.compareAtPrice === 'string'
        ? parseFloat(product.compareAtPrice)
        : product.compareAtPrice;
    return compare > getPrice() ? compare : null;
  }, [product, getPrice]);

  const getLowestPrice30 = useCallback(() => {
    if (!product?.lowestPrice30Days) return null;
    const lowest =
      typeof product.lowestPrice30Days === 'string'
        ? parseFloat(product.lowestPrice30Days)
        : product.lowestPrice30Days;
    return lowest > 0 ? lowest : null;
  }, [product]);

  // --- Variant helpers ---
  const getAttributeKeys = useCallback(() => {
    if (!product?.variants || product.variants.length <= 1) return [];
    const keys = new Set<string>();
    product.variants.forEach((v) => {
      Object.keys(v.attributes || {}).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [product]);

  const getAttributeValues = useCallback(
    (key: string) => {
      if (!product?.variants) return [];
      const values = new Set<string>();
      product.variants.forEach((v) => {
        if (v.attributes?.[key]) values.add(v.attributes[key]);
      });
      return Array.from(values);
    },
    [product]
  );

  const handleAttributeSelect = useCallback(
    (key: string, value: string) => {
      const newAttrs = { ...selectedAttributes, [key]: value };
      setSelectedAttributes(newAttrs);

      // Find matching variant
      const match = product?.variants?.find((v) =>
        Object.entries(newAttrs).every(([k, val]) => v.attributes?.[k] === val)
      );
      if (match) setSelectedVariant(match);
    },
    [product, selectedAttributes]
  );

  // --- Stock status ---
  const getStockInfo = useCallback(() => {
    if (!selectedVariant) {
      // No variants - check if product has any variant with stock
      if (product?.variants && product.variants.length > 0) {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        if (totalStock === 0) return { status: 'out', label: 'Niedostępny', color: colors.textMuted };
        if (totalStock <= 5) return { status: 'low', label: 'Mało sztuk', color: colors.warning };
        return { status: 'in', label: 'Dostępny', color: colors.success };
      }
      return { status: 'in', label: 'Dostępny', color: colors.success };
    }

    if (selectedVariant.stock === 0) return { status: 'out', label: 'Niedostępny', color: colors.textMuted };
    if (selectedVariant.stock <= 5) return { status: 'low', label: 'Mało sztuk', color: colors.warning };
    return { status: 'in', label: 'Dostępny', color: colors.success };
  }, [product, selectedVariant]);

  // --- Add to cart ---
  const handleAddToCart = useCallback(async () => {
    if (!product) return;

    const variantId = selectedVariant?.id || product.variants?.[0]?.id;
    if (!variantId) {
      Alert.alert('Błąd', 'Brak dostępnego wariantu produktu');
      return;
    }

    const stock = getStockInfo();
    if (stock.status === 'out') {
      Alert.alert('Niedostępny', 'Ten produkt jest obecnie niedostępny');
      return;
    }

    setAddingToCart(true);
    try {
      const price = Number(selectedVariant?.price || product.price) || 0;
      await addToCart(variantId, 1, {
        productId: product.id,
        name: product.name,
        imageUrl: product.images?.[0]?.url,
        price,
        quantity: 1,
        warehouse: product.wholesaler || undefined,
      });
    } catch (err: any) {
      Alert.alert('Błąd', err.message || 'Nie udało się dodać do koszyka');
    } finally {
      setAddingToCart(false);
    }
  }, [product, selectedVariant, addToCart, getStockInfo]);

  // --- Loading / Error states ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Ładowanie produktu...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <FontAwesome name="exclamation-triangle" size={48} color={colors.destructive} />
        <Text style={styles.errorText}>{error || 'Nie znaleziono produktu'}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.tint }]} onPress={() => {
            setError(null);
            setLoading(true);
            api.get<any>(`/products/${id}`)
              .then((data) => {
                const prod: Product = data.product || data;
                setProduct(prod);
                if (prod.variants && prod.variants.length > 0) {
                  setSelectedVariant(prod.variants[0]);
                  setSelectedAttributes(prod.variants[0].attributes || {});
                }
              })
              .catch((err) => setError(err.message || 'Nie udało się pobrać produktu'))
              .finally(() => setLoading(false));
          }}>
            <Text style={[styles.retryButtonText, { color: '#fff' }]}>Spróbuj ponownie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Wróć</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const price = Number(getPrice()) || 0;
  const comparePrice = getComparePrice();
  const lowestPrice30 = getLowestPrice30();
  const hasDiscount = comparePrice != null && comparePrice > price;
  const stockInfo = getStockInfo();
  const attributeKeys = getAttributeKeys();

  // Submit review handler
  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      showToast('Wybierz ocenę (1-5 gwiazdek)', 'error');
      return;
    }
    if (reviewContent.trim().length < 10) {
      showToast('Treść opinii musi mieć minimum 10 znaków', 'error');
      return;
    }
    if (!product) return;
    setSubmittingReview(true);
    try {
      const pid = product.id;
      await api.post('/reviews', {
        productId: pid,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        content: reviewContent.trim(),
      });
      showToast('Dziękujemy za opinię!', 'success');
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewTitle('');
      setReviewContent('');
      setCanReview(false);
      setHasReviewed(true);
      // Refresh reviews & product data for updated rating
      api.get<ReviewStats>(`/products/${pid}/reviews/stats`).then(setReviewStats).catch(() => {});
      api.get<{ reviews: Review[] }>(`/products/${pid}/reviews?limit=5&sort=newest`).then((d) => setReviews(d.reviews || [])).catch(() => {});
      // Re-fetch product to get updated average_rating and review_count
      api.get<any>(`/products/${pid}`).then((data) => {
        const prod: Product = data.product || data;
        setProduct(prod);
      }).catch(() => {});
    } catch (err: any) {
      showToast(err.message || 'Nie udało się dodać opinii', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: product.name.substring(0, 30) }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <ImageGallery images={product.images || []} />

        <View style={styles.content}>
          {/* Badge */}
          {product.badge && (
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeChip,
                  {
                    backgroundColor:
                      product.badge === 'super-price'
                        ? colors.destructive
                        : product.badge === 'outlet'
                          ? colors.warning
                          : product.badge === 'bestseller'
                            ? colors.tint
                            : colors.success,
                  },
                ]}
              >
                <Text style={styles.badgeText}>
                  {product.badge === 'super-price'
                    ? 'Super cena'
                    : product.badge === 'outlet'
                      ? 'Outlet'
                      : product.badge === 'bestseller'
                        ? 'Bestseller'
                        : 'Nowość'}
                </Text>
              </View>
            </View>
          )}

          {/* Product Name */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* SKU */}
          {product.sku && (
            <Text style={styles.sku}>SKU: {product.sku}</Text>
          )}

          {/* Rating summary */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <View style={styles.ratingSummaryRow}>
              <StarRating rating={reviewStats.averageRating} size={14} />
              <Text style={styles.ratingText}>
                {reviewStats.averageRating.toFixed(1)} ({pluralizeReviews(reviewStats.totalReviews)})
              </Text>
            </View>
          )}

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text
                style={[
                  styles.currentPrice,
                  hasDiscount && { color: colors.destructive },
                ]}
              >
                {Number(price).toFixed(2).replace('.', ',')} zł
              </Text>
              {hasDiscount && (
                <>
                  <Text style={styles.comparePrice}>
                    {Number(comparePrice).toFixed(2).replace('.', ',')} zł
                  </Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>
                      -{Math.round(((Number(comparePrice) - price) / Number(comparePrice)) * 100)}%
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* OMNIBUS - Lowest price 30 days */}
            {lowestPrice30 && (
              <Text style={styles.omnibusText}>
                Najniższa cena z 30 dni: {Number(lowestPrice30).toFixed(2).replace('.', ',')} zł
              </Text>
            )}

            {/* Newsletter discount badge — animated */}
            <Animated.View style={[styles.newsletterBadge, { transform: [{ scale: nlScale }], opacity: nlOpacity }]}>
              <FontAwesome name="ticket" size={13} color={colors.tint} style={{ transform: [{ rotate: '-45deg' }] }} />
              <Text style={styles.newsletterBadgeText}>10% rabatu z newsletterem</Text>
              <FontAwesome name="chevron-right" size={10} color={colors.tint} />
            </Animated.View>
          </View>

          {/* Variant Selection */}
          {attributeKeys.length > 0 && (
            <View style={styles.variantsSection}>
              {attributeKeys.map((key) => (
                <View key={key} style={styles.variantGroup}>
                  <Text style={styles.variantLabel}>{key}:</Text>
                  <View style={styles.chipsRow}>
                    {getAttributeValues(key).map((value) => {
                      const isSelected = selectedAttributes[key] === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.chip,
                            isSelected && styles.chipSelected,
                          ]}
                          onPress={() => handleAttributeSelect(key, value)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                            ]}
                          >
                            {value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Stock Status */}
          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: stockInfo.color }]} />
            <Text style={[styles.stockText, { color: stockInfo.color }]}>
              {stockInfo.label}
            </Text>
          </View>

          {/* Add to Cart + Wishlist */}
          <View style={styles.cartRow}>
            <TouchableOpacity
              style={[
                styles.addToCartButton,
                stockInfo.status === 'out' && styles.addToCartDisabled,
              ]}
              onPress={handleAddToCart}
              disabled={addingToCart || stockInfo.status === 'out'}
              activeOpacity={0.8}
            >
              {addingToCart ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <FontAwesome name="shopping-cart" size={18} color={colors.textInverse} />
                  <Text style={styles.addToCartText}>
                    {stockInfo.status === 'out' ? 'Niedostępny' : 'Dodaj do koszyka'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <WishlistButton productId={product.id} />
          </View>

          {/* Add to Shopping List */}
          <TouchableOpacity
            style={styles.addToListBtn}
            onPress={() => {
              if (!user) {
                router.push('/(auth)/login');
                return;
              }
              setShowListModal(true);
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name="list-ul" size={16} color={colors.tint} />
            <Text style={styles.addToListText}>Dodaj do listy zakupowej</Text>
          </TouchableOpacity>

          {/* Store/Warehouse info */}
          {product.storeName && (
            <View style={styles.storeRow}>
              <FontAwesome name="building-o" size={14} color={colors.textMuted} />
              <Text style={styles.storeText}>Magazyn: {product.storeName}</Text>
            </View>
          )}

          {/* Description & Specifications Tabs */}
          {(product.description || (product.specifications && Object.keys(product.specifications).length > 0)) && (
            <ProductInfoTabs
              description={product.description}
              specifications={product.specifications}
            />
          )}

          {/* Delivery Info */}
          {product.deliveryInfo && (
            <Accordion title="Dostawa">
              <HtmlContent html={product.deliveryInfo} />
            </Accordion>
          )}

          {/* Reviews Section — x-kom style */}
          <View style={styles.reviewsSection}>
            {/* Header row: "Opinie 4.5 ★★★★★ (26 opinii)" */}
            <View style={styles.reviewsSectionHeader}>
              <Text style={styles.reviewsSectionTitle}>Opinie</Text>
              {reviewStats && reviewStats.totalReviews > 0 && (
                <>
                  <Text style={styles.reviewsSectionRating}>
                    {reviewStats.averageRating.toFixed(1)}
                  </Text>
                  <StarRating rating={reviewStats.averageRating} size={14} />
                  <Text style={styles.reviewsSectionCount}>
                    ({pluralizeReviews(reviewStats.totalReviews)})
                  </Text>
                </>
              )}
            </View>

            {/* Horizontal scrollable review cards */}
            {reviews.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewsHScroll}
              >
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewHCard}>
                    <View style={styles.reviewHCardHeader}>
                      <StarRating rating={review.rating} size={12} />
                      <Text style={styles.reviewHCardAuthor}>
                        {review.user
                          ? `${review.user.firstName} | `
                          : ''}
                        {new Date(review.createdAt).toLocaleDateString('pl-PL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                        {', '}
                        {new Date(review.createdAt).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {review.title && (
                      <Text style={styles.reviewHCardTitle}>
                        {review.title}
                      </Text>
                    )}
                    <Text style={styles.reviewHCardContent} numberOfLines={4}>
                      {review.content}
                    </Text>
                    {review.adminReply && (
                      <View style={{
                        marginTop: 8,
                        padding: 10,
                        backgroundColor: colors.backgroundTertiary,
                        borderLeftWidth: 3,
                        borderLeftColor: '#3B82F6',
                        borderRadius: 6,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#60A5FA', marginBottom: 3 }}>
                          Odpowiedź sklepu
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={3}>
                          {review.adminReply}
                        </Text>
                      </View>
                    )}
                    {review.isVerifiedPurchase && (
                      <View style={styles.reviewHCardVerified}>
                        <FontAwesome name="check-circle" size={11} color={colors.success} />
                        <Text style={styles.reviewHCardVerifiedText}>Zweryfikowany zakup</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* "Zobacz wszystkie opinie" button */}
            {reviewStats && reviewStats.totalReviews > reviews.length && !showAllReviews && (
              <TouchableOpacity
                style={styles.seeAllReviewsBtn}
                activeOpacity={0.7}
                onPress={async () => {
                  if (!product || loadingAllReviews) return;
                  setLoadingAllReviews(true);
                  try {
                    const data = await api.get<{ reviews: Review[] }>(
                      `/products/${product.id}/reviews?limit=100&sort=newest`
                    );
                    setReviews(data.reviews || []);
                    setShowAllReviews(true);
                  } catch {
                    showToast('Nie udało się załadować opinii', 'error');
                  } finally {
                    setLoadingAllReviews(false);
                  }
                }}
              >
                {loadingAllReviews ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Text style={styles.seeAllReviewsText}>
                    Zobacz wszystkie opinie ({reviewStats.totalReviews})
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* "Masz ten produkt?" CTA */}
            <View style={styles.reviewCta}>
              <Text style={styles.reviewCtaTitle}>Masz ten produkt?</Text>
              <Text style={styles.reviewCtaSubtitle}>Oceń go i pomóż innym w wyborze</Text>
              {!showReviewForm ? (
                <TouchableOpacity
                  style={styles.addReviewBtn}
                  onPress={() => {
                    if (!user) {
                      router.push('/(auth)/login');
                      return;
                    }
                    if (hasReviewed) {
                      showToast('Już oceniłeś ten produkt', 'info');
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addReviewBtnText}>Dodaj opinię</Text>
                </TouchableOpacity>
              ) : (
                /* Review Form */
                <View style={styles.reviewForm}>
                  {/* Star picker */}
                  <Text style={styles.reviewFormLabel}>Twoja ocena</Text>
                  <View style={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setReviewRating(star)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      >
                        <FontAwesome
                          name={star <= reviewRating ? 'star' : 'star-o'}
                          size={32}
                          color={star <= reviewRating ? colors.warning : colors.border}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Title */}
                  <Text style={styles.reviewFormLabel}>Tytuł (opcjonalnie)</Text>
                  <TextInput
                    style={styles.reviewFormInput}
                    placeholder="Np. Świetny produkt!"
                    placeholderTextColor={colors.placeholder}
                    value={reviewTitle}
                    onChangeText={setReviewTitle}
                    maxLength={200}
                  />

                  {/* Content */}
                  <Text style={styles.reviewFormLabel}>Treść opinii</Text>
                  <TextInput
                    style={[styles.reviewFormInput, styles.reviewFormTextarea]}
                    placeholder="Opisz swoje wrażenia z używania produktu..."
                    placeholderTextColor={colors.placeholder}
                    value={reviewContent}
                    onChangeText={setReviewContent}
                    multiline
                    numberOfLines={4}
                    maxLength={5000}
                    textAlignVertical="top"
                  />
                  <Text style={styles.reviewFormCharCount}>
                    {reviewContent.length}/5000 (min. 10)
                  </Text>

                  {/* Buttons */}
                  <View style={styles.reviewFormButtons}>
                    <TouchableOpacity
                      style={styles.reviewFormCancel}
                      onPress={() => {
                        setShowReviewForm(false);
                        setReviewRating(0);
                        setReviewTitle('');
                        setReviewContent('');
                      }}
                    >
                      <Text style={styles.reviewFormCancelText}>Anuluj</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.reviewFormSubmit,
                        (submittingReview || reviewRating === 0 || reviewContent.trim().length < 10) && styles.reviewFormSubmitDisabled,
                      ]}
                      onPress={handleSubmitReview}
                      disabled={submittingReview || reviewRating === 0 || reviewContent.trim().length < 10}
                      activeOpacity={0.8}
                    >
                      {submittingReview ? (
                        <ActivityIndicator size="small" color={colors.textInverse} />
                      ) : (
                        <Text style={styles.reviewFormSubmitText}>Wyślij opinię</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Same Warehouse Products */}
          {warehouseProducts.length > 0 && (
            <View style={styles.warehouseSection}>
              <ProductCarousel
                title={warehouseSource === 'warehouse' ? 'Inne produkty z tego magazynu' : 'Podobne produkty'}
                products={warehouseProducts}
              />
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Add to Shopping List Modal */}
      {product && (
        <AddToListModal
          visible={showListModal}
          onClose={() => setShowListModal(false)}
          productId={product.id}
          productName={product.name}
        />
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.card,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.tint,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textInverse,
    fontWeight: '600',
  },

  // Gallery
  galleryPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPlaceholderText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: colors.backgroundSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.tint,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },

  // Content
  content: {
    padding: 16,
  },

  // Badge
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },

  // Product name
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 28,
    marginBottom: 4,
  },
  sku: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },

  // Rating summary
  ratingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Price
  priceSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  comparePrice: {
    fontSize: 16,
    color: colors.priceOld,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.destructive,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  omnibusText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  newsletterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.tintLight,
    borderWidth: 1,
    borderColor: colors.tintMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    borderStyle: 'dashed',
  },
  newsletterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tint,
    letterSpacing: 0.2,
  },

  // Variants
  variantsSection: {
    marginBottom: 16,
  },
  variantGroup: {
    marginBottom: 12,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
  },
  chipSelected: {
    borderColor: colors.tint,
    backgroundColor: colors.tintLight,
  },
  chipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.tint,
    fontWeight: '600',
  },

  // Stock
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  stockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Add to cart
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  addToCartDisabled: {
    backgroundColor: colors.border,
  },
  addToCartText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  wishlistBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistBtnActive: {
    borderColor: colors.destructive,
    backgroundColor: colors.destructiveBg,
  },
  addToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.tintMuted,
    borderRadius: 10,
    backgroundColor: colors.tintLight,
  },
  addToListText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tint,
  },

  // Store
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  storeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Accordion
  accordionContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  accordionContent: {
    paddingBottom: 14,
  },

  // ─── Product Info Tabs ───
  tabsWrap: {
    marginTop: 24,
    marginHorizontal: -16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 3,
    marginTop: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.backgroundTertiary,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.tint,
  },
  tabBody: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },

  // ─── Spec rows (Specyfikacja tab) ───
  specTableWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  specRowAlt: {
    backgroundColor: colors.backgroundSecondary,
  },
  specLabel: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 20,
  },
  specVal: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1.3,
    paddingLeft: 12,
    lineHeight: 20,
  },

  // Reviews — x-kom style
  reviewsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  reviewsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  reviewsSectionRating: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  reviewsSectionCount: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Horizontal review cards
  reviewsHScroll: {
    paddingRight: 16,
    gap: 12,
    marginBottom: 12,
  },
  reviewHCard: {
    width: SCREEN_WIDTH * 0.72,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewHCardHeader: {
    marginBottom: 6,
  },
  reviewHCardAuthor: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  reviewHCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reviewHCardContent: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  reviewHCardVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  reviewHCardVerifiedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },

  // See all reviews button
  seeAllReviewsBtn: {
    borderWidth: 1,
    borderColor: colors.tint,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllReviewsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tint,
  },

  // "Masz ten produkt?" CTA
  reviewCta: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewCtaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  reviewCtaSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  addReviewBtn: {
    backgroundColor: colors.tint,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  addReviewBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },

  // Review form
  reviewForm: {
    width: '100%',
    marginTop: 4,
  },
  reviewFormLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  starPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  reviewFormInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.inputText,
  },
  reviewFormTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reviewFormCharCount: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  reviewFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  reviewFormCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  reviewFormCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  reviewFormSubmit: {
    backgroundColor: colors.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reviewFormSubmitDisabled: {
    backgroundColor: colors.border,
  },
  reviewFormSubmitText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },

  // Old review styles kept for compatibility
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reviewContent: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Warehouse section
  warehouseSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
