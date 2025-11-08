import { Controller, Post, Body, Logger } from '@nestjs/common';
import { IncomingMessageUseCase } from '../use-cases/incoming-message.use-case';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';

interface WebhookPayload<T> {
  instance: string;
  data: T;
}

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(private incomingMessageUseCase: IncomingMessageUseCase) {}

  @Post('messages-upsert')
  async handleMessages(
    @Body() payload: WebhookPayload<EvolutionMessagesUpsertPayload>,
  ) {
    this.logger.log('Received messages from Evolution API');
    const { instance, data } = payload;

    try {
      await this.incomingMessageUseCase.execute(instance, data);

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing messages webhook:', error);
      return { success: false, error: error.message };
    }
  }
}
