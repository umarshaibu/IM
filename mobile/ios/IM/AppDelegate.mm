#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <AVFoundation/AVFoundation.h>
#import <Firebase.h>
#import <PushKit/PushKit.h>
#import "RNCallKeep.h"
#import "RNVoipPushNotificationManager.h"

@interface AppDelegate () <PKPushRegistryDelegate>
@property (nonatomic, strong) PKPushRegistry *voipRegistry;
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Initialize Firebase
  [FIRApp configure];

  self.moduleName = @"IM";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Configure audio session for WebRTC/LiveKit
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];
  NSError *error = nil;

  [audioSession setCategory:AVAudioSessionCategoryPlayAndRecord
                       mode:AVAudioSessionModeVideoChat
                    options:AVAudioSessionCategoryOptionAllowBluetooth | AVAudioSessionCategoryOptionDefaultToSpeaker
                      error:&error];

  if (error) {
    NSLog(@"Failed to set audio session category: %@", error);
  }

  [audioSession setActive:YES error:&error];
  if (error) {
    NSLog(@"Failed to activate audio session: %@", error);
  }

  // Register for VoIP push notifications
  [RNVoipPushNotificationManager voipRegistration];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

#pragma mark - PushKit VoIP Delegates

// Handle updated VoIP push token
- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {
  // Register VoIP push credentials
  [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];
}

// Handle incoming VoIP push - called when a VoIP push is received (wakes device)
- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion {

  // Extract call info from payload
  NSDictionary *payloadData = payload.dictionaryPayload;
  NSString *uuid = [[NSUUID UUID] UUIDString];
  NSString *callerName = payloadData[@"callerName"] ?: @"Unknown Caller";
  NSString *callerId = payloadData[@"callerId"] ?: @"";
  BOOL hasVideo = [payloadData[@"callType"] isEqualToString:@"Video"];

  // Display incoming call using CallKit (MUST be called synchronously)
  // This is required by Apple - VoIP pushes must report a call immediately
  [RNCallKeep reportNewIncomingCall:uuid
                             handle:callerId
                         handleType:@"generic"
                           hasVideo:hasVideo
                localizedCallerName:callerName
                    supportsHolding:YES
                       supportsDTMF:YES
                   supportsGrouping:YES
                 supportsUngrouping:YES
                        fromPushKit:YES
                            payload:payloadData
              withCompletionHandler:completion];

  // Process the push in React Native
  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];
}

#pragma mark - RNCallKeep App Delegate Methods

// Continue user activity for CallKit
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  return [RNCallKeep application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
