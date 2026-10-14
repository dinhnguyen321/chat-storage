import { Module } from "@nestjs/common";
import { TelegramController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationEntity } from "../entities/conversations.entity.js";

@Module({
    imports: [TypeOrmModule.forFeature([ConversationEntity]), HttpModule, ConfigModule],
    controllers: [TelegramController],
    providers: [TelegramService]
})
export class TelegramModule {}