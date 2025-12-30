#import "PTTAudioModule.h"
#import <React/RCTLog.h>
#import <AudioToolbox/AudioToolbox.h>

@interface PTTAudioModule ()

@property (nonatomic, assign) AudioQueueRef audioQueue;
@property (nonatomic, strong) NSMutableArray<NSData *> *audioDataQueue;
@property (nonatomic, assign) BOOL isPlaying;
@property (nonatomic, assign) BOOL isInitialized;
@property (nonatomic, strong) dispatch_queue_t playbackQueue;

@end

// Audio format constants - must match Android settings
static const Float64 kSampleRate = 16000.0;
static const UInt32 kNumberOfChannels = 1;
static const UInt32 kBitsPerChannel = 16;
static const UInt32 kBytesPerFrame = 2; // 16-bit mono = 2 bytes per frame
static const UInt32 kBufferSize = 4096;

// Audio Queue callback function
static void HandleOutputBuffer(void *inUserData,
                               AudioQueueRef inAQ,
                               AudioQueueBufferRef inBuffer) {
    PTTAudioModule *module = (__bridge PTTAudioModule *)inUserData;

    @synchronized (module.audioDataQueue) {
        if (module.audioDataQueue.count > 0) {
            NSData *audioData = module.audioDataQueue.firstObject;
            [module.audioDataQueue removeObjectAtIndex:0];

            // Copy audio data to buffer
            UInt32 bytesToCopy = MIN((UInt32)audioData.length, inBuffer->mAudioDataBytesCapacity);
            memcpy(inBuffer->mAudioData, audioData.bytes, bytesToCopy);
            inBuffer->mAudioDataByteSize = bytesToCopy;

            // Re-enqueue the buffer
            AudioQueueEnqueueBuffer(inAQ, inBuffer, 0, NULL);
        } else {
            // No data available, fill with silence
            memset(inBuffer->mAudioData, 0, kBufferSize);
            inBuffer->mAudioDataByteSize = kBufferSize;
            AudioQueueEnqueueBuffer(inAQ, inBuffer, 0, NULL);
        }
    }
}

