import { Injectable, Logger } from '@nestjs/common';
import { UpdateServiceRequestAction } from '../types/action.types';
import { UpdateServiceRequestService } from '../../service-requests/services/update-service-request.service';
import { FindServiceRequestService } from '../../service-requests/services/find-service-request.service';
import { QueryServiceRequestService } from '../../service-requests/services/query-service-request.service';
import { ServiceRequestStatus } from '../../service-requests/entities/service-request.entity';
import { LangchainService } from '../../ai/services/langchain.service';
import { updateServiceRequestPrompt } from '../prompts/update-service-request.prompt';
import { ActionExecutionResult } from './action-executor.service';
import { ActionContext } from './create-service-request-action.service';

@Injectable()
export class UpdateServiceRequestActionService {
  private readonly logger = new Logger(UpdateServiceRequestActionService.name);

  constructor(
    private updateServiceRequestService: UpdateServiceRequestService,
    private findServiceRequestService: FindServiceRequestService,
    private queryServiceRequestService: QueryServiceRequestService,
    private langchainService: LangchainService,
  ) {}

  async execute(
    action: UpdateServiceRequestAction,
    context: ActionContext,
  ): Promise<ActionExecutionResult> {
    try {
      const { payload } = action;

      // Use AI to analyze messages and extract update details
      const prompt = updateServiceRequestPrompt();
      const messagesText = payload.relevantMessages.join('\n');
      
      const aiResponse = await this.langchainService.chat(
        `${prompt}\n\nMensagens do cliente:\n${messagesText}`,
      );

      let updateData;
      try {
        updateData = JSON.parse(aiResponse);
      } catch (error) {
        this.logger.error('Failed to parse AI response:', aiResponse);
        return {
          success: false,
          action,
          message: 'Failed to parse update request details',
        };
      }

      // Find the request to update
      let serviceRequest;

      if (updateData.requestType && context.contactId) {
        // Find most recent active request of this type for the contact
        const requests = await this.queryServiceRequestService.findByContactAndType(
          context.contactId,
          updateData.requestType,
        );
        serviceRequest = requests[0];
      } else if (context.contactId) {
        // Find most recent active request for the contact
        const requests = await this.queryServiceRequestService.getActiveRequestsForContact(
          context.contactId,
        );
        serviceRequest = requests[0];
      }

      if (!serviceRequest) {
        return {
          success: false,
          action,
          message: 'Service request not found',
        };
      }

      // If client is updating, reset to pending
      const updates = { ...updateData.updates };
      if (context.contactId && !context.userId) {
        updates.status = ServiceRequestStatus.PENDING;
        this.logger.log(
          `Client update detected - resetting request ${serviceRequest.id} to PENDING`,
        );
      }

      const updatedRequest = await this.updateServiceRequestService.execute(
        serviceRequest.id,
        updates,
      );

      this.logger.log(`Updated service request ${updatedRequest.id}`);

      return {
        success: true,
        action,
        message: 'Service request updated successfully',
        data: updatedRequest,
      };
    } catch (error) {
      this.logger.error('Error updating service request:', error);
      return {
        success: false,
        action,
        message: `Failed to update service request: ${error.message}`,
      };
    }
  }
}
