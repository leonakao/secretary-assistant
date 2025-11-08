import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationStrategy } from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { User } from '../../users/entities/user.entity';
import { assistantOnboardingPrompt } from '../../ai/agent-prompts/assistant-onboarding';

@Injectable()
export class OnboardingConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OnboardingConversationStrategy.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatService: ChatService,
  ) {}

  async handleConversation(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    userId: string;
  }): Promise<void> {
    this.logger.log(
      `Handling onboarding conversation for session ${params.sessionId}`,
    );

    // Get user to build prompt
    const user = await this.userRepository.findOneByOrFail({
      id: params.userId,
    });

    const systemPrompt = assistantOnboardingPrompt(user);

    // Process and reply to user during onboarding
    await this.chatService.processAndReply({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      systemPrompt,
    });

    // TODO: Add onboarding-specific logic here
    // - Collect company information
    // - Guide user through setup process
    // - Validate required fields
    // - Transition to 'running' when complete
  }
}
