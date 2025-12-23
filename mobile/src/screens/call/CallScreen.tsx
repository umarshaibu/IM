import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { registerGlobals, VideoView } from '@livekit/react-native';
import {
  Room,
  Track,
  RoomOptions,
  VideoPresets,
  ConnectionQuality,
  RoomEvent,
} from 'livekit-client';
import InCallManager from 'react-native-incall-manager';
import Avatar from '../../components/Avatar';
import { conversationsApi } from '../../services/api';
import * as signalr from '../../services/signalr';
import { useCallStore } from '../../stores/callStore';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import { callSoundService } from '../../services/CallSoundService';

registerGlobals();

// Connection quality levels for UI display
type QualityLevel = 'excellent' | 'good' | 'poor' | 'lost';

const getQualityLevel = (quality: ConnectionQuality): QualityLevel => {
  switch (quality) {
    case ConnectionQuality.Excellent:
      return 'excellent';
    case ConnectionQuality.Good:
      return 'good';
    case ConnectionQuality.Poor:
      return 'poor';
    case ConnectionQuality.Lost:
      return 'lost';
    default:
      return 'good';
  }
};

const getQualityColor = (quality: QualityLevel): string => {
  switch (quality) {
    case 'excellent':
      return '#4CAF50'; // Green
    case 'good':
      return '#8BC34A'; // Light green
    case 'poor':
      return '#FF9800'; // Orange
    case 'lost':
      return '#F44336'; // Red
    default:
      return '#8BC34A';
  }
};

const getQualityIcon = (quality: QualityLevel): string => {
  switch (quality) {
    case 'excellent':
      return 'signal-cellular-3';
    case 'good':
      return 'signal-cellular-2';
    case 'poor':
      return 'signal-cellular-1';
    case 'lost':
      return 'signal-cellular-outline';
    default:
      return 'signal-cellular-2';
  }
};

