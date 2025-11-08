import { Module } from '@nestjs/common';
import { ActionDetectionService } from './services/action-detection.service';
import { ActionExecutorService } from './services/action-executor.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [ActionDetectionService, ActionExecutorService],
  exports: [ActionDetectionService, ActionExecutorService],
})
export class ActionsModule {}
