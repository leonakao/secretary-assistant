import { Controller, Post, Body, Logger, Param } from '@nestjs/common';
import { IncomingMessageUseCase } from '../use-cases/incoming-message.use-case';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';

interface WebhookPayload<T> {
  instance: string;
  data: T;
}

@Controller('webhooks/evolution/:companyId')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(private incomingMessageUseCase: IncomingMessageUseCase) {}

  @Post('/messages-upsert')
  async handleMessages(
    @Param('companyId') companyId: string,
    @Body() payload: WebhookPayload<EvolutionMessagesUpsertPayload>,
  ) {
    this.logger.log('Received messages from Evolution API');
    const { instance, data } = payload;

    await this.incomingMessageUseCase.execute(companyId, instance, data);

    return { success: true };
  }
}
