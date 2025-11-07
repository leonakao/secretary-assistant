import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';

@Module({
  imports: [DatabaseModule, UsersModule, CompaniesModule, ContactsModule],
})
export class AppModule {}
