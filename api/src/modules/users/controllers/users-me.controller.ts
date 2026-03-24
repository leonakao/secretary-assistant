import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import type { User } from '../entities/user.entity';

interface UsersMeResponse {
  id: string;
  authProviderId: string | null;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Controller('users/me')
export class UsersMeController {
  @Get()
  @UseGuards(SessionGuard)
  getMe(@CurrentUser() user: User): UsersMeResponse {
    return {
      id: user.id,
      authProviderId: user.authProviderId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
