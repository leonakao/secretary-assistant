import { Module } from '@nestjs/common';
import { LangchainService } from './services/langchain.service';

@Module({
  providers: [LangchainService],
  exports: [LangchainService],
})
export class AiModule {}
