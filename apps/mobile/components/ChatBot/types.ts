export interface MessageAction {
  label: string;
  icon: 'envelope' | 'phone' | 'external-link' | 'question-circle';
  type: 'email' | 'link';
  payload: string; // email address or URL
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
}

export interface ChatBotModalProps {
  visible: boolean;
  onMinimize: () => void;
  onEndChat: () => void;
}

export interface FaqEntry {
  keywords: string[];
  question: string;
  answer: string;
  category: string;
}
