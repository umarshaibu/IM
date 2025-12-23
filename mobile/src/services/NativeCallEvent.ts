import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallEventModule } = NativeModules;

export interface NativeCallEventData {
  action: 'incoming' | 'answer' | 'decline';
  callId: string;
  callerId?: string;
  callerName?: string;
  callType?: 'Voice' | 'Video';
  conversationId?: string;
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
