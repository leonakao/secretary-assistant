import { Module } from '@nestjs/common';
import { EvolutionService } from './services/evolution.service';

@Module({
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EvolutionModule {}
