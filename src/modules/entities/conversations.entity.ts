import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { MessageEntity } from "./messages.entity.js";
import type { ConversationDocument } from "./conversation_docs.entity.js";

@Entity('conversations')
export class ConversationEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({
        type: 'varchar',
        length: 255,
    })
    user_id!: string;

    @Column({
        type: 'text',
        length: 255,
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
