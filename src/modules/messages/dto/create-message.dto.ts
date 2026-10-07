import { IsArray,
    //  IsEnum, 
    IsNotEmpty, IsOptional, IsString } from "class-validator";
// import { MessageRole } from "../../../common/chat.enum.js";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMessageDto {
    @IsString()
    @ApiProperty({
        example: 'Cach nao de co muc luong 1000$ nganh IT'
    })
    @IsNotEmpty({ message: 'message content khong duoc de trong' })
    content!: string

    @ApiPropertyOptional({
        description: 'Danh sách ID tài liệu (để trống nếu chat thường không RAG)',
        type: [String],
    })
    @IsOptional()
    @IsArray()
    // @IsUUID('4', { each: false, message: 'Mỗi ID tài liệu phải là UUID hợp lệ' })
    selector_choices?: string[];

    @IsString()
    @ApiProperty({example: '123456', description: 'id cua nguoi dung'})
    @IsNotEmpty({message: 'user id khong duoc de trong'})
    user_id!: string

}