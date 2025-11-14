import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LangchainService } from './services/langchain.service';
import { AudioTranscriptionService } from './services/audio-transcription.service';
import { OwnerAssistantAgent } from './agents/owner-assistant.agent';
import { ClientAssistantAgent } from './agents/client-assistant.agent';
import { OnboardingAssistantAgent } from './agents/onboarding-assistant.agent';
import { CreateServiceRequestTool } from './tools/create-service-request.tool';
import { SearchServiceRequestTool } from './tools/search-service-request.tool';
import { UpdateServiceRequestTool } from './tools/update-service-request.tool';
import { SendMessageTool } from './tools/send-message.tool';
import { SearchConversationTool } from './tools/search-conversation.tool';
import { SearchContactTool } from './tools/search-contact.tool';
import { CreateContactTool } from './tools/create-contact.tool';
import { UpdateContactTool } from './tools/update-contact.tool';
import { UpdateCompanyTool } from './tools/update-company.tool';
import { SearchUserTool } from './tools/search-user.tool';
import { CreateConfirmationTool } from './tools/create-confirmation.tool';
import { SearchConfirmationTool } from './tools/search-confirmation.tool';
import { UpdateConfirmationTool } from './tools/update-confirmation.tool';
import { UpdateMemoryTool } from './tools/update-memory.tool';
import { SearchMemoryTool } from './tools/search-memory.tool';
import { FinishOnboardingTool } from './tools/finish-onboarding.tool';
import { ServiceRequest, ServiceRequestsModule } from '../service-requests';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Memory } from '../chat/entities/memory.entity';
import { Confirmation } from '../service-requests/entities/confirmation.entity';
import { ChatModule } from '../chat/chat.module';
import { ExtractAiMessageService } from './services/extract-ai-message.service';
import { PostgresStore } from './stores/postgres.store';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceRequest,
      Contact,
      User,
      Company,
      Memory,
      Confirmation,
    ]),
    forwardRef(() => ChatModule),
    ServiceRequestsModule,
  ],
  providers: [
    OwnerAssistantAgent,
    ClientAssistantAgent,
    OnboardingAssistantAgent,
    // Tools
    CreateServiceRequestTool,
    SearchServiceRequestTool,
    UpdateServiceRequestTool,
    SendMessageTool,
    SearchConversationTool,
    SearchContactTool,
    CreateContactTool,
    UpdateContactTool,
    UpdateCompanyTool,
    SearchUserTool,
    CreateConfirmationTool,
    SearchConfirmationTool,
    UpdateConfirmationTool,
    UpdateMemoryTool,
    SearchMemoryTool,
    FinishOnboardingTool,
    // Services
    ExtractAiMessageService,
    LangchainService,
    AudioTranscriptionService,
    PostgresStore,
  ],
  exports: [
    OwnerAssistantAgent,
    ClientAssistantAgent,
    OnboardingAssistantAgent,
    // Services
    AudioTranscriptionService,
    ExtractAiMessageService,
    LangchainService,
  ],
})
export class AiModule {}
