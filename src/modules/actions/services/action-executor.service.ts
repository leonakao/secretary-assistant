import { Injectable, Logger } from '@nestjs/common';
import { Action, ActionType } from '../types/action.types';
import { FinishOnboardingActionService } from './finish-onboarding-action.service';

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
    private finishOnboardingActionService: FinishOnboardingActionService,
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
          case ActionType.FINISH_ONBOARDING:
            if (!context.userId) {
              throw new Error('userId required for FINISH_ONBOARDING action');
            }
            result = await this.finishOnboardingActionService.execute(action, {
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
