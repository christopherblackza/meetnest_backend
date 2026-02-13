import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DmNotificationDto } from './dto/dm-notification.dto';
import { FriendRequestNotificationDto } from './dto/friend-request-notification.dto';
import { ActivityJoinNotificationDto } from './dto/activity-join-notification.dto';
import { FounderMessageDto } from './dto/founder-message.dto';
import { ActivityNearbyNotificationDto } from './dto/activity-nearby-notification.dto';
import { ActivityEdgeFunctionNotificationDto } from './dto/activity-edge-function-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async send(token: string, title: string, message: string, data?: any) {
    return this.firebaseService.sendPushNotification(
      token,
      title,
      message,
      data,
    );
  }

  async handleDmNotification(dmData: DmNotificationDto) {
    try {
      this.logger.log('Processing DM notification', { dmData });

      // Get the recipient's device token from Supabase
      const deviceToken = await this.supabaseService.getUserDeviceToken(
        dmData.recipient_id,
      );
      this.logger.log(
        `Device token retrieved for user ${dmData.recipient_id}`,
        {
          hasToken: !!deviceToken,
        },
      );

      if (!deviceToken) {
        this.logger.warn(
          `No device token found for user ${dmData.recipient_id}`,
        );
        return {
          success: false,
          message: 'No device token found for recipient',
        };
      }

      // Prepare notification data
      const title = `New message from ${dmData.sender_display_name}`;
      const body =
        dmData.content.length > 100
          ? `${dmData.content.substring(0, 100)}...`
          : dmData.content;

      const notificationData = {
        type: 'dm',
        sender_id: dmData.sender_id,
        sender_display_name: dmData.sender_display_name,
        sender_avatar_url: dmData.sender_avatar_url || '',
      };

      this.logger.log('Sending push notification', {
        recipient_id: dmData.recipient_id,
        title,
        bodyLength: body.length,
      });

      // Send the push notification
      const result = await this.firebaseService.sendPushNotification(
        deviceToken,
        title,
        body,
        notificationData,
      );

      if (result.success) {
        this.logger.log(
          `DM notification sent successfully to user ${dmData.recipient_id}`,
        );
        return {
          success: true,
          message: 'DM notification sent successfully',
        };
      } else {
        this.logger.error(`Failed to send DM notification`, result.error);
        return {
          success: false,
          message: 'Failed to send push notification',
          error: result.error,
        };
      }
    } catch (error) {
      this.logger.error('Error handling DM notification', error.stack);
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }

  async handleFriendRequestNotification(
    friendRequestData: FriendRequestNotificationDto,
  ) {
    try {
      this.logger.log('Processing friend request notification', {
        friendRequestData,
      });

      // Get the receiver's device token from Supabase
      const deviceToken = await this.supabaseService.getUserDeviceToken(
        friendRequestData.receiver_id,
      );
      this.logger.log(
        `Device token retrieved for user ${friendRequestData.receiver_id}`,
        {
          hasToken: !!deviceToken,
        },
      );

      if (!deviceToken) {
        this.logger.warn(
          `No device token found for user ${friendRequestData.receiver_id}`,
        );
        return {
          success: false,
          message: 'No device token found for receiver',
        };
      }

      // Prepare notification data
      const title = `Friend Request`;
      const body = `${friendRequestData.sender_display_name} sent you a friend request`;

      const notificationData = {
        type: 'friend_request',
        sender_id: friendRequestData.sender_id,
        sender_display_name: friendRequestData.sender_display_name,
        sender_avatar_url: friendRequestData.sender_avatar_url || '',
        friend_request_id: friendRequestData.friend_request_id || '',
      };

      this.logger.log('Sending friend request push notification', {
        receiver_id: friendRequestData.receiver_id,
        sender_display_name: friendRequestData.sender_display_name,
        title,
      });

      // Send the push notification
      const result = await this.firebaseService.sendPushNotification(
        deviceToken,
        title,
        body,
        notificationData,
      );

      if (result.success) {
        this.logger.log(
          `Friend request notification sent successfully to user ${friendRequestData.receiver_id}`,
        );
        return {
          success: true,
          message: 'Friend request notification sent successfully',
        };
      } else {
        this.logger.error(
          `Failed to send friend request notification`,
          result.error,
        );
        return {
          success: false,
          message: 'Failed to send push notification',
          error: result.error,
        };
      }
    } catch (error) {
      this.logger.error(
        'Error handling friend request notification',
        error.stack,
      );
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }

  async handleActivityJoinNotification(
    activityJoinData: ActivityJoinNotificationDto,
  ) {
    try {
      this.logger.log('Processing activity join notification', {
        activityJoinData,
      });

      // Skip notification if the joiner is the creator (they created the activity)
      if (activityJoinData.is_creator == 'true') {
        this.logger.log('Skipping notification - user is the activity creator');
        return {
          success: true,
          message: 'Notification skipped - user is creator',
        };
      }

      // Get the creator's device token from Supabase
      const deviceToken = await this.supabaseService.getUserDeviceToken(
        activityJoinData.creator_id,
      );
      this.logger.log(
        `Device token retrieved for creator ${activityJoinData.creator_id}`,
        {
          hasToken: !!deviceToken,
        },
      );

      if (!deviceToken) {
        this.logger.warn(
          `No device token found for creator ${activityJoinData.creator_id}`,
        );
        return {
          success: false,
          message: 'No device token found for activity creator',
        };
      }

      // Prepare notification data
      const title = `Someone joined your activity!`;
      const body = `${activityJoinData.joiner_display_name} joined "${activityJoinData.activity_title}"`;

      const notificationData = {
        type: 'activity_join',
        activity_id: activityJoinData.activity_id,
        activity_title: activityJoinData.activity_title,
        joiner_id: activityJoinData.user_id,
        joiner_display_name: activityJoinData.joiner_display_name,
        joiner_avatar_url: activityJoinData.joiner_avatar_url || '',
      };

      this.logger.log('Sending activity join push notification', {
        creator_id: activityJoinData.creator_id,
        joiner_display_name: activityJoinData.joiner_display_name,
        activity_title: activityJoinData.activity_title,
        title,
      });

      // Send the push notification
      const result = await this.firebaseService.sendPushNotification(
        deviceToken,
        title,
        body,
        notificationData,
      );

      if (result.success) {
        this.logger.log(
          `Activity join notification sent successfully to creator ${activityJoinData.creator_id}`,
        );
        return {
          success: true,
          message: 'Activity join notification sent successfully',
        };
      } else {
        this.logger.error(
          `Failed to send activity join notification`,
          result.error,
        );
        return {
          success: false,
          message: 'Failed to send push notification',
          error: result.error,
        };
      }
    } catch (error) {
      this.logger.error(
        'Error handling activity join notification',
        error.stack,
      );
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }

  async handleActivityNearbyNotification(
    activityNearbyData: ActivityNearbyNotificationDto,
  ) {
    try {
      this.logger.log('Processing activity nearby notification', {
        activityNearbyData,
      });

      const { activityId, lat, lng } = activityNearbyData;

      // Get activity details
      const activityDetails =
        await this.supabaseService.getActivityDetails(activityId);
      if (!activityDetails) {
        this.logger.warn(`Activity not found: ${activityId}`);
        return {
          success: false,
          message: 'Activity not found',
        };
      }

      // Get nearby users within 10km
      const nearbyUsers = await this.supabaseService.getNearbyUsersWithTokens(
        lat,
        lng,
        10,
      );

      if (nearbyUsers.length === 0) {
        this.logger.log('No nearby users found with push tokens');
        return {
          success: true,
          message: 'No nearby users to notify',
          notificationsSent: 0,
        };
      }

      // Filter out the activity creator and users without tokens
      const usersToNotify = nearbyUsers.filter(
        (user) =>
          user.user_id !== activityDetails.created_by &&
          (user.user_push_tokens?.token || user.token),
      );

      this.logger.log(
        `Found ${usersToNotify.length} nearby users to notify (excluding creator)`,
      );

      if (usersToNotify.length === 0) {
        this.logger.log('No valid users to notify after filtering');
        return {
          success: true,
          message: 'No valid users to notify',
          notificationsSent: 0,
        };
      }

      // Format the meeting time for display
      const meetingDate = new Date(activityDetails.meeting_time);
      const formattedTime = meetingDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Prepare notification data
      const title = `New activity nearby!`;
      const body = `"${activityDetails.title}" in ${activityDetails.location_city}`;

      // Calculate average distance for the notification body
      const distances = usersToNotify.map((user) =>
        this.calculateDistance(lat, lng, user.latitude, user.longitude),
      );
      const avgDistance =
        distances.reduce((sum, dist) => sum + dist, 0) / distances.length;

      const notificationData = {
        type: 'activity_nearby',
        activity_id: activityDetails.id,
        activity_title: activityDetails.title,
        activity_description: activityDetails.description,
        meeting_time: activityDetails.meeting_time,
        location_city: activityDetails.location_city,
        location_country: activityDetails.location_country,
        creator_id: activityDetails.created_by,
        creator_name: activityDetails.user_profiles?.display_name || 'Unknown',
        formatted_time: formattedTime,
        avg_distance_km: avgDistance.toFixed(1),
      };

      // Extract tokens from users
      const tokens = usersToNotify.map(
        (user) => user.user_push_tokens?.token || user.token,
      );

      this.logger.log(`Sending bulk notification to ${tokens.length} users`, {
        activity_title: activityDetails.title,
        avg_distance: avgDistance.toFixed(1),
      });

      // Send bulk notification using sendPushToMultiple
      const result = await this.firebaseService.sendPushToMultiple(
        tokens,
        title,
        body,
        notificationData,
      );

      this.logger.log(`Activity nearby notifications completed`, {
        total: tokens.length,
        successful: result.successCount,
        failed: result.failureCount,
        activityId,
      });

      return {
        success: result.success,
        message: `Bulk notifications sent to nearby users`,
        notificationsSent: result.successCount,
        notificationsFailed: result.failureCount,
        totalNearbyUsers: usersToNotify.length,
        successRate:
          result.successCount > 0
            ? ((result.successCount / tokens.length) * 100).toFixed(2) + '%'
            : '0%',
        result: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          totalTokens: result.totalTokens,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error handling activity nearby notification',
        error.stack,
      );
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }

  async handleActivityEdgeFunctionNotification(
    edgeFunctionData: ActivityEdgeFunctionNotificationDto,
  ) {
    try {
      this.logger.log('Processing activity edge function notification', {
        activityId: edgeFunctionData.activity.id,
        recipientCount: edgeFunctionData.recipients.length,
      });

      const { activity, creator, recipients } = edgeFunctionData;

      if (recipients.length === 0) {
        this.logger.log('No recipients provided for notification');
        return {
          success: true,
          message: 'No recipients to notify',
          notificationsSent: 0,
        };
      }

      // Format the meeting time for display
      const meetingDate = new Date(activity.meeting_time);
      const formattedTime = meetingDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Calculate average distance
      const avgDistance =
        recipients.reduce((sum, recipient) => sum + recipient.distance_km, 0) /
        recipients.length;

      // Prepare notification data
      const title = `New activity nearby!`;
      const body = `"${creator.display_name} wants to ${activity.title}"  (${avgDistance.toFixed(1)}km away)`;

      const notificationData = {
        type: 'activity_nearby',
        activity_id: activity.id,
        activity_title: activity.title,
        meeting_time: activity.meeting_time,
        creator_id: creator.user_id,
        creator_name: creator.display_name,
        creator_avatar: creator.avatar_url || '',
        formatted_time: formattedTime,
        avg_distance_km: avgDistance.toFixed(1),
      };

      // Extract tokens from recipients
      const tokens = recipients.map((recipient) => recipient.token);

      this.logger.log(`Sending bulk notification to ${tokens.length} users`, {
        activity_title: activity.title,
        avg_distance: avgDistance.toFixed(1),
        creator: creator.display_name,
      });

      // Send bulk notification using sendPushToMultiple
      const result = await this.firebaseService.sendPushToMultiple(
        tokens,
        title,
        body,
        notificationData,
      );

      this.logger.log(`Activity edge function notifications completed`, {
        total: tokens.length,
        successful: result.successCount,
        failed: result.failureCount,
        activityId: activity.id,
      });

      return {
        success: result.success,
        message: `Bulk notifications sent to nearby users`,
        notificationsSent: result.successCount,
        notificationsFailed: result.failureCount,
        totalRecipients: recipients.length,
        successRate:
          result.successCount > 0
            ? ((result.successCount / tokens.length) * 100).toFixed(2) + '%'
            : '0%',
        activity: {
          id: activity.id,
          title: activity.title,
        },
        creator: {
          id: creator.user_id,
          name: creator.display_name,
        },
        result: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          totalTokens: result.totalTokens,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error handling activity edge function notification',
        error.stack,
      );
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async handleFounderMessage(founderMessageData: FounderMessageDto) {
    try {
      this.logger.log('Processing founder message notification', {
        founderMessageData,
      });

      const {
        my_message,
        title = 'Message from Wandermundo',
        topic = 'all',
        avatar_url,
      } = founderMessageData;

      if (!my_message) {
        this.logger.warn('No message content provided for founder message');
        return {
          success: false,
          message: 'Missing required parameter: my_message',
        };
      }

      // Prepare notification data
      const notificationData = {
        type: 'founder_message',
        timestamp: new Date().toISOString(),
        avatar_url: avatar_url || '',
      };

      this.logger.log('Sending founder message to topic', {
        topic,
        title,
        messageLength: my_message.length,
      });

      // Send the topic notification
      const result = await this.firebaseService.sendTopicNotification(
        topic,
        title,
        my_message,
        notificationData,
      );

      if (result.success) {
        this.logger.log(`Founder message sent successfully to topic: ${topic}`);
        return {
          success: true,
          message: `Notifications sent successfully to topic "${topic}"`,
          messageId: result.messageId,
          topic: result.topic,
        };
      } else {
        this.logger.error(`Failed to send founder message`, result.error);
        return {
          success: false,
          message: 'Failed to send topic notification',
          error: result.error,
        };
      }
    } catch (error) {
      this.logger.error('Error handling founder message', error.stack);
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }
}
