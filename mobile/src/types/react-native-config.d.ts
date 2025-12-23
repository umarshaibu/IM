declare module 'react-native-config' {
  export interface NativeConfig {
    API_URL?: string;
    API_URL_ANDROID?: string;
    SIGNALR_URL?: string;
    SIGNALR_URL_ANDROID?: string;
    LIVEKIT_URL?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
