import { IsString, IsUUID } from 'class-validator';

export class SendWebChatMessageDto {
  @IsString()
  message: string;

  @IsUUID()
  companyId: string;
}
