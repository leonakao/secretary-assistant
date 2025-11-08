import { Injectable, Logger } from '@nestjs/common';
import { Action, ActionType } from '../types/action.types';
import { SendMessageActionService } from './send-message-action.service';

export interface ActionExecutionResult {
  success: boolean;
  action: Action;
  message?: string;
  error?: string;
  data?: any;
}

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(private sendMessageActionService: SendMessageActionService) {}

  async executeActions(
    actions: Action[],
    context: {
      companyId: string;
      instanceName: string;
      userId: string;
    },
  ): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      this.logger.log(
        `Executing action: ${action.type} (confidence: ${action.confidence})`,
      );

      try {
        let result: ActionExecutionResult;

        switch (action.type) {
          case ActionType.SEND_MESSAGE:
            result = await this.sendMessageActionService.execute(
              action,
              context,
            );
            break;

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        results.push(result);
      } catch (error) {
        this.logger.error(`Error executing action ${action.type}:`, error);
        results.push({
          success: false,
          action,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }
}
