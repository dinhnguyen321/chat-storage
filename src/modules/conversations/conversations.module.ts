import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationsController } from "./conversations.controller.js";
import { ConversationService } from "./conversations.service.js";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { MessageEntity } from "../entities/messages.entity.js";
import { ConversationDocument } from "../entities/conversation_docs.entity.js";
import { DocumentEntity } from "../entities/documents.entity.js";
import { FastApiService } from "../../fastapi/fastapi.service.js";

@Module({
    imports: [TypeOrmModule.forFeature([ConversationEntity, MessageEntity, ConversationDocument, DocumentEntity])], 
    controllers: [ConversationsController],
    providers: [ConversationService, FastApiService],
})

export class ConversationsModule {}