type CallScreenRouteProp = RouteProp<RootStackParamList, 'Call'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CallScreen: React.FC = () => {
  const route = useRoute<CallScreenRouteProp>();
  const navigation = useNavigation();
  const { conversationId, type, callId, isIncoming } = route.params;
  const { userId } = useAuthStore();
  const { setActiveCall, clearActiveCall, activeCall } = useCallStore();
  const currentUserId = userId || '';
  const currentConversationId = conversationId || '';
  const existingCallId = callId;

  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === 'Video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [hasOtherParticipant, setHasOtherParticipant] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState<Track | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<Track | null>(null);
  const [callInitialized, setCallInitialized] = useState(false);
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected'>('calling');
  const ringingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasOtherParticipantRef = useRef(false); // Ref to track participant status for timeout callback
  const isReconnectingRef = useRef(false); // Ref to track reconnection status for callbacks
  const participantDisconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Grace period timeout

  // Connection quality and reconnection state
  const [connectionQuality, setConnectionQuality] = useState<QualityLevel>('good');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qualityWarningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: async () => {
      const response = await conversationsApi.get(currentConversationId);
      return response.data;
    },
    enabled: !!currentConversationId,
  });

  const otherParticipant = conversation?.participants?.find(
    (p: any) => p.userId !== currentUserId
  );

  useEffect(() => {
    // Start InCallManager for proper audio routing
    InCallManager.start({ media: type === 'Video' ? 'video' : 'audio' });
    // Set initial speaker mode (speaker for video calls, earpiece for voice calls)
    InCallManager.setSpeakerphoneOn(type === 'Video');
    setIsSpeakerOn(type === 'Video');

    initializeCall();

    return () => {
      // Clear timeout on unmount
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (qualityWarningTimeoutRef.current) {
        clearTimeout(qualityWarningTimeoutRef.current);
      }
      if (participantDisconnectTimeoutRef.current) {
        clearTimeout(participantDisconnectTimeoutRef.current);
      }
      // Stop any playing sounds
      callSoundService.stopAllSounds();
      // Stop InCallManager
      InCallManager.stop();
      cleanupCall();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isConnecting && room && hasOtherParticipant) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnecting, room, hasOtherParticipant]);

  // Watch for call ending from the other side
  useEffect(() => {
    console.log('CallScreen: activeCall changed:', activeCall?.id);
    console.log('CallScreen: existingCallId from route:', existingCallId);
    console.log('CallScreen: room exists:', !!room);
    console.log('CallScreen: callInitialized:', callInitialized);
    if (!activeCall && callInitialized) {
      // Call was ended remotely, cleanup and navigate back
      console.log('CallScreen: Call ended remotely, cleaning up and navigating back');
      cleanupCall();
      navigateBack();
    }
  }, [activeCall]);

  const navigateBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    }
  };

  const initializeCall = async () => {
    if (!currentConversationId) {
      Alert.alert('Error', 'No conversation specified');
      navigation.goBack();
      return;
    }

    // Declare call outside try block so it's accessible in catch for cleanup
    let call: any = null;

    try {
      let roomToken: string;
      let liveKitUrl: string;

      if (isIncoming && existingCallId) {
        // Join existing call via SignalR
        const response = await signalr.joinCall(existingCallId);
        if (!response) {
          throw new Error('Failed to join call - SignalR returned null');
        }
        call = { id: existingCallId };
        roomToken = response.roomToken;
        liveKitUrl = response.liveKitUrl;
      } else {
        // Initiate new call via SignalR
        const response = await signalr.initiateCall(currentConversationId, type);
        if (!response) {
          throw new Error('Failed to initiate call - SignalR returned null');
        }
        call = response.call;
        roomToken = response.roomToken;
        liveKitUrl = response.liveKitUrl;
      }

      setActiveCall({
        id: call.id,
        conversationId: currentConversationId,
        type,
        status: 'Connecting',
        initiatorId: currentUserId,
        participants: [],
        startedAt: new Date().toISOString(),
      });

      // Connect to LiveKit room
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
        publishDefaults: {
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        },
      };

      const newRoom = new Room(roomOptions);

      newRoom.on('participantConnected', (participant: any) => {
        console.log('Participant connected:', participant.identity);
        hasOtherParticipantRef.current = true;
        setHasOtherParticipant(true);
        setCallStatus('connected');
        // Stop the ringing tone when participant joins
        callSoundService.stopAllSounds();
        // Clear the ringing timeout when participant joins
        if (ringingTimeoutRef.current) {
          clearTimeout(ringingTimeoutRef.current);
          ringingTimeoutRef.current = null;
        }
      });

      newRoom.on('participantDisconnected', (participant: any) => {
        console.log('Participant disconnected:', participant.identity);
        console.log('Remaining remote participants:', newRoom.remoteParticipants.size);
        console.log('Is reconnecting:', isReconnectingRef.current);
        hasOtherParticipantRef.current = false;
        setHasOtherParticipant(false);
        setRemoteVideoTrack(null);

        // In a 1:1 call, if the other participant disconnects, wait for potential reconnection
        if (newRoom.remoteParticipants.size === 0) {
          console.log('All remote participants left, waiting for potential reconnection...');

          // Clear any existing grace period timeout
          if (participantDisconnectTimeoutRef.current) {
            clearTimeout(participantDisconnectTimeoutRef.current);
          }

          // Wait 5 seconds before ending call to allow for reconnection
          participantDisconnectTimeoutRef.current = setTimeout(() => {
            // Check again if still no participants and not reconnecting
            if (newRoom.remoteParticipants.size === 0 && !isReconnectingRef.current) {
              console.log('No participants after grace period, ending call');
              callSoundService.stopAllSounds();
              callSoundService.playEndedTone();
              newRoom.disconnect();
              clearActiveCall();
              navigateBack();
            } else {
              console.log('Participant reconnected or reconnecting, keeping call alive');
            }
          }, 5000);
        }
      });

      // Cancel grace period timeout when participant reconnects
      newRoom.on('participantConnected', (participant: any) => {
        if (participantDisconnectTimeoutRef.current) {
          console.log('Participant reconnected, cancelling disconnect timeout');
          clearTimeout(participantDisconnectTimeoutRef.current);
          participantDisconnectTimeoutRef.current = null;
        }
      });

      newRoom.on('trackSubscribed', (track: Track, publication: any, participant: any) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        if (track.kind === Track.Kind.Video) {
          console.log('Setting remote video track');
          setRemoteVideoTrack(track);
        }
      });

      newRoom.on('trackUnsubscribed', (track: Track) => {
        console.log('Track unsubscribed:', track.kind);
        if (track.kind === Track.Kind.Video) {
          setRemoteVideoTrack(null);
        }
      });

      newRoom.on('disconnected', (reason?: any) => {
        console.log('Room disconnected, reason:', reason);
        // Don't call handleEndCall if we're the one who initiated the disconnect
        // Just cleanup and navigate back
        callSoundService.stopAllSounds();
        callSoundService.playEndedTone();
        clearActiveCall();
        navigateBack();
      });

      // Connection quality monitoring
      newRoom.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant: any) => {
        // Only track local participant's connection quality
        if (participant.isLocal) {
          const qualityLevel = getQualityLevel(quality);
          console.log('Connection quality changed:', qualityLevel);
          setConnectionQuality(qualityLevel);

          // Show warning for poor/lost quality
          if (qualityLevel === 'poor' || qualityLevel === 'lost') {
            setShowQualityWarning(true);
            // Auto-hide warning after 5 seconds if quality improves
            if (qualityWarningTimeoutRef.current) {
              clearTimeout(qualityWarningTimeoutRef.current);
            }
            qualityWarningTimeoutRef.current = setTimeout(() => {
              setShowQualityWarning(false);
            }, 5000);
          } else {
            setShowQualityWarning(false);
          }

          // Automatically reduce video quality when connection is poor
          if (qualityLevel === 'poor' && type === 'Video' && isVideoEnabled) {
            console.log('Poor connection - reducing video quality');
            // LiveKit's adaptive streaming will handle this automatically
            // but we can also manually set preferred quality
          }
        }
      });

      // Reconnection handling
      newRoom.on(RoomEvent.Reconnecting, () => {
        console.log('Connection lost, attempting to reconnect...');
        isReconnectingRef.current = true;
        setIsReconnecting(true);
        setReconnectAttempts((prev) => prev + 1);
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        console.log('Successfully reconnected!');
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        setReconnectAttempts(0);
      });

      newRoom.on(RoomEvent.SignalReconnecting, () => {
        console.log('Signal connection lost, reconnecting...');
        isReconnectingRef.current = true;
        setIsReconnecting(true);
      });

      // Media device failure handling
      newRoom.on(RoomEvent.MediaDevicesError, (error: Error) => {
        console.error('Media device error:', error);
        Alert.alert(
          'Media Error',
          'There was a problem with your microphone or camera. Please check your device permissions.',
          [{ text: 'OK' }]
        );
      });

      // Listen for local track published BEFORE enabling camera
      newRoom.localParticipant.on('localTrackPublished', (publication: any) => {
        console.log('Local track published:', publication.kind, publication.track?.sid);
        if (publication.kind === 'video' && publication.track) {
          setLocalVideoTrack(publication.track);
        }
      });

      await newRoom.connect(liveKitUrl, roomToken);
      console.log('Connected to LiveKit room');

      // Check if there are already participants in the room
      // This handles the case where the other user joined before us
      if (newRoom.remoteParticipants.size > 0) {
        console.log('Found existing participants:', newRoom.remoteParticipants.size);
        hasOtherParticipantRef.current = true;
        setHasOtherParticipant(true);
        setCallStatus('connected');
        // Stop any ringing sounds since we're already connected
        callSoundService.stopAllSounds();
        // Clear the ringing timeout since participant is already here
        if (ringingTimeoutRef.current) {
          clearTimeout(ringingTimeoutRef.current);
          ringingTimeoutRef.current = null;
        }

        // Check for existing remote video tracks
        newRoom.remoteParticipants.forEach((participant: any) => {
          participant.videoTrackPublications.forEach((publication: any) => {
            if (publication.track) {
              console.log('Found existing remote video track from', participant.identity);
              setRemoteVideoTrack(publication.track);
            }
          });
        });
      }

      // Enable media
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      if (type === 'Video') {
        await newRoom.localParticipant.setCameraEnabled(true);
        console.log('Camera enabled');

        // Wait a bit for track to be published, then try to get it
        setTimeout(() => {
          const videoTracks = Array.from(newRoom.localParticipant.videoTrackPublications.values());
          console.log('Video track publications:', videoTracks.length);
          if (videoTracks.length > 0) {
            const pub = videoTracks[0] as any;
            if (pub.track) {
              console.log('Setting local video track from publication');
              setLocalVideoTrack(pub.track);
            }
          }
        }, 500);
      }

      setRoom(newRoom);
      setIsConnecting(false);
      setCallInitialized(true);

      // If this is an outgoing call and no participants yet, set status to ringing and start 30s timeout
      // Skip if we already found existing participants (handled above)
      if (!isIncoming && newRoom.remoteParticipants.size === 0) {
        setCallStatus('ringing');
        // Play the outgoing call tone (ringback tone)
        callSoundService.playOutgoingTone();
        ringingTimeoutRef.current = setTimeout(() => {
          // Use ref instead of state to get current value (avoids stale closure issue)
          // Also double-check remoteParticipants size as a backup
          console.log('Timeout check - hasOtherParticipantRef:', hasOtherParticipantRef.current, 'remoteParticipants:', newRoom.remoteParticipants.size);
          if (!hasOtherParticipantRef.current && newRoom.remoteParticipants.size === 0) {
            console.log('Call timeout - no answer after 30 seconds');
            callSoundService.stopAllSounds();
            Alert.alert('Call Ended', 'No answer');
            handleEndCall();
          } else {
            console.log('Timeout fired but participant is connected, ignoring');
          }
        }, 30000);
      } else if (isIncoming) {
        // Incoming call - immediately connected (ringtone handled by IncomingCallScreen)
        setCallStatus('connected');
      }
      // Note: If !isIncoming && remoteParticipants.size > 0, status was already set to 'connected' above
    } catch (error: any) {
      console.error('Failed to initialize call:', error);

      // IMPORTANT: End the call on the server to prevent stale calls
      // This happens when LiveKit connection fails but the call was already created
      // Use local call variable since activeCall state may not be set yet
      const callIdToEnd = call?.id || activeCall?.id;
      if (callIdToEnd) {
        try {
          console.log('Ending failed call on server:', callIdToEnd);
          await signalr.endCall(callIdToEnd);
        } catch (endError) {
          console.error('Error ending failed call:', endError);
        }
      }

      clearActiveCall();

      // Show user-friendly error message
      const errorMessage = error?.message || '';
      let friendlyMessage = 'Call failed. Please try again.';

      if (errorMessage.includes('401') || errorMessage.includes('Network')) {
        friendlyMessage = 'Call failed. Unable to connect to call server.';
      } else if (errorMessage.includes('active call')) {
        friendlyMessage = 'Call failed. There may be an ongoing call. Please try again in a moment.';
      }

      Alert.alert('Call Failed', friendlyMessage);

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
      }
    }
  };

  const cleanupCall = async () => {
    if (room) {
      await room.disconnect();
    }
    clearActiveCall();
  };

  const handleEndCall = async () => {
    // Stop any playing sounds first
    await callSoundService.stopAllSounds();

    try {
      if (activeCall?.id) {
        await signalr.endCall(activeCall.id);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }

    // Play the call ended tone
    callSoundService.playEndedTone();

    await cleanupCall();
    // Use reset instead of goBack to handle case where there's no screen to go back to
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Navigate to main screen if there's nothing to go back to
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    }
  };

  const toggleMute = async () => {
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (room && type === 'Video') {
      await room.localParticipant.setCameraEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleSpeaker = () => {
    const newSpeakerState = !isSpeakerOn;
    InCallManager.setSpeakerphoneOn(newSpeakerState);
    setIsSpeakerOn(newSpeakerState);
  };

  const flipCamera = async () => {
    if (room && type === 'Video') {
      const videoPublication = room.localParticipant.getTrackPublicationByName('camera');
      if (videoPublication?.track) {
        // Camera flip implementation
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVideoCall = () => {
    const showLocalVideoFullscreen = !remoteVideoTrack && localVideoTrack && isVideoEnabled;

    console.log('renderVideoCall - localVideoTrack:', !!localVideoTrack, 'remoteVideoTrack:', !!remoteVideoTrack, 'isVideoEnabled:', isVideoEnabled);

    return (
      <View style={styles.videoContainer}>
        {/* Remote video (full screen) or placeholder */}
        {remoteVideoTrack ? (
          <VideoView
            style={styles.remoteVideo}
            videoTrack={remoteVideoTrack as any}
            objectFit="cover"
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            {showLocalVideoFullscreen ? (
              // Show local video fullscreen while waiting for remote participant
              <VideoView
                style={styles.remoteVideo}
                videoTrack={localVideoTrack as any}
                objectFit="cover"
                mirror
              />
            ) : null}
            <View style={[styles.waitingOverlay, showLocalVideoFullscreen && styles.waitingOverlayTransparent]}>
              <Avatar
                uri={otherParticipant?.profilePictureUrl}
                name={otherParticipant?.displayName || otherParticipant?.fullName || ''}
                size={100}
              />
              <Text style={styles.callerName}>
                {otherParticipant?.displayName || otherParticipant?.fullName}
              </Text>
              <Text style={styles.callStatus}>
                {getCallStatusText()}
              </Text>
            </View>
          </View>
        )}

        {/* Call duration overlay when connected */}
        {callStatus === 'connected' && hasOtherParticipant && (
          <View style={styles.durationOverlay}>
            <View style={styles.durationBadge}>
              <View style={styles.recordingDot} />
              <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
            </View>
          </View>
        )}

        {/* Local video PiP (Picture-in-Picture) - WhatsApp style */}
        {localVideoTrack && isVideoEnabled && remoteVideoTrack && (
          <View style={styles.localVideoContainer}>
            <VideoView
              style={styles.localVideo}
              videoTrack={localVideoTrack as any}
              objectFit="cover"
              mirror
            />
            <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
              <Icon name="camera-flip" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* Local video PiP when no remote video yet */}
        {localVideoTrack && isVideoEnabled && !remoteVideoTrack && !showLocalVideoFullscreen && (
          <View style={styles.localVideoContainer}>
            <VideoView
              style={styles.localVideo}
              videoTrack={localVideoTrack as any}
              objectFit="cover"
              mirror
            />
            <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
              <Icon name="camera-flip" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* Flip camera button when local video is fullscreen */}
        {showLocalVideoFullscreen && (
          <TouchableOpacity style={styles.flipButtonFullscreen} onPress={flipCamera}>
            <Icon name="camera-flip" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        )}

        {/* Remote participant info badge when connected */}
        {remoteVideoTrack && (
          <View style={styles.remoteInfoBadge}>
            <Avatar
              uri={otherParticipant?.profilePictureUrl}
              name={otherParticipant?.displayName || otherParticipant?.fullName || ''}
              size={32}
            />
            <Text style={styles.remoteInfoName} numberOfLines={1}>
              {otherParticipant?.displayName || otherParticipant?.fullName}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getCallStatusText = () => {
    if (isReconnecting) return 'Reconnecting...';
    if (isConnecting) return 'Calling...';
    if (callStatus === 'calling') return 'Calling...';
    if (callStatus === 'ringing') return 'Ringing...';
    if (callStatus === 'connected') return formatDuration(callDuration);
    return 'Connecting...';
  };

  const renderVoiceCall = () => (
    <View style={styles.voiceContainer}>
      <Avatar
        uri={otherParticipant?.profilePictureUrl}
        name={otherParticipant?.displayName || otherParticipant?.fullName || ''}
        size={150}
      />
      <Text style={styles.callerName}>
        {otherParticipant?.displayName || otherParticipant?.fullName}
      </Text>
      <Text style={styles.callStatus}>
        {getCallStatusText()}
      </Text>
    </View>
  );

  // Render connection quality indicator
  const renderConnectionQuality = () => (
    <View style={styles.qualityIndicator}>
      <Icon
        name={getQualityIcon(connectionQuality)}
        size={20}
        color={getQualityColor(connectionQuality)}
      />
    </View>
  );

  // Render reconnecting banner
  const renderReconnectingBanner = () => {
    if (!isReconnecting) return null;

    return (
      <View style={styles.reconnectingBanner}>
        <Icon name="wifi-off" size={18} color="#FFF" />
        <Text style={styles.reconnectingText}>
          Connection lost. Reconnecting{reconnectAttempts > 1 ? ` (attempt ${reconnectAttempts})` : ''}...
        </Text>
      </View>
    );
  };

  // Render quality warning banner
  const renderQualityWarning = () => {
    if (!showQualityWarning || isReconnecting) return null;

    return (
      <View style={styles.qualityWarningBanner}>
        <Icon name="signal-cellular-1" size={18} color="#FFF" />
        <Text style={styles.qualityWarningText}>
          {connectionQuality === 'lost'
            ? 'Connection lost'
            : 'Poor network connection - quality may be reduced'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Reconnecting banner at top */}
      {renderReconnectingBanner()}

      {/* Quality warning banner */}
      {renderQualityWarning()}

      {type === 'Video' ? renderVideoCall() : renderVoiceCall()}

      {/* Connection quality indicator */}
      {callStatus === 'connected' && !isReconnecting && renderConnectionQuality()}

      <View style={styles.controls}>
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Icon
              name={isMuted ? 'microphone-off' : 'microphone'}
              size={28}
              color={isMuted ? COLORS.text : COLORS.textLight}
            />
          </TouchableOpacity>

          {type === 'Video' && (
            <TouchableOpacity
              style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Icon
                name={isVideoEnabled ? 'video' : 'video-off'}
                size={28}
                color={!isVideoEnabled ? COLORS.text : COLORS.textLight}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Icon
              name={isSpeakerOn ? 'volume-high' : 'volume-off'}
              size={28}
              color={isSpeakerOn ? COLORS.text : COLORS.textLight}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Icon name="phone-hangup" size={32} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  videoContainer: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  waitingOverlayTransparent: {
    backgroundColor: 'rgba(26, 26, 46, 0.7)',
  },
  durationOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
    marginRight: 8,
  },
  durationText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  localVideoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  localVideo: {
    width: 120,
    height: 160,
  },
  flipButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonFullscreen: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteInfoBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  remoteInfoName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    fontWeight: '500',
    marginLeft: 8,
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginTop: SPACING.lg,
  },
  callStatus: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textLight,
    opacity: 0.8,
    marginTop: SPACING.sm,
  },
  controls: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 50 : SPACING.xl,
    paddingTop: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  duration: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: COLORS.textLight,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Connection quality indicator
  qualityIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // Reconnecting banner
  reconnectingBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 50 : 8,
  },
  reconnectingText: {
    color: '#FFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Quality warning banner
  qualityWarningBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF9800',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  qualityWarningText: {
    color: '#FFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default CallScreen;
