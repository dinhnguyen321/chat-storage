import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateConversationDto {
    @IsString()
    @ApiProperty({example: '123456', description: 'id cua nguoi dung'})
    @IsNotEmpty({message: 'user id khong duoc de trong'})
    user_id!: string
    
    @IsString()
    @ApiProperty({example: 'Test conversation', description: 'Ten cua cuoc tro chuyen'})
    @IsNotEmpty({message: 'title khong duoc de trong'})
    @MaxLength(255, {message: 'title khong duoc vuot qua 255 ky tu'})
    title!: string
}