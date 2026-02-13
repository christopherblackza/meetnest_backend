import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { DmNotificationDto } from './dto/dm-notification.dto';
import { FriendRequestNotificationDto } from './dto/friend-request-notification.dto';
import { ActivityJoinNotificationDto } from './dto/activity-join-notification.dto';
import { ActivityNearbyNotificationDto } from './dto/activity-nearby-notification.dto';
import { ActivityEdgeFunctionNotificationDto } from './dto/activity-edge-function-notification.dto';

// Add this import at the top
import { FirebaseService } from '../firebase/firebase.service';
import { FounderMessageDto } from './dto/founder-message.dto';

class SendNotificationDto {
  token: string;
  title: string;
  message: string;
  data?: Record<string, string>;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  // Add this to your NotificationsController class
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly firebaseService: FirebaseService, // Add this
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send a push notification' })
  @ApiBody({
    description: 'Notification payload',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Firebase device token',
          example: 'dGVzdF90b2tlbl9leGFtcGxl',
        },
        title: {
          type: 'string',
          description: 'Notification title',
          example: 'Meeting Reminder',
        },
        message: {
          type: 'string',
          description: 'Notification message',
          example: 'Your meeting starts in 5 minutes',
        },
        data: {
          type: 'object',
          description: 'Additional data payload',
          example: { meetingId: '123', type: 'reminder' },
        },
      },
      required: ['token', 'title', 'message'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        messageId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendNotification(@Body() body: SendNotificationDto) {
    return this.notificationsService.send(
      body.token,
      body.title,
      body.message,
      body.data,
    );
  }

  @Post('dm')
  @ApiOperation({
    summary: 'Handle direct message notification from database trigger',
  })
  @ApiBody({ type: DmNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'DM notification processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleDmNotification(@Body() dmData: DmNotificationDto) {
    return this.notificationsService.handleDmNotification(dmData);
  }

  @Post('friend-request')
  @ApiOperation({
    summary: 'Handle friend request notification from database trigger',
  })
  @ApiBody({ type: FriendRequestNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Friend request notification processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleFriendRequestNotification(
    @Body() friendRequestData: FriendRequestNotificationDto,
  ) {
    return this.notificationsService.handleFriendRequestNotification(
      friendRequestData,
    );
  }

  @Post('activity-join')
  @ApiOperation({
    summary: 'Handle activity join notification from database trigger',
  })
  @ApiBody({ type: ActivityJoinNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Activity join notification processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleActivityJoinNotification(
    @Body() activityJoinData: ActivityJoinNotificationDto,
  ) {
    return this.notificationsService.handleActivityJoinNotification(
      activityJoinData,
    );
  }

  @Post('nearby-activity')
  @ApiOperation({
    summary: 'Handle nearby activity notification from Supabase edge function',
    description:
      'Sends push notifications to users within radius of a new activity using pre-processed data from edge function',
  })
  @ApiBody({ type: ActivityEdgeFunctionNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Activity nearby notification processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        notificationsSent: { type: 'number' },
        notificationsFailed: { type: 'number' },
        totalRecipients: { type: 'number' },
        successRate: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleActivityNearbyNotification(
    @Body() activityEdgeFunctionData: ActivityEdgeFunctionNotificationDto,
  ) {
    return this.notificationsService.handleActivityEdgeFunctionNotification(
      activityEdgeFunctionData,
    );
  }

  @Post('validate-token')
  @ApiOperation({ summary: 'Validate device token format and environment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Device token to validate' },
      },
      required: ['token'],
    },
  })
  async validateToken(@Body() body: { token: string }) {
    const validation = this.firebaseService.validateTokenFormat(body.token);
    return {
      tokenLength: body.token.length,
      tokenPreview: body.token.substring(0, 10) + '...',
    };
  }

  @Post('test-notification')
  @ApiOperation({ summary: 'Test notification with detailed error handling' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['token', 'title', 'message'],
    },
  })
  async testNotification(
    @Body() body: { token: string; title: string; message: string },
  ) {
    // First validate the token
    const validation = this.firebaseService.validateTokenFormat(body.token);

    if (!validation.valid) {
      return {
        success: false,
        error: 'Invalid token format',
        validation,
      };
    }

    // Try to send the notification
    const result = await this.firebaseService.sendPushNotification(
      body.token,
      body.title,
      body.message,
      { test: 'true' },
    );

    return {
      ...result,
      tokenValidation: validation,
    };
  }

  @Post('check-apns-config')
  @ApiOperation({ summary: 'Check APNs configuration status' })
  async checkApnsConfig() {
    const config = await this.checkApnsConfig();

    return {
      ...config,
      currentSetup: {
        authKeyFile: 'AuthKey_ZX3CB4Y8XG.p8',
        keyId: 'ZX3CB4Y8XG',
        method: 'APNs Authentication Key',
        certificatesNeeded: false,
      },
      troubleshooting: {
        commonIssue: 'Firebase expecting both Auth Key AND certificates',
        solution: 'Use ONLY Auth Key, no certificates needed',
        verifyInConsole: [
          'APNs Authentication Key: ✅ Uploaded',
          'Development APNs Certificate: ❌ Should be empty',
          'Production APNs Certificate: ❌ Should be empty',
        ],
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Add these methods to your NotificationsController class

  @Post('debug-android')
  @ApiOperation({ summary: 'Debug Android FCM notification issues' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Android FCM token' },
      },
      required: ['token'],
    },
  })
  async debugAndroid(@Body() body: { token: string }) {
    const validation = this.firebaseService.validateTokenFormat(body.token);
    const debugResult = await this.firebaseService.debugAndroidNotification(
      body.token,
    );

    return {
      tokenValidation: validation,
      debugResult,
      androidTroubleshooting: {
        commonIssues: [
          'google-services.json file mismatch (debug vs release)',
          'Package name mismatch in Firebase Console',
          'Notification channels not properly configured in Flutter app',
          'Background notification handling not implemented',
          'Token from debug build used with release configuration',
        ],
        flutterAppChecklist: [
          'Create notification channel with ID: high_importance_channel',
          'Handle background messages in Flutter',
          'Ensure proper Firebase initialization',
          'Check android/app/google-services.json is for release',
          'Verify package name matches Firebase Console',
        ],
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test-platform-specific')
  @ApiOperation({
    summary: 'Test notification with platform-specific configuration',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['token', 'title', 'message'],
    },
  })
  async testPlatformSpecific(
    @Body() body: { token: string; title: string; message: string },
  ) {
    const validation = this.firebaseService.validateTokenFormat(body.token);

    const result = await this.firebaseService.sendPushNotification(
      body.token,
      body.title,
      body.message,
      {
        test: 'platform-specific',
        timestamp: new Date().toISOString(),
      },
    );

    return {
      ...result,
      tokenValidation: validation,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('founder-message')
  @ApiOperation({
    summary: 'Send founder message to Firebase topic users',
  })
  @ApiBody({ type: FounderMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Founder message sent successfully to topic',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        messageId: { type: 'string' },
        topic: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendFounderMessage(@Body() founderMessageData: FounderMessageDto) {
    return this.notificationsService.handleFounderMessage(founderMessageData);
  }
}
