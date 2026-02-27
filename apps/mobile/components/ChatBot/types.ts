export interface MessageAction {
  label: string;
  icon: 'envelope' | 'phone' | 'external-link' | 'question-circle' | 'arrow-right';
  type: 'email' | 'link' | 'navigate';
  payload: string; // email address or URL
  route?: string; // navigation route for type: 'navigate'
  subject?: string;
  body?: string;
}

export interface ProductResult {
  id: string;
  name: string;
  price: string | number;
  rating?: string | number;
  reviewCount?: number;
  imageUrl?: string;
}

export interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  actions?: MessageAction[];
  showSuggestions?: boolean;
  products?: ProductResult[];
  showCategories?: boolean;
  categoryQuestions?: string[];
  contextualSuggestions?: string[];
  reaction?: 'up' | 'down' | null;
}

export interface ChatBotModalProps {
  visible: boolean;
  onMinimize: () => void;
  onEndChat: () => void;
  onBotMessage?: () => void;
}

export interface FaqEntry {
  keywords: string[];
  question: string;
  answer: string;
  category: string;
  actions?: MessageAction[];
}
