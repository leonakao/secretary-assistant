import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { User } from 'src/modules/users/entities/user.entity';
import type { SessionClaims } from '../auth.types';

@Injectable()
export class AuthService {
  private readonly auth0Domain: string;
  private readonly auth0ClientId: string;
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    this.auth0Domain = this.configService.get<string>(
      'AUTH0_DOMAIN',
      'dev-du3tsou284mgwefg.us.auth0.com',
    );
    this.auth0ClientId = this.configService.get<string>(
      'AUTH0_CLIENT_ID',
      'SJtvoRN584unasTOBo2fYogJM8HaWjWU',
    );
    this.issuer = `https://${this.auth0Domain}/`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}.well-known/jwks.json`),
    );
  }

  async authenticateBearerToken(token: string): Promise<{
    claims: SessionClaims;
    user: User;
  }> {
    const claims = await this.verifyIdToken(token);
    const user = await this.findOrCreateUser(claims);

    return {
      claims,
      user,
    };
  }

  private async verifyIdToken(token: string): Promise<SessionClaims> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.auth0ClientId,
      });

      return this.mapClaims(payload);
    } catch {
      throw new UnauthorizedException('Invalid session token');
    }
  }

  private mapClaims(payload: JWTPayload): SessionClaims {
    const sub = payload.sub;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const name =
      typeof payload.name === 'string' && payload.name.trim().length > 0
        ? payload.name.trim()
        : (email?.split('@')[0] ?? null);

    if (!sub || !email || !name) {
      throw new UnauthorizedException(
        'Session token is missing required claims',
      );
    }

    return {
      sub,
      email,
      name,
    };
  }

  private async findOrCreateUser(claims: SessionClaims): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ authProviderId: claims.sub }, { email: claims.email }],
    });

    if (!existingUser) {
      const user = this.usersRepository.create({
        authProviderId: claims.sub,
        email: claims.email,
        name: claims.name,
        phone: null,
      });

      return this.usersRepository.save(user);
    }

    const shouldUpdate =
      existingUser.authProviderId !== claims.sub ||
      existingUser.email !== claims.email ||
      existingUser.name !== claims.name;

    if (!shouldUpdate) {
      return existingUser;
    }

    existingUser.authProviderId = claims.sub;
    existingUser.email = claims.email;
    existingUser.name = claims.name;

    return this.usersRepository.save(existingUser);
  }
}
