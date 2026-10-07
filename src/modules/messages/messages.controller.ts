import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MessageService } from "./messages.service.js";
import { MessageEntity } from "../entities/messages.entity.js";
import { CreateMessageDto } from "./dto/create-message.dto.js";
import { GetMessagesQueryDto } from "./dto/get-messages-query.dto.js";
import { CreateFirstMessageDto } from "./dto/create-first-message.dto.js";

@ApiTags('messages')
// @ApiBearerAuth('JWT-auth')
@Controller('messages')
export class MessagesController {
    constructor (private readonly messageService: MessageService) {}

    @Post('conversations/:conversationId')
    async create(@Param('conversationId', ParseUUIDPipe) conversationId: string, @Body() dto: CreateMessageDto)
    // : Promise<MessageEntity>
     {
        return await this.messageService.createMessage(conversationId, dto);
    }

    @Get('conversations/:conversationId')
    async findAllByConversation(
        @Param('conversationId', ParseUUIDPipe) conversationId: string,
        @Query() query: GetMessagesQueryDto
    ): Promise<{ data: MessageEntity[]; total: number; page: number; limit: number }> {
        return this.messageService.findAllByConversation(conversationId, query);
    }
    
    @Get(':messageId')
    findOneMessage(
        @Param('messageId', ParseUUIDPipe) messageId: string, 
        @Query('conversationId') conversationId: string
    ): Promise<MessageEntity> {

        return this.messageService.findOneMessage(conversationId, messageId);
    }

    @Delete(':conversationId')
    remove(
        @Param('conversationId', ParseUUIDPipe) conversationId: string,
        @Query('messageId', ParseUUIDPipe) messageId: string,
    ) {
        return this.messageService.remove(conversationId, messageId);
    }

    @Post('conversation/first-message')
    @ApiOperation({ summary: 'Gửi tin nhắn đầu tiên' })
    createFirstMessage(@Body() dto: CreateFirstMessageDto) {
        return this.messageService.createFirstMessage(dto)
    }

}