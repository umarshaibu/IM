import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';

export const storage = new MMKV({
  id: 'im-app-storage',
});

const STORAGE_KEYS = {
  AUTH_TOKENS: 'auth_tokens',
  USER_ID: 'user_id',
  USER_PROFILE: 'user_profile',
  ENCRYPTION_KEYS: 'encryption_keys',
  SETTINGS: 'settings',
  DRAFT_MESSAGES: 'draft_messages',
};

export const setItem = (key: string, value: any): void => {
  storage.set(key, JSON.stringify(value));
};

export const getItem = <T>(key: string): T | null => {
  const value = storage.getString(key);
  if (value) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
};

export const removeItem = (key: string): void => {
  storage.delete(key);
};

export const clearAll = (): void => {
  storage.clearAll();
};

// Secure storage for sensitive data
export const setSecureItem = async (key: string, value: string): Promise<void> => {
  await Keychain.setGenericPassword(key, value, { service: key });
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({ service: key });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  await Keychain.resetGenericPassword({ service: key });
};

// Auth tokens
export const saveAuthTokens = async (tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> => {
  await setSecureItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
};

export const getAuthTokens = async (): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> => {
  const tokens = await getSecureItem(STORAGE_KEYS.AUTH_TOKENS);
  if (tokens) {
    try {
      return JSON.parse(tokens);
    } catch {
      return null;
    }
  }
  return null;
};

export const clearAuthTokens = async (): Promise<void> => {
  await removeSecureItem(STORAGE_KEYS.AUTH_TOKENS);
};

// User profile
export const saveUserProfile = (profile: any): void => {
  setItem(STORAGE_KEYS.USER_PROFILE, profile);
};

export const getUserProfile = (): any | null => {
  return getItem(STORAGE_KEYS.USER_PROFILE);
};

// Settings
export const saveSettings = (settings: any): void => {
  setItem(STORAGE_KEYS.SETTINGS, settings);
};

export const getSettings = (): any | null => {
  return getItem(STORAGE_KEYS.SETTINGS);
};

// Draft messages
export const saveDraftMessage = (conversationId: string, message: string): void => {
  const drafts = getItem<Record<string, string>>(STORAGE_KEYS.DRAFT_MESSAGES) || {};
  drafts[conversationId] = message;
  setItem(STORAGE_KEYS.DRAFT_MESSAGES, drafts);
};

export const getDraftMessage = (conversationId: string): string | null => {
  const drafts = getItem<Record<string, string>>(STORAGE_KEYS.DRAFT_MESSAGES);
  return drafts?.[conversationId] || null;
};

export const clearDraftMessage = (conversationId: string): void => {
  const drafts = getItem<Record<string, string>>(STORAGE_KEYS.DRAFT_MESSAGES) || {};
  delete drafts[conversationId];
  setItem(STORAGE_KEYS.DRAFT_MESSAGES, drafts);
};
