import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { ConversationDocument } from "./conversation_docs.entity.js";
import { DocumentStatus, DocumentType } from "../../common/chat.enum.js";

@Entity('documents')
export class DocumentEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({
        type: 'varchar',
        length: 255
    })
    title!: string;

    @Column({ name: 'selector_choices', type: 'varchar', length: 255, unique: true })
    selector!: string;
    
    @Column({
        type: 'enum',
        enum: DocumentType
    })
    type!: DocumentType;

    @Column({
        type: 'text'
    })
    path!: string;

    @Column({
        type: 'text'
    })
    upload_by!: string;

    @Column({
        type: 'enum',
        enum: DocumentStatus,
        default: DocumentStatus.PENDING
    })
    status!: DocumentStatus;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @OneToMany('ConversationDocument', (conversationDoc: any) => conversationDoc.document)
    conversationDocs!: ConversationDocument[];
}
