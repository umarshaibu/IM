import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallEventModule } = NativeModules;

export interface NativeCallEventData {
  action: 'incoming' | 'answer' | 'decline';
  callId: string;
  callerId?: string;
  callerName?: string;
  callType?: 'Voice' | 'Video';
  conversationId?: string;
  // Room token data from native join call (when call is answered via native UI)
  roomToken?: string;
  roomId?: string;
  liveKitUrl?: string;
}

/**
 * End a call from the native side - closes the native incoming call UI
 */
export const endNativeCall = (callId: string): void => {
  if (Platform.OS === 'android' && CallEventModule?.endCall) {
    try {
      CallEventModule.endCall(callId);
      console.log('NativeCallEvent: endCall sent for', callId);
    } catch (error) {
      console.log('NativeCallEvent: Error ending call:', error);
    }
  }
};

/**
 * Save credentials for native API calls
 * This allows the native IncomingCallActivity to join/decline calls via HTTP
 * without waiting for React Native to initialize
 */
export const saveNativeCredentials = (accessToken: string, apiUrl: string): void => {
  if (Platform.OS === 'android' && CallEventModule?.saveCredentials) {
    try {
      CallEventModule.saveCredentials(accessToken, apiUrl);
      console.log('NativeCallEvent: Credentials saved for native API calls');
    } catch (error) {
      console.log('NativeCallEvent: Error saving credentials:', error);
    }
  }
};

/**
 * Clear credentials on logout
 */
export const clearNativeCredentials = (): void => {
  if (Platform.OS === 'android' && CallEventModule?.clearCredentials) {
    try {
      CallEventModule.clearCredentials();
      console.log('NativeCallEvent: Credentials cleared');
    } catch (error) {
      console.log('NativeCallEvent: Error clearing credentials:', error);
    }
  }
};

type CallEventListener = (event: NativeCallEventData) => void;

class NativeCallEventService {
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: CallEventListener[] = [];
  private subscription: any = null;

  constructor() {
    if (Platform.OS === 'android' && CallEventModule) {
      this.eventEmitter = new NativeEventEmitter(CallEventModule);
    }
  }

  /**
   * Start listening for native call events
   */
  startListening(callback: CallEventListener): () => void {
    if (!this.eventEmitter) {
      console.log('NativeCallEvent: Not available on this platform');
      return () => {};
    }

    this.listeners.push(callback);

    // Only create one subscription for all listeners
    if (!this.subscription) {
      this.subscription = this.eventEmitter.addListener(
        'onNativeCallEvent',
        (event: NativeCallEventData) => {
          console.log('NativeCallEvent received:', event);
          this.listeners.forEach((listener) => listener(event));
        }
      );
    }

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }

      // Remove subscription if no more listeners
      if (this.listeners.length === 0 && this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
    };
  }

  /**
   * Get any pending call data from when the app was launched
   */
  async getPendingCallData(): Promise<NativeCallEventData | null> {
    if (Platform.OS === 'android' && CallEventModule) {
      try {
        const data = await CallEventModule.getPendingCallData();
        return data;
      } catch (error) {
        console.log('Error getting pending call data:', error);
        return null;
      }
    }
    return null;
  }
}

export const nativeCallEventService = new NativeCallEventService();
export default nativeCallEventService;
