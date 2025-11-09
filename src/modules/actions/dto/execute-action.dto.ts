import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActionType } from '../types/action.types';

export class ExecuteActionContextDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  instanceName: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  contactId?: string;
}

export class ExecuteActionDto {
  @IsEnum(ActionType)
  @IsNotEmpty()
  type: ActionType;

  @IsObject()
  @IsNotEmpty()
  payload: any;

  @ValidateNested()
  @Type(() => ExecuteActionContextDto)
  @IsNotEmpty()
  context: ExecuteActionContextDto;
}
