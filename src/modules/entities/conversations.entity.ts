import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { MessageEntity } from "./messages.entity.js";
import type { ConversationDocument } from "./conversation_docs.entity.js";

@Entity('conversations')
export class ConversationEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', nullable: true })
    fastApi_conversation_id: string; // ID từ FastAPI trả về

    @Column({
        type: 'varchar',
        length: 255,
    })
    user_id!: string;

    @Column({
        type: 'text'
    })
    title!: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @OneToMany('MessageEntity', (message:any) => message.conversation)
    messages!: MessageEntity[];

    @OneToMany('ConversationDocument', (conversationDoc:any) => conversationDoc.conversation)
    conversationDocs!: ConversationDocument[];
}
