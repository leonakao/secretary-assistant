import { Injectable, Logger } from '@nestjs/common';
import { SendMessageAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';

@Injectable()
export class SendMessageActionService {
  private readonly logger = new Logger(SendMessageActionService.name);

  async execute(
    action: SendMessageAction,
    context: {
      companyId: string;
      instanceName: string;
      userId: string;
    },
  ): Promise<ActionExecutionResult> {
    this.logger.log(
      `[TODO] Send message to ${action.payload.contactName}: "${action.payload.message}"`,
    );

    // TODO: Implement
    // 1. Find contact by name/phone in database
    // 2. Get contact's remoteJid
    // 3. Send message via messageProvider
    // 4. Log the action

    return {
      success: false,
      action,
      message: 'Send message action not yet implemented',
    };
  }
}
