import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { Room, RoomOptions, Track, VideoPresets, ConnectionState } from 'livekit-client';
import { callsApi } from '../services/api';
import * as signalr from '../services/signalr';
import { useCallStore } from '../stores/callStore';
import { CallType } from '../types';

interface UseCallOptions {
  conversationId: string;
  callType: CallType;
  isIncoming?: boolean;
  callId?: string;
}

interface UseCallReturn {
  room: Room | null;
  isConnecting: boolean;
  isConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  localVideoTrack: Track | null;
  remoteVideoTracks: Map<string, Track>;
  remoteAudioTracks: Map<string, Track>;
  callDuration: number;
  error: Error | null;
  initializeCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleSpeaker: () => void;
  flipCamera: () => Promise<void>;
}

export const useCall = ({
  conversationId,
  callType,
  isIncoming = false,
  callId: existingCallId,
}: UseCallOptions): UseCallReturn => {
  const { setActiveCall, clearActiveCall } = useCallStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'Video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [localVideoTrack, setLocalVideoTrack] = useState<Track | null>(null);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<Map<string, Track>>(new Map());
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<Map<string, Track>>(new Map());
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callIdRef = useRef<string | null>(existingCallId || null);

  // Start duration timer
  useEffect(() => {
    if (isConnected && !durationIntervalRef.current) {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [isConnected]);

  // Initialize call
  const initializeCall = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      let callId: string;
      let liveKitUrl: string;
      let roomToken: string;

      if (isIncoming && existingCallId) {
        // Join existing call via SignalR
        const result = await signalr.joinCall(existingCallId);
        if (!result) {
          throw new Error('Failed to join call - SignalR returned null');
        }
        callId = existingCallId;
        liveKitUrl = result.liveKitUrl;
        roomToken = result.roomToken;
        callIdRef.current = existingCallId;
      } else {
        // Initiate new call via SignalR
        const result = await signalr.initiateCall(conversationId, callType);
        if (!result) {
          throw new Error('Failed to initiate call - SignalR returned null');
        }
        callId = result.call.id;
        liveKitUrl = result.liveKitUrl;
        roomToken = result.roomToken;
        callIdRef.current = callId;
      }

      // Set up room options
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      };

      const newRoom = new Room(roomOptions);

      // Set up event listeners
      newRoom.on('connectionStateChanged', (state: ConnectionState) => {
        if (state === ConnectionState.Connected) {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (state === ConnectionState.Disconnected) {
          setIsConnected(false);
        }
      });

      newRoom.on('trackSubscribed', (track: Track, publication: any, participant: any) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteVideoTracks((prev) => {
            const updated = new Map(prev);
            updated.set(participant.identity, track);
            return updated;
          });
        } else if (track.kind === Track.Kind.Audio) {
          setRemoteAudioTracks((prev) => {
            const updated = new Map(prev);
            updated.set(participant.identity, track);
            return updated;
          });
        }
      });

      newRoom.on('trackUnsubscribed', (track: Track, publication: any, participant: any) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteVideoTracks((prev) => {
            const updated = new Map(prev);
            updated.delete(participant.identity);
            return updated;
          });
        } else if (track.kind === Track.Kind.Audio) {
          setRemoteAudioTracks((prev) => {
            const updated = new Map(prev);
            updated.delete(participant.identity);
            return updated;
          });
        }
      });

      newRoom.on('disconnected', () => {
        setIsConnected(false);
        clearActiveCall();
      });

      // Connect to room
      await newRoom.connect(liveKitUrl, roomToken);

      // Enable media
      await newRoom.localParticipant.setMicrophoneEnabled(true);

      if (callType === 'Video') {
        await newRoom.localParticipant.setCameraEnabled(true);
        const videoPublication = newRoom.localParticipant.getTrackPublicationByName('camera');
        if (videoPublication?.track) {
          setLocalVideoTrack(videoPublication.track);
        }
      }

      setRoom(newRoom);

      // Update call store
      setActiveCall({
        id: callId,
        conversationId,
        type: callType,
        status: 'InProgress',
        initiatorId: '',
        participants: [],
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to initialize call:', err);
      setError(err as Error);
      setIsConnecting(false);
      Alert.alert('Error', 'Failed to connect call');
    }
  }, [conversationId, callType, isIncoming, existingCallId, setActiveCall, clearActiveCall]);

  // End call
  const endCall = useCallback(async () => {
    try {
      if (callIdRef.current) {
        await signalr.endCall(callIdRef.current);
      }
    } catch (err) {
      console.error('Error ending call:', err);
    }

    if (room) {
      await room.disconnect();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    clearActiveCall();
    setRoom(null);
    setIsConnected(false);
    setCallDuration(0);
  }, [room, clearActiveCall]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!room) return;

    try {
      await room.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);

      if (callIdRef.current) {
        await signalr.updateCallStatus(callIdRef.current, { isMuted: !isMuted });
      }
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  }, [room, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!room || callType !== 'Video') return;

    try {
      await room.localParticipant.setCameraEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);

      if (!isVideoEnabled) {
        const videoPublication = room.localParticipant.getTrackPublicationByName('camera');
        if (videoPublication?.track) {
          setLocalVideoTrack(videoPublication.track);
        }
      } else {
        setLocalVideoTrack(null);
      }

      if (callIdRef.current) {
        await signalr.updateCallStatus(callIdRef.current, { isVideoEnabled: !isVideoEnabled });
      }
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  }, [room, callType, isVideoEnabled]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Actual speaker toggle requires native module implementation
  }, [isSpeakerOn]);

  // Flip camera
  const flipCamera = useCallback(async () => {
    if (!room || callType !== 'Video') return;

    try {
      const videoPublication = room.localParticipant.getTrackPublicationByName('camera');
      if (videoPublication?.track) {
        // Note: Camera flip requires native module implementation
      }
    } catch (err) {
      console.error('Error flipping camera:', err);
    }
  }, [room, callType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return {
    room,
    isConnecting,
    isConnected,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    localVideoTrack,
    remoteVideoTracks,
    remoteAudioTracks,
    callDuration,
    error,
    initializeCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    flipCamera,
  };
};

export default useCall;
