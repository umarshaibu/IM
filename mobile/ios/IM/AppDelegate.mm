#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <AVFoundation/AVFoundation.h>
#import <Firebase.h>

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

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
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
