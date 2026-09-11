import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DocumentEntity } from "../entities/documents.entity.js";
import { ConversationEntity } from '../entities/conversations.entity.js';
import { DocumentStatus, DocumentType } from '../../common/chat.enum.js';
import { extname, join } from 'path';
import { ConversationDocument } from '../entities/conversation_docs.entity.js';
import { GetDocumentsQueryDto } from './dto/get-document-query.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { unlink } from 'fs/promises';

@Injectable()
export class DocumentsService {
constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(ConversationDocument)
    private readonly conversationDocumentRepository: Repository<ConversationDocument>    
) {}

    async createDocument(conversationId: string, file: Express.Multer.File) {
        const conversation = await this.conversationRepository.findOne({
            where: {
                id: conversationId
            },
        });
        if (!conversation) {
            throw new NotFoundException(`không tìm thấy cuộc trò chuyện với ID: ${conversationId}`)
        }

        // 2. Map mimetype/extension sang DocumentType Enum (PDF, DOCX, MD)
        const docType = mapDocumentType(file);
        
        // 3. Tao record Document
        const document = this.documentRepository.create({
            title: file.originalname,
            selector: file.filename,
            type: docType,
            path: `/uploads/${file.filename}`,
            upload_by: 'system_user',
            status: DocumentStatus.READY
        })

        const savedDoc = await this.documentRepository.save(document)

        // 4. Liên kết vào bảng trung gian ConversationDocument
        const conversationDocs = this.conversationDocumentRepository.create({
            conversationId: conversationId,
            documentId: savedDoc.id,
        })
        await this.conversationDocumentRepository.save(conversationDocs)

        return savedDoc;
    }

    async getDocumentsByConversation(conversationId: string, query: GetDocumentsQueryDto) {
        await this.conversationIdExist(conversationId)

        const { page = 1, limit = 10, type } = query

        const skip = (page - 1) * limit  

        const queryBuilder = this.documentRepository
        .createQueryBuilder('document')
        .innerJoin('document.conversationDocs', 'convDoc')
        .where('convDoc.conversationId = :conversationId', { conversationId })

        if (type) {
            queryBuilder.andWhere('document.type = :type', { type });
        }

        const [items, total] = await queryBuilder
        .orderBy('document.created_at', 'DESC')
        .skip(skip)
        .getManyAndCount();

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }
    }

    async getDocumentById(documentId: string) {
        const document = await this.documentRepository.findOne({
            where: {
                id: documentId
            },
        });

        if(!document){
            throw new NotFoundException(`Khong tim thay file docs voi ID ${documentId}`)
        }

        return document
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

    async updateDocument( id: string, dto: UpdateDocumentDto ) {
        const document = await this.getDocumentById(id)
        document.title = dto.title;

        return await this.documentRepository.save(document)
    }

    async removeDoc(id: string) {
        const document = await this.getDocumentById(id)
        // 1. Xóa bản ghi trong Postgres (CASCADE sẽ tự xóa bản ghi ở conversation_documents)
        await this.documentRepository.remove(document)
        // 2. Dọn dẹp file vật lý trong thư mục /uploads
        const filePath = join(process.cwd(), 'uploads', document.selector)

        try {
            await unlink(filePath)

        } catch (error) {
           console.warn(`Không thể xóa file vật lý tại ${filePath}:`, error);
        }
        return { message: `Đã xóa tài liệu thành công`}
        }
    }
function mapDocumentType(file: Express.Multer.File): DocumentType {
  const ext = extname(file.originalname).toLowerCase();

  switch (ext) {
    case '.pdf':
      return DocumentType.PDF;
    case '.docx':
      return DocumentType.DOCX;
    case '.md':
    default:
      return DocumentType.MD;
  }
}
