import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { DocumentsService } from "./documents.service.js";

import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { GetDocumentsQueryDto } from "./dto/get-document-query.dto.js";
import { UpdateDocumentDto } from "./dto/update-document.dto.js";
import { UpdateDocumentStatusDto } from "./dto/update-document-status.dto.js";

@ApiTags('Documents')
// @ApiBearerAuth('JWT-auth')
@Controller('document')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Post('/upload/:userId')
    @ApiConsumes('multipart/form-data') // 1. Tells Swagger this route accepts form data
    @ApiBody({                          // 2. Defines the exact payload shape for Swagger
        schema: {
        type: 'object',
        properties: {
            file: {                       // Key name must match the FileInterceptor string
            type: 'string',
            format: 'binary',
            },
        },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: join(process.cwd(), 'uploads'),
                filename: (req, file, callback) => {
                    // Tạo tên file unique bằng timestamp + random hashconst uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
                },
            }),
            limits: {
                fieldSize: 10 * 1024 * 1024, // Giới hạn max 10MB
            },
            fileFilter: (req, file, callback) => {
                const allowedExtensions = ['.pdf', '.docx', '.md'];
                const ext = extname(file.originalname).toLowerCase();
                
                if (allowedExtensions.includes(ext)) {
                    callback(null, true);
                } else {
                    callback(
                    new BadRequestException('Chỉ cho phép upload file .pdf, .docx, hoặc .md!'),
                    false,
                    );
                }
            }
        }),
    )
    async uploadFile(
        @Param('userId') userId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
        }

        return await this.documentsService.createDocument(userId, file);
    }

    @Get('/conversation/:conversationId')
    async getDocumentsByConversation (
        @Param('conversationId', ParseUUIDPipe) conversationId: string,
        @Query() query: GetDocumentsQueryDto)
    {
        return await this.documentsService.getDocumentsByConversation(conversationId, query)
    }

    @Get('/userId/:userId')
    async getDocumentsByUserId (
        @Param('userId') userId: string,
        @Query() query: GetDocumentsQueryDto)
    {
        return await this.documentsService.getDocumentsByUserId(userId, query)
    }

    @Get(':documentId')
    async getDocumentById(@Param('documentId', ParseUUIDPipe) documentId: string) {
        return await this.documentsService.getDocumentById(documentId)
    }

    @Patch(':documentId')
    async updateDocument(
        @Param('documentId', ParseUUIDPipe) id: string,
        @Body() dto: UpdateDocumentDto
    ) {
        return await this.documentsService.updateDocument(id, dto)
    }

    @Patch('status/:id')
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateDocumentStatusDto
    ) {
        return await this.documentsService.updateStatus(id, dto.status)
    }


    @Delete(':documentId')
    async deleteDocs (
        @Param('documentId', ParseUUIDPipe,) id: string,
    ) {
        return await this.documentsService.removeDoc(id)
    }    
}