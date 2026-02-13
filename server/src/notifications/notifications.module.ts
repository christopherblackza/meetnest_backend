// src/notifications/notifications.module.ts

import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseService } from '../firebase/firebase.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseService],
})
export class NotificationsModule {}