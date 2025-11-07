import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { UserCompany } from './entities/user-company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, UserCompany])],
  exports: [TypeOrmModule],
})
export class CompaniesModule {}
