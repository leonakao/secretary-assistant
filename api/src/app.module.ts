import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { AiModule } from './modules/ai/ai.module';
import { ChatModule } from './modules/chat/chat.module';
import { EvolutionModule } from './modules/evolution/evolution.module';
import { MonitorModule } from './modules/monitor/monitor.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { MessageQueueModule } from './modules/message-queue/message-queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MonitorModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    ContactsModule,
    AiModule,
    ChatModule,
    EvolutionModule,
    ServiceRequestsModule,
    OnboardingModule,
    MessageQueueModule,
  ],
})
export class AppModule {}
