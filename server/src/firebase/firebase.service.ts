import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  async sendPushNotification(
    deviceToken: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ) {
    // Validate device token format–
    if (
      !deviceToken ||
      typeof deviceToken !== 'string' ||
      deviceToken.trim() === ''
    ) {
      this.logger.error('Invalid device token provided');
      return { success: false, error: 'Invalid device token' };
    }

    // Detect platform based on token characteristics
    const platform = this.detectPlatform(deviceToken);
    this.logger.log(`Detected platform: ${platform}`);
    this.logger.log(
      `Token: ${deviceToken.substring(0, 10)}... (length: ${deviceToken.length})`,
    );

    const message: admin.messaging.Message = {
      token: deviceToken,
      notification: {
        title,
        body,
      },
      data,
    };

    message.apns = {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          alert: { title, body },
          'content-available': 1,
        },
      },
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
    };

    message.android = {
      priority: 'high' as const,
      notification: {
        title,
        body,
        sound: 'default',
        channelId: 'high_importance_channel', // Use a specific channel
        priority: 'high' as const,
        defaultSound: true,
        defaultVibrateTimings: true,
        defaultLightSettings: true,
        // notificationPriority: 'PRIORITY_HIGH' as const,
        // visibility: 'PUBLIC' as const,
      },
      // Add data payload for Android
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default',
      },
    };

    // Add platform-specific configurations
    // if (platform === 'ios') {
    //   console.log('PLATFORM: ios');
    //   message.apns = {
    //     payload: {
    //       aps: {
    //         sound: 'default',
    //         badge: 1,
    //         alert: { title, body },
    //         'content-available': 1,
    //       },
    //     },
    //     headers: {
    //       'apns-priority': '10',
    //       'apns-push-type': 'alert',
    //     },
    //   };
    // } else if (platform === 'android') {
    //   // Enhanced Android configuration
    // message.android = {
    //   priority: 'high' as const,
    //   notification: {
    //     title,
    //     body,
    //     sound: 'default',
    //     channelId: 'high_importance_channel', // Use a specific channel
    //     priority: 'high' as const,
    //     defaultSound: true,
    //     defaultVibrateTimings: true,
    //     defaultLightSettings: true,
    //     // notificationPriority: 'PRIORITY_HIGH' as const,
    //     // visibility: 'PUBLIC' as const,
    //   },
    //   // Add data payload for Android
    //   data: {
    //     ...data,
    //     click_action: 'FLUTTER_NOTIFICATION_CLICK',
    //     sound: 'default',
    //   },
    // };
    // }

    try {
      this.logger.log(`Attempting to send ${platform} push notification...`);
      const response = await admin.messaging().send(message);
      this.logger.log(`Successfully sent message: ${response}`);
      return { success: true, messageId: response, platform };
    } catch (error) {
      this.logger.error('Detailed error sending push notification:', {
        platform,
        code: error.code,
        message: error.message,
        details: error.details,
        tokenPreview: deviceToken.substring(0, 10) + '...',
      });

      // Enhanced error handling for Android-specific issues
      if (error.code === 'messaging/invalid-registration-token') {
        this.logger.error(
          'Invalid registration token - common Android issues:',
          {
            possibleCauses: [
              'Token from debug build used with release configuration',
              'App uninstalled and reinstalled',
              'Token expired or corrupted',
              'Wrong google-services.json file',
              'Package name mismatch',
            ],
          },
        );

        return {
          success: false,
          error: 'Invalid registration token',
          code: error.code,
          platform,
          details:
            platform === 'android'
              ? 'Android token may be from debug build or expired'
              : 'iOS token may be from wrong environment',
        };
      } else if (error.code === 'messaging/registration-token-not-registered') {
        return {
          success: false,
          error: 'Registration token not registered',
          code: error.code,
          platform,
          details:
            platform === 'android'
              ? 'Android app may need to be reinstalled or token refreshed'
              : 'iOS token not registered with APNS',
        };
      } else if (error.code === 'messaging/third-party-auth-error') {
        return {
          success: false,
          error:
            platform === 'android'
              ? 'Android FCM authentication error'
              : 'APNS authentication error',
          code: error.code,
          platform,
          details:
            platform === 'android'
              ? 'Check google-services.json and Firebase project configuration'
              : 'Check APNS configuration in Firebase Console',
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error',
        code: error.code,
        platform,
      };
    }
  }

  async sendPushToMultiple(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string> = {},
  ) {
    if (!tokens.length) {
      this.logger.warn('No tokens provided for multicast notification');
      return {
        success: false,
        error: 'No tokens provided',
        successCount: 0,
        failureCount: 0,
      };
    }

    // Filter out invalid tokens
    const validTokens = tokens.filter(
      (token) => token && typeof token === 'string' && token.trim() !== '',
    );

    if (validTokens.length === 0) {
      this.logger.error('No valid tokens found in array');
      return {
        success: false,
        error: 'No valid tokens found',
        successCount: 0,
        failureCount: tokens.length,
      };
    }

    this.logger.log(
      `Sending multicast notification to ${validTokens.length} tokens`,
    );

    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      data,
      tokens: validTokens, // up to 500 tokens per call
      // iOS configuration
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: { title, body },
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
      // Android configuration
      android: {
        priority: 'high' as const,
        notification: {
          title,
          body,
          sound: 'default',
          channelId: 'high_importance_channel',
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          sound: 'default',
        },
      },
      // Web Push configuration
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
        },
        data,
        fcmOptions: {
          link: '/',
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(`Multicast notification results:`, {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: validTokens.length,
      });

      if (response.failureCount > 0) {
        const failedTokens = response.responses
          .map((r, idx) => (!r.success ? validTokens[idx] : null))
          .filter(Boolean);

        this.logger.warn('Failed tokens:', {
          count: failedTokens.length,
          tokens: failedTokens.map((token) => token?.substring(0, 10) + '...'),
        });

        // Log specific errors for failed tokens
        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            this.logger.error(
              `Token ${validTokens[index].substring(0, 10)}... failed:`,
              {
                error: resp.error?.code,
                message: resp.error?.message,
              },
            );
          }
        });
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: validTokens.length,
        responses: response.responses,
        failedTokens: response.responses
          .map((r, idx) => (!r.success ? validTokens[idx] : null))
          .filter(Boolean),
      };
    } catch (error) {
      this.logger.error('Error sending multicast push notifications:', {
        code: error.code,
        message: error.message,
        tokenCount: validTokens.length,
      });

      return {
        success: false,
        error: error.message || 'Unknown error',
        code: error.code,
        successCount: 0,
        failureCount: validTokens.length,
        totalTokens: validTokens.length,
      };
    }
  }

  // Enhanced platform detection
  private detectPlatform(token: string): 'ios' | 'android' | 'unknown' {
    if (!token) return 'unknown';

    // iOS tokens are typically 64 characters (hex) for legacy format
    // or longer for newer formats but usually shorter than Android
    if (token.length === 64 && /^[a-fA-F0-9]+$/.test(token)) {
      return 'ios';
    }

    // Android FCM tokens are typically 152+ characters and contain various characters
    if (token.length > 140) {
      return 'android';
    }

    // Modern iOS tokens can be longer but usually not as long as Android
    if (token.length > 64 && token.length < 140) {
      return 'ios';
    }

    return 'unknown';
  }

  // Enhanced validation with platform-specific details
  validateTokenFormat(token: string): {
    valid: boolean;
    platform?: string;
    details: string;
  } {
    if (!token || typeof token !== 'string') {
      return { valid: false, details: 'Token is not a string' };
    }

    if (token.length < 50) {
      return { valid: false, details: 'Token too short' };
    }

    const platform = this.detectPlatform(token);

    switch (platform) {
      case 'ios':
        return {
          valid: true,
          platform: 'iOS',
          details: 'Valid iOS token format - should work with APNs Auth Key',
        };
      case 'android':
        return {
          valid: true,
          platform: 'Android',
          details: 'Valid Android FCM token format',
        };
      default:
        return {
          valid: true,
          platform: 'Unknown',
          details: 'Token format appears valid but platform unclear',
        };
    }
  }

  // Android-specific debugging method
  async debugAndroidNotification(token: string): Promise<any> {
    const platform = this.detectPlatform(token);

    if (platform !== 'android') {
      return {
        error: 'Token does not appear to be Android format',
        detectedPlatform: platform,
        tokenLength: token.length,
      };
    }

    // Try sending a minimal Android notification
    const testMessage: admin.messaging.Message = {
      token,
      data: {
        title: 'Android Test',
        body: 'Testing Android FCM',
        test: 'true',
      },
      android: {
        priority: 'high' as const,
        data: {
          title: 'Android Test',
          body: 'Testing Android FCM',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    };

    try {
      const response = await admin.messaging().send(testMessage);
      return {
        success: true,
        messageId: response,
        method: 'data-only',
        note: 'Sent as data-only message for Android debugging',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        troubleshooting: {
          commonAndroidIssues: [
            'google-services.json mismatch between debug/release',
            'Package name mismatch in Firebase Console',
            'Token from debug build used with release config',
            'App needs to handle background notifications',
            'Notification channel not created in Android app',
          ],
          nextSteps: [
            '1. Verify google-services.json is correct for release',
            '2. Check package name in Firebase Console matches app',
            '3. Ensure notification channels are created in Flutter app',
            '4. Test with fresh token from release build',
            '5. Check Android app background notification handling',
          ],
        },
      };
    }
  }

  // New method for sending topic-based notifications (founder messages)
  async sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ) {
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      this.logger.error('Invalid topic provided');
      return { success: false, error: 'Invalid topic' };
    }

    this.logger.log(`Sending topic notification to: ${topic}`);
    this.logger.log(`Title: ${title}, Body: ${body}`);

    const message: admin.messaging.Message = {
      topic: topic,
      notification: {
        title,
        body,
      },
      data,
      // iOS configuration
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: { title, body },
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
      // Android configuration
      android: {
        priority: 'high' as const,
        notification: {
          title,
          body,
          sound: 'default',
          channelId: 'high_importance_channel',
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          sound: 'default',
        },
      },
      // Web Push configuration
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon-192x192.png', // You can customize this
          badge: '/badge-72x72.png', // You can customize this
        },
        fcmOptions: {
          link: '/', // You can customize this
        },
      },
    };

    try {
      this.logger.log(`Attempting to send topic notification to: ${topic}`);
      const response = await admin.messaging().send(message);
      this.logger.log(`Successfully sent topic message: ${response}`);
      return {
        success: true,
        messageId: response,
        topic,
        recipientCount: 'unknown', // Firebase doesn't return recipient count for topics
      };
    } catch (error) {
      this.logger.error('Error sending topic notification:', {
        topic,
        code: error.code,
        message: error.message,
        details: error.details,
      });

      // Handle specific topic-related errors
      if (error.code === 'messaging/invalid-argument') {
        return {
          success: false,
          error: 'Invalid topic name or message format',
          code: error.code,
          details: 'Topic names must match the pattern: [a-zA-Z0-9-_.~%]+',
        };
      } else if (error.code === 'messaging/topic-management-not-allowed') {
        return {
          success: false,
          error: 'Topic management not allowed',
          code: error.code,
          details: 'Check Firebase project permissions and service account',
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error',
        code: error.code,
        topic,
      };
    }
  }
}
