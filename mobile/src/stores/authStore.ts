import { create } from 'zustand';
import { UserProfile, AuthTokens } from '../types';
import {
  saveAuthTokens,
  getAuthTokens,
  clearAuthTokens,
  saveUserProfile,
  getUserProfile,
  clearAll,
} from '../utils/storage';
import { saveNativeCredentials, clearNativeCredentials } from '../services/NativeCallEvent';
import { AppConfig } from '../config';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (
    userId: string,
    user: UserProfile,
    tokens: AuthTokens
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<UserProfile>) => void;
  setUser: (user: Partial<UserProfile>) => void;
  updateTokens: (tokens: AuthTokens) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  user: null,
  accessToken: null,
  refreshToken: null,

  initialize: async () => {
    try {
      const tokens = await getAuthTokens();
      const user = getUserProfile();

      if (tokens && user) {
        // Save credentials for native API calls (Android)
        saveNativeCredentials(tokens.accessToken, AppConfig.apiUrl);

        set({
          isAuthenticated: true,
          isLoading: false,
          userId: user.id,
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },

  login: async (userId, user, tokens) => {
    await saveAuthTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    saveUserProfile(user);

    // Save credentials for native API calls (Android)
    saveNativeCredentials(tokens.accessToken, AppConfig.apiUrl);

    set({
      isAuthenticated: true,
      userId,
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },

  logout: async () => {
    await clearAuthTokens();
    clearAll();

    // Clear native credentials on logout
    clearNativeCredentials();

    set({
      isAuthenticated: false,
      userId: null,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },

  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      saveUserProfile(updatedUser);
      set({ user: updatedUser });
    }
  },

  setUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      saveUserProfile(updatedUser);
      set({ user: updatedUser });
    }
  },

  updateTokens: async (tokens) => {
    await saveAuthTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    // Update native credentials when tokens are refreshed
    saveNativeCredentials(tokens.accessToken, AppConfig.apiUrl);

    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },
}));
