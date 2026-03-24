import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import { CreateOnboardingCompanyDto } from '../dto/create-onboarding-company.dto';
import { CreateOnboardingCompanyUseCase } from '../use-cases/create-onboarding-company.use-case';
import type { User } from 'src/modules/users/entities/user.entity';

@Controller('onboarding/company')
export class OnboardingCompanyController {
  constructor(
    private readonly createOnboardingCompany: CreateOnboardingCompanyUseCase,
  ) {}

  @Post()
  @UseGuards(SessionGuard)
  async createCompany(
    @CurrentUser() user: User,
    @Body() dto: CreateOnboardingCompanyDto,
  ) {
    return this.createOnboardingCompany.execute(user, dto);
  }
}
