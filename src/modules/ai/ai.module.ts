import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LangchainService } from './services/langchain.service';
import { AudioTranscriptionService } from './services/audio-transcription.service';
import { OwnerAssistantAgent } from './agents/owner-assistant.agent';
import { ClientAssistantAgent } from './agents/client-assistant.agent';
import {
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
  CreateMediationTool,
  SearchMediationTool,
  UpdateMediationTool,
  // UpdateMemoryTool,
  // SearchMemoryTool,
} from './tools';
import { ServiceRequest, ServiceRequestsModule } from '../service-requests';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Memory } from '../chat/entities/memory.entity';
import { Mediation } from '../service-requests/entities/mediation.entity';
import { ChatModule } from '../chat/chat.module';
import { ExtractAiMessageService } from './services/extract-ai-message.service';
// import { PostgresStore } from './stores/postgres.store';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceRequest,
      Contact,
      User,
      Company,
      Memory,
      Mediation,
    ]),
    forwardRef(() => ChatModule),
    ServiceRequestsModule,
  ],
  providers: [
    OwnerAssistantAgent,
    ClientAssistantAgent,
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
    CreateMediationTool,
    SearchMediationTool,
    UpdateMediationTool,
    // UpdateMemoryTool,
    // SearchMemoryTool,
    // Services
    ExtractAiMessageService,
    LangchainService,
    AudioTranscriptionService,
    // PostgresStore,
  ],
  exports: [
    OwnerAssistantAgent,
    ClientAssistantAgent,
    // Services
    AudioTranscriptionService,
    ExtractAiMessageService,
    LangchainService,
  ],
})
export class AiModule {}
