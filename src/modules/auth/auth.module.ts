import { Module } from '@nestjs/common';
import { EvolutionGuard } from './guards/evolution.guard';

@Module({
  providers: [EvolutionGuard],
  exports: [EvolutionGuard],
})
export class AuthModule {}
