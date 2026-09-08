import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageEntity } from "../entities/messages.entity.js";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { MessagesController } from "./messages.controller.js";
import { MessageService } from "./messages.service.js";

@Module({
    imports: [TypeOrmModule.forFeature([MessageEntity, ConversationEntity])],
    controllers: [MessagesController],
    providers: [MessageService],
})

export class MessagesModule {}