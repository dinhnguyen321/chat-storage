import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MessageService } from "./messages.service.js";
import { MessageEntity } from "../entities/messages.entity.js";
import { CreateMessageDto } from "./dto/create-message.dto.js";

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
    constructor (private readonly messageService: MessageService) {}

    @Post()
    create(@Query('conversationId') conversationId: string, @Body() dto: CreateMessageDto): Promise<MessageEntity> {
        return this.messageService.createMessage(conversationId, dto);
    }

    @Get()
    findAllByConversation(
        @Query('conversationId', ParseUUIDPipe) conversationId: string, 
    ): Promise<MessageEntity[]> {
        return this.messageService.findAllByConversation(conversationId);
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
}