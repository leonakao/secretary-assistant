import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import type { User } from 'src/modules/users/entities/user.entity';
import { UpdateManagedCompanyKnowledgeBaseDto } from '../dto/update-managed-company-knowledge-base.dto';
import { UpdateManagedCompanyProfileDto } from '../dto/update-managed-company-profile.dto';
import { GetManagedCompanyUseCase } from '../use-cases/get-managed-company.use-case';
import { UpdateManagedCompanyKnowledgeBaseUseCase } from '../use-cases/update-managed-company-knowledge-base.use-case';
import { UpdateManagedCompanyProfileUseCase } from '../use-cases/update-managed-company-profile.use-case';

@Controller('companies/me')
@UseGuards(SessionGuard)
export class CompaniesMeController {
  constructor(
    private readonly getManagedCompany: GetManagedCompanyUseCase,
    private readonly updateManagedCompanyProfile: UpdateManagedCompanyProfileUseCase,
    private readonly updateManagedCompanyKnowledgeBase: UpdateManagedCompanyKnowledgeBaseUseCase,
  ) {}

  @Get()
  async getCompany(@CurrentUser() user: User) {
    return this.getManagedCompany.execute(user);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateManagedCompanyProfileDto,
  ) {
    return this.updateManagedCompanyProfile.execute(user, dto);
  }

  @Put('knowledge-base')
  async updateKnowledgeBase(
    @CurrentUser() user: User,
    @Body() dto: UpdateManagedCompanyKnowledgeBaseDto,
  ) {
    return this.updateManagedCompanyKnowledgeBase.execute(user, dto);
  }
}
