import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import { GetUsersMeUseCase } from '../use-cases/get-users-me.use-case';
import type { User } from '../entities/user.entity';

@Controller('users/me')
export class UsersMeController {
  constructor(private readonly getUsersMe: GetUsersMeUseCase) {}

  @Get()
  @UseGuards(SessionGuard)
  async getMe(@CurrentUser() user: User) {
    return this.getUsersMe.execute(user);
  }
}
