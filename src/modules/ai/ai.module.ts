import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LangchainService } from './services/langchain.service';
import { VectorStoreService } from './services/vector-store.service';
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
} from './tools';
import { ServiceRequest } from '../service-requests';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Memory } from '../chat/entities/memory.entity';
import { Mediation } from '../service-requests/entities/mediation.entity';
import { ChatModule } from '../chat/chat.module';
import { ExtractAiMessageService } from './services/extract-ai-message.service';

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
    // Services
    ExtractAiMessageService,
    LangchainService,
    VectorStoreService,
    AudioTranscriptionService,
  ],
  exports: [
    OwnerAssistantAgent,
    ClientAssistantAgent,
    // Services
    AudioTranscriptionService,
    ExtractAiMessageService,
  ],
})
export class AiModule {}
