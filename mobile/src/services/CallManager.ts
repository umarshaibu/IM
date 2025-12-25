import { Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import { v4 as uuidv4 } from 'uuid';

// Call state tracking
interface ActiveCall {
  callId: string;
  uuid: string;
  callerName: string;
  isVideo: boolean;
  isOutgoing: boolean;
  startTime?: Date;
}

class CallManagerClass {
  private isInitialized = false;
  private activeCalls: Map<string, ActiveCall> = new Map();

  // Callbacks
  private onAnswerCall: ((callId: string) => void) | null = null;
  private onEndCall: ((callId: string) => void) | null = null;
  private onMuteCall: ((callId: string, muted: boolean) => void) | null = null;

  /**
   * Initialize CallKeep (CallKit on iOS, ConnectionService on Android)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const options = {
      ios: {
        appName: 'IM',
        supportsVideo: true,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
        includesCallsInRecents: true,
        ringtoneSound: 'ringtone.caf',
      },
      android: {
        alertTitle: 'Permissions Required',
        alertDescription: 'IM needs access to manage phone calls',
        cancelButton: 'Cancel',
        okButton: 'OK',
        imageName: 'ic_launcher',
        // Self-managed mode for VoIP apps
        selfManaged: true,
        // Additional required permissions
        additionalPermissions: [],
        // Foreground service notification
        foregroundService: {
          channelId: 'calls',
          channelName: 'Incoming Calls',
          notificationTitle: 'IM Call',
          notificationIcon: 'ic_call',
        },
      },
    };

    try {
      await RNCallKeep.setup(options);
      this.isInitialized = true;
      this.setupEventListeners();
      console.log('CallManager initialized successfully');
    } catch (error) {
      console.error('CallManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for CallKeep events
   */
  private setupEventListeners(): void {
    // Answer call from native UI
    RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
      console.log('CallKeep: answerCall', callUUID);
      const call = this.getCallByUUID(callUUID);
      if (call && this.onAnswerCall) {
        this.onAnswerCall(call.callId);
      }
    });

    // End call from native UI
    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      console.log('CallKeep: endCall', callUUID);
      const call = this.getCallByUUID(callUUID);
      if (call) {
        if (this.onEndCall) {
          this.onEndCall(call.callId);
        }
        this.activeCalls.delete(call.callId);
      }
    });

    // Mute toggle from native UI
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', ({ callUUID, muted }) => {
      console.log('CallKeep: didPerformSetMutedCallAction', callUUID, muted);
      const call = this.getCallByUUID(callUUID);
      if (call && this.onMuteCall) {
        this.onMuteCall(call.callId, muted);
      }
    });

    // DTMF (dial pad) - not typically used in VoIP but required
    RNCallKeep.addEventListener('didPerformDTMFAction', ({ callUUID, digits }) => {
      console.log('CallKeep: DTMF', callUUID, digits);
    });

    // Audio route changed (speaker, bluetooth, etc.)
    RNCallKeep.addEventListener('didChangeAudioRoute', ({ output, reason }) => {
      console.log('CallKeep: Audio route changed', output, reason);
    });

    // Call activated (audio session is ready)
    RNCallKeep.addEventListener('didActivateAudioSession', () => {
      console.log('CallKeep: Audio session activated');
    });

    // Call deactivated
    RNCallKeep.addEventListener('didDeactivateAudioSession', () => {
      console.log('CallKeep: Audio session deactivated');
    });

    // Provider reset (iOS only)
    RNCallKeep.addEventListener('didResetProvider', () => {
      console.log('CallKeep: Provider reset');
      this.activeCalls.clear();
    });
  }

  /**
   * Display incoming call (wakes device on both iOS and Android)
   */
  async displayIncomingCall(
    callId: string,
    callerName: string,
    isVideo: boolean = false,
    callerNumber?: string
  ): Promise<string> {
    await this.ensureInitialized();

    const uuid = uuidv4();

    const call: ActiveCall = {
      callId,
      uuid,
      callerName,
      isVideo,
      isOutgoing: false,
    };

    this.activeCalls.set(callId, call);

    // Display the incoming call - this wakes the device
    RNCallKeep.displayIncomingCall(
      uuid,
      callerNumber || callerName,
      callerName,
      'generic',
      isVideo
    );

    console.log('CallManager: Displayed incoming call', { callId, uuid, callerName, isVideo });
    return uuid;
  }

  /**
   * Start an outgoing call
   */
  async startOutgoingCall(
    callId: string,
    callerName: string,
    isVideo: boolean = false,
    callerNumber?: string
  ): Promise<string> {
    await this.ensureInitialized();

    const uuid = uuidv4();

    const call: ActiveCall = {
      callId,
      uuid,
      callerName,
      isVideo,
      isOutgoing: true,
    };

    this.activeCalls.set(callId, call);

    RNCallKeep.startCall(uuid, callerNumber || callerName, callerName, 'generic', isVideo);

    console.log('CallManager: Started outgoing call', { callId, uuid, callerName, isVideo });
    return uuid;
  }

  /**
   * Report that the call is connected
   */
  reportConnectedCall(callId: string): void {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.startTime = new Date();
      RNCallKeep.setCurrentCallActive(call.uuid);
      console.log('CallManager: Call connected', callId);
    }
  }

  /**
   * End a call
   */
  async endCall(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (call) {
      RNCallKeep.endCall(call.uuid);
      this.activeCalls.delete(callId);
      console.log('CallManager: Ended call', callId);
    }
  }

  /**
   * End all active calls
   */
  async endAllCalls(): Promise<void> {
    RNCallKeep.endAllCalls();
    this.activeCalls.clear();
    console.log('CallManager: Ended all calls');
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (call) {
      RNCallKeep.rejectCall(call.uuid);
      this.activeCalls.delete(callId);
      console.log('CallManager: Rejected call', callId);
    }
  }

  /**
   * Set call muted state
   */
  setMuted(callId: string, muted: boolean): void {
    const call = this.activeCalls.get(callId);
    if (call) {
      RNCallKeep.setMutedCall(call.uuid, muted);
      console.log('CallManager: Set muted', callId, muted);
    }
  }

  /**
   * Set call on hold
   */
  setOnHold(callId: string, onHold: boolean): void {
    const call = this.activeCalls.get(callId);
    if (call) {
      RNCallKeep.setOnHold(call.uuid, onHold);
      console.log('CallManager: Set on hold', callId, onHold);
    }
  }

  /**
   * Update call info (e.g., caller name)
   */
  updateDisplay(callId: string, callerName: string, callerNumber?: string): void {
    const call = this.activeCalls.get(callId);
    if (call) {
      RNCallKeep.updateDisplay(call.uuid, callerName, callerNumber || callerName);
      call.callerName = callerName;
      console.log('CallManager: Updated display', callId, callerName);
    }
  }

  /**
   * Check if there's an active call
   */
  hasActiveCall(): boolean {
    return this.activeCalls.size > 0;
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): ActiveCall[] {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Get call by ID
   */
  getCall(callId: string): ActiveCall | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Set callback handlers
   */
  setCallbacks(callbacks: {
    onAnswerCall?: (callId: string) => void;
    onEndCall?: (callId: string) => void;
    onMuteCall?: (callId: string, muted: boolean) => void;
  }): void {
    if (callbacks.onAnswerCall) this.onAnswerCall = callbacks.onAnswerCall;
    if (callbacks.onEndCall) this.onEndCall = callbacks.onEndCall;
    if (callbacks.onMuteCall) this.onMuteCall = callbacks.onMuteCall;
  }

  /**
   * Configure audio session for VoIP
   */
  async configureAudioSession(): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS audio session configuration is handled by CallKit
      RNCallKeep.setAvailable(true);
    }
  }

  /**
   * Check if CallKeep is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await RNCallKeep.hasPhoneAccount();
      }
      return true; // iOS always supports CallKit
    } catch {
      return false;
    }
  }

  /**
   * Request phone account permission (Android only)
   */
  async requestPhoneAccountPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return await RNCallKeep.hasPhoneAccount();
    }
    return true;
  }

  /**
   * Open phone account settings (Android only)
   */
  openPhoneAccountSettings(): void {
    if (Platform.OS === 'android') {
      RNCallKeep.hasDefaultPhoneAccount();
    }
  }

  /**
   * Get call by UUID
   */
  private getCallByUUID(uuid: string): ActiveCall | undefined {
    for (const call of this.activeCalls.values()) {
      if (call.uuid === uuid) {
        return call;
      }
    }
    return undefined;
  }

  /**
   * Ensure CallKeep is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Remove all event listeners (cleanup)
   */
  cleanup(): void {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
    RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
    RNCallKeep.removeEventListener('didPerformDTMFAction');
    RNCallKeep.removeEventListener('didChangeAudioRoute');
    RNCallKeep.removeEventListener('didActivateAudioSession');
    RNCallKeep.removeEventListener('didDeactivateAudioSession');
    RNCallKeep.removeEventListener('didResetProvider');
    this.isInitialized = false;
    this.activeCalls.clear();
  }
}

// Export singleton instance
export const CallManager = new CallManagerClass();
export default CallManager;
