import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import { GetOnboardingStateUseCase } from '../use-cases/get-onboarding-state.use-case';
import type { User } from 'src/modules/users/entities/user.entity';

@Controller('onboarding/state')
export class OnboardingStateController {
  constructor(private readonly getOnboardingState: GetOnboardingStateUseCase) {}

  @Get()
  @UseGuards(SessionGuard)
  async getState(@CurrentUser() user: User) {
    return this.getOnboardingState.execute(user);
  }
}
