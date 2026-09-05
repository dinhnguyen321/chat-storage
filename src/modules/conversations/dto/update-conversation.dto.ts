import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateConversationDto {
    @IsString()
    @IsNotEmpty({message: 'title khong duoc de trong'})
    @MaxLength(255, {message: 'title khong duoc vuot qua 255 ky tu'})
    title!: string
}