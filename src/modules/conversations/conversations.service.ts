import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { DataSource, Repository } from "typeorm";
import { CreateConversationDto } from "./dto/create-conversation.dto.js";
import { UpdateConversationDto } from "./dto/update-conversation.dto.js";
import { FastApiService } from "../../fastapi/fastapi.service.js";
import axios from "axios";

@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name)

    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(ConversationEntity)
        private readonly conversationRepository: Repository<ConversationEntity>,
        private readonly fastApiService: FastApiService

    ) {}

    async create(dto: CreateConversationDto) {
        const conversation = this.conversationRepository.create(dto);
        
        return await this.conversationRepository.save(conversation);
    }

    async findAllByUserId(userId: string): Promise<ConversationEntity[]> {
        return await this.conversationRepository.find({
            where: {user_id: userId},
            order: {updated_at: 'DESC'},
        })
    }

    async findOne(id: string, userId: string): Promise<ConversationEntity> {
        
        const conversation = await this.conversationRepository.findOne({
            where: {id, user_id: userId},
            relations: {
                messages: true,
            },
        });

        if (!conversation) {
            throw new NotFoundException(`Khong tim thay cuoc tro chuyen nao voi id: ${id}`);
        }
        
        return conversation;
    }

    async update(id: string, userId: string, dto: UpdateConversationDto): Promise<ConversationEntity> {
        const conversation = await this.findOne(id, userId);
        conversation.title = dto.title;
        return await this.conversationRepository.save(conversation);
    }

    async remove(conversationId: string, userId: string) {
        //  transaction
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        const token = await this.fastApiService.getValidToken()
        
        const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
        const conversation = await queryRunner.manager.findOne(ConversationEntity, {
            where: {
                user_id: userId,
                id: conversationId,
            },
        })
        const conversation_id_fastapi =  conversation?.fastApi_conversation_id
        await queryRunner.manager.remove(conversation)
        
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
                message: 'Xóa cuộc hội thoại thành công'
            }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            this.logger.log(`Transaction - Xóa cuộc hội thoại không thành công`, error)
            throw error;
        } finally {
            // Đóng connection
            await queryRunner.release();
        }
    }
}