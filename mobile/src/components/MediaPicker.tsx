import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  Alert,
  PermissionsAndroid,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Geolocation from '@react-native-community/geolocation';
import Contacts from 'react-native-contacts';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';

interface MediaPickerProps {
  visible: boolean;
  onClose: () => void;
  onMediaSelected: (media: SelectedMedia) => void;
  onLocationSelected?: (location: LocationData) => void;
  onContactSelected?: (contact: ContactData) => void;
}

export interface SelectedMedia {
  type: 'image' | 'video' | 'document' | 'audio';
  uri: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ContactData {
  name: string;
  phoneNumber: string;
  email?: string;
}

interface PickerOption {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface ContactItem {
  recordID: string;
  displayName: string;
  givenName: string | null;
  familyName: string;
  phoneNumbers: Array<{ label: string; number: string }>;
  emailAddresses: Array<{ label: string; email: string }>;
}

const MediaPicker: React.FC<MediaPickerProps> = ({
  visible,
  onClose,
  onMediaSelected,
  onLocationSelected,
  onContactSelected,
}) => {
  const [slideAnim] = useState(new Animated.Value(300));
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactItem[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Reset state when closing
      setShowContactPicker(false);
      setContactSearch('');
    }
  }, [visible]);

  const handleImageResult = (response: ImagePickerResponse) => {
    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to pick image');
      return;
    }