@implementation PTTAudioModule

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        _audioDataQueue = [NSMutableArray new];
        _isPlaying = NO;
        _isInitialized = NO;
        _playbackQueue = dispatch_queue_create("com.im.pttaudio", DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

- (dispatch_queue_t)methodQueue {
    return _playbackQueue;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

RCT_EXPORT_METHOD(init:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (_isInitialized) {
        RCTLogInfo(@"PTTAudioModule already initialized");
        resolve(@YES);
        return;
    }

    @try {
        // Set up audio session for playback
        NSError *error = nil;
        AVAudioSession *session = [AVAudioSession sharedInstance];
        [session setCategory:AVAudioSessionCategoryPlayAndRecord
                        mode:AVAudioSessionModeVoiceChat
                     options:AVAudioSessionCategoryOptionDefaultToSpeaker |
                             AVAudioSessionCategoryOptionAllowBluetooth
                       error:&error];

        if (error) {
            RCTLogError(@"Failed to set audio session category: %@", error);
            reject(@"INIT_ERROR", @"Failed to set audio session", error);
            return;
        }

        [session setActive:YES error:&error];
        if (error) {
            RCTLogError(@"Failed to activate audio session: %@", error);
            reject(@"INIT_ERROR", @"Failed to activate audio session", error);
            return;
        }

        // Set up Audio Queue for playback
        AudioStreamBasicDescription format;
        memset(&format, 0, sizeof(format));
        format.mSampleRate = kSampleRate;
        format.mFormatID = kAudioFormatLinearPCM;
        format.mFormatFlags = kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked;
        format.mBitsPerChannel = kBitsPerChannel;
        format.mChannelsPerFrame = kNumberOfChannels;
        format.mBytesPerFrame = kBytesPerFrame;
        format.mFramesPerPacket = 1;
        format.mBytesPerPacket = kBytesPerFrame;

        OSStatus status = AudioQueueNewOutput(&format,
                                              HandleOutputBuffer,
                                              (__bridge void *)self,
                                              NULL,
                                              NULL,
                                              0,
                                              &_audioQueue);

        if (status != noErr) {
            RCTLogError(@"Failed to create audio queue: %d", (int)status);
            reject(@"INIT_ERROR", [NSString stringWithFormat:@"Failed to create audio queue: %d", (int)status], nil);
            return;
        }

        // Allocate audio buffers
        for (int i = 0; i < 3; i++) {
            AudioQueueBufferRef buffer;
            status = AudioQueueAllocateBuffer(_audioQueue, kBufferSize, &buffer);
            if (status != noErr) {
                RCTLogError(@"Failed to allocate audio buffer: %d", (int)status);
                reject(@"INIT_ERROR", [NSString stringWithFormat:@"Failed to allocate buffer: %d", (int)status], nil);
                return;
            }

            // Initialize buffer with silence and enqueue
            memset(buffer->mAudioData, 0, kBufferSize);
            buffer->mAudioDataByteSize = kBufferSize;
            AudioQueueEnqueueBuffer(_audioQueue, buffer, 0, NULL);
        }

        _isInitialized = YES;
        RCTLogInfo(@"PTTAudioModule initialized successfully");
        resolve(@YES);
    } @catch (NSException *exception) {
        RCTLogError(@"Exception initializing PTTAudioModule: %@", exception);
        reject(@"INIT_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(startPlayback:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (!_isInitialized) {
        reject(@"NOT_INITIALIZED", @"PTTAudioModule not initialized. Call init() first.", nil);
        return;
    }

    if (_isPlaying) {
        RCTLogInfo(@"Already playing");
        resolve(@YES);
        return;
    }

    OSStatus status = AudioQueueStart(_audioQueue, NULL);
    if (status != noErr) {
        RCTLogError(@"Failed to start audio queue: %d", (int)status);
        reject(@"PLAYBACK_ERROR", [NSString stringWithFormat:@"Failed to start playback: %d", (int)status], nil);
        return;
    }

    _isPlaying = YES;
    RCTLogInfo(@"PTT playback started");
    resolve(@YES);
}

RCT_EXPORT_METHOD(playChunk:(NSString *)audioDataBase64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSData *audioData = [[NSData alloc] initWithBase64EncodedString:audioDataBase64 options:0];
        if (!audioData) {
            reject(@"DECODE_ERROR", @"Failed to decode base64 audio data", nil);
            return;
        }

        @synchronized (_audioDataQueue) {
            [_audioDataQueue addObject:audioData];
        }

        // Auto-start playback if not already playing
        if (!_isPlaying && _isInitialized) {
            OSStatus status = AudioQueueStart(_audioQueue, NULL);
            if (status == noErr) {
                _isPlaying = YES;
            }
        }

        resolve(@YES);
    } @catch (NSException *exception) {
        RCTLogError(@"Exception playing chunk: %@", exception);
        reject(@"PLAYBACK_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(stopPlayback:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_audioQueue) {
            AudioQueueStop(_audioQueue, true);
        }

        @synchronized (_audioDataQueue) {
            [_audioDataQueue removeAllObjects];
        }

        _isPlaying = NO;
        RCTLogInfo(@"PTT playback stopped");
        resolve(@YES);
    } @catch (NSException *exception) {
        RCTLogError(@"Exception stopping playback: %@", exception);
        reject(@"STOP_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(release:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_audioQueue) {
            AudioQueueStop(_audioQueue, true);
            AudioQueueDispose(_audioQueue, true);
            _audioQueue = NULL;
        }

        @synchronized (_audioDataQueue) {
            [_audioDataQueue removeAllObjects];
        }

        _isPlaying = NO;
        _isInitialized = NO;
        RCTLogInfo(@"PTTAudioModule released");
        resolve(@YES);
    } @catch (NSException *exception) {
        RCTLogError(@"Exception releasing: %@", exception);
        reject(@"RELEASE_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(isPlaying:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(_isPlaying));
}

RCT_EXPORT_METHOD(getQueueSize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @synchronized (_audioDataQueue) {
        resolve(@(_audioDataQueue.count));
    }
}

@end
