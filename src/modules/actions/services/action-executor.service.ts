import { Injectable, Logger } from '@nestjs/common';
import { Action, ActionType } from '../types/action.types';
import { SendMessageActionService } from './send-message-action.service';
import { RequestHumanContactActionService } from './request-human-contact-action.service';
import { NotifyUserActionService } from './notify-user-action.service';
import { SearchConversationActionService } from './search-conversation-action.service';
import { FinishOnboardingActionService } from './finish-onboarding-action.service';
import { UpdateCompanyActionService } from './update-company-action.service';

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
    private searchConversationActionService: SearchConversationActionService,
    private finishOnboardingActionService: FinishOnboardingActionService,
    private updateCompanyActionService: UpdateCompanyActionService,
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

          case ActionType.SEARCH_CONVERSATION:
            if (!context.userId) {
              throw new Error('userId required for SEARCH_CONVERSATION action');
            }
            result = await this.searchConversationActionService.execute(
              action,
              {
                companyId: context.companyId,
                instanceName: context.instanceName,
                userId: context.userId,
              },
            );
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

          case ActionType.FINISH_ONBOARDING:
            if (!context.userId) {
              throw new Error('userId required for FINISH_ONBOARDING action');
            }
            result = await this.finishOnboardingActionService.execute(action, {
              companyId: context.companyId,
              userId: context.userId,
            });
            break;

          case ActionType.UPDATE_COMPANY:
            if (!context.userId) {
              throw new Error('userId required for UPDATE_COMPANY action');
            }
            result = await this.updateCompanyActionService.execute(action, {
              companyId: context.companyId,
              userId: context.userId,
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
