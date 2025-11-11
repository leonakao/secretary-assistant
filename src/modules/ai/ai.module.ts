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
} from './tools';
import { ServiceRequest } from '../service-requests';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Memory } from '../chat/entities/memory.entity';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest, Contact, User, Company, Memory]),
    forwardRef(() => ChatModule),
  ],
  providers: [
    LangchainService,
    AudioTranscriptionService,
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
  ],
  exports: [
    LangchainService,
    AudioTranscriptionService,
    OwnerAssistantAgent,
    ClientAssistantAgent,
  ],
})
export class AiModule {}
