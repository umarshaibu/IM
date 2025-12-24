import { Platform } from 'react-native';

// Try to import react-native-config, fallback to empty object if not available
let Config: Record<string, string | undefined> = {};
try {
  Config = require('react-native-config').default || {};
} catch (e) {
  // react-native-config not available, use defaults
  console.log('react-native-config not available, using default configuration');
}

/**
 * Environment Configuration
 *
 * For development:
 * - Uses localhost for iOS simulator
 * - Uses 10.0.2.2 for Android emulator (host machine gateway)
 *
 * For production:
 * - Uses the production URL from .env.production
 * - Requires SSL (https) for secure connections
 * - Backend must be deployed to a public server
 */

// Determine if running in development mode
const isDev = __DEV__;

// Get API URL based on platform and environment
// Now respects .env file values even in dev mode
const getApiUrl = (): string => {
  // Always use env values if provided (allows testing production backend in dev)
  if (Platform.OS === 'android') {
    return Config.API_URL_ANDROID || Config.API_URL || 'http://10.0.2.2:5001';
  }
  return Config.API_URL || 'http://localhost:5001';
};

// Get SignalR URL based on platform and environment
// Now respects .env file values even in dev mode
const getSignalRUrl = (): string => {
  if (Platform.OS === 'android') {
    return Config.SIGNALR_URL_ANDROID || Config.SIGNALR_URL || 'http://10.0.2.2:5001';
  }
  return Config.SIGNALR_URL || 'http://localhost:5001';
};

// Get LiveKit URL
const getLiveKitUrl = (): string => {
  return Config.LIVEKIT_URL || 'http://68.168.211.251:7880';
};

export const AppConfig = {
  // Environment
  isDevelopment: isDev,
  isProduction: !isDev,

  // API Configuration
  apiUrl: getApiUrl(),
  apiBaseUrl: `${getApiUrl()}/api`,

  // SignalR Configuration
  signalRUrl: getSignalRUrl(),
  chatHubUrl: `${getSignalRUrl()}/hubs/chat`,
  callHubUrl: `${getSignalRUrl()}/hubs/call`,
  presenceHubUrl: `${getSignalRUrl()}/hubs/presence`,

  // LiveKit Configuration
  liveKitUrl: getLiveKitUrl(),

  // Timeouts
  apiTimeout: 30000,
  signalRReconnectInterval: 5000,

  // App Info
  appName: 'IM',
  appVersion: '1.0.0',
};

// Log configuration always (for debugging)
console.log('App Configuration:', {
  environment: isDev ? 'development' : 'production',
  apiUrl: AppConfig.apiUrl,
  apiBaseUrl: AppConfig.apiBaseUrl,
  signalRUrl: AppConfig.signalRUrl,
  liveKitUrl: AppConfig.liveKitUrl,
  configValues: {
    API_URL: Config.API_URL,
    API_URL_ANDROID: Config.API_URL_ANDROID,
  },
});

export default AppConfig;
