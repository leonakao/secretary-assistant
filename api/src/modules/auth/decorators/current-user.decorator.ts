import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from 'src/modules/users/entities/user.entity';
import type { AuthenticatedRequest } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.session?.user) {
      throw new Error('Session user is not available on the request');
    }

    return request.session.user;
  },
);
