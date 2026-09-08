import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { MessageRole } from "../../../common/chat.enum.js";
import { ApiProperty } from "@nestjs/swagger";

export class createMessageDto {
    @IsString()
    @ApiProperty({
        example: 'Cach nao de co muc luong 1000$ nganh IT'
    })
    @IsNotEmpty({ message: 'message content khong duoc de trong' })
    content!: string

    @ApiProperty({
    example: 'user'
    })
    @IsEnum(MessageRole, { message: 'message role khong hop le' })
    role!: MessageRole
}