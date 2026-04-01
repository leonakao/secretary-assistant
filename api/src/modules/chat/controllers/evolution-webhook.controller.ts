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
import { MessageQueueService } from '../../message-queue/services/message-queue.service';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';

interface WebhookPayload<T> {
  instance: string;
  data: T;
}

@Controller('webhooks/evolution/:companyId')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(
    private messageQueueService: MessageQueueService,
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

    // Extract phone from remoteJid
    const phone = '+' + data.key.remoteJid.split('@')[0];
    const conversationKey = `whatsapp:${companyId}:${phone}`;

    // Enqueue the message
    await this.messageQueueService.enqueueWhatsapp(companyId, conversationKey, {
      instanceName: instance,
      payload: data,
    });

    return { success: true };
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
