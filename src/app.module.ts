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

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
