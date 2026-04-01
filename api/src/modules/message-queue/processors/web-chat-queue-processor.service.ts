import { Injectable, Logger } from '@nestjs/common';
import { MessageQueue } from '../entities/message-queue.entity';
import { ChatStateService } from '../services/chat-state.service';

@Injectable()
export class WebChatQueueProcessorService {
  private readonly logger = new Logger(WebChatQueueProcessorService.name);

  constructor(private chatStateService: ChatStateService) {}

  async process(item: MessageQueue): Promise<void> {
    await this.chatStateService.setTyping(item.conversationKey);

    try {
      // No strategy implementation yet — stub logs and returns
      this.logger.log(`web_chat stub: processing item ${item.id}`);
    } finally {
      await this.chatStateService.clearTyping(item.conversationKey);
    }
  }
}
