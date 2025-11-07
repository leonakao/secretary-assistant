import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './entities/memory.entity';
import { AiModule } from '../ai/ai.module';
import { ChatService } from './services/chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([Memory]), AiModule],
  providers: [ChatService],
  exports: [TypeOrmModule, ChatService],
})
export class ChatModule {}
