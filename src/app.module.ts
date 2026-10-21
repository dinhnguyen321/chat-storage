import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config.js';

import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { TelegramModule } from './modules/telegram/telegram.module.js';

// rate limiting Chống DoS / Spam API
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core'
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // Time to live (ms)
      limit: 60, // Tối đa 60 request
    }]),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY || '',
      appSecret: process.env.OBSERVE_APP_SECRET || '',
      serviceId: 'chat-storage',
    }),

    DatabaseModule,
    ConversationsModule,
    MessagesModule,
    DocumentsModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Áp dụng global cho toàn ứng dụng
    }
  ],
})
export class AppModule {}
