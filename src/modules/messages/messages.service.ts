import { Repository } from 'typeorm';
import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessageEntity } from "../entities/messages.entity.js";
import { CreateMessageDto } from './dto/create-message.dto.js';
import { ConversationEntity } from '../entities/conversations.entity.js';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto.js';
import { CreateFirstMessageDto } from './dto/create-first-message.dto.js';

import axios from 'axios';
import { FastApiService } from '../../fastapi/fastapi.service.js';
import { ConversationDocument } from '../entities/conversation_docs.entity.js';
import { MessageRole } from '../../common/chat.enum.js';
@Injectable()
export class MessageService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly messageRepository: Repository<MessageEntity>,
        @InjectRepository(ConversationEntity)
        private readonly conversationRepository: Repository<ConversationEntity>,
        @InjectRepository(ConversationDocument)
        private readonly conversationDocumentRepository: Repository<ConversationDocument>,
        private readonly fastApiService: FastApiService
    ) {}

    async createMessage(conversationId: string, dto: CreateMessageDto) {
        const { user_id, content, selector_choices,
            //  ...messageData
             } = dto
        let _targetConversationId = conversationId
        
        if(conversationId === 'new') {
            const generatedTitle = dto.content.length > 30
            ? `${dto.content.substring(0,30)}...`
            : dto.content

            const newConversation = this.conversationRepository.create({
                title: generatedTitle,
                user_id: user_id
            })

            const savedConversation = await this.conversationRepository.save(newConversation)
            _targetConversationId = savedConversation.id
        } else {
            await this.conversationIdExist(_targetConversationId)
            
            // Cập nhật updated_at của Conversation để nhảy lên đầu danh sách
            await this.conversationRepository.update(_targetConversationId, {
                updated_at: new Date()
            })
        }

        // Lưu các mối quan hệ giữa cuộc trò chuyện và các tài liệu được chọn (nếu có)
        if (dto.selector_choices && dto.selector_choices.length > 0) {
                const convDocs = dto.selector_choices.map(docId => 
                    this.conversationDocumentRepository.create({
                        conversationId: _targetConversationId,
                        documentId: docId
                    }),
                );
                await this.conversationDocumentRepository.save(convDocs);
        }

        const message = this.messageRepository.create({
            content: content,
            role: MessageRole.USER,
            conversationId: _targetConversationId
        })
        const savedMessage = await this.messageRepository.save(message)

        const token = await this.fastApiService.getValidToken()
        const data = {
                chat_input: content,
                answer_mode: "answer",
                selector_choices: selector_choices
            }
        const aiResponse = await axios.post(`http://localhost:8000/conversations/messages`, data, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                }})
        const assistantMsg = await this.messageRepository.save({
                content: aiResponse.data.answer ? aiResponse.data.answer : "Xin lỗi, tôi không thể trả lời câu hỏi này.",
                role: MessageRole.ASSISTANT,
                conversationId: _targetConversationId,
            })
        return {
            conversation: _targetConversationId,
            assistantMsg: assistantMsg,
            messages: [savedMessage, assistantMsg]
        }
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

    async createFirstMessage(dto: CreateFirstMessageDto) {
        const { content, selector_choices, user_id } = dto

        console.log(content, selector_choices, user_id);
        try {
            const conversation = this.conversationRepository.create({
                title: content.length > 30 ? `${content.substring(0,30)}...` : content,
                user_id: user_id || 'anonymous'
            })

            const saveConv = await this.conversationRepository.save(conversation)

            // Lưu các mối quan hệ giữa cuộc trò chuyện và các tài liệu được chọn (nếu có)
            if (dto.selector_choices && dto.selector_choices.length > 0) {
                const convDocs = dto.selector_choices.map(docId => 
                    this.conversationDocumentRepository.create({
                        conversationId: saveConv.id,
                        documentId: docId
                    }),
                );
                await this.conversationDocumentRepository.save(convDocs);
            }

            // Lưu tin nhắn của User vào DB
            const userMsg = await this.messageRepository.save({
                content: content,
                role: MessageRole.USER,
                conversationId: saveConv.id
            })
        
            const token = await this.fastApiService.getValidToken()
            const data = {
                chat_input: content,
                answer_mode: "answer",
                selector_choices: selector_choices
            }
            const aiResponse = await axios.post(`http://localhost:8000/conversations/messages`, data, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                }})
            const assistantMsg = await this.messageRepository.save({
                content: aiResponse.data.answer ? aiResponse.data.answer : "Xin lỗi, tôi không thể trả lời câu hỏi này.",
                role: MessageRole.ASSISTANT,
                conversationId: saveConv.id,
            })
            return {
                conversation: saveConv,
                messages: [userMsg, assistantMsg]
            }
        } catch (error) {
            console.log("error from createFirstMessage", error);
            throw new InternalServerErrorException("Failed to create first message");
        }
    }
}