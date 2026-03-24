import { IsNotEmpty, IsString } from 'class-validator';

export class SendOnboardingMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
