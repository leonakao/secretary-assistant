import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateServiceRequestAction } from '../types/action.types';
import { CreateServiceRequestService } from '../../service-requests/services/create-service-request.service';
import { Company } from '../../companies/entities/company.entity';
import { LangchainService } from '../../ai/services/langchain.service';
import { createServiceRequestPrompt } from '../prompts/create-service-request.prompt';
import { ActionExecutionResult } from './action-executor.service';

export interface ActionContext {
  companyId: string;
  instanceName: string;
  userId?: string;
  contactId?: string;
}

@Injectable()
export class CreateServiceRequestActionService {
  private readonly logger = new Logger(CreateServiceRequestActionService.name);

  constructor(
    private createServiceRequestService: CreateServiceRequestService,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private langchainService: LangchainService,
  ) {}

  async execute(
    action: CreateServiceRequestAction,
    context: ActionContext,
  ): Promise<ActionExecutionResult> {
    try {
      if (!context.contactId) {
        return {
          success: false,
          action,
          message: 'Contact ID is required to create a service request',
        };
      }

      const { payload } = action;

      const company = await this.companyRepository.findOne({
        where: { id: context.companyId },
      });

      if (!company) {
        return {
          success: false,
          action,
          message: 'Company not found',
        };
      }

      const prompt = createServiceRequestPrompt(company.description || '');
      const messagesText = payload.relevantMessages.join('\n');

      const aiResponse = await this.langchainService.chat(
        `${prompt}\n\nMensagens do cliente:\n${messagesText}`,
      );

      let requestData;
      try {
        requestData = JSON.parse(aiResponse);
      } catch (error) {
        this.logger.error('Failed to parse AI response:', aiResponse, error);
        return {
          success: false,
          action,
          message: 'Failed to parse service request details',
        };
      }

      const serviceRequest = await this.createServiceRequestService.execute({
        companyId: context.companyId,
        contactId: context.contactId,
        requestType: requestData.requestType,
        title: requestData.title,
        description: requestData.description,
        scheduledFor: requestData.scheduledFor
          ? new Date(requestData.scheduledFor)
          : undefined,
        metadata: requestData.metadata || {},
      });

      this.logger.log(
        `Created service request ${serviceRequest.id} of type ${requestData.requestType}`,
      );

      return {
        success: true,
        action,
        message: `Service request created successfully`,
        data: serviceRequest,
      };
    } catch (error) {
      this.logger.error('Error creating service request:', error);
      return {
        success: false,
        action,
        message: `Failed to create service request: ${error.message}`,
      };
    }
  }
}
