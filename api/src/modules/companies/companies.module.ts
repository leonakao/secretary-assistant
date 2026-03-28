import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CompaniesMeController } from './controllers/companies-me.controller';
import { Company } from './entities/company.entity';
import { UserCompany } from './entities/user-company.entity';
import { GetManagedCompanyUseCase } from './use-cases/get-managed-company.use-case';
import { UpdateManagedCompanyKnowledgeBaseUseCase } from './use-cases/update-managed-company-knowledge-base.use-case';
import { UpdateManagedCompanyProfileUseCase } from './use-cases/update-managed-company-profile.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Company, UserCompany]), AuthModule],
  controllers: [CompaniesMeController],
  providers: [
    GetManagedCompanyUseCase,
    UpdateManagedCompanyProfileUseCase,
    UpdateManagedCompanyKnowledgeBaseUseCase,
  ],
  exports: [TypeOrmModule],
})
export class CompaniesModule {}
