import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DocumentEntity } from "../entities/documents.entity.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { ConversationDocument } from "../entities/conversation_docs.entity.js";

@Module({
    imports: [TypeOrmModule.forFeature([DocumentEntity, ConversationEntity, ConversationDocument])],
    controllers: [DocumentsController],
    providers: [DocumentsService],
})
export class DocumentsModule {}