import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { Repository } from "typeorm";
import { CreateConversationDto } from "./dto/create-conversation.dto.js";
import { UpdateConversationDto } from "./dto/update-conversation.dto.js";

@Injectable()
export class ConversationService {
    constructor(
        @InjectRepository(ConversationEntity)
        private readonly conversationRepository: Repository<ConversationEntity>
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

    async remove(id: string, userId: string): Promise<{message: string}> {
        const conversation = await this.findOne(id, userId);
        await this.conversationRepository.remove(conversation); // Cascade sẽ tự động xoá toàn bộ messages liên quan
        return { message: 'Xóa cuộc trò chuyện thành công' };
    }
}