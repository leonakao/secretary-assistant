import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Memory } from '../chat/entities/memory.entity';
import { UserCompany } from '../companies/entities/user-company.entity';
import { ContactsMeController } from './controllers/contacts-me.controller';
import { Contact } from './entities/contact.entity';
import { GetManagedContactDetailUseCase } from './use-cases/get-managed-contact-detail.use-case';
import { ListManagedContactsUseCase } from './use-cases/list-managed-contacts.use-case';
import { UpdateManagedContactIgnoreUntilUseCase } from './use-cases/update-managed-contact-ignore-until.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, Memory, UserCompany]),
    AuthModule,
  ],
  controllers: [ContactsMeController],
  providers: [
    ListManagedContactsUseCase,
    GetManagedContactDetailUseCase,
    UpdateManagedContactIgnoreUntilUseCase,
  ],
  exports: [TypeOrmModule],
})
export class ContactsModule {}
