import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  Modal,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { useTheme } from '../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';

const audioRecorderPlayer = new AudioRecorderPlayer();

// Common emoji categories
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💽', '💾', '💿', '📀', '🎥', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', '💴', '💵', '💶', '💷', '💸', '💳'],
  'Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊'],
  'Food': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
};

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onSendMedia?: (type: 'image' | 'video' | 'document' | 'audio') => void;
  onSendVoiceNote?: (uri: string, duration: number) => void;
  onAttachmentPress?: () => void;
  onTypingStart?: () => void;
  onTypingEnd?: () => void;
  replyingTo?: { id: string; senderName: string; content: string } | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendMedia,
  onSendVoiceNote,
  onAttachmentPress,
  onTypingStart,
  onTypingEnd,
  replyingTo,
  onCancelReply,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('Smileys');

  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingAnimValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulse animation for recording indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnimValue, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnimValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      recordingAnimValue.setValue(1);
    }
  }, [isRecording]);

  const handleTextChange = (text: string) => {
    setMessage(text);

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingEnd?.();
      }
    }, 2000);
  };

  const handleSend = () => {
    if (message.trim().length === 0) return;

    onSendMessage(message.trim());
    setMessage('');
    setIsTyping(false);
    setShowEmojiPicker(false);
    onTypingEnd?.();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleAttachmentPress = () => {
    setShowEmojiPicker(false);
    onAttachmentPress?.();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        if (
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          return true;
        } else {
          Alert.alert('Permission Denied', 'Please grant audio recording permission to send voice notes.');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const startRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) return;

    try {
      const path = Platform.select({
        ios: `voice_note_${Date.now()}.m4a`,
        android: `${Date.now()}.mp4`,
      });

      await audioRecorderPlayer.startRecorder(path);
      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordingDuration(Math.floor(e.currentPosition / 1000));
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordedUri(result);

      if (onSendVoiceNote && result) {
        onSendVoiceNote(result, recordingDuration);
      } else if (onSendMedia) {
        // Fallback: send as audio media
        onSendMedia('audio');
      }

      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const cancelRecording = async () => {
    try {
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordedUri(null);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const renderEmojiPicker = () => (
    <Modal
      visible={showEmojiPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEmojiPicker(false)}
    >
      <View style={styles.emojiPickerOverlay}>
        <TouchableOpacity
          style={styles.emojiPickerBackdrop}
          onPress={() => setShowEmojiPicker(false)}
        />
        <View style={[styles.emojiPickerContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.emojiPickerHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.emojiPickerTitle, { color: colors.text }]}>Emoji</Text>
            <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.emojiCategoryTabs, { borderBottomColor: colors.divider }]}
          >
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.emojiCategoryTab,
                  selectedEmojiCategory === category && [styles.emojiCategoryTabActive, { borderBottomColor: colors.primary }],
                ]}
                onPress={() => setSelectedEmojiCategory(category)}
              >
                <Text
                  style={[
                    styles.emojiCategoryTabText,
                    { color: colors.textSecondary },
                    selectedEmojiCategory === category && { color: colors.primary },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.emojiGrid} showsVerticalScrollIndicator={false}>
            <View style={styles.emojiRow}>
              {EMOJI_CATEGORIES[selectedEmojiCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiItem}
                  onPress={() => handleEmojiSelect(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Recording UI
  if (isRecording) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
        <View style={[styles.recordingContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.cancelRecordingButton} onPress={cancelRecording}>
            <Icon name="delete" size={24} color={colors.error} />
          </TouchableOpacity>

          <View style={styles.recordingInfo}>
            <Animated.View
              style={[
                styles.recordingIndicator,
                { backgroundColor: colors.error, transform: [{ scale: recordingAnimValue }] },
              ]}
            />
            <Text style={[styles.recordingDuration, { color: colors.text }]}>
              {formatRecordingTime(recordingDuration)}
            </Text>
            <Text style={[styles.recordingText, { color: colors.textSecondary }]}>Recording...</Text>
          </View>

          <TouchableOpacity style={[styles.stopRecordingButton, { backgroundColor: colors.primary }]} onPress={stopRecording}>
            <Icon name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
      {replyingTo && (
        <View style={[styles.replyContainer, { backgroundColor: colors.inputBackground, borderBottomColor: colors.divider }]}>
          <View style={styles.replyContent}>
            <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
            <View style={styles.replyTextContainer}>
              <Text style={[styles.replySender, { color: colors.primary }]}>{replyingTo.senderName}</Text>
              <Text style={[styles.replyText, { color: colors.textSecondary }]} numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReply}>
            <Icon name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleAttachmentPress}
          disabled={disabled}
        >
          <Icon
            name="plus"
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={[styles.textInputContainer, { backgroundColor: colors.inputBackground }]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.text }]}
            value={message}
            onChangeText={handleTextChange}
            placeholder="Type a message"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4096}
            editable={!disabled}
            onFocus={() => setShowEmojiPicker(false)}
          />
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() => {
              setShowEmojiPicker(!showEmojiPicker);
            }}
          >
            <Icon
              name={showEmojiPicker ? 'keyboard' : 'emoticon-outline'}
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {message.trim().length > 0 ? (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }, disabled && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={disabled}
          >
            <Icon name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }, disabled && styles.sendButtonDisabled]}
            onPress={handleMicPress}
            disabled={disabled}
          >
            <Icon name="microphone" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {renderEmojiPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderBottomWidth: 1,
  },
  replyContent: {
    flex: 1,
    flexDirection: 'row',
  },
  replyBar: {
    width: 4,
    borderRadius: 2,
    marginRight: SPACING.sm,
  },
  replyTextContainer: {
    flex: 1,
  },
  replySender: {
    fontWeight: 'bold',
    fontSize: FONTS.sizes.sm,
  },
  replyText: {
    fontSize: FONTS.sizes.sm,
  },
  cancelReply: {
    padding: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 0,
    marginHorizontal: SPACING.xs,
    minHeight: 40,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    paddingVertical: SPACING.sm,
  },
  emojiButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Recording styles
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  cancelRecordingButton: {
    padding: SPACING.sm,
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  recordingDuration: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
  },
  recordingText: {
    fontSize: FONTS.sizes.sm,
  },
  stopRecordingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Emoji picker styles
  emojiPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  emojiPickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  emojiPickerContainer: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  emojiPickerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  emojiCategoryTabs: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  emojiCategoryTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  emojiCategoryTabActive: {
    borderBottomWidth: 2,
  },
  emojiCategoryTabText: {
    fontSize: FONTS.sizes.sm,
  },
  emojiCategoryTabTextActive: {
    fontWeight: 'bold',
  },
  emojiGrid: {
    padding: SPACING.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiItem: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
  },
});

export default ChatInput;
