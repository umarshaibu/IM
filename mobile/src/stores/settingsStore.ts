import { create } from 'zustand';
import { saveSettings, getSettings } from '../utils/storage';

// Font size options
export type FontSize = 'small' | 'medium' | 'large';

// Wallpaper options
export type WallpaperType = 'default' | 'light' | 'dark' | 'solid';

export interface WallpaperSettings {
  type: WallpaperType;
  solidColor?: string;
}

// Notification settings
export interface NotificationSettings {
  enabled: boolean;
  sound: string;
  vibration: boolean;
  popup: boolean;
}

// Two-step verification
export interface TwoStepVerification {
  enabled: boolean;
  pin?: string; // Hashed, not stored in plain text
  email?: string;
  lastVerified?: string;
}

// App settings interface
export interface AppSettings {
  // Chat settings
  fontSize: FontSize;
  enterKeySends: boolean;
  mediaAutoDownload: 'wifi' | 'always' | 'never';

  // Appearance
  wallpaper: WallpaperSettings;

  // Notifications
  messageNotifications: NotificationSettings;
  groupNotifications: NotificationSettings;
  callNotifications: {
    enabled: boolean;
    ringtone: string;
    vibration: boolean;
  };

  // Security
  twoStepVerification: TwoStepVerification;

  // Privacy
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
}

// Default settings
const defaultSettings: AppSettings = {
  fontSize: 'medium',
  enterKeySends: false,
  mediaAutoDownload: 'wifi',

  wallpaper: {
    type: 'default',
  },

  messageNotifications: {
    enabled: true,
    sound: 'default',
    vibration: true,
    popup: true,
  },

  groupNotifications: {
    enabled: true,
    sound: 'default',
    vibration: true,
    popup: true,
  },

  callNotifications: {
    enabled: true,
    ringtone: 'default',
    vibration: true,
  },

  twoStepVerification: {
    enabled: false,
  },

  lastSeenVisibility: 'everyone',
  profilePhotoVisibility: 'everyone',
  readReceipts: true,
};

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;

  // Actions
  initialize: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Chat settings
  setFontSize: (size: FontSize) => void;
  setEnterKeySends: (enabled: boolean) => void;
  setMediaAutoDownload: (option: 'wifi' | 'always' | 'never') => void;

  // Wallpaper
  setWallpaper: (wallpaper: WallpaperSettings) => void;

  // Notifications
  setMessageNotifications: (settings: Partial<NotificationSettings>) => void;
  setGroupNotifications: (settings: Partial<NotificationSettings>) => void;
  setCallNotifications: (settings: Partial<AppSettings['callNotifications']>) => void;

  // Security
  setTwoStepVerification: (settings: Partial<TwoStepVerification>) => void;
  enableTwoStepVerification: (pin: string, email?: string) => void;
  disableTwoStepVerification: () => void;
  verifyTwoStepPin: (pin: string) => boolean;

  // Privacy
  setLastSeenVisibility: (visibility: 'everyone' | 'contacts' | 'nobody') => void;
  setProfilePhotoVisibility: (visibility: 'everyone' | 'contacts' | 'nobody') => void;
  setReadReceipts: (enabled: boolean) => void;

  // Reset
  resetToDefaults: () => void;
}

// Simple hash function for PIN (in production, use proper crypto)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: true,

  initialize: () => {
    try {
      const savedSettings = getSettings();
      if (savedSettings) {
        set({
          settings: { ...defaultSettings, ...savedSettings },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: (updates) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    saveSettings(newSettings);
  },

  // Chat settings
  setFontSize: (size) => {
    get().updateSettings({ fontSize: size });
  },

  setEnterKeySends: (enabled) => {
    get().updateSettings({ enterKeySends: enabled });
  },

  setMediaAutoDownload: (option) => {
    get().updateSettings({ mediaAutoDownload: option });
  },

  // Wallpaper
  setWallpaper: (wallpaper) => {
    get().updateSettings({ wallpaper });
  },

  // Notifications
  setMessageNotifications: (settings) => {
    const current = get().settings.messageNotifications;
    get().updateSettings({
      messageNotifications: { ...current, ...settings },
    });
  },

  setGroupNotifications: (settings) => {
    const current = get().settings.groupNotifications;
    get().updateSettings({
      groupNotifications: { ...current, ...settings },
    });
  },

  setCallNotifications: (settings) => {
    const current = get().settings.callNotifications;
    get().updateSettings({
      callNotifications: { ...current, ...settings },
    });
  },

  // Security
  setTwoStepVerification: (settings) => {
    const current = get().settings.twoStepVerification;
    get().updateSettings({
      twoStepVerification: { ...current, ...settings },
    });
  },

  enableTwoStepVerification: (pin, email) => {
    get().updateSettings({
      twoStepVerification: {
        enabled: true,
        pin: hashPin(pin),
        email,
        lastVerified: new Date().toISOString(),
      },
    });
  },

  disableTwoStepVerification: () => {
    get().updateSettings({
      twoStepVerification: {
        enabled: false,
        pin: undefined,
        email: undefined,
        lastVerified: undefined,
      },
    });
  },

  verifyTwoStepPin: (pin) => {
    const storedHash = get().settings.twoStepVerification.pin;
    if (!storedHash) return false;
    return hashPin(pin) === storedHash;
  },

  // Privacy
  setLastSeenVisibility: (visibility) => {
    get().updateSettings({ lastSeenVisibility: visibility });
  },

  setProfilePhotoVisibility: (visibility) => {
    get().updateSettings({ profilePhotoVisibility: visibility });
  },

  setReadReceipts: (enabled) => {
    get().updateSettings({ readReceipts: enabled });
  },

  // Reset
  resetToDefaults: () => {
    set({ settings: defaultSettings });
    saveSettings(defaultSettings);
  },
}));

export default useSettingsStore;
