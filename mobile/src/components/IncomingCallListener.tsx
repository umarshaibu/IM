import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallStore } from '../stores/callStore';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Component that listens for incoming calls from SignalR
 * and navigates to the IncomingCallScreen
 */
const IncomingCallListener: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const incomingCall = useCallStore((state) => state.incomingCall);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (incomingCall && !hasNavigated.current) {
      hasNavigated.current = true;

      const callerName = incomingCall.initiatorName || 'Unknown';
      const callerAvatar = incomingCall.initiatorProfilePicture;

      console.log('Navigating to IncomingCall screen:', {
        callId: incomingCall.id,
        callerName,
        callType: incomingCall.type,
        conversationId: incomingCall.conversationId,
      });

      // Navigate to incoming call screen
      navigation.navigate('IncomingCall', {
        callId: incomingCall.id,
        callerName,
        callerAvatar,
        callType: incomingCall.type,
        conversationId: incomingCall.conversationId,
      });
    }

    // Reset navigation flag when incoming call is cleared
    if (!incomingCall) {
      hasNavigated.current = false;
    }
  }, [incomingCall, navigation]);

  // This component doesn't render anything
  return null;
};

export default IncomingCallListener;
