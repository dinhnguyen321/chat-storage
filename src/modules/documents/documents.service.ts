import { Repository } from 'typeorm';
import { ConflictException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DocumentEntity } from "../entities/documents.entity.js";
import { ConversationEntity } from '../entities/conversations.entity.js';
import { DocumentStatus, DocumentType } from '../../common/chat.enum.js';
import { basename, extname, join } from 'path';
import { ConversationDocument } from '../entities/conversation_docs.entity.js';
import { GetDocumentsQueryDto } from './dto/get-document-query.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { unlink } from 'fs/promises';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';

import * as fs from 'fs';
import FormData from 'form-data';
import { FastApiService } from '../../fastapi/fastapi.service.js';

// function mapDocumentType(file: Express.Multer.File): DocumentType {
//     const ext = extname(file.originalname).toLowerCase();

//     switch (ext) {
//         case '.pdf':
//             return DocumentType.PDF;
//         case '.docx':
//             return DocumentType.DOCX;
//         case '.md':
//         default:
//             return DocumentType.MD;
//     }
// }
@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name)
constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(ConversationDocument)
    // private readonly conversationDocumentRepository: Repository<ConversationDocument>,
    private readonly httpService: HttpService,

    private readonly fastApiService: FastApiService,
) {}
    private static mapDocumentType(file: Express.Multer.File): DocumentType {
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

    async createDocument(userId: string, file: Express.Multer.File) {
        const checkUserExist = await this.conversationRepository.findOne({
            where: {
                user_id: userId
            },
        });
        if (!checkUserExist) {
            throw new NotFoundException(`không tìm thấy cuộc trò chuyện với ID user: ${userId}`)
        }
        // 2. Map mimetype/extension sang DocumentType Enum (PDF, DOCX, MD)
        const docType = DocumentsService.mapDocumentType(file);
        
        // 3. Tao record Document
        const document = this.documentRepository.create({
            title: file.originalname,
            selector: file.filename,
            type: docType,
            path: `/uploads/${file.filename}`,
            upload_by: userId || 'system_user',
            status: DocumentStatus.PENDING
        })
        
        const savedDoc = await this.documentRepository.save(document)
        
       try {
           // Gửi docs lên fastapi-rag
           const fastApiResult = await this.triggerFastApiProcessing(savedDoc, file)
           console.log("fastApiResult uploads file", fastApiResult);
           
            return fastApiResult;
        } catch (error) {
            // ROLLBACK: Nếu FastAPI từ chối (409 Conflict, Lỗi parse...), xóa record vừa tạo để sạch DB
            await this.documentRepository.delete(savedDoc.id);

            // Xóa file bất đồng bộ (async), nhưng không cần chờ (file bị từ chối ở thư mục "uploads")
            if (file.path) {
                unlink(file.path).catch((err) => { // unlink là(Non-blocking)
                    this.logger.warn(`Không thể xóa file ${file.path}`, err)
                })
            }
            throw error; 
        }
    }
        
    private async triggerFastApiProcessing(
        savedDoc: DocumentEntity,
        file: Express.Multer.File
    ) {
        const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000'

        const formData = new FormData()
        if (file.path) {
            formData.append('file', fs.createReadStream(file.path), file.originalname);
            } else {
            formData.append('file', file.buffer, file.originalname);
            }
            
        try {
            const token = await this.fastApiService.getValidToken()
            
            const req = await axios.post(`${fastApiUrl}/documents`, formData, {
                  headers: {
                    ...formData.getHeaders(),
                    "Authorization": `Bearer ${token}`,
                }
            })

            const fastApiDocId = req.data?.id;
            await this.documentRepository.update(savedDoc.id, {
                status: DocumentStatus.READY,
                selector: fastApiDocId // id của tài liệu trên FastAPI-RAG
            });

            savedDoc.status = DocumentStatus.READY;
            savedDoc.selector = fastApiDocId;
            return {
                message: 'Upload thành công',
                nestedDoc: savedDoc,
                fastApiDoc: req.data, 
            };
        } catch (error: unknown) {
           // 1. Log chi tiết lỗi từ FastAPI trả về (Response body)
            if (axios.isAxiosError(error) && error.response) {
                console.error('Lỗi từ FastAPI Status:', error.response.status);
                console.error('Lỗi chi tiết từ FastAPI:', error.response.data);

                // Xử lý riêng trường hợp file bị trùng (409 Conflict)
                if (error.response.status === 409) {
                throw new ConflictException('File/Tài liệu này đã tồn tại trên hệ thống FastAPI!');
                }

                // Ném lỗi HTTP của NestJS để Client nhận đúng Status Code
                throw new HttpException(
                error.response.data?.detail || 'Lỗi xử lý tài liệu từ FastAPI',
                error.response.status,
                );
        }
        // Fallback nếu không phải lỗi Axios Response (vd: lỗi mạng, timeout, FastAPI down)
        throw new HttpException(
            'Không thể kết nối đến hệ thống FastAPI-RAG',
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
        
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
        .take(limit)
        .getManyAndCount();

        return {
            items,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        }
    }

    async getDocumentsByUserId(userId: string, query: GetDocumentsQueryDto) {
        // await this.conversationIdExist(userId)

        const { page = 1, limit = 10, type } = query

        const skip = (page - 1) * limit  

        const queryBuilder = this.documentRepository
        .createQueryBuilder('document')
        .where('document.upload_by = :userId', { userId })

        if (type) {
            queryBuilder.andWhere('document.type = :type', { type });
        }

        const [items, total] = await queryBuilder
        .orderBy('document.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

        return {
            items,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        }
    }

    async getDocumentById(documentId: string) {
        const document = await this.documentRepository.findOne({
            where: {
                id: documentId,
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

    async updateStatus(id:string, status: DocumentStatus): Promise<DocumentEntity> {
        const document = await this.documentRepository.findOne({where: { id }})

        if (!document) {
            throw new NotFoundException(`Không tìm thấy tài liệu khớp với ID ${id}`)
        }

        document.status = status;
        return await this.documentRepository.save(document)
    }

    async removeDoc(id: string) {
        const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
        const token = await this.fastApiService.getValidToken()
        const document = await this.getDocumentById(id)
        // Xóa bản ghi trong Postgres
        await this.documentRepository.remove(document)
        // Dọn dẹp file vật lý trong thư mục /uploads
        const fileName = basename(document.path) // Trả về "1710000000-file.pdf"
        const filePath = join(process.cwd(), 'uploads', fileName)
        // Xóa bản ghi trên FastAPI-RAG
        await axios.delete(`${fastApiUrl}/documents/${document.selector}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        try {
            await unlink(filePath)
        } catch (error) {
           console.warn(`Không thể xóa file vật lý tại ${filePath}:`, error);
        }
        return { message: `Đã xóa tài liệu thành công`}
        }
}

