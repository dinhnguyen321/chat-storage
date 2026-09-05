import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { MessageRole } from "../../../common/chat.enum.js";

export class createMessageDto {
    @IsString()
    @IsNotEmpty({ message: 'conversation id khong duoc de trong' })
    conversationId!: string

    @IsString()
    @IsNotEmpty({ message: 'message content khong duoc de trong' })
    content!: string

    @IsEnum(MessageRole, { message: 'message role khong hop le' })
    role!: MessageRole
}