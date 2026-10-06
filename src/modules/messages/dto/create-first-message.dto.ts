// src/modules/messages/dto/create-first-message.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsUUID, IsEnum } from 'class-validator';
// import { MessageRole } from '../../../common/chat.enum.js';

export class CreateFirstMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn người dùng nhập',
    example: 'Tóm tắt giúp tôi các quy định trong tài liệu này',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  content: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID tài liệu (để trống nếu chat thường không RAG)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  // @IsUUID('4', { each: false, message: 'Mỗi ID tài liệu phải là UUID hợp lệ' })
  selector_choices?: string[];

  // Ghi chú: Nếu ứng dụng của bạn chưa lấy userId từ token JWT
  // thì cần truyền thêm userId. Nếu đã có JWT Auth Guards, có thể bỏ field này.
  @ApiPropertyOptional({
    example: '123456',
    description: 'ID người dùng (nếu không dùng JWT token)',
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  // @ApiProperty({
  // example: 'USER'
  // })
  // @IsEnum(MessageRole, { message: 'message role khong hop le' })
  // role!: MessageRole
}