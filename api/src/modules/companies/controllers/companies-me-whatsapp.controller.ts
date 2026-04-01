import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import type { User } from 'src/modules/users/entities/user.entity';
import { UpdateManagedAgentStateDto } from '../dto/update-managed-agent-state.dto';
import { UpdateManagedAgentReplySettingsDto } from '../dto/update-managed-agent-reply-settings.dto';
import { GetManagedWhatsAppSettingsUseCase } from '../use-cases/get-managed-whatsapp-settings.use-case';
import { GetManagedWhatsAppConnectionPayloadUseCase } from '../use-cases/get-managed-whatsapp-connection-payload.use-case';
import { ProvisionManagedWhatsAppInstanceUseCase } from '../use-cases/provision-managed-whatsapp-instance.use-case';
import { RefreshManagedWhatsAppStatusUseCase } from '../use-cases/refresh-managed-whatsapp-status.use-case';
import { DisconnectManagedWhatsAppUseCase } from '../use-cases/disconnect-managed-whatsapp.use-case';
import { UpdateManagedAgentStateUseCase } from '../use-cases/update-managed-agent-state.use-case';
import { UpdateManagedAgentReplySettingsUseCase } from '../use-cases/update-managed-agent-reply-settings.use-case';

@Controller('companies/me')
@UseGuards(SessionGuard)
export class CompaniesMeWhatsAppController {
  constructor(
    private readonly getManagedWhatsAppSettings: GetManagedWhatsAppSettingsUseCase,
    private readonly provisionManagedWhatsAppInstance: ProvisionManagedWhatsAppInstanceUseCase,
    private readonly getManagedWhatsAppConnectionPayload: GetManagedWhatsAppConnectionPayloadUseCase,
    private readonly refreshManagedWhatsAppStatus: RefreshManagedWhatsAppStatusUseCase,
    private readonly updateManagedAgentState: UpdateManagedAgentStateUseCase,
    private readonly updateManagedAgentReplySettings: UpdateManagedAgentReplySettingsUseCase,
    private readonly disconnectManagedWhatsApp: DisconnectManagedWhatsAppUseCase,
  ) {}

  @Get('whatsapp-settings')
  async getWhatsAppSettings(@CurrentUser() user: User) {
    return this.getManagedWhatsAppSettings.execute(user);
  }

  @Post('whatsapp-instance')
  async provisionWhatsAppInstance(@CurrentUser() user: User) {
    return this.provisionManagedWhatsAppInstance.execute(user);
  }

  @Post('whatsapp-connection')
  async getWhatsAppConnection(@CurrentUser() user: User) {
    return this.getManagedWhatsAppConnectionPayload.execute(user);
  }

  @Post('whatsapp-refresh')
  async refreshWhatsAppStatus(@CurrentUser() user: User) {
    return this.refreshManagedWhatsAppStatus.execute(user);
  }

  @Post('agent-state')
  async updateAgentState(
    @CurrentUser() user: User,
    @Body() dto: UpdateManagedAgentStateDto,
  ) {
    return this.updateManagedAgentState.execute(user, dto.enabled);
  }

  @Post('agent-reply-settings')
  async updateAgentReplySettings(
    @CurrentUser() user: User,
    @Body() dto: UpdateManagedAgentReplySettingsDto,
  ) {
    return this.updateManagedAgentReplySettings.execute(user, {
      scope: dto.scope,
      namePattern: dto.namePattern,
      listMode: dto.listMode,
      listEntries: dto.listEntries,
    });
  }

  @Post('whatsapp-disconnect')
  async disconnectWhatsApp(@CurrentUser() user: User) {
    return this.disconnectManagedWhatsApp.execute(user);
  }
}
