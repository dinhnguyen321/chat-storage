import { IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentStatus } from '../../../common/chat.enum.js';

export class UpdateDocumentStatusDto {
  @IsEnum(DocumentStatus, { message: 'Status không hợp lệ' })
  @IsNotEmpty()
  status: DocumentStatus;
}