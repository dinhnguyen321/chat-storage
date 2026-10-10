import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageEntity } from "../entities/messages.entity.js";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { MessagesController } from "./messages.controller.js";
import { MessageService } from "./messages.service.js";
import { FastApiService } from "../../fastapi/fastapi.service.js";
import { ConversationDocument } from "../entities/conversation_docs.entity.js";
import { DocumentEntity } from "../entities/documents.entity.js";

@Module({
    imports: [TypeOrmModule.forFeature([MessageEntity, ConversationEntity, DocumentEntity, ConversationDocument])],
    controllers: [MessagesController],
    providers: [MessageService, FastApiService],
})

export class MessagesModule {}