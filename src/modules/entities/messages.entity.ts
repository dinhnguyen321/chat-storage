import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { ConversationEntity } from "./conversations.entity.js";
import { MessageRole } from "../../common/chat.enum.js";

@Entity('messages')
export class MessageEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({
        name: 'conversation_id',
        type: 'uuid'
    })
    conversationId!: string;

    @Column({
        type: 'text'
    })
    content!: string;

    @Column({
        type: 'enum',
        enum: MessageRole
    })
    role!: MessageRole;

    @CreateDateColumn()
    created_at!: Date;

    @ManyToOne('ConversationEntity', (conversation: any) => conversation.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation!: ConversationEntity;
}
