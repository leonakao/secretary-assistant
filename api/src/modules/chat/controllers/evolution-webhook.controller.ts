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
import { IncomingMessageUseCase } from '../use-cases/incoming-message.use-case';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';

interface WebhookPayload<T> {
  instance: string;
  data: T;
}

@Controller('webhooks/evolution/:companyId')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(
    private incomingMessageUseCase: IncomingMessageUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Post('/messages-upsert')
  async handleMessages(
    @Param('companyId') companyId: string,
    @Headers('x-evolution-token') evolutionToken: string | undefined,
    @Body() payload: WebhookPayload<EvolutionMessagesUpsertPayload>,
  ) {
    this.assertWebhookToken(evolutionToken);
    this.logger.log('Received messages from Evolution API');
    const { instance, data } = payload;

    const response = await this.incomingMessageUseCase.execute(
      companyId,
      instance,
      data,
    );

    console.log(response);

    return { success: true, ...response };
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
