import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from "typeorm";
import type { DocumentEntity } from "./documents.entity.js";
import type { ConversationEntity } from "./conversations.entity.js";

@Entity('conversation_documents')
@Unique(['conversationId', 'documentId'])
export class ConversationDocument {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId!: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne('DocumentEntity', (document: any) => document.conversationDocs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentEntity;

  @ManyToOne('ConversationEntity', (conversation: any) => conversation.conversationDocs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationEntity;

}

