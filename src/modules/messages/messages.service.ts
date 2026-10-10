import { In, Repository } from 'typeorm';
import { HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessageEntity } from "../entities/messages.entity.js";
import { CreateMessageDto, SelectorChoiceDto } from './dto/create-message.dto.js';
import { ConversationEntity } from '../entities/conversations.entity.js';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto.js';
import { CreateFirstMessageDto } from './dto/create-first-message.dto.js';

import axios from 'axios';
import { FastApiService } from '../../fastapi/fastapi.service.js';
import { ConversationDocument } from '../entities/conversation_docs.entity.js';
import { MessageRole } from '../../common/chat.enum.js';
import { DocumentsService } from '../documents/documents.service.js';

import { DataSource } from 'typeorm';
import { DocumentEntity } from '../entities/documents.entity.js';
@Injectable()
export class MessageService {
        private readonly logger = new Logger(DocumentsService.name)
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(MessageEntity)
        private readonly messageRepository: Repository<MessageEntity>,
        @InjectRepository(ConversationEntity)
        private readonly conversationRepository: Repository<ConversationEntity>,
        @InjectRepository(ConversationDocument)
        private readonly conversationDocumentRepository: Repository<ConversationDocument>,
        @InjectRepository(DocumentEntity)
        private readonly documentRepository: Repository<DocumentEntity>,
        private readonly fastApiService: FastApiService
    ) {}

    async createMessage(conversationId: string, dto: CreateMessageDto) {
        //  transaction config
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const { user_id, content, selector_choices } = dto
        let _targetConversationId = conversationId
        let conversation: ConversationEntity | null
        let isNewConversation = false;  
        try {
        
        if(conversationId === 'new') { // Nếu nhận giá trị conversation id là "new" thì tạo mới conv
            
            const generatedTitle = dto.content.length > 30
            ? `${dto.content.substring(0,30)}...`
            : dto.content

           const newConversation = queryRunner.manager.create(ConversationEntity, {
                title: generatedTitle,
                user_id: user_id || "anonymous",
                fastApi_conversation_id: '', // Sẽ được set sau khi FastAPI trả về
            })

            conversation = await queryRunner.manager.save(newConversation);
            _targetConversationId = conversation.id;
            isNewConversation = true
            
            this.logger.log(`Sử dụng conversation mới: ${conversation.id}`); 
        } else { 
            // lấy ra thông tin conversation nếu có
            conversation = await queryRunner.manager.findOne(ConversationEntity, {
                where: {
                    id: conversationId,
                },
                select: {
                    id: true,
                    fastApi_conversation_id: true,
                    user_id: true,
                },
            })

            if (!conversation) {
                throw new NotFoundException(
                    `Không tìm thấy cuộc trò chuyện với ID: ${conversationId}`);
            }

            _targetConversationId = conversation.id;
            this.logger.log(`Sử dụng conversation cũ: ${conversation.id}`); 
        }
        
            // Cập nhật updated_at của Conversation để đưa lên đầu danh sách
            await queryRunner.manager.update(ConversationEntity, 
                { id: _targetConversationId },
                { updated_at: new Date() });
            


        // Liên kết docs vào bảng trung gian ConversationDocument (nếu có)
        if (dto.selector_choices && dto.selector_choices.length > 0) {
                const convDocs = dto.selector_choices.map((item: SelectorChoiceDto | string) => {

                    const docId = typeof item === 'string' ? item : item?.document_id
                    if(!docId || typeof docId !== 'string') {
                        return null
                    }
                    return queryRunner.manager.create(ConversationDocument, {
                        conversationId: _targetConversationId,
                        documentId: docId,
                    });
                });
                console.log("convDocs", convDocs);
                
                await queryRunner.manager.save(convDocs);
                this.logger.log(`Lưu ${dto.selector_choices.length} documents`);
            }

        const userMessage = queryRunner.manager.create(MessageEntity, {
            content: content,
            role: MessageRole.USER,
            conversationId: _targetConversationId
        })
        const savedMessage = await queryRunner.manager.save(userMessage)

        // Gọi đến FastApi và nhận kết quả
        // Nếu fail thì catch sẽ rollback tất cả ở trên
        const fastApiConversationId = conversation.fastApi_conversation_id || ''
        let aiResponse: any;

        
        try {
            aiResponse = await this.queryFastApi(
            fastApiConversationId,
            isNewConversation,
            content,
            selector_choices,
            )   
        this.logger.log(`FastAPI trả lời thành công`);
        } catch (fastApiError) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`FastAPI error - Transaction rollback:`, fastApiError);
            throw fastApiError;
        }   

        
        // cập nhật conversation_id của fast-api
        if (conversationId === "new") {
            conversation.fastApi_conversation_id = aiResponse.conversation_id;
            await queryRunner.manager.save(conversation);
            this.logger.log(
                `Cập nhật FastAPI conversation ID: ${aiResponse.conversation_id}`
            );
        }
  
        // Lưu message của AI
        const contentFromApi: string = aiResponse?.answer
                ? String(aiResponse.answer).trim() 
                : "Xin lỗi, tôi không thể trả lời câu hỏi này."
                
        const assistantMessage = queryRunner.manager.create(MessageEntity, {
                content: contentFromApi,
                role: MessageRole.ASSISTANT,
                conversationId: _targetConversationId,
        })

        const savedAssistantMessage = await queryRunner.manager.save(assistantMessage)
        this.logger.log(`Tạo message thành công (Conversation: ${_targetConversationId})`);
        
        // Commit transaction
        await queryRunner.commitTransaction();
        this.logger.log(`Tin nhắn đã được lưu thành công`)
        return {
            conversationId: _targetConversationId,
            messages: [savedMessage, savedAssistantMessage]
        }           
        } catch (error) {
            // Xóa message của user vì không có response từ AI
            // await this.messageRepository.delete(_targetConversationId);
            // FastAPI fail → Rollback transaction
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            this.logger.log(`Transaction rollback - Database về trạng thái ban đầu`);
            if (axios.isAxiosError(error)) {
                this.logger.error('Create message error:', error.response?.data);
                throw new HttpException(
                    error.response?.data?.detail || 'Lỗi kết nối FastAPI',
                    error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }
            throw error;
        } finally {
        // Đóng connection
        await queryRunner.release();
        }
    }

    private async queryFastApi (
        fastApiConversationId: string | null,
        isNewConversation: boolean,
        content: string,
        selector_choices: SelectorChoiceDto[] | string[] | undefined,
    ) {
        
        const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
        const token = await this.fastApiService.getValidToken()
        // Khởi tạo mảng chứa các selector_choices đã được định dạng chuẩn gửi FastAPI
        let formattedSelectorChoices: any[] = [];
        if (selector_choices && selector_choices?.length > 0 ) {
           
            const documentIds = selector_choices
                .map((item: SelectorChoiceDto | string) => 
                    typeof item === 'string' ? item : item?.document_id    
                )
                .filter((id): id is string => Boolean(id) && typeof id === 'string');
            
            if (documentIds.length > 0) {
                // 2. Query DB lấy tất cả Document trong 1 câu SQL duy nhất (Thay vì loop findOne)
                const documents = await this.documentRepository.find({
                    where: {
                        id: In(documentIds)
                    }
                })

                // 3. Map các thông tin document/selector cần thiết cho FastAPI
                // Giả sử mỗi document chứa thông tin selector hoặc cấu trúc FastAPI yêu cầu
                formattedSelectorChoices = documents.map((doc) => ({
                    document_id: doc.selector
                }));
            }
        
        };
        
        console.log("formattedSelectorChoices", formattedSelectorChoices);
        
        const requestData = {
                chat_input: content,
                answer_mode: "answer",
                selector_choices: formattedSelectorChoices
        }
        try {
        let endpoint: string;
            if (isNewConversation || !fastApiConversationId) {
                // Tạo conversation mới trên FastAPI
                endpoint = `${fastApiUrl}/conversations/messages`;
            } else {
                // Gửi message vào conversation cũ
                endpoint = `${fastApiUrl}/conversations/${fastApiConversationId}/messages`
            }

            this.logger.debug(`Gọi FastAPI: ${endpoint}`);

        const response = await axios.post(`${endpoint}`, requestData, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                timeout: 100000, // Timeout 1 phút
        })
        return response.data;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                this.logger.error(
                    `FastAPI Error [${error.response?.status}]`
                );

                throw new HttpException(
                    error.response?.data?.detail || 'Lỗi kết nối FastAPI',
                    error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                )
            }
            throw new HttpException(
                'Không thể kết nối FastAPI-RAG',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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

    async remove(conversationId: string, messageId: string) {
        //  transaction
        console.log("conversationId delete", conversationId);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        const token = await this.fastApiService.getValidToken()
        
        const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
        const message = await queryRunner.manager.findOne(MessageEntity, {
            where: {
                id: messageId,
                conversationId: conversationId,
            },
            relations: {
                conversation: true
            }
        })
        const conversation_id_fastapi =  message?.conversation.fastApi_conversation_id
        console.log("conversation_id_fastapi delete", conversation_id_fastapi);
        await queryRunner.manager.remove(message)
        
        // Commit transaction
        await queryRunner.commitTransaction();
        this.logger.log(`Xóa tin nhắn thành công`);
        try {
            await axios.delete(`${fastApiUrl}/conversations/${conversation_id_fastapi}`, {
                headers : {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                timeout: 30000,
            })
            return {
                message: 'Xóa thành công'
            }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            this.logger.log(`Transaction - Xóa không thành công`, error)
            throw error;
        } finally {
            // Đóng connection
            await queryRunner.release();
        }
    }

    async conversationIdExist(conversationId: string) {
        const exists = await this.conversationRepository.exists({
            where: {
                id: conversationId
            }
        })
        
        return exists;
    }

    async createFirstMessage(dto: CreateFirstMessageDto) {
        const { content, selector_choices, user_id } = dto

        const conversation = this.conversationRepository.create({
            title: content.length > 30 ? `${content.substring(0,30)}...` : content,
            user_id: user_id || 'anonymous'
            })

            const saveConv = await this.conversationRepository.save(conversation)
            console.log("selector_choices", selector_choices);
            
            // Liên kết docs vào bảng trung gian ConversationDocument (nếu có)
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
            
            try {
            const token = await this.fastApiService.getValidToken()
            const data = {
                chat_input: content,
                answer_mode: "answer",
                selector_choices: selector_choices
            }

            const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
            const aiResponse = await axios.post(`${fastApiUrl}/conversations/messages`, data, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                }})

            const fastApiConvId = aiResponse.data.conversation_id
            saveConv.fastApi_conversation_id = fastApiConvId;
            await this.conversationRepository.save(saveConv)

            const contentFromApi: string = aiResponse?.data?.answer
                    ? String(aiResponse.data.answer).trim() 
                    : "Xin lỗi, tôi không thể trả lời câu hỏi này." 
            if (!content || content.length === 0) {
                throw new HttpException(
                'FastAPI trả về response trống',
                HttpStatus.INTERNAL_SERVER_ERROR,
            )}    
            
            const assistantMsg = await this.messageRepository.save({
                content: contentFromApi,
                role: MessageRole.ASSISTANT,
                conversationId: saveConv.id,
            })
    
            return {
                conversation: saveConv,
                messages: [userMsg, assistantMsg]
            }
        } catch (error) {
            // Xóa message của user vì không có response từ AI
            await this.messageRepository.delete(userMsg.id);
            if (axios.isAxiosError(error)) {
                this.logger.error('FastAPI Error:', error.response?.data);
                throw new HttpException(
                    error.response?.data?.detail || 'Lỗi kết nối FastAPI',
                    error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }
            throw error;
        }
    }
}