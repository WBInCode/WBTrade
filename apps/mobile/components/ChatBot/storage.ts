import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from './types';

const STORAGE_KEY = 'wubus_chat_history';
const MAX_MESSAGES = 100;

/**
 * Save messages to AsyncStorage with Date serialization.
 * Keeps only the last MAX_MESSAGES (FIFO).
 */
export async function saveChatHistory(messages: Message[]): Promise<void> {
  try {
    const trimmed = messages.length > MAX_MESSAGES
      ? messages.slice(messages.length - MAX_MESSAGES)
      : messages;

    const json = JSON.stringify(trimmed, (_key, value) => {
      // Date instances are auto-converted to ISO strings by JSON.stringify,
      // but we tag them explicitly so we can restore on parse
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });

    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.warn('[WuBuś] Failed to save chat history:', e);
  }
}

/**
 * Load messages from AsyncStorage, restoring Date objects.
 * Returns null if no history exists.
 */
export async function loadChatHistory(): Promise<Message[] | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const parsed: Message[] = JSON.parse(json, (_key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });

    // Validate basic structure
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed;
  } catch (e) {
    console.warn('[WuBuś] Failed to load chat history:', e);
    return null;
  }
}

/**
 * Clear persisted chat history.
 */
export async function clearChatHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[WuBuś] Failed to clear chat history:', e);
  }
}
