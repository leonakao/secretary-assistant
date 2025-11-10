import { Injectable, Logger } from '@nestjs/common';
import { QueryServiceRequestAction } from '../types/action.types';
import { QueryServiceRequestService as QueryService } from '../../service-requests/services/query-service-request.service';
import { LangchainService } from '../../ai/services/langchain.service';
import { queryServiceRequestPrompt } from '../prompts/query-service-request.prompt';
import { ActionContext } from './create-service-request-action.service';
import { ActionExecutionResult } from './action-executor.service';

@Injectable()
export class QueryServiceRequestActionService {
  private readonly logger = new Logger(QueryServiceRequestActionService.name);

  constructor(
    private queryService: QueryService,
    private langchainService: LangchainService,
  ) {}

  async execute(
    action: QueryServiceRequestAction,
    context: ActionContext,
  ): Promise<ActionExecutionResult> {
    try {
      if (!context.contactId) {
        return {
          success: false,
          action,
          message: 'Contact ID is required to query service requests',
        };
      }

      const { payload } = action;

      // Use AI to analyze messages and extract query details
      const prompt = queryServiceRequestPrompt();
      const messagesText = payload.relevantMessages.join('\n');

      const aiResponse = await this.langchainService.chat(
        `${prompt}\n\nMensagens do cliente:\n${messagesText}`,
      );

      let queryData;
      try {
        queryData = JSON.parse(aiResponse);
      } catch (error) {
        this.logger.error('Failed to parse AI response:', aiResponse, error);
        return {
          success: false,
          action,
          message: 'Failed to parse query details',
        };
      }

      let requests;

      if (queryData.requestType) {
        requests = await this.queryService.findByContactAndType(
          context.contactId,
          queryData.requestType,
        );
      } else {
        requests = await this.queryService.getActiveRequestsForContact(
          context.contactId,
        );
      }

      this.logger.log(
        `Found ${requests.length} service requests for contact ${context.contactId}`,
      );

      return {
        success: true,
        action,
        message: `Found ${requests.length} service request(s)`,
        data: requests,
      };
    } catch (error) {
      this.logger.error('Error querying service requests:', error);
      return {
        success: false,
        action,
        message: `Failed to query service requests: ${error.message}`,
      };
    }
  }
}
