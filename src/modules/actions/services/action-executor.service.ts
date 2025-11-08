import { Injectable, Logger } from '@nestjs/common';
import { Action, ActionType } from '../types/action.types';
import { SendMessageActionService } from './send-message-action.service';
import { RequestHumanContactActionService } from './request-human-contact-action.service';
import { NotifyUserActionService } from './notify-user-action.service';

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

  constructor(
    private sendMessageActionService: SendMessageActionService,
    private requestHumanContactActionService: RequestHumanContactActionService,
    private notifyUserActionService: NotifyUserActionService,
  ) {}

  async executeActions(
    actions: Action[],
    context: {
      companyId: string;
      instanceName: string;
      userId?: string;
      contactId?: string;
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
            if (!context.userId) {
              throw new Error('userId required for SEND_MESSAGE action');
            }
            result = await this.sendMessageActionService.execute(action, {
              companyId: context.companyId,
              instanceName: context.instanceName,
              userId: context.userId,
            });
            break;

          case ActionType.REQUEST_HUMAN_CONTACT:
            if (!context.contactId) {
              throw new Error(
                'contactId required for REQUEST_HUMAN_CONTACT action',
              );
            }
            result = await this.requestHumanContactActionService.execute(
              action,
              {
                companyId: context.companyId,
                instanceName: context.instanceName,
                contactId: context.contactId,
              },
            );
            break;

          case ActionType.NOTIFY_USER:
            if (!context.contactId) {
              throw new Error('contactId required for NOTIFY_USER action');
            }
            result = await this.notifyUserActionService.execute(action, {
              companyId: context.companyId,
              instanceName: context.instanceName,
              contactId: context.contactId,
            });
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
