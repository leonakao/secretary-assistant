import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import type { User } from 'src/modules/users/entities/user.entity';
import { ListManagedContactsQueryDto } from '../dto/list-managed-contacts-query.dto';
import { UpdateManagedContactIgnoreUntilDto } from '../dto/update-managed-contact-ignore-until.dto';
import { GetManagedContactDetailUseCase } from '../use-cases/get-managed-contact-detail.use-case';
import { ListManagedContactsUseCase } from '../use-cases/list-managed-contacts.use-case';
import { UpdateManagedContactIgnoreUntilUseCase } from '../use-cases/update-managed-contact-ignore-until.use-case';

@Controller('contacts/me')
@UseGuards(SessionGuard)
export class ContactsMeController {
  constructor(
    private readonly listManagedContacts: ListManagedContactsUseCase,
    private readonly getManagedContactDetail: GetManagedContactDetailUseCase,
    private readonly updateManagedContactIgnoreUntil: UpdateManagedContactIgnoreUntilUseCase,
  ) {}

  @Get()
  async listContacts(
    @CurrentUser() user: User,
    @Query() query: ListManagedContactsQueryDto,
  ) {
    return this.listManagedContacts.execute(user, query);
  }

  @Get(':contactId')
  async getContactDetail(
    @CurrentUser() user: User,
    @Param('contactId') contactId: string,
  ) {
    return this.getManagedContactDetail.execute(user, contactId);
  }

  @Patch(':contactId/ignore-until')
  async updateIgnoreUntil(
    @CurrentUser() user: User,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateManagedContactIgnoreUntilDto,
  ) {
    return this.updateManagedContactIgnoreUntil.execute(user, contactId, dto);
  }
}
