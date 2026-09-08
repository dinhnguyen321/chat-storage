import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessageEntity } from "../entities/messages.entity.js";
import { CreateMessageDto } from './dto/create-message.dto.js';
import { ConversationEntity } from '../entities/conversations.entity.js';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto.js';

@Injectable()
export class MessageService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly messageRepository: Repository<MessageEntity>,
        @InjectRepository(ConversationEntity)
        private readonly conversationRepository: Repository<ConversationEntity>
    ) {}

    async createMessage(conversationId: string, dto: CreateMessageDto) {
        await this.conversationIdExist(conversationId)
        
        const message = this.messageRepository.create({
            ...dto,
            conversationId: conversationId
        })
        // Cập nhật updated_at của Conversation để nhảy lên đầu danh sách
        await this.conversationRepository.update(conversationId, { updated_at: new Date() })
        
        return await this.messageRepository.save(message)
    }

    async findAllByConversation(conversationId: string, query: GetMessagesQueryDto): Promise<{data: MessageEntity[]; total: number; page: number; limit: number}> {
        await this.conversationIdExist(conversationId)

        const { page = 1, limit = 10 } = query

        const skip = (page - 1) * limit

        // Dùng findAndCount để lấy luôn tổng số tin nhắn (phục vụ tính tổng số trang)
        const [data, total] = await this.messageRepository.findAndCount({
            where: {
                conversationId: conversationId,
            },
            order: {
                created_at: 'ASC',
            },
            skip: skip,
            take: limit
        })

        return {
            data,
            page,
            limit,
            total,
        };
    }

    async findOneMessage(conversationId: string, messageId: string): Promise<MessageEntity> {
        await this.conversationIdExist(conversationId)
        
        const message = await this.messageRepository.findOne({
            where: {
                id: messageId,
                conversationId: conversationId
            },
         })

        if (!message) {
        throw new NotFoundException(`Không tìm thấy tin nhắn với ID ${messageId} trong cuộc trò chuyện này`);
        }

        return message;
    }

    async remove(conversationId: string, messageId: string): Promise<{ message: string }> {
        const message = await this.findOneMessage(conversationId, messageId)
   
        await this.messageRepository.remove(message)

        return {
            message: 'Xóa thành công'
        }
    }

    async conversationIdExist(conversationId: string) {
        const exists = await this.conversationRepository.exists({
            where: {
                id: conversationId
            }
        })
        if (!exists) {
            throw new NotFoundException(`Không tìm thấy cuộc trò chuyện với ID: ${conversationId}`);
        }
    }
}