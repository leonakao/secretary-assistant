import { IsBoolean } from 'class-validator';

export class UpdateManagedAgentStateDto {
  @IsBoolean()
  enabled: boolean;
}
