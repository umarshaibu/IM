declare module 'react-native-video' {
  import { ComponentClass } from 'react';
  import { ViewStyle } from 'react-native';

  export enum ResizeMode {
    CONTAIN = 'contain',
    COVER = 'cover',
    STRETCH = 'stretch',
  }

  export interface OnLoadData {
    duration: number;
    currentTime: number;
    naturalSize: { width: number; height: number };
  }

  export interface OnProgressData {
    currentTime: number;
    playableDuration: number;
    seekableDuration: number;
  }

  export interface VideoProperties {
    source: { uri: string } | number;
    paused?: boolean;
    rate?: number;
    volume?: number;
    muted?: boolean;
    resizeMode?: 'contain' | 'cover' | 'stretch';
    repeat?: boolean;
    playInBackground?: boolean;
    playWhenInactive?: boolean;
    ignoreSilentSwitch?: 'ignore' | 'obey';
    progressUpdateInterval?: number;
    onLoad?: (data: OnLoadData) => void;
    onProgress?: (data: OnProgressData) => void;
    onEnd?: () => void;
    onError?: (error: { error: { code: number; domain: string } }) => void;
    onBuffer?: (bufferData: { isBuffering: boolean }) => void;
    style?: ViewStyle;
  }

  export interface VideoRef {
    seek: (time: number) => void;
    pause: () => void;
    resume: () => void;
  }

  const Video: ComponentClass<VideoProperties>;
  export default Video;
}
