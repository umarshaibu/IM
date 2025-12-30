import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  Platform,
  Share,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, G } from 'react-native-svg';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import Avatar from '../../components/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH * 0.6;

// Simple QR code generator for demonstration
// In production, use a proper QR code library
const generateQRMatrix = (data: string, size: number = 33): boolean[][] => {
  // Create a pseudo-random matrix based on the data string
  const matrix: boolean[][] = [];
  let seed = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Simple seeded random function
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      // Create finder patterns in corners
      if (
        (i < 7 && j < 7) ||
        (i < 7 && j >= size - 7) ||
        (i >= size - 7 && j < 7)
      ) {
        // Finder pattern
        const isOuter = i === 0 || i === 6 || j === 0 || j === 6 ||
          (j >= size - 7 && (i === 0 || i === 6 || j === size - 1 || j === size - 7)) ||
          (i >= size - 7 && (i === size - 1 || i === size - 7 || j === 0 || j === 6));
        const isInner = (i >= 2 && i <= 4 && j >= 2 && j <= 4) ||
          (i >= 2 && i <= 4 && j >= size - 5 && j <= size - 3) ||
          (i >= size - 5 && i <= size - 3 && j >= 2 && j <= 4);
        matrix[i][j] = isOuter || isInner;
      } else if (i === 6 || j === 6) {
        // Timing patterns
        matrix[i][j] = (i + j) % 2 === 0;
      } else {
        // Data area
        matrix[i][j] = random() > 0.5;
      }
    }
  }

  return matrix;
};

const QRCodeDisplay: React.FC<{
  data: string;
  size: number;
  color: string;
  backgroundColor: string;
}> = ({ data, size, color, backgroundColor }) => {
  const matrix = generateQRMatrix(data);
  const moduleSize = size / matrix.length;

  return (
    <Svg width={size} height={size}>
      <Rect width={size} height={size} fill={backgroundColor} />
      <G>
        {matrix.map((row, i) =>
          row.map((cell, j) =>
            cell ? (
              <Rect
                key={`${i}-${j}`}
                x={j * moduleSize}
                y={i * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill={color}
              />
            ) : null
          )
        )}
      </G>
    </Svg>
  );
};

const QRCodeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<'my-code' | 'scan'>('my-code');
  const [isScanning, setIsScanning] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Generate QR code data for the user
  const qrData = JSON.stringify({
    type: 'im_user',
    id: user?.id,
    name: user?.displayName || user?.fullName,
    serviceNumber: user?.serviceNumber,
  });

  useEffect(() => {
    if (activeTab === 'scan') {
      // Start scan line animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [activeTab]);

  const handleTabChange = (tab: 'my-code' | 'scan') => {
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === 'my-code' ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Add me on IM! My service number is: ${user?.serviceNumber}`,
        title: 'Share IM Contact',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleScanResult = (result: string) => {
    try {
      const data = JSON.parse(result);
      if (data.type === 'im_user') {
        Alert.alert(
          'Contact Found',
          `Would you like to add ${data.name} to your contacts?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add',
              onPress: () => {
                // Add contact logic here
                Alert.alert('Success', `${data.name} added to contacts!`);
                setActiveTab('my-code');
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Invalid QR Code', 'This QR code is not a valid IM contact.');
    }
  };

  const handleSaveToPhotos = () => {
    Alert.alert('Saved', 'QR code saved to your photos.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Icon name="share-variant" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'my-code' && styles.activeTab,
          ]}
          onPress={() => handleTabChange('my-code')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'my-code' && styles.activeTabText,
            ]}
          >
            My Code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'scan' && styles.activeTab,
          ]}
          onPress={() => handleTabChange('scan')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'scan' && styles.activeTabText,
            ]}
          >
            Scan Code
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my-code' ? (
        /* My QR Code View */
        <View style={styles.content}>
          <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
            {/* User Info */}
            <View style={styles.userInfo}>
              <Avatar
                uri={user?.profilePictureUrl}
                name={user?.displayName || user?.fullName || ''}
                size={56}
              />
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user?.displayName || user?.fullName || 'User'}
                </Text>
                <Text style={[styles.userService, { color: colors.textSecondary }]}>
                  {user?.serviceNumber || 'IM User'}
                </Text>
              </View>
            </View>

            {/* QR Code */}
            <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
              <QRCodeDisplay
                data={qrData}
                size={QR_SIZE}
                color={colors.primary}
                backgroundColor="#FFFFFF"
              />
            </View>

            {/* Instructions */}
            <Text style={[styles.instructions, { color: colors.textSecondary }]}>
              Let others scan this code to add you as a contact
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={handleSaveToPhotos}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="download" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={handleShare}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="share-variant" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={() => handleTabChange('scan')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="qrcode-scan" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Scan View */
        <View style={styles.scanContent}>
          <View style={styles.scannerPlaceholder}>
            {/* Camera placeholder - in real implementation, use react-native-camera */}
            <View style={[styles.scannerFrame, { borderColor: colors.primary }]}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />

              {/* Scan line animation */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    backgroundColor: colors.primary,
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, SCREEN_WIDTH * 0.7],
                        }),
                      },
                    ],
                  },
                ]}
              />

              {/* Center icon */}
              <View style={[styles.scanCenterIcon, { backgroundColor: colors.overlay }]}>
                <Icon name="qrcode" size={48} color={colors.textInverse} />
              </View>
            </View>
          </View>

          <View style={styles.scanInstructions}>
            <Icon name="camera" size={24} color={colors.textSecondary} />
            <Text style={[styles.scanText, { color: colors.textSecondary }]}>
              Position a QR code within the frame to scan
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.enableCameraButton, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert('Camera', 'Camera permission required to scan QR codes.')}
          >
            <Icon name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.enableCameraText}>Enable Camera</Text>
          </TouchableOpacity>

          {/* Demo button to simulate scan */}
          <TouchableOpacity
            style={[styles.demoButton, { borderColor: colors.border }]}
            onPress={() =>
              handleScanResult(
                JSON.stringify({
                  type: 'im_user',
                  id: 'demo-id',
                  name: 'Demo Contact',
                  serviceNumber: 'DEMO-001',
                })
              )
            }
          >
            <Text style={[styles.demoButtonText, { color: colors.textSecondary }]}>
              Simulate Scan (Demo)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: colors.header,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginLeft: SPACING.md,
    color: colors.headerText,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    backgroundColor: colors.card,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.textInverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  qrCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  userDetails: {
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  userService: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
    color: colors.textSecondary,
  },
  qrContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
  },
  instructions: {
    marginTop: SPACING.lg,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  actionButton: {
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 80,
    backgroundColor: colors.card,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    backgroundColor: colors.primary + '15',
  },
  actionText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: colors.text,
  },
  scanContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  scannerPlaceholder: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    opacity: 0.8,
    backgroundColor: colors.primary,
  },
  scanCenterIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    marginTop: -40,
    marginLeft: -40,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  scanInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  scanText: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  enableCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
    backgroundColor: colors.primary,
  },
  enableCameraText: {
    color: colors.textInverse,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  demoButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    borderColor: colors.border,
  },
  demoButtonText: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
});

export default QRCodeScreen;
