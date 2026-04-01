import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CompaniesMeController } from './controllers/companies-me.controller';
import { CompaniesMeWhatsAppController } from './controllers/companies-me-whatsapp.controller';
import { Company } from './entities/company.entity';
import { UserCompany } from './entities/user-company.entity';
import { EvolutionModule } from '../evolution/evolution.module';
import { GetManagedCompanyUseCase } from './use-cases/get-managed-company.use-case';
import { GetManagedWhatsAppConnectionPayloadUseCase } from './use-cases/get-managed-whatsapp-connection-payload.use-case';
import { GetManagedWhatsAppSettingsUseCase } from './use-cases/get-managed-whatsapp-settings.use-case';
import { ProvisionManagedWhatsAppInstanceUseCase } from './use-cases/provision-managed-whatsapp-instance.use-case';
import { RefreshManagedWhatsAppStatusUseCase } from './use-cases/refresh-managed-whatsapp-status.use-case';
import { DisconnectManagedWhatsAppUseCase } from './use-cases/disconnect-managed-whatsapp.use-case';
import { UpdateManagedAgentStateUseCase } from './use-cases/update-managed-agent-state.use-case';
import { UpdateManagedAgentReplySettingsUseCase } from './use-cases/update-managed-agent-reply-settings.use-case';
import { UpdateManagedCompanyKnowledgeBaseUseCase } from './use-cases/update-managed-company-knowledge-base.use-case';
import { UpdateManagedCompanyProfileUseCase } from './use-cases/update-managed-company-profile.use-case';
import { BuildCompanyEvolutionInstanceNameService } from './services/build-company-evolution-instance-name.service';
import { ProvisionCompanyWhatsAppInstanceService } from './services/provision-company-whatsapp-instance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, UserCompany]),
    AuthModule,
    EvolutionModule,
  ],
  controllers: [CompaniesMeController, CompaniesMeWhatsAppController],
  providers: [
    GetManagedCompanyUseCase,
    GetManagedWhatsAppConnectionPayloadUseCase,
    GetManagedWhatsAppSettingsUseCase,
    ProvisionManagedWhatsAppInstanceUseCase,
    RefreshManagedWhatsAppStatusUseCase,
    DisconnectManagedWhatsAppUseCase,
    UpdateManagedAgentStateUseCase,
    UpdateManagedAgentReplySettingsUseCase,
    BuildCompanyEvolutionInstanceNameService,
    ProvisionCompanyWhatsAppInstanceService,
    UpdateManagedCompanyProfileUseCase,
    UpdateManagedCompanyKnowledgeBaseUseCase,
  ],
  exports: [
    TypeOrmModule,
    BuildCompanyEvolutionInstanceNameService,
    ProvisionCompanyWhatsAppInstanceService,
  ],
})
export class CompaniesModule {}
