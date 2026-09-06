import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateConversationDto {
    @IsString()
    @ApiProperty({
        example: 'Test update title'
    })
    @IsNotEmpty({message: 'title khong duoc de trong'})
    @MaxLength(255, {message: 'title khong duoc vuot qua 255 ky tu'})
    title!: string
}