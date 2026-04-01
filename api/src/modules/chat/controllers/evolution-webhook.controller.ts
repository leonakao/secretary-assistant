import {
  Body,
  Controller,
  Headers,
  Logger,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';
import {
  IncomingMessageResult,
  IncomingMessageUseCase,
} from '../use-cases/incoming-message.use-case';

interface WebhookPayload<T> {
  instance: string;
  data: T;
}

@Controller('webhooks/evolution/:companyId')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(
    private readonly incomingMessageUseCase: IncomingMessageUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Post('messages-upsert')
  async handleMessages(
    @Param('companyId') companyId: string,
    @Headers('x-evolution-token') evolutionToken: string | undefined,
    @Body() payload: WebhookPayload<EvolutionMessagesUpsertPayload>,
  ): Promise<IncomingMessageResult> {
    this.assertWebhookToken(evolutionToken);
    this.logger.log('Received messages from Evolution API');
    const { instance, data } = payload;

    return this.incomingMessageUseCase.execute(companyId, instance, data);
  }

  private assertWebhookToken(receivedToken: string | undefined) {
    const expectedToken = this.configService
      .get<string>('EVOLUTION_API_TOKEN')
      ?.trim();

    if (!expectedToken) {
      return;
    }

    if (receivedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid Evolution webhook token');
    }
  }
}
