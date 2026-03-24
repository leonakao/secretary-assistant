import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOnboardingCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  businessType: string;

  @IsString()
  @IsOptional()
  ownerDisplayName?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
