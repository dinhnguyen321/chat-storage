import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateConversationDto } from "./dto/create-conversation.dto.js";
import { ConversationService } from "./conversations.service.js";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { UpdateConversationDto } from "./dto/update-conversation.dto.js";

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
    constructor(private readonly conversationService: ConversationService) {}

    @Post()
    create(@Body() dto: CreateConversationDto): Promise<ConversationEntity> {
        return this.conversationService.create(dto);
    }

    @Get()
    findAllByUserId(@Query('userId') userId: string): Promise<ConversationEntity[]> {
        return this.conversationService.findAllByUserId(userId);
    }

    // cách 1: Sử dụng query parameter để truyền userId
    @Get(':id')
    findOne(
        @Param('id') id: string, 
        @Query('userId') userId: string
    ): Promise<ConversationEntity> {
        console.log(id, userId);
        return this.conversationService.findOne(id, userId);
    }
    // cách 2: sử dụng với UseGuard và AuthGuard để lấy userId từ token, không cần truyền userId trong query parameter
    // @Get(':id')
    // @UseGuards(AuthGuard)
    // findOne(
    //     @Param('id', ParseUUIDPipe) id: string, 
    //     @CurrentUser('id') userId: string
    // ) {
    //     return this.conversationService.findOne(id, userId);
    // }

    @Put(':id')
    update(
        @Param('id') id:string, 
        @Query('userId') userId: string,
        @Body() dto: UpdateConversationDto
    ) {
        return this.conversationService.update(id, userId, dto);
    }

    @Delete(':id')
    remove(
        @Param('id') id:string, 
        @Query('userId') userId: string,
    ) {
        return this.conversationService.remove(id, userId);
    }
}
