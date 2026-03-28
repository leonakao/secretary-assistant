import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { User } from 'src/modules/users/entities/user.entity';
import type { SessionClaims } from '../auth.types';

interface DeterministicSessionClaims {
  email?: unknown;
  name?: unknown;
  sub?: unknown;
}

const E2E_TOKEN_PREFIX = 'e2e.';

const LEGACY_E2E_TOKENS: Record<string, SessionClaims> = {
  'mock-e2e-signin-token': {
    sub: 'auth0|signin-user',
    email: 'owner@example.com',
    name: 'Existing Owner',
  },
  'mock-e2e-signup-token': {
    sub: 'auth0|signup-user',
    email: 'new-owner@example.com',
    name: 'New Owner',
  },
};

@Injectable()
export class AuthService {
  private readonly auth0Domain: string;
  private readonly auth0ClientId: string;
  private readonly e2eAuthModeEnabled: boolean;
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
    this.e2eAuthModeEnabled =
      this.configService.get<string>('E2E_AUTH_MODE', 'false') === 'true' &&
      this.configService.get<string>('NODE_ENV', 'development') !==
        'production';
    this.issuer = `https://${this.auth0Domain}/`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}.well-known/jwks.json`),
    );
  }

  async authenticateBearerToken(token: string): Promise<{
    claims: SessionClaims;
    user: User;
  }> {
    const claims = this.shouldUseDeterministicAuth(token)
      ? this.verifyDeterministicToken(token)
      : await this.verifyIdToken(token);
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

  private shouldUseDeterministicAuth(token: string): boolean {
    return (
      this.e2eAuthModeEnabled &&
      (token.startsWith(E2E_TOKEN_PREFIX) || token in LEGACY_E2E_TOKENS)
    );
  }

  private verifyDeterministicToken(token: string): SessionClaims {
    const legacyClaims = LEGACY_E2E_TOKENS[token];

    if (legacyClaims) {
      return legacyClaims;
    }

    const encodedClaims = token.slice(E2E_TOKEN_PREFIX.length);
    const decodedClaims = this.decodeBase64Url(encodedClaims);

    let claims: DeterministicSessionClaims;

    try {
      claims = JSON.parse(decodedClaims) as DeterministicSessionClaims;
    } catch {
      throw new UnauthorizedException('Invalid E2E session token');
    }

    return this.mapDeterministicClaims(claims);
  }

  private decodeBase64Url(value: string): string {
    if (!value) {
      throw new UnauthorizedException('Invalid E2E session token');
    }

    const paddedValue = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
    const normalizedValue = paddedValue.replace(/-/g, '+').replace(/_/g, '/');

    try {
      return Buffer.from(normalizedValue, 'base64').toString('utf8');
    } catch {
      throw new UnauthorizedException('Invalid E2E session token');
    }
  }

  private mapDeterministicClaims(
    payload: DeterministicSessionClaims,
  ): SessionClaims {
    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const name =
      typeof payload.name === 'string' && payload.name.trim().length > 0
        ? payload.name.trim()
        : null;

    if (!sub || !email || !name) {
      throw new UnauthorizedException('Invalid E2E session token');
    }

    return { sub, email, name };
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
