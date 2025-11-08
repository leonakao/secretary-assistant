import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionDetectionService } from './services/action-detection.service';
import { ActionExecutorService } from './services/action-executor.service';
import { SendMessageActionService } from './services/send-message-action.service';
import { Contact } from '../contacts/entities/contact.entity';
import { AiModule } from '../ai/ai.module';
import { ChatModule } from '../chat/chat.module';
import { EvolutionMessageProvider } from '../chat/providers/evolution-message.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact]),
    AiModule,
    forwardRef(() => ChatModule),
  ],
  providers: [
    ActionDetectionService,
    ActionExecutorService,
    SendMessageActionService,
    {
      provide: 'MESSAGE_PROVIDER',
      useExisting: EvolutionMessageProvider,
    },
  ],
  exports: [ActionDetectionService, ActionExecutorService],
})
export class ActionsModule {}
