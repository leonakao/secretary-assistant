import type { Request } from 'express';
import type { User } from '../users/entities/user.entity';

export interface SessionClaims {
  sub: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  session?: {
    claims: SessionClaims;
    user: User;
  };
}
