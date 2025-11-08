import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class EvolutionGuard implements CanActivate {
  private readonly logger = new Logger(EvolutionGuard.name);
  private readonly evolutionApiToken: string;

  constructor(private configService: ConfigService) {
    this.evolutionApiToken = this.configService.get<string>(
      'EVOLUTION_API_TOKEN',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('Missing Authorization header');
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Support both "Bearer token" and "token" formats
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!this.evolutionApiToken) {
      this.logger.error('EVOLUTION_API_TOKEN not configured');
      throw new UnauthorizedException('Server configuration error');
    }

    if (token !== this.evolutionApiToken) {
      this.logger.warn('Invalid Evolution API token');
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }
}
