import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendOnboardingMessageDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : undefined,
  )
  @IsOptional()
  @IsIn(['text', 'audio'])
  kind?: 'text' | 'audio';

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  durationMs?: string;
}
