import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import { SendOnboardingMessageDto } from '../dto/send-onboarding-message.dto';
import { SendOnboardingMessageUseCase } from '../use-cases/send-onboarding-message.use-case';
import type { User } from 'src/modules/users/entities/user.entity';

@Controller('onboarding/messages')
export class OnboardingMessagesController {
  constructor(
    private readonly sendOnboardingMessage: SendOnboardingMessageUseCase,
  ) {}

  @Post()
  @UseGuards(SessionGuard)
  async sendMessage(
    @CurrentUser() user: User,
    @Body() dto: SendOnboardingMessageDto,
  ) {
    return this.sendOnboardingMessage.execute(user, dto.message);
  }
}