    const asset = response.assets?.[0];
    if (asset) {
      onMediaSelected({
        type: asset.type?.startsWith('video') ? 'video' : 'image',
        uri: asset.uri || '',
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.type,
        duration: asset.duration,
      });
      onClose();
    }
  };

  const handleCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'mixed',
        quality: 0.8,
        videoQuality: 'high',
        durationLimit: 60,
      });
      handleImageResult(result);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.8,
        selectionLimit: 1,
      });
      handleImageResult(result);
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const handleDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      if (result.length > 0) {
        const doc = result[0];
        onMediaSelected({
          type: 'document',
          uri: doc.uri,
          fileName: doc.name || 'document',
          fileSize: doc.size || 0,
          mimeType: doc.type || 'application/octet-stream',
        });
        onClose();
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Document picker error:', error);
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const handleAudio = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
      });

      if (result.length > 0) {
        const audio = result[0];
        onMediaSelected({
          type: 'audio',
          uri: audio.uri,
          fileName: audio.name || 'audio',
          fileSize: audio.size || 0,
          mimeType: audio.type || 'audio/mpeg',
        });
        onClose();
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Audio picker error:', error);
        Alert.alert('Error', 'Failed to pick audio');
      }
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to share it.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Location permission is required to share your location.');
      return;
    }

    setLoadingLocation(true);

    Geolocation.getCurrentPosition(
      (position) => {
        setLoadingLocation(false);
        const { latitude, longitude } = position.coords;

        if (onLocationSelected) {
          onLocationSelected({
            latitude,
            longitude,
          });
          onClose();
        } else {
          // Fallback: Show coordinates in alert
          Alert.alert(
            'Location',
            `Latitude: ${latitude.toFixed(6)}\nLongitude: ${longitude.toFixed(6)}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Share',
                onPress: () => {
                  // Create a location message content
                  const locationContent = JSON.stringify({ latitude, longitude });
                  onMediaSelected({
                    type: 'document',
                    uri: `geo:${latitude},${longitude}`,
                    fileName: 'location.json',
                    mimeType: 'application/json',
                  });
                  onClose();
                },
              },
            ]
          );
        }
      },
      (error) => {
        setLoadingLocation(false);
        console.error('Location error:', error);
        let errorMessage = 'Failed to get your location.';
        if (error.code === 1) {
          errorMessage = 'Location permission denied.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable. Please check your GPS settings.';
        } else if (error.code === 3) {
          errorMessage = 'Location request timed out.';
        }
        Alert.alert('Error', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const requestContactsPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts to share them.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleContact = async () => {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Contacts permission is required to share contacts.');
      return;
    }

    setLoadingContacts(true);

    try {
      const contactsList = await Contacts.getAll();
      const formattedContacts: ContactItem[] = contactsList.map((contact) => ({
        recordID: contact.recordID,
        displayName: contact.displayName || `${contact.givenName} ${contact.familyName}`.trim(),
        givenName: contact.givenName,
        familyName: contact.familyName,
        phoneNumbers: contact.phoneNumbers,
        emailAddresses: contact.emailAddresses,
      }));

      // Sort contacts alphabetically
      formattedContacts.sort((a, b) => a.displayName.localeCompare(b.displayName));

      setContacts(formattedContacts);
      setFilteredContacts(formattedContacts);
      setShowContactPicker(true);
    } catch (error) {
      console.error('Contacts error:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactSearch = (text: string) => {
    setContactSearch(text);
    if (text.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter((contact) =>
        contact.displayName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  };

  const handleContactSelect = (contact: ContactItem) => {
    const phoneNumber = contact.phoneNumbers[0]?.number || '';
    const email = contact.emailAddresses[0]?.email;

    if (onContactSelected) {
      onContactSelected({
        name: contact.displayName,
        phoneNumber,
        email,
      });
    } else {
      // Fallback: Create a contact message
      const contactContent = JSON.stringify({
        name: contact.displayName,
        phoneNumber,
        email,
      });
      onMediaSelected({
        type: 'document',
        uri: `contact:${contact.recordID}`,
        fileName: `${contact.displayName}.vcf`,
        mimeType: 'text/vcard',
      });
    }
    onClose();
  };

  const renderContactItem = ({ item }: { item: ContactItem }) => {
    const phoneNumber = item.phoneNumbers[0]?.number || 'No phone number';
    const initials = item.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleContactSelect(item)}
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactInitials}>{initials}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.displayName}</Text>
          <Text style={styles.contactPhone}>{phoneNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const options: PickerOption[] = [
    {
      icon: 'file-document',
      label: 'Document',
      color: '#7C4DFF',
      onPress: handleDocument,
    },
    {
      icon: 'camera',
      label: 'Camera',
      color: '#F50057',
      onPress: handleCamera,
    },
    {
      icon: 'image',
      label: 'Gallery',
      color: '#E040FB',
      onPress: handleGallery,
    },
    {
      icon: 'headphones',
      label: 'Audio',
      color: '#FF6D00',
      onPress: handleAudio,
    },
    {
      icon: 'map-marker',
      label: 'Location',
      color: '#00C853',
      onPress: handleLocation,
    },
    {
      icon: 'account',
      label: 'Contact',
      color: '#2979FF',
      onPress: handleContact,
    },
  ];

  if (!visible) return null;

  // Contact Picker View
  if (showContactPicker) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.contactPickerContainer}>
          <View style={styles.contactPickerHeader}>
            <TouchableOpacity onPress={() => setShowContactPicker(false)}>
              <Icon name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.contactPickerTitle}>Select Contact</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={COLORS.textMuted}
              value={contactSearch}
              onChangeText={handleContactSearch}
            />
            {contactSearch.length > 0 && (
              <TouchableOpacity onPress={() => handleContactSearch('')}>
                <Icon name="close-circle" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {loadingContacts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.recordID}
              style={styles.contactList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="account-off" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No contacts found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.handle} />
              {loadingLocation ? (
                <View style={styles.loadingLocationContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Getting your location...</Text>
                </View>
              ) : (
                <View style={styles.optionsGrid}>
                  {options.map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      style={styles.option}
                      onPress={option.onPress}
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          { backgroundColor: option.color },
                        ]}
                      >
                        <Icon name={option.icon} size={24} color={COLORS.textLight} />
                      </View>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
  },
  option: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  optionLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // Loading styles
  loadingLocationContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  // Contact picker styles
  contactPickerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contactPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.lg,
  },
  contactPickerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contactInitials: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  contactPhone: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textMuted,
  },
});

export default MediaPicker;
